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
  , url   = require('url')
  , opt   = require('parseopt')
  , io    = require('socket.io');

var options    = getOptions()
  , server     = http.createServer(handleHttpRequest)
  , socket     = io.listen(server);

server.listen(options.port);

console.log('Listening for clients: http://localhost:' + options.port + '/');
console.log('Listening for SIGUSR2 to trigger updates');

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

process.on("SIGUSR2", function() {
  console.log("Heard SIGUSR2");
  socket.sockets.emit('update');
  if (typeof socket_ssl !== 'undefined') {
     socket_ssl.sockets.emit('update');
  }
});

function handleHttpRequest(request, response) {
  fs.readFile(__dirname + '/client/vogue-client.js', function(e, fileData) {
    var script = fileData.toString();
    response.writeHead(200, {
    	'Content-Type': 'text/javascript',
    	'Cache-Control':	'public, max-age=315360000',
    });
    response.write(script);
    response.end();
  });
}

function getOptions() {
  var data = createOptionParser().parse();
  if (!data) process.exit(1); // Some kind of parsing error

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
}
