# Firebase App Shell Caching

This is an example of how to use the [sw-precache](https://github.com/GoogleChrome/sw-precache)
for a Firebase Hosting site to cache an app shell for a single-page style app.

## Running Locally

    npm install
    npm run build
    npm install -g firebase-tools
    firebase serve

## How it Works

The script in `build.js` utilizes the [node-glob](https://github.com/isaacs/node-glob)
library to build up a list of the files that will be deployed to Firebase Hosting.
The `sw-precache` library is then used to generate a service worker which is
placed in the `dist` directory.

This implementation uses a `navigateFallback` option on `sw-precache` which causes
any unrecognized navigation to serve up `index.html`.
