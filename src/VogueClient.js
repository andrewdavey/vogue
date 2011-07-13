var fs = require('fs');

exports.VogueClient = VogueClient;

// Encapsulates a web socket client connection from a web browser.
function VogueClient(clientSocket, watcher) {
  this.socket = clientSocket;
  this.watcher = watcher;
  this.watchedFiles = {};
  clientSocket.on('message', this.handleMessage.bind(this));
  clientSocket.on('disconnect', this.disconnect.bind(this));
}

// Parse an incoming message from the client and dispatch accordingly.
VogueClient.prototype.handleMessage = function(message) {
  var match = message.match(/^watch (.*)$/);
  if (!match) return;
  var href = match[1];
  this.watchFile(href);
};

VogueClient.prototype.watchFile = function(href) {
  var filename = this.watcher.getFilenameForHref(href);
  fs.stat(filename, function(err, stats) {
    if (err) {
      console.log('Could not read stats for ' + filename, 'because'
        , err.message);
      return;
    }
    
    this.watchedFiles[filename] = {
      href: href,
      mtime: stats.mtime
    };
    this.watcher.startWatching(filename);
  }.bind(this));
};

VogueClient.prototype.updateFile = function(filename) {
  var fileInfo = this.watchedFiles[filename];
  if (fileInfo) {
    fs.stat(filename, function(err, stats) {
      if (err) {
        console.error(err);
        console.error('Could not read stats for file: ' + filename);
        return;
      }
      // Only send message to client if the file was modified
      // since we last saw it.
      if (fileInfo.mtime < stats.mtime) {
        this.socket.send('update ' + fileInfo.href);
        fileInfo.mtime = stats.mtime;
      }
    }.bind(this));
  }
};

VogueClient.prototype.disconnect = function() {
  for (var filename in this.watchedFiles) {
    this.watcher.stopWatching(filename);
  }
  this.watcher.removeClient(this);
};
