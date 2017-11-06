var http = require('http');
var fs = require('fs');

http.createServer(function (request, response) {
    console.log("request: " + request.url);
    switch(request.url) {
        case "/":
            fs.readFile("./ajax_demo.html", function(error, content) {
                if(!error) {
                    response.writeHead(200, { 'Content-Type': 'text/html' });
                    response.end(content, 'utf-8');
                } else {
                    console.log(error);
                }
            });
            break;
        case "/call1":
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end("reply for Call1");
            break;
        case "/call2":
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end("reply for Call2");
            break;
        default:
            response.writeHead(404, { 'Content-Type': 'text/html' });
            response.write('<!DOCTYPE html>\n' +
                '<html>\n' +
                '  <head>\n' +
                '    <meta charset=\'utf-8\'>\n' +
                '  </head>\n' +
                '  <body>\n'
                );
            response.write("404, NOT FOUND: " + request.url);
            response.end(
                '  </body>\n' + 
                '</html>\n');
    }
}).listen(3000);

console.log('Server running at http://localhost:3000/');

