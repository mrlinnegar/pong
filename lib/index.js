import World from './World';
import http from 'http';

http.createServer((req, res) => {
  const world = new World();
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(world.name);
}).listen(1337, '127.0.0.1');

console.log('Server running');