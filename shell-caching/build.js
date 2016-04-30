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

var glob = require('glob');
var path = require('path');
var swPrecache = require('sw-precache');

var fbjson = require('./firebase.json');
var rootDir = 'dist';

var filesToCache = glob.sync('**', {
  ignore: fbjson.hosting.ignore,
  cwd: rootDir
});

swPrecache.write(path.join(rootDir, 'service-worker.js'), {
  staticFileGlobs: filesToCache.map(file => path.join(rootDir, file)),
  stripPrefix: rootDir,
  navigateFallback: '/index.html'
});
