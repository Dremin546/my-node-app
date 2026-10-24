const http = require('http');
const querystring = require('querystring');

const PORT = 3000;
const MAX_SIZE = 1024 * 1024;

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  let body = '';
  let isTooLarge = false;

  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX_SIZE) {
      isTooLarge = true;
      res.statusCode = 413;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('413 Payload Too Large');
      req.destroy();
    }
  });

  req.on('end', () => {
    if (isTooLarge) return;

    const contentType = req.headers['content-type'] || '';
    console.log(`[POST ${req.url}] Размер тела: ${Buffer.byteLength(body)} байт, Content-Type: ${contentType}`);

    if (req.url === '/echo') {
      if (contentType.includes('application/json')) {
        try {
          const parsed = JSON.parse(body || '{}');
          parsed.group = 'ББМО-01-23';
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(parsed, null, 2));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Некорректный JSON' }));
        }
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(body);
      }
      return;
    }

    if (req.url === '/form') {
      const parsedForm = querystring.parse(body);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(parsedForm, null, 2));
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });
});

server.listen(PORT, () => {
  console.log(`Сервер чтения тела запроса запущен на порту ${PORT}`);
});
