const express = require('express');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 3000;
const SECRET = 'mysecretkey';

app.use(express.json());

let users = [
  { id: 1, email: 'admin@mail.ru', password: '123', role: 'admin' },
  { id: 2, email: 'user@mail.ru', password: '123', role: 'user' }
];

let books = [];
for (let i = 1; i <= 100; i++) {
  books.push({
    id: i,
    title: `Книга ${i} (ББМО-01-23)`,
    author: `Автор ${((i - 1) % 10) + 1}`,
    year: 1950 + (i % 70),
    genre: i % 2 === 0 ? 'роман' : 'повесть',
    isbn: `ISBN-ББМО-${1000 + i}`,
    available: i % 5 !== 0,
    reviews: []
  });
}

let cache = {};

const swaggerDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Библиотека API',
    version: '1.0'
  },
  paths: {
    '/auth/login': {
      post: { summary: 'Вход' }
    },
    '/auth/register': {
      post: { summary: 'Регистрация' }
    },
    '/api/books': {
      get: { summary: 'Список книг' },
      post: { summary: 'Добавить книгу' }
    },
    '/api/books/{id}': {
      get: { summary: 'Книга по ID' },
      delete: { summary: 'Удалить книгу' }
    }
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

function auth(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нужен токен' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Неверный токен' });
    req.user = user;
    next();
  });
}

function checkAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Только для админа' });
  }
  next();
}

app.post('/auth/register', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Заполните email и пароль' });
  }
  const user = { id: users.length + 1, email, password, role: role || 'user' };
  users.push(user);
  res.status(201).json({ message: 'Зарегистрирован', id: user.id });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Неверные данные' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.get('/api/books', auth, (req, res) => {
  const cacheKey = req.url;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].time < 300000) {
    return res.json(cache[cacheKey].data);
  }

  let result = [...books];
  const { page = 1, limit = 10, search, sort } = req.query;

  if (search) {
    result = result.filter(b => b.title.includes(search) || b.author.includes(search));
  }

  if (sort === 'year') {
    result.sort((a, b) => a.year - b.year);
  } else if (sort === '-year') {
    result.sort((a, b) => b.year - a.year);
  }

  const p = Number(page);
  const l = Number(limit);
  const data = result.slice((p - 1) * l, p * l);

  const response = { total: result.length, page: p, limit: l, data };
  cache[cacheKey] = { data: response, time: Date.now() };

  res.json(response);
});

app.get('/api/books/available', auth, (req, res) => {
  const available = books.filter(b => b.available);
  res.json(available);
});

app.get('/api/books/export', auth, (req, res) => {
  if (req.query.format === 'csv') {
    let csv = 'id,title,author,year\n';
    books.forEach(b => {
      csv += `${b.id},${b.title},${b.author},${b.year}\n`;
    });
    res.header('Content-Type', 'text/csv');
    return res.send(csv);
  }
  res.json(books);
});

app.get('/api/books/:id', auth, (req, res) => {
  const book = books.find(b => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });
  res.json(book);
});

app.post('/api/books', auth, checkAdmin, (req, res) => {
  const { title, author, year, genre } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'Название и автор обязательны' });
  }
  const newBook = {
    id: books.length + 1,
    title,
    author,
    year: Number(year) || 2024,
    genre: genre || 'роман',
    isbn: `ISBN-${books.length + 1}`,
    available: true,
    reviews: []
  };
  books.push(newBook);
  cache = {};
  res.status(201).json(newBook);
});

app.put('/api/books/:id', auth, (req, res) => {
  const book = books.find(b => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });

  if (req.body.title) book.title = req.body.title;
  if (req.body.author) book.author = req.body.author;
  if (req.body.year) book.year = Number(req.body.year);

  cache = {};
  res.json(book);
});

app.delete('/api/books/:id', auth, checkAdmin, (req, res) => {
  const index = books.findIndex(b => b.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Книга не найдена' });

  const deleted = books.splice(index, 1);
  cache = {};
  res.json({ message: 'Удалено', book: deleted[0] });
});

app.post('/api/books/:id/reviews', auth, (req, res) => {
  const book = books.find(b => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });

  const { comment, rating } = req.body;
  if (!comment) return res.status(400).json({ error: 'Напишите отзыв' });

  const review = { id: book.reviews.length + 1, comment, rating: Number(rating) || 5 };
  book.reviews.push(review);
  res.status(201).json(review);
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
