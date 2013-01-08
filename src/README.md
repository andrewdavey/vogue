# Vogue

Vogue creates a real-time link between your web browser and your file system. When you save 
a CSS file, used by the HTML page in your browser, Vogue will make the browser reload the 
stylesheet. Only the stylesheet is reloaded, not the entire page, making it work
even for very dynamic/ajax pages.

## Usage
Run the Vogue server.

    vogue --port 8001 /path/to/website

`--port` : The port used for Vogue's HTTP server. Optional, defaults to 8001.

`--rewrite` : A rule in the form of "regexp:replacement" (e.g. `v[0-9]/(.*)$:files/\$1` ) to rewrite urls to filesystem paths.
 Submatches such as $1 will probably need to entered in your shell as \$1 to escape the $. 

Open http://localhost:8001/ to see instructions for loading the Vogue client into your
web pages.


