# Vogue

Vogue creates a real-time link between your web browser and your file system. When you save
a CSS file, used by the HTML page in your browser, Vogue will make the browser reload the
stylesheet. Only the stylesheet is reloaded, not the entire page, making it work
even for very dynamic/ajax pages.

Vogue is all javascript. It runs a server on [Node.js](http://nodejs.org/),
which will watch the file system.
The server accepts WebSocket connections from the client code
(which uses [socket.io](http://socket.io/)).
The client javascript can be loaded into a HTML page using a single script tag.

## Usage
Run the Vogue server.

    vogue --port 8001 /path/to/website

`--port` : The port used for Vogue's HTTP server. Optional, defaults to 8001.

 Multiple directories can be watched by using separating the paths with colons. e.g. `/path/to/website:/other/path`

## Demo
Vogue runs a separate HTTP server to the one running your website.
To run the demo website, for example, do something like this first:

    cd demo
    python -m SimpleHTTPServer

Then, from another terminal session, run Vogue:

    vogue demo

Open http://localhost:8000 (or whatever the port used by your web server is)
to view the demo index page. The demo page has the Vogue client javascript already included.
So it will connect to the Vogue server and be watching the two CSS files used by the page.

Try editing the CSS files in the `demo/styles` directory. Whenever you save, you will see the
browser update the reflect the changes made. This is done without reloading the entire page.

Copyright &copy; 2011 Andrew Davey (andrew@equin.co.uk)
