/*
Copyright 2016 Google, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var merge = require('merge-stream');
var path = require('path');
var fs = require('fs');
var glob = require('glob-all');
var superstatic = require('superstatic');
var fbConfig = require('./firebase.json');
var packageJson = require('./package.json');
var crypto = require('crypto');
var ensureFiles = require('./tasks/ensure-files.js');

// var ghPages = require('gulp-gh-pages');

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var DIST = 'dist';

var dist = function(subpath) {
  return !subpath ? DIST : path.join(DIST, subpath);
};

var styleTask = function(stylesPath, srcs) {
  return gulp.src(srcs.map(function(src) {
      return path.join('app', stylesPath, src);
    }))
    .pipe($.changed(stylesPath, {extension: '.css'}))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('.tmp/' + stylesPath))
    .pipe($.minifyCss())
    .pipe(gulp.dest(dist(stylesPath)))
    .pipe($.size({title: stylesPath}));
};

var imageOptimizeTask = function(src, dest) {
  return gulp.src(src)
    .pipe($.imagemin({
      progressive: true,
      interlaced: true
    }))
    .pipe(gulp.dest(dest))
    .pipe($.size({title: 'images'}));
};

var optimizeHtmlTask = function(src, dest) {
  var assets = $.useref.assets({
    searchPath: ['.tmp', 'app']
  });

  return gulp.src(src)
    .pipe(assets)
    // Concatenate and minify JavaScript
    .pipe($.if('*.js', $.uglify({
      preserveComments: 'some'
    })))
    // Concatenate and minify styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.minifyCss()))
    .pipe(assets.restore())
    .pipe($.useref())
    // Minify any HTML
    .pipe($.if('*.html', $.minifyHtml({
      quotes: true,
      empty: true,
      spare: true
    })))
    // Output files
    .pipe(gulp.dest(dest))
    .pipe($.size({
      title: 'html'
    }));
};

// Compile and automatically prefix stylesheets
gulp.task('styles', function() {
  return styleTask('styles', ['**/*.css']);
});

gulp.task('elements', function() {
  return styleTask('elements', ['**/*.css']);
});

// Ensure that we are not missing required files for the project
// "dot" files are specifically tricky due to them being hidden on
// some systems.
gulp.task('ensureFiles', function(cb) {
  var requiredFiles = ['.bowerrc'];

  ensureFiles(requiredFiles.map(function(p) {
    return path.join(__dirname, p);
  }), cb);
});

// Optimize images
gulp.task('images', function() {
  return imageOptimizeTask('app/images/**/*', dist('images'));
});

// Copy all files at the root level (app)
gulp.task('copy', function() {
  var app = gulp.src([
    'app/*',
    'app/data/emoji.json',
    '!app/test',
    '!app/elements',
    '!app/bower_components',
    '!**/.DS_Store'
  ], {
    dot: true
  }).pipe(gulp.dest(dist()));

  var data = gulp.src('app/data/emoji.json').pipe(gulp.dest(dist('data')));

  // Copy over only the bower_components we need
  // These are things which cannot be vulcanized
  var bower = gulp.src([
    'app/bower_components/{webcomponentsjs,promise-polyfill,app-storage}/**/*.js'
  ]).pipe(gulp.dest(dist('bower_components')));

  return merge(app, bower, data)
    .pipe($.size({
      title: 'copy'
    }));
});

// Copy web fonts to dist
gulp.task('fonts', function() {
  return gulp.src(['app/fonts/**'])
    .pipe(gulp.dest(dist('fonts')))
    .pipe($.size({
      title: 'fonts'
    }));
});

// Scan your HTML for assets & optimize them
gulp.task('html', function() {
  return optimizeHtmlTask(
    ['app/**/*.html', '!app/{elements,test,bower_components}/**/*.html'],
    dist());
});

// Vulcanize granular configuration
gulp.task('vulcanize', function() {
  return gulp.src('app/elements/elements.html')
    .pipe($.vulcanize({
      stripComments: true,
      inlineCss: true,
      inlineScripts: true
    }))
    .pipe(gulp.dest(dist('elements')))
    .pipe($.size({title: 'vulcanize'}));
});

gulp.task('generate-dev-service-worker', function(callback) {
  var dir = 'app';
  var swPrecache = require('sw-precache');

  swPrecache.write(path.join('.tmp', 'service-worker.js'), {
    handleFetch: false,
    cacheId: packageJson.name,
    staticFileGlobs: [
      dir + '/**/*.{js,html,css,png,svg,jpg,gif,json}'
    ],
    stripPrefix: dir,
    logger: $.util.log,
    verbose: true,
    navigateFallback: '/index.html',
    runtimeCaching: [{
      urlPattern: /^https:\/\/fonts.googleapis.com\/.*/,
      handler: 'cacheFirst'
    },
    {
      urlPattern: /^https:\/\/www.gstatic.com\/.*/,
      handler: 'networkFirst'
    }]
  }, callback);
});

gulp.task('generate-service-worker', function(callback) {
  var dir = dist();
  var swPrecache = require('sw-precache');

  swPrecache.write(path.join(dir, 'service-worker.js'), {
    cacheId: packageJson.name,
    staticFileGlobs: [
      dir + '/**/*.{js,html,css,png,svg,jpg,gif}',
      dir + '/data/emoji.json'
    ],
    stripPrefix: dir,
    logger: $.util.log,
    runtimeCaching: [{
      // cache Google Web Fonts (both css and font files)
      urlPattern: /^https:\/\/fonts.(?:googleapis|gstatic).com\/.*/,
      handler: 'cacheFirst'
    },
    {
      // cache Google user profile pics
      urlPattern: /^https:\/\/lh3.googleusercontent.com\/.*/,
      handler: 'networkFirst'
    },
    {
      // cache Firebase Storage data
      urlPattern: /^https:\/\/storage.googleapis.com\/teamoji-app.appspot.com\/.*/,
      handler: 'networkFirst'
    }]
  }, callback);
});

// Clean output directory
gulp.task('clean', function() {
  return del(['.tmp', dist()]);
});

// Watch files for changes & reload
gulp.task('serve', ['styles', 'elements', 'generate-dev-service-worker'], function() {
  browserSync({
    port: 5000,
    notify: false,
    logPrefix: 'PSK',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: ['app'],
      middleware: [superstatic({
        config: Object.assign({}, fbConfig.hosting, {public: ['.tmp', 'app']})
      })]
    }
  });

  console.log(Object.assign({}, fbConfig.hosting, {public: ['.tmp', 'app']}));
  gulp.watch(['app/**/*.html'], ['generate-dev-service-worker', reload]);
  gulp.watch(['app/styles/**/*.css'], ['styles', 'generate-dev-service-worker', reload]);
  gulp.watch(['app/elements/**/*.css'], ['elements', 'generate-dev-service-worker', reload]);
  gulp.watch(['app/images/**/*'], ['generate-dev-service-worker', reload]);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function() {
  browserSync({
    port: 5001,
    notify: false,
    logPrefix: 'PSK',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: dist(),
    middleware: [superstatic({config: Object.assign({}, fbConfig.hosting, {public: 'dist'})})]
  });
});

// Build production files, the default task
gulp.task('default', ['clean'], function(cb) {
  runSequence(
    ['ensureFiles', 'copy', 'styles'],
    'elements',
    ['images', 'fonts', 'html'],
    'vulcanize',
    'generate-service-worker',
    cb);
});

// Load custom tasks from the `tasks` directory
try {
  require('require-dir')('tasks');
} catch (err) {}
