var http = require('http');
var serveStatic = require('serve-static');

var serve = serveStatic('client-build', {'index': ['index.html', 'index.htm']})

http.createServer(function (req, res) {
    console.log("request: " + req.url);
    switch(req.url) {
        case "/call1":
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end("reply for /call1");
            break;
        case "/call2":
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end("reply for /call2");
            break;
        default:
            serve(req, res, function(err) {
                // better use https://www.npmjs.com/package/finalhandler
                // in production instead
                if(!err) {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.write('<!DOCTYPE html>\n' +
                        '<html>\n' +
                        '  <head>\n' +
                        '    <meta charset=\'utf-8\'>\n' +
                        '  </head>\n' +
                        '  <body>\n'
                        );
                    res.write("404, NOT FOUND: " + req.url);
                    res.end(
                        '  </body>\n' + 
                        '</html>\n');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(err);
                    console.log(err);
                }
            });
    }
}).listen(3000);

console.log('Server running at http://localhost:3000/');

