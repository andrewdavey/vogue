function Watcher() {
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

Watcher.prototype.startWatching = function(filename) {
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
    console.log('Watching file: ' + filename);
  }

  function fileChanged() {
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

exports.Watcher = Watcher;
