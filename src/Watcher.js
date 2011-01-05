var fs   = require('fs')
  , path = require('path');

exports.Watcher = Watcher;

function Watcher(webDirectory) {
  this.webDirectory = webDirectory;

  // array of VogueClient objects
  this.clients = [];
  
  // filename -> number_of_clients_watching 
  this.fileWatcherCount = {};
}

Watcher.prototype.addClient = function(client) {
  this.clients.push(client);
};

Watcher.prototype.removeClient = function(client) {
  this.clients.splice(this.clients.indexOf(client), 1);
};

Watcher.prototype.startWatchingByHref = function(href, callback) {
  // Remove any querystring junk.
  // e.g. "foo/bar.css?abc=123" --> "foo/bar.css"
  href = href.split('?')[0];
  var filename = path.join(this.webDirectory, href);
  fs.stat(filename, function(err, stats) {
    if (err) {
      console.log('Could not read stats for ' + filename);
      return;
    }

    this.startWatching(filename);
    callback(filename, stats);
  }.bind(this));
};

Watcher.prototype.startWatching = function(filename) {
  console.log('Watching file: ' + filename);
  if (filename in this.fileWatcherCount) {
    // already watching this file, so just increment the client count.
    this.fileWatcherCount[filename]++;
  } else {
    fs.watchFile(
      filename,
      { persistent: true, interval: 50 },
      fileChanged.bind(this)
    );
    this.fileWatcherCount[filename] = 1;
  }

  function fileChanged() {
    console.log('File changed: ' + filename);
    this.clients.forEach(function(client) {
      client.updateFile(filename);
    });
  }
};

Watcher.prototype.stopWatching = function(filename) {
  if (!(filename in this.fileWatcherCount)) return;

  var watcherCount = --this.fileWatcherCount[filename];
  if (watcherCount == 0) {
    delete this.fileWatcherCount[filename];
    fs.unwatchFile(filename);
    console.log('Stopped watching file: ' + filename);
  }
}

