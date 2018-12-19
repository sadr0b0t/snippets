var http = require('http');
var fs = require('fs');

// request, response
http.createServer(function (req, res) {
    console.log("request: " + req.url);
    switch(req.url) {
        case "/":
            fs.readFile("./ajax_demo.html", function(err, content) {
                if(!err) {
                    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                    res.end(content, 'utf-8');
                } else {
                    res.writeHead(500, {'Content-Type': 'text/html; charset=utf-8'});
                    res.end(err.message, 'utf-8');
                    console.log(err);
                }
            });
            break;
        case "/call1":
            res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
            res.end("reply for /call1");
            break;
        case "/call2":
            res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
            res.end("reply for /call2");
            break;
        default:
            res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
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
    }
}).listen(3000);

console.log('Server running at http://localhost:3000/');

