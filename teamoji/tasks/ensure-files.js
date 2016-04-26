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
var fs = require('fs');

/**
 * @param {Array<string>} files
 * @param {Function} cb
 */

function ensureFiles(files, cb) {
  var missingFiles = files.reduce(function(prev, filePath) {
    var fileFound = false;

    try {
      fileFound = fs.statSync(filePath).isFile();
    } catch (e) { }

    if (!fileFound) {
      prev.push(filePath + ' Not Found');
    }

    return prev;
  }, []);

  if (missingFiles.length) {
    var err = new Error('Missing Required Files\n' + missingFiles.join('\n'));
  }

  if (cb) {
    cb(err);
  } else if (err) {
    throw err;
  }
}

module.exports = ensureFiles;
