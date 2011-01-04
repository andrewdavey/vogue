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
  this.watchFile(match[1]);
};

VogueClient.prototype.watchFile = function(href) {
  var filename = path.join(options.dir, href.substr(1));
  fs.stat(filename, function(err, stats) {
    if (err) {
      console.log('Could not read stats for ' + filename);
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
        console.error('Could not read stats for file: ' + filename);
        return;
      }
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

exports.VogueClient = VogueClient;
