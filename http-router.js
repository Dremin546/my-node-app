const http = require('http');
const url = require('url');

const PORT = 3000;
const GROUP_PREFIX = 'ББМО-01-23';

function formatTime(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const date = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
  const time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
  return `${date} ${time}`;
}

let students = [
  { id: 1, name: 'Вадим Дёмин', group: 'ББМО-01-23' },
  { id: 2, name: 'Мария Смирнова', group: 'ББМО-01-23' },
  { id: 3, name: 'Алексей Попов', group: 'ИВТ-02-23' }
];

let nextId = 4;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  const idMatch = pathname.match(/^\/api\/students\/(\d+)$/);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  let statusCode = 200;

  try {
    if (pathname === '/api/students') {
      if (method === 'GET') {
        const groupQuery = parsedUrl.query.group;
        let result = students;
        if (groupQuery) {
          result = students.filter(s => s.group === groupQuery);
        }
        res.statusCode = 200;
        res.end(JSON.stringify(result, null, 2));
      } else if (method === 'POST') {
        const data = await readJsonBody(req);
        const newStudent = {
          id: nextId++,
          name: data.name || 'Студент',
          group: data.group || GROUP_PREFIX
        };
        students.push(newStudent);
        res.statusCode = 201;
        statusCode = 201;
        res.end(JSON.stringify(newStudent, null, 2));
      } else {
        res.statusCode = 405;
        statusCode = 405;
        res.end(JSON.stringify({ error: '405 Method Not Allowed' }));
      }
    } else if (idMatch) {
      const id = parseInt(idMatch[1], 10);
      const studentIndex = students.findIndex(s => s.id === id);

      if (method === 'PATCH') {
        res.statusCode = 405;
        statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('405 Method Not Allowed');
      } else if (studentIndex === -1) {
        res.statusCode = 404;
        statusCode = 404;
        res.end(JSON.stringify({ error: 'Студент не найден' }));
      } else if (method === 'GET') {
        res.statusCode = 200;
        res.end(JSON.stringify(students[studentIndex], null, 2));
      } else if (method === 'PUT') {
        const data = await readJsonBody(req);
        if (data.name) students[studentIndex].name = data.name;
        if (data.group) students[studentIndex].group = data.group;
        res.statusCode = 200;
        res.end(JSON.stringify(students[studentIndex], null, 2));
      } else if (method === 'DELETE') {
        students.splice(studentIndex, 1);
        res.statusCode = 200;
        res.end(JSON.stringify({ deleted: true, id }));
      } else {
        res.statusCode = 405;
        statusCode = 405;
        res.end(JSON.stringify({ error: '405 Method Not Allowed' }));
      }
    } else {
      res.statusCode = 404;
      statusCode = 404;
      res.end(JSON.stringify({ error: '404 Not Found' }));
    }
  } catch (err) {
    res.statusCode = 500;
    statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }

  console.log(`[${formatTime()}] [${GROUP_PREFIX}] ${method} ${req.url} ${statusCode}`);
});

server.listen(PORT, () => {
  console.log(`REST API сервер на чистом http запущен на порту ${PORT}`);
});
