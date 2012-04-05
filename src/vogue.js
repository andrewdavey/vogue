#!/usr/bin/env node
/* vogue.js
 * A tool for web developers. Vogue watches for changes to CSS files and
 * informs the web browser using them to reload those stylesheets.
 * 
 * Created by Andrew Davey ~ http://aboutcode.net 
 *
 * Vogue runs on nodeJS and uses socket.io for real-time communication between
 * browser and server.
 */

var http  = require('http')
  , fs    = require('fs')
  , path  = require('path')
  , url   = require('url')
  , opt   = require('parseopt')
  , io    = require('socket.io');

var options    = getOptions()
  , server     = http.createServer(handleHttpRequest)
  , socket     = io.listen(server);

server.listen(options.port);

console.log('Watching directory: ' + options.webDirectory);
console.log('Listening for clients: http://localhost:' + options.port + '/');

if (options.key !== null) {
  console.log('Listening for SSL clients: https://localhost:' + options.sslPort + '/');
  
  https = require('https');
  var ssl_opts = {
    cert: fs.readFileSync(options.cert),
    key: fs.readFileSync(options.key)
  };
  if (options.ca !== null) {
    ssl_opts.ca = fs.readFileSync(options.ca);
  }
  server_ssl = https.createServer(ssl_opts, handleHttpRequest);
  
  socket_ssl = io.listen(server_ssl);
  server_ssl.listen(options.sslPort);
}

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

var watching = {};
function watchAllFiles() {
  var newFiles = [];
  // watch every file in the whole directory we're put to
  walk(options.webDirectory, function(err, list) {
  	list.forEach(function(file) {
  	  if (!Object.prototype.hasOwnProperty.call(watching, file)) {
  	    fs.watchFile(file, {interval: 2000}, onFileChange.bind(file));
  	    watching[file] = 'normal';
  	    newFiles.push(file);
  	  }
  	})
  	console.log('Now watching '+newFiles.length+' new files');
  });
}

watchAllFiles();
// refresh file tree every N seconds (TODO: watch directory for new files?)
setInterval(watchAllFiles, 20000);

function onFileChange(cur, prev) {
	if (cur.mtime.toString() != prev.mtime.toString()) {
		socket.sockets.emit('update');
		if (typeof socket_ssl !== 'undefined') {
		  socket_ssl.sockets.emit('update');
		}
		// not sure why the filename gets turned into an object?
		var file = this.toString();
		// put this particular file on high-alert for changes
		// (reduce the polling interval)
		if (watching[file] === 'normal') {
		  fs.unwatchFile(this.toString());
      fs.watchFile(this.toString(), {interval: 100}, onFileChange.bind(this.toString()));
  		watching[file] = 'hyperspeed';  
		}
	}
}

function handleHttpRequest(request, response) {
  fs.readFile(__dirname + '/client/vogue-client.js', function(e, fileData) {
    var script = fileData.toString();
    response.writeHead(200, { 'Content-Type': 'text/javascript' });
    response.write(script);
    response.end();
  });
}

function getOptions() {
  var data = createOptionParser().parse();
  if (!data) process.exit(1); // Some kind of parsing error

  // The directory to watch is given as the first argument after the options.
  // So we'll put it into the options we return for simplicity.
  data.options.webDirectory = getDirectoryToWatch(data.arguments);
  return data.options;

  function createOptionParser() {
    var parser = new opt.OptionParser({
      options: [
        {
          name: ['--port', '-p'],
          type: 'int',
          help: 'Port to run Vogue server on (http)',
          'default': 8001
        },
        {
          name: ['--ssl_port', '-s'],
          type: 'int',
          help: 'Port to run the Vogue server on (https) (optional)',
          'default': 8002
        },
        {
		      name: ['--key', '-k'],
		      type: 'string',
		      help: 'A private key file (.pem format) (optional)',
		      'default': null
        },
        {
		      name: ['--cert', '-c'],
		      type: 'string',
		      help: 'A certificate file (.pem format) (optional)',
		      'default': null
        },
        {
		      name: ['--ca', '-a'],
		      type: 'string',
		      help: 'A intermediate certificate file (.pem format) (optional)',
		      'default': null
        },
        {
          name: ['--rewrite', '-r'],
          type: 'string',
          help: 'Expression of the form "regexp:replacement" rewrites a URL path into a file system path, relative to the website root directory. For example: --rewrite "v[0-9]/(.*)$:files/\\$1" would change "v1/demo.css" to "files/demo.css".',
          'default': null
        },
        {
          name: ['--help','-h','-?'],
          type: 'flag',
          help: 'Show this help message',
          onOption: function (value) {
            if (value) {
              parser.usage('First argument after options should be the path to the website\'s root directory. Otherwise the current directory is used.\ne.g. vogue -p 8001 ./myweb');
            }
            // returning true cancels any further option parsing
            // and parser.parse() returns null
            return value;
          }
        }
      ]
    });
    return parser;
  }

  function getDirectoryToWatch(arguments) {
    var dir;
    if (arguments.length > 0) {
      if (/^\//.test(arguments[0])) {
        dir = arguments[0];
      } else {
        dir = path.join(process.cwd(), arguments[0]);
      }
    } else {
      dir = process.cwd();
    }

    try {
      var stats = fs.statSync(dir);
      if (!stats.isDirectory()) {
        console.error('Path is not a directory: ' + dir);
        process.exit(1);
      }
    } catch (e) {
      console.error('Path not found: ' + dir);
      process.exit(1);
    }

    return dir;
  }
}
