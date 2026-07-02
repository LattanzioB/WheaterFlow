const http = require('http');

const port = Number(process.env.OWM_STUB_PORT || 4010);

const payload = {
  id: 3435910,
  main: {
    temp: 18.42,
    humidity: 63,
    pressure: 1017,
  },
  dt: Math.floor(Date.now() / 1000),
};

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/data/2.5/weather')) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(payload));
    return;
  }

  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ message: 'Not found' }));
});

server.listen(port, () => {
  console.log(
    `OpenWeather load-test stub listening on http://localhost:${port}`,
  );
});
