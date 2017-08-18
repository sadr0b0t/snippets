var http = require('http');
 
http.createServer(function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write('<!DOCTYPE html>\n' +
'<html>\n' +
'  <head>\n' +
'    <meta charset=\'utf-8\'>\n' +
'  </head>\n' +
'  <body>\n'
);
  var a=3;
  var b=5;
  response.write('' + a + ' + ' + b + ' = ' + (a+b) + '\n');
  
  response.end(
'  </body>\n' + 
'</html>\n');
}).listen(3000);

console.log('Server running at http://localhost:3000/');

