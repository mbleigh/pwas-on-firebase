// add to x-app.html "ready"
this.offline = navigator.onLine === false;
window.addEventListener('online', function() {
  this.offline = false;
}.bind(this));
window.addEventListener('offline', function() {
  this.offline = true;
}.bind(this));
