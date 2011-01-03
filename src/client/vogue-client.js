// Vogue - Client
// Copyright (c) 2011 Andrew Davey (andrew@equin.co.uk)
//
// Note that all occurances of {port} in this script will be replaced with the port of the 
// HTTP server hosted by Node.

(function() {

loadScripts({
  jQuery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.min.js',
  io: 'http://localhost:{port}/socket.io/socket.io.js'
}, vogue);

function vogue() {
  var stylesheets = getLocalStylesheets();
  WEB_SOCKET_SWF_LOCATION = 'http://localhost:{port}/socket.io/lib/vendor/web-socket-js/WebSocketMain.swf';
  var socket = new io.Socket('localhost', { port: {port} });
  socket.on('connect', watchAllStylesheets);
  socket.on('message', handleMessage);
  socket.connect();

  function watchAllStylesheets() {
    var origin = document.location.protocol + '//' + document.location.host;
    var skipPrefixLength = origin.length;
    for (var href in stylesheets) {
      // linkElement.href is resolved by the browser to the full URL.
      // (unlike reading the actual attribute value.)
      // Very handy; we can easily get the full path segment of the URL
      // by skipping the current document's location origin length.
      var path = stylesheets[href].href.substr(skipPrefixLength);
      socket.send('watch ' + path);
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
    var newHref = href 
      + (href.indexOf('?') >= 0 ? '&' : '?') 
      + '_vogue_nocache=' 
      + (new Date()).getTime();
    $(stylesheets[href]).attr('href', newHref);
  }
  
  function getLocalStylesheets() {
    var links = $('link[type=text/css][href]').filter(isLocal);
    var origin = document.location.protocol + '//' + document.location.host;
    var stylesheets = {};
    links.each(function() {
      var href = this.href.substr(origin.length)
      stylesheets[href] = this;
    });
    return stylesheets;

    function isLocal() {
      var href = $(this).attr('href');
      return !href.match(/^https?:/);
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
  }
  document.getElementsByTagName('head')[0].appendChild(script);
}

})();
