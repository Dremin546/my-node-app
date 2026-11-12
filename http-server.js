const http = require('http');

const PORT = 3000;

function formatTime(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const date = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
  const time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
  return `${date} ${time}`;
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method === 'GET' && req.url === '/') {
    res.statusCode = 200;
    res.end(`
      <h1>Лабораторная работа №20</h1>
      <p>Группа: ББМО-01-23</p>
      <p>Метод: ${req.method}</p>
      <p>URL: ${req.url}</p>
    `);
  } else if (req.method === 'GET' && req.url === '/about') {
    res.statusCode = 200;
    res.end(`
      <h1>О студенте</h1>
      <p>Группа: ББМО-01-23</p>
      <p>Студент: Дёмин Вадим</p>
    `);
  } else {
    res.statusCode = 404;
    res.end(`
      <h1>404 Not Found</h1>
      <p>Путь ${req.url} не найден</p>
    `);
  }

  console.log(`[${formatTime()}] ${req.method} ${req.url} ${res.statusCode}`);
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
