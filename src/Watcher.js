var fs   = require('fs')
  , path = require('path');

exports.Watcher = Watcher;

function Watcher(webDirectory, rewrite) {
  this.webDirectory = webDirectory;
  // array of VogueClient objects
  this.clients = [];
  
  // filename -> number_of_clients_watching 
  this.fileWatcherCount = {};

  if (rewrite) {
    this.rewriteUrlToPath = createRewriter(rewrite); 
  }

  function createRewriter(rewrite) {
    var parts = rewrite.split(':');
    if (parts.length === 2) {
      var regex = new RegExp(parts[0]);
      var replacement = parts[1];
      return function (str) { 
        return str.replace(regex, replacement);
      }
    } else {
      throw new Error('Rewrite must be of the form "regex:replacement".');
    }
  }
}

Watcher.prototype.addClient = function(client) {
  this.clients.push(client);
};

Watcher.prototype.removeClient = function(client) {
  this.clients.splice(this.clients.indexOf(client), 1);
};

Watcher.prototype.getFilenameForHref = function(href) {
  if (this.rewriteUrlToPath) {
    href = this.rewriteUrlToPath(href);
  }
  // Remove any querystring junk.
  // e.g. "foo/bar.css?abc=123" --> "foo/bar.css"
  href = href.split('?')[0];
  var filename = path.join(this.webDirectory, href);
  return filename;
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

