const http = require('http');

const PORT = 3000;
const GROUP_HEADER = Buffer.from('ББМО-01-23').toString('latin1');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/headers') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      headers: req.headers,
      method: req.method,
      url: req.url,
      httpVersion: req.httpVersion
    }, null, 2));
    return;
  }

  if (req.method === 'GET' && req.url === '/headers/set') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Powered-By', 'Node.js');
    res.setHeader('X-Group', GROUP_HEADER);
    res.setHeader('Cache-Control', 'no-cache');
    res.end('<h1>Кастомные заголовки установлены</h1>');
    return;
  }

  if (req.method === 'GET' && req.url === '/headers/check') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Group', GROUP_HEADER);
    res.setHeader('X-Temporary', 'test-value');
    res.removeHeader('X-Temporary');

    const result = {
      hasContentType: res.hasHeader('Content-Type'),
      hasXGroup: res.hasHeader('X-Group'),
      hasUnknown: res.hasHeader('X-Temporary')
    };

    res.statusCode = 200;
    res.end(JSON.stringify(result, null, 2));
    return;
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Сервер заголовков запущен на порту ${PORT}`);
});
