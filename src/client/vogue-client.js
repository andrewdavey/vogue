// Vogue - Client
// Copyright (c) 2011 Andrew Davey (andrew@equin.co.uk)
(function () {
  var script,
      hop = Object.prototype.hasOwnProperty,
      head = document.getElementsByTagName("head")[0];

  function vogue() {
    var stylesheets,
        socket = io.connect(script.rootUrl);

    var imported = {};

    /**
     * Watch for all available stylesheets.
     */
    function watchAllStylesheets() {
      var href;
      for (href in stylesheets) {
        if (hop.call(stylesheets, href)) {
          socket.emit("watch", {
            href: href
          });
        }
      }
    }

    /**
     * Reload a stylesheet.
     *
     * @param {String} href The URL of the stylesheet to be reloaded.
     */
    function reloadStylesheet(href) {
      var newHref = href +
            (href.indexOf("?") >= 0 ? "&" : "?") +
            "_vogue_nocache=" + (new Date).getTime(),
          stylesheet;
      
      // Check if the appropriate DOM Node is there.
      if (!stylesheets[href].setAttribute) {
        // If the stylesheet is from an @import, remove it
        // as a "rule" and add it as a normal stylesheet
        if (imported[href]) {
          var styleSheet = imported[href].styleSheet;
          var index = imported[href].index;
          // deleteRule is standard way of removing rules, removeRule is for IE
          if (styleSheet.deleteRule)
            styleSheet.deleteRule(index);
          else if (styleSheet.removeRule)
            styleSheet.removeRule(index);
          delete imported[href];
        }
        
        // Create the link.
        stylesheet = document.createElement("link");
        stylesheet.setAttribute("rel", "stylesheet");
        stylesheet.setAttribute("href", newHref);
        head.appendChild(stylesheet);

        // Update the reference to the newly created link.
        stylesheets[href] = stylesheet;
      } else {
        // Update the href to the new URL.
        stylesheets[href].href = newHref;
      }
    }


    /**
     * Handle messages from socket.io, and load the appropriate stylesheet.
     *
     * @param message Socket.io message object.
     * @param message.href The url of the stylesheet to be loaded.
     */
    function handleMessage(message) {
      reloadStylesheet(message.href);
    }

    /**
     * Fetch all the local stylesheets from the page.
     *
     * @returns {Object} The list of local stylesheets keyed by their base URL.
     */
    function getLocalStylesheets() {

      /**
       * Checks if the stylesheet is local.
       *
       * @param {Object} link The link to check for.
       * @returns {Boolean}
       */
      function isLocalStylesheet(link) {
        var href, i, isExternal = true;
        if (link.getAttribute("rel") !== "stylesheet") {
          return false;
        }
        href = link.href;

        for (i = 0; i < script.bases.length; i += 1) {
          if (href.indexOf(script.bases[i]) > -1) {
            isExternal = false;
            break;
          }
        }

        return !(isExternal && href.match(/^https?:/));
      }

      /**
       * Checks if the stylesheet's media attribute is 'print'
       *
       * @param (Object) link The stylesheet element to check.
       * @returns (Boolean)
       */
      function isPrintStylesheet(link) {
        return link.getAttribute("media") === "print";
      }

      /**
       * Get the link's base URL.
       *
       * @param {String} href The URL to check.
       * @returns {String|Boolean} The base URL, or false if no matches found.
       */
      function getBase(href) {
        var base, j;
        for (j = 0; j < script.bases.length; j += 1) {
          base = script.bases[j];
          if (href.indexOf(base) > -1) {
            return href.substr(base.length);
          }
        }
        return false;
      }

      function getProperty(property) {
        return this[property];
      }

      var stylesheets = {},
          links = document.getElementsByTagName("link"),
          link, href, matches, content, i, m;

      // Go through all the links in the page, looking for stylesheets.
      for (i = 0, m = links.length; i < m; i += 1) {
        link = links[i];
        if (isPrintStylesheet(link)) continue;
        if (!isLocalStylesheet(link)) continue;
        // Link is local, get the base URL.
        href = getBase(link.href);
        if (href !== false) {
          stylesheets[href] = link;
        }
      }

      // Go through stylesheet rules looking for @import
      var allStyleSheets = document.styleSheets;
      function recursivelyAddImportedStylesheets(styleSheet) {
        var rules;
        // The try {} will catch security errors when trying to get cssRules
        // from cross domain stylesheets
        try {
          rules = styleSheet.rules || styleSheet.cssRules;
        } catch (e) {}
        if ( ! rules ) return;
        for ( var i = 0, rule; rule = rules[i]; i++ ) {
          if ( rule.href ) {
            var h = rule.href;
            stylesheets[h] = {rel: "stylesheet", href: h};
            imported[h] = {styleSheet: styleSheet, index: i};
            recursivelyAddImportedStylesheets(rule.styleSheet);
          }
        }
      }
      for ( var i = 0, sheet; sheet = allStyleSheets[i]; i++)
        recursivelyAddImportedStylesheets(sheet);
      
      return stylesheets;
    }

    stylesheets = getLocalStylesheets();
    socket.on("connect", watchAllStylesheets);
    socket.on("update", handleMessage);
  }

  /**
   * Load a script into the page, and call a callback when it is loaded.
   *
   * @param {String} src The URL of the script to be loaded.
   * @param {Function} loadedCallback The function to be called when the script is loaded.
   */
  function loadScript(src, loadedCallback) {
    var script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", src);

    // Call the callback when the script is loaded.
    script.onload = loadedCallback;
    script.onreadystatechange = function () {
      if (this.readyState === "complete" || this.readyState === "loaded") {
        loadedCallback();
      }
    };

    head.appendChild(script);
  }

  /**
   * Load scripts into the page, and call a callback when they are loaded.
   *
   * @param {Array} scripts The scripts to be loaded.
   * @param {Function} loadedCallback The function to be called when all the scripts have loaded.
   */
  function loadScripts(scripts, loadedCallback) {
    var srcs = [], property, count, i, src,
        countDown = function () {
          count -= 1;
          if (!count) {
            loadedCallback();
          }
        };

    for (property in scripts) {
      if (!(property in window)) {
        srcs.push(scripts[property]);
      }
    }

    count = srcs.length;
    if (!count) {
      loadedCallback();
    }

    for (i = 0; i < srcs.length; i += 1) {
      src = srcs[i];
      loadScript(src, countDown);
    }
  }

  /**
   * Fetches the info for the vogue client.
   */
  function getScriptInfo() {
    var bases = [ document.location.protocol + "//" + document.location.host ],
        scripts, src, rootUrl, baseMatch;
    if (typeof window.__vogue__ === "undefined") {
      scripts = document.getElementsByTagName("script");
      for (var i=0; i < scripts.length; i++) {
        src = scripts[i].getAttribute("src");
        if (src && src.slice(-15) === 'vogue-client.js') break;
      }
      rootUrl = src.match(/^https?\:\/\/(.*?)\//)[0];
      // There is an optional base argument, that can be used.
      baseMatch = src.match(/\bbase=(.*)(&|$)/);

      if (baseMatch) {
        bases = bases.concat(baseMatch[1].split(","));
      }
      return {
        rootUrl: rootUrl,
        bases: bases
      };
    } else {
      window.__vogue__.bases = bases;
      return window.__vogue__;
    }
  }

  /**
   * Fetches the port from the URL.
   *
   * @param {String} url URL to get the port from
   * @returns {Number} The port number, or 80 if no port number found or is invalid.
   */
  function getPort(url) {
    // URL may contain the port number after the second colon.
    // http://domain:1234/
    var index = url.indexOf(":", 6); // skipping 6 characters to ignore first colon
    return index < 0 ? 80 : parseInt(url.substr(index + 1), 10);
  }

  script = getScriptInfo();
  loadScripts({
    io: script.rootUrl + "socket.io/socket.io.js"
  }, vogue);
}());
