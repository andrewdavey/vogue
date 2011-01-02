/* vogue.js
 * A tool for web developers. Vogue watches for changes to CSS files and
 * informs the web browser using them to reload those stylesheets.
 * 
 * Created by Andrew Davey ~ http://aboutcode.net 
 *
 * Vogue runs on nodeJS and uses socket.io for real-time communication between
 * browser and server.
 */

var http = require('http'),
    fs   = require('fs'),
    path = require('path'),
    io   = require('socket.io');

var defaultOptions = {
  port: '8001',
  dir: ''
};
var options = parseOptions(process.argv, defaultOptions);
options.port = parseInt(options.port);
options.dir = path.join(process.cwd(), options.dir);

console.log('Watch directory: ' + options.dir);



var server = http.createServer(onWebRequest);
server.listen(options.port);
var socket = io.listen(server);
var clients = [];
var watchedFiles = {};

socket.on('connection', function(client) {
  var vogueClient = new VogueClient(client);
  clients.push(vogueClient);
  client.on('message', vogueClient.handleMessage.bind(vogueClient));
  client.on('disconnect', vogueClient.disconnect.bind(vogueClient));
});


function onWebRequest(request, response) {
  if (request.url === '/') {
    sendAboutPage(response);
  } else if (request.url === '/vogue-client.js') {
    sendVogueClient(response);
  }
}


function VogueClient(clientSocket) {
  this.socket = clientSocket;
  this.watchedFiles = {};
}
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
    startWatching(filename);
  }.bind(this));
};
VogueClient.prototype.updateFile = function(filename) {
  var fileInfo = this.watchedFiles[filename];
  if (fileInfo) {
    fs.stat(filename, function(err, stats) {
      if (err) {
        console.log('Could not read stats for ' + filename);
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
    stopWatching(filename);
  }
};

function startWatching(filename) {
  if (filename in watchedFiles) {
    watchedFiles[filename]++;
  } else {
    fs.watchFile(filename, { persistent: true, interval: 50 }, function() {
      clients.forEach(function(client) {
        client.updateFile(filename);
      });
    });
    watchedFiles[filename] = 1;
    console.log('File watched: ' + filename);
  }
}

function stopWatching(filename) {
  if (--watchedFiles[filename] == 0) {
    delete watchedFiles[filename];
    fs.unwatchFile(filename);
    console.log('File unwatched: ' + filename);
  }
}

function sendAboutPage(response) {
  fs.readFile(__dirname + '/client/about.htm', function(e, fileData) {
    var html = fileData.toString();
    html = html.replace(/\{port\}/g, options.port.toString());
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.write(html);
    response.end();
  });
}

function sendVogueClient(response) {
  fs.readFile(__dirname + '/client/vogue-client.js', function(e, fileData) {
    var script = fileData.toString();
    script = script.replace(/\{port\}/g, options.port.toString());
    response.writeHead(200, { 'Content-Type': 'text/javascript' });
    response.write(script);
    response.end();
  });
}

function parseOptions(argv, defaults) {
  var options = {}, nextArgName;
  for (var p in defaults) {
    if (defaults.hasOwnProperty(p)) options[p] = defaults[p];
  }
  for (var i = 0; i < argv.length; i++) {
    if (nextArgName) {
      options[nextArgName] = argv[i];
      nextArgName = null;
    }
    if (argv[i].match(/^-./)) {
      nextArgName = argv[i].substr(1);
    }
  }
  return options;
}
