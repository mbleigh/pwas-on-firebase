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
    verbose: true,
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

// REPLACE EXISTING DEFAULT TASK:
gulp.task('default', ['clean'], function(cb) {
  runSequence(
    ['ensureFiles', 'copy', 'styles'],
    'elements',
    ['images', 'fonts', 'html'],
    'vulcanize',
    'generate-service-worker',
    cb);
});
