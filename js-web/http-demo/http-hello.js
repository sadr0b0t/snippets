var http = require('http');
 
http.createServer(function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'});
  var a=3;
  var b=5;
  response.write('' + a + ' + ' + b + ' = ' + (a+b) + '\n');
  
  response.end('работает\n');
}).listen(3000);

console.log('Server running at http://localhost:3000/');

