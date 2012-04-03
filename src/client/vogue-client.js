// Vogue - Client
// Original Copyright (c) 2011 Andrew Davey (andrew@equin.co.uk)
// Adapted and rewritten by Quizlet (github.com/quizet.com/vogue)
(function() {

	var script,
		hop = Object.prototype.hasOwnProperty,
		head = document.getElementsByTagName("head")[0],
		broken_sheet_popups = {};

	function vogue() {
		var stylesheets,
		socket = io.connect(script.rootUrl),
		finishedLoadingCount,
		sheetCount = 0,
		loaderTimer;
			
		// when stylesheets are being loaded, add a dot on the screen
		// to indicate vogue progress
		function animateLoader() {
			if (++finishedLoadingCount !== sheetCount)
				return;
				
			loader.style.background = '#0965d6';
			loader.style.border = '2px solid #cfe4ff';
			loaderTimer = setTimeout(function() {
				var opacity = 1;
				// old school tweening to work in all browsers
				loaderTimer = setInterval(function() {
					opacity -= .05;
					loader.style.filter = 'alpha(opacity=' + opacity*100 + ')';
					loader.style.opacity = opacity;
					if (opacity === 0) {
						resetLoader();
					}
				}, 30);
			}, 500);
		}
		
		function resetLoader() {
			// could be either a timeout or an interval, so clear both
			clearInterval(loaderTimer);
			clearTimeout(loaderTimer);
			loader.setAttribute('style', 'display: none; opacity: 1; filter: alpha(opacity=100); background: #e6df27; position: absolute; top: 60px; left: 60px; z-index: 9999; height: 20px; width: 20px; border-radius: 20px; border: 2px solid #aba623;');
		}
		
		var loader = document.createElement('div');
		loader.setAttribute('id', 'vogueLoader');
		resetLoader();
		document.getElementsByTagName('body')[0].appendChild(loader);
				
		function updateAllStylesheets() {
			
			finishedLoadingCount = 0;
			resetLoader();
			loader.style.display = 'block';
			
			for (href in stylesheets) {
				if (hop.call(stylesheets, href)) {
					// use ajax to download contents of CSS
					// and create a <style> tag with it. This prevents a flash of unstyled content
					var new_url = stylesheets[href].href + (stylesheets[href].href.indexOf('?') === -1 ? "?": "&") + "_vogue_rand=" + Math.random();
					var ajax = new XMLHttpRequest();
					ajax.base_href = href;
					
					ajax.onreadystatechange = function() {
						if (this.readyState == 4) {
							var match = this.responseText.match(/ParseError: ([^:]+):(\d+)/);
							// if we get a parse error, pop up it up and don't return the error
							if (match) {
								broken_sheet_popups[this.base_href] = window.open(this.base_href, "_blank", "height=650,width=800,toolbar=0");
								return;
							} else {
								if (broken_sheet_popups.hasOwnProperty(this.base_href)) {
									broken_sheet_popups[this.base_href].close();
									delete broken_sheet_popups[this.base_href];
								}
							}

							// http://www.phpied.com/dynamic-script-and-style-elements-in-ie/
							var sheet = document.createElement('style');

							sheet.setAttribute("type", "text/css");
							if (sheet.styleSheet) {
								// IE
								sheet.styleSheet.cssText = this.responseText;
							} else {
								// the world
								sheet.appendChild(document.createTextNode(this.responseText));
							}
							// replace the old stylesheet with the new
							stylesheets[this.base_href].parentNode.replaceChild(sheet, stylesheets[this.base_href]);

							stylesheets[this.base_href] = sheet;
							// make it look like a <link> tag
							sheet.href = this.base_href;
							
							animateLoader();
						}
					}
					ajax.open("GET", new_url, true);
					ajax.send(null);					
				}
			}
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
				var href,
					i,
					isExternal = true;
				
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

				return ! isExternal;
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
				reImport = /@import\s+url\(["']?([^"'\)]+)["']?\)/g,
				links = document.getElementsByTagName("link"),
				link,
				href,
				matches,
				content,
				i,
				m;

			// Go through all the links in the page, looking for stylesheets.
			for (i = 0, m = links.length; i < m; i += 1) {
				link = links[i];
				if (isPrintStylesheet(link)) continue;
				if (!isLocalStylesheet(link)) continue;
				// Link is local, get the base URL.
				href = getBase(link.href);
				if (href !== false) {
					stylesheets[href] = link;
					sheetCount++;
				}
			}

			// Go through all the style tags, looking for @import tags.
			links = document.getElementsByTagName("style");
			for (i = 0, m = links.length; i < m; i += 1) {
				if (isPrintStylesheet(links[i])) continue;
				content = links[i].text || links[i].textContent;
				while ((matches = reImport.exec(content))) {
					link = {
						rel: "stylesheet",
						href: matches[1],
						getAttribute: getProperty
					};
					if (isLocalStylesheet(link)) {
						// Link is local, get the base URL.
						href = getBase(link.href);
						if (href !== false) {
							stylesheets[href] = link;
							sheetCount++;
						}
					}
				}
			}
			return stylesheets;
		}

		stylesheets = getLocalStylesheets();
		socket.on("update", updateAllStylesheets);
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
		script.onreadystatechange = function() {
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
		var srcs = [],
			property,
			count,
			i,
			src,
			countDown = function() {
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
		var bases = [document.location.protocol + "//" + document.location.host],
			scripts,
			src,
			rootUrl,
			baseMatch;
		if (typeof window.__vogue__ === "undefined") {
			scripts = document.getElementsByTagName("script");
			for (var i = 0; i < scripts.length; i++) {
				src = scripts[i].getAttribute("src");
				if (src && src.slice( - 15) === 'vogue-client.js') break;
			}
			rootUrl = src.match(/^(?:https?\:)?\/\/(.*?)\//)[0];
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

	script = getScriptInfo();
	loadScripts({
		io: script.rootUrl + "socket.io/socket.io.js"
	},
	vogue);
} ());