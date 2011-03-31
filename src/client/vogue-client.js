// Vogue - Client
// Copyright (c) 2011 Andrew Davey (andrew@equin.co.uk)

(function() {

var stylesheetBases = [document.location.protocol + '//' + document.location.host];
var scriptBase = getScriptBase();
var port = getPort(scriptBase);

loadScripts({
  jQuery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.min.js',
  io: scriptBase + 'socket.io/socket.io.js'
}, vogue);

function vogue() {
  window.WEB_SOCKET_SWF_LOCATION = scriptBase + 'socket.io/lib/vendor/web-socket-js/WebSocketMain.swf';
  var stylesheets = getLocalStylesheets();
  var socket = new io.Socket('localhost', { port: port });
  socket.on('connect', watchAllStylesheets);
  socket.on('message', handleMessage);
  socket.connect();

  function watchAllStylesheets() {
    for (var href in stylesheets) {
      socket.send('watch ' + href);
    }
  }

  function handleMessage(message) {
    var match = message.match(/^update (.*)$/);
    if (match) {
      var href = match[1];
      reloadStylesheet(href);
    }
  }

  function reloadStylesheet(href) {
    var newHref = stylesheets[href].href
      + (href.indexOf('?') >= 0 ? '&' : '?') 
      + '_vogue_nocache=' 
      + (new Date()).getTime();
    $(stylesheets[href]).attr('href', newHref);
  }
  
  function getLocalStylesheets() {
    var links = $('link[type=text/css][href]').filter(isLocal);
    var stylesheets = {};
    links.each(function() {
      // Match hrefs against stylesheet bases we know of
      for (var i=0; i<stylesheetBases.length; i++) {
        if (this.href.indexOf(stylesheetBases[i]) > -1) {
          var href = this.href.substr(stylesheetBases[i].length);
          stylesheets[href] = this;
          break;
        }
      }
    });
    return stylesheets;

    function isLocal() {
      var href = $(this).attr('href');

      var isExternal = true;
      for (var i=0; i<stylesheetBases.length; i++) {
        if (href.indexOf(stylesheetBases[i]) > -1) {
          isExternal = false;
          break;
        }
      }
      return !(isExternal && href.match(/^https?:/));
    }
  }
}

function loadScripts(scripts, loadedCallback) {
  var srcs = [];
  for (var property in scripts) {
    if (!(property in window)) srcs.push(scripts[property]);
  }

  var count = srcs.length;
  if (count == 0) loadedCallback();
  for (var i = 0; i < srcs.length; i++) {
    var src = srcs[i];
    loadScript(src, function() {
      count--;
      if (count == 0) loadedCallback();
    });
  }
}

function loadScript(src, loadedCallback) {
  var script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', src);
  script.onload = loadedCallback; // Chrome
  script.onreadystatechange = function () { // IE?
    if (this.readyState == 'complete' || this.readyState == 'loaded') loadedCallback();
  };
  document.getElementsByTagName('head')[0].appendChild(script);
}

function getScriptBase() {
  var scripts = document.getElementsByTagName("script");
  var src = scripts[scripts.length - 1].getAttribute("src");

  if (src.match(/base=(.*)$/)) {
    stylesheetBases.push(src.match(/base=(.*)$/)[1]);
  }

  return src.match(/https?\:\/\/.*?\//)[0];
}

function getPort(url) {
  // URL may contain the port number after the second colon.
  // http://domain:1234/
  var index = url.indexOf(':', 6); // skipping 6 characters to ignore first colon
  if (index < 0) return 80; // default to port 80 if none found.
  return parseInt(url.substr(index+1));
}

})();
