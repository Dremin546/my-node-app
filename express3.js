const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

function formatTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const date = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
  const time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
  return `${date} ${time}`;
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${formatTimestamp()}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов, повторите попытку позже', status: 429 }
});
app.use(limiter);

app.use(express.json());

let books = [
  { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 },
  { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 },
  { id: 3, title: 'Мастер и Маргарита', author: 'Булгаков', year: 1967 }
];

app.get('/api/books', (req, res) => {
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find(b => b.id === id);
  if (!book) {
    const err = new Error('Книга не найдена');
    err.status = 404;
    throw err;
  }
  res.json(book);
});

app.get('/error', (req, res) => {
  throw new Error('Тестовая синхронная ошибка');
});

app.get('/async-error', async (req, res, next) => {
  setTimeout(() => {
    const err = new Error('Тестовая асинхронная ошибка');
    err.status = 500;
    next(err);
  }, 10);
});

app.use((req, res, next) => {
  const err = new Error('Маршрут не найден');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Внутренняя ошибка сервера';
  res.status(status).json({
    error: message,
    status: status
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
