// Vogue - Client
// Copyright (c) 2011 Andrew Davey (andrew@equin.co.uk)

(function() {

var script = getScriptInfo();

loadScripts({
  io: script.url + 'socket.io/socket.io.js'
}, vogue);

function vogue() {
  var stylesheets = getLocalStylesheets();
  var socket = io.connect("http://" + script.domain + ":" + script.port);
  socket.on('connect', watchAllStylesheets);
  socket.on('update', handleMessage);

  function watchAllStylesheets() {
    for (var href in stylesheets) {
      socket.emit('watch', { href: href });
    }
  }

  function handleMessage(message) {
    reloadStylesheet(message.href);
  }

  function reloadStylesheet(href) {
    var newHref = stylesheets[href].href
      + (href.indexOf('?') >= 0 ? '&' : '?') 
      + '_vogue_nocache=' 
      + (new Date()).getTime();
      stylesheets[href].href = newHref;
  }
  
  function getLocalStylesheets() {
    
    function isLocalStylesheet(link) {
      if (link.getAttribute('rel') !== 'stylesheet') {
        return false;
      }
      var href = link.href;
      var isExternal = true;
      for (var i=0; i<script.bases.length; i++) {
        if (href.indexOf(script.bases[i]) > -1) {
          isExternal = false;
          break;
        }
      }
      return !(isExternal && href.match(/^https?:/));
    }
    
    var links = document.getElementsByTagName('link');
    var stylesheets = {};
    for (var i = 0, m = links.length; i < m; i++) {
      if (!isLocalStylesheet(links[i])) {
        continue;
      }
      // Match hrefs against stylesheet bases we know of
      for (var j=0; j<script.bases.length; j++) {
        if (links[i].href.indexOf(script.bases[j]) > -1) {
          var href = links[i].href.substr(script.bases[j].length);
          stylesheets[href] = links[i];
          break;
        }
      }      
    }

    return stylesheets;
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

function getScriptInfo() {
  var bases = [document.location.protocol + '//' + document.location.host];
  if (typeof window.__vogue__ === "undefined") {
    var scripts = document.getElementsByTagName("script");
    var src = scripts[scripts.length - 1].getAttribute("src");

    var url = src.match(/https?\:\/\/.*?\//)[0];

    var domain = src.match(/https?\:\/(.*?)\//)[1];

    var baseMatch = src.match(/\bbase=(.*)(&|$)/);
    if (baseMatch) {
      bases = bases.concat(baseMatch[1].split(','));
    }

    return {
      url: url,
      domain: domain,
      port: getPort(url),
      bases: bases
    };
  } else {
    window.__vogue__.bases = bases;
    return window.__vogue__;
  }
}

function getPort(url) {
  // URL may contain the port number after the second colon.
  // http://domain:1234/
  var index = url.indexOf(':', 6); // skipping 6 characters to ignore first colon
  if (index < 0) return 80; // default to port 80 if none found.
  return parseInt(url.substr(index+1));
}

})();
