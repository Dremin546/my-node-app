const express = require('express');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'bbmo-01-23-secret-key';

app.use(express.json());

const users = [
  { id: 1, email: 'admin@example.com', password: 'password123', name: 'Администратор', role: 'admin' },
  { id: 2, email: 'student@example.com', password: 'password123', name: 'Вадим Дёмин', role: 'user' }
];

let nextUserId = 3;

function generateBooks() {
  const titles = [
    'Слуга двух господ', 'Герой нашего времени', 'Мертвые души', 'Капитанская дочка',
    'Отцы и дети', 'Обломов', 'Гроза', 'Вишневый сад', 'Чайка', 'Палата №6',
    'Преступление и наказание', 'Идиот', 'Братья Карамазовы', 'Бесы', 'Игрок',
    'Война и мир', 'Анна Каренина', 'Воскресение', 'Смерть Ивана Ильича', 'Крейцерова соната',
    'Мастер и Маргарита', 'Белая гвардия', 'Собачье сердце', 'Роковые яйца', 'Театральный роман'
  ];

  const authors = [
    'Лев Толстой', 'Федор Достоевский', 'Антон Чехов', 'Николай Гоголь',
    'Александр Пушкин', 'Михаил Булгаков', 'Иван Тургенев', 'Иван Гончаров'
  ];

  const genres = ['роман', 'повесть', 'драма', 'классика', 'комедия'];

  const generated = [];
  for (let i = 1; i <= 100; i++) {
    const titleBase = titles[(i - 1) % titles.length];
    const author = authors[(i - 1) % authors.length];
    const genre = genres[(i - 1) % genres.length];
    const year = 1820 + (i * 2) % 190;
    const copies = (i % 5) + 1;
    const available = (i % 4) !== 0;

    generated.push({
      id: i,
      title: `${titleBase} (ББМО-01-23 №${i})`,
      author,
      year,
      genre,
      isbn: `978-5-00123-${String(i).padStart(3, '0')}-${i % 9}`,
      available,
      copies,
      reviews: [
        {
          id: 1,
          userName: 'Читатель',
          rating: 4 + (i % 2),
          comment: 'Отличное произведение из фонда библиотеки'
        }
      ]
    });
  }
  return generated;
}

let books = generateBooks();
let nextBookId = 101;

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getFromCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setToCache(key, data) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  });
}

function clearCache() {
  cache.clear();
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется токен авторизации (Bearer <token>)' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный или истекший токен' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ разрешен только администраторам' });
  }
  next();
}

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Library REST API - ББМО-01-23',
    version: '1.0.0',
    description: 'Полнофункциональное REST API библиотеки с JWT аутентификацией и кэшированием'
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Регистрация пользователя',
        responses: { '201': { description: 'Успешная регистрация' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Авторизация пользователя и получение JWT',
        responses: { '200': { description: 'Успешный вход' } }
      }
    },
    '/api/books': {
      get: {
        summary: 'Получить список книг с фильтрацией, пагинацией и сортировкой',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Список книг' } }
      },
      post: {
        summary: 'Создание новой книги (только админ)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Книга создана' } }
      }
    },
    '/api/books/available': {
      get: {
        summary: 'Список доступных для выдачи книг',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Доступные книги' } }
      }
    },
    '/api/books/recommendations': {
      get: {
        summary: 'Рекомендации книг по жанру',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Рекомендации' } }
      }
    },
    '/api/books/export': {
      get: {
        summary: 'Экспорт книг в формате JSON или CSV',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Файл или данные' } }
      }
    },
    '/api/books/import': {
      post: {
        summary: 'Импорт книг в формате JSON или CSV (только админ)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Результат импорта' } }
      }
    },
    '/api/books/{id}': {
      get: {
        summary: 'Получить книгу с отзывами по ID',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Книга найдена' }, '404': { description: 'Не найдена' } }
      },
      put: {
        summary: 'Обновить книгу по ID',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Книга обновлена' } }
      },
      delete: {
        summary: 'Удалить книгу по ID (только админ)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Книга удалена' } }
      }
    },
    '/api/books/{id}/reviews': {
      post: {
        summary: 'Добавить отзыв к книге',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Отзыв добавлен' } }
      }
    },
    '/api/admin/stats': {
      get: {
        summary: 'Панель администратора',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Статистика' } }
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post('/auth/register', (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Корректный email обязателен' });
  }

  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
  }

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Имя обязательно' });
  }

  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  const newUser = {
    id: nextUserId++,
    email: email.trim().toLowerCase(),
    password,
    name: name.trim(),
    role: role === 'admin' ? 'admin' : 'user'
  };

  users.push(newUser);
  res.status(201).json({ message: 'Пользователь успешно зарегистрирован', userId: newUser.id });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ token, role: user.role, name: user.name });
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    totalUsers: users.length,
    totalBooks: books.length,
    activeCacheKeys: cache.size,
    currentUser: req.user
  });
});

app.get('/api/books/export', authenticateToken, (req, res) => {
  const format = (req.query.format || 'json').toLowerCase();

  if (format === 'csv') {
    const headers = 'id,title,author,year,genre,isbn,available,copies\n';
    const rows = books.map(b =>
      `"${b.id}","${b.title.replace(/"/g, '""')}","${b.author}","${b.year}","${b.genre}","${b.isbn}","${b.available}","${b.copies}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="books.csv"');
    return res.send(headers + rows);
  }

  res.json(books);
});

app.post('/api/books/import', authenticateToken, requireAdmin, (req, res) => {
  const { books: imported, csv } = req.body;

  if (Array.isArray(imported)) {
    for (const item of imported) {
      if (item.title && item.author) {
        books.push({
          id: nextBookId++,
          title: item.title,
          author: item.author,
          year: Number(item.year) || 2024,
          genre: item.genre || 'прочее',
          isbn: item.isbn || `978-5-00123-${nextBookId}-0`,
          available: item.available !== false,
          copies: item.copies || 1,
          reviews: []
        });
      }
    }
    clearCache();
    return res.json({ message: `Успешно импортировано ${imported.length} книг` });
  }

  if (csv && typeof csv === 'string') {
    const lines = csv.trim().split('\n').filter(Boolean);
    let count = 0;
    const startIndex = lines[0].toLowerCase().includes('title') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        books.push({
          id: nextBookId++,
          title: parts[0],
          author: parts[1],
          year: Number(parts[2]) || 2024,
          genre: parts[3] || 'прочее',
          isbn: parts[4] || `978-5-00123-${nextBookId}-0`,
          available: true,
          copies: 1,
          reviews: []
        });
        count++;
      }
    }
    clearCache();
    return res.json({ message: `Успешно импортировано ${count} книг из CSV` });
  }

  res.status(400).json({ error: 'Передайте массив books или строку csv' });
});

app.get('/api/books/available', authenticateToken, (req, res) => {
  const availableBooks = books.filter(b => b.available && b.copies > 0);
  res.json({ count: availableBooks.length, books: availableBooks });
});

app.get('/api/books/recommendations', authenticateToken, (req, res) => {
  const genre = req.query.genre;
  let recs;

  if (genre) {
    recs = books.filter(b => b.genre.toLowerCase() === genre.toLowerCase()).slice(0, 5);
  } else {
    recs = books.filter(b => b.reviews.some(r => r.rating >= 5)).slice(0, 5);
    if (recs.length === 0) recs = books.slice(0, 5);
  }

  res.json(recs);
});

app.get('/api/books', authenticateToken, (req, res) => {
  const cacheKey = req.originalUrl || req.url;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  let result = [...books];
  const { author, year, yearFrom, yearTo, search, sort, page, limit } = req.query;

  if (author) {
    result = result.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
  }
  if (year) {
    result = result.filter(b => b.year === Number(year));
  }
  if (yearFrom) {
    result = result.filter(b => b.year >= Number(yearFrom));
  }
  if (yearTo) {
    result = result.filter(b => b.year <= Number(yearTo));
  }
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(b =>
      b.title.toLowerCase().includes(s) ||
      b.author.toLowerCase().includes(s) ||
      b.isbn.toLowerCase().includes(s)
    );
  }

  if (sort) {
    const isDesc = sort.startsWith('-');
    const field = isDesc ? sort.substring(1) : sort;
    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];
      if (typeof valA === 'string') {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return isDesc ? valB - valA : valA - valB;
    });
  }

  let responseData;
  if (limit) {
    const lim = Math.max(1, parseInt(limit, 10));
    const p = Math.max(1, parseInt(page || 1, 10));
    const startIndex = (p - 1) * lim;
    responseData = {
      total: result.length,
      page: p,
      limit: lim,
      totalPages: Math.ceil(result.length / lim),
      data: result.slice(startIndex, startIndex + lim)
    };
  } else {
    responseData = result;
  }

  setToCache(cacheKey, responseData);
  res.json(responseData);
});

app.get('/api/books/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  res.json(book);
});

app.post('/api/books', authenticateToken, requireAdmin, (req, res) => {
  const { title, author, year, genre, isbn, copies } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Название книги обязательно' });
  }
  if (!author || typeof author !== 'string' || !author.trim()) {
    return res.status(400).json({ error: 'Автор книги обязателен' });
  }

  const numYear = Number(year);
  if (year === undefined || isNaN(numYear) || numYear < 1000 || numYear > new Date().getFullYear() + 1) {
    return res.status(400).json({ error: 'Корректный год издания обязателен' });
  }

  const newBook = {
    id: nextBookId++,
    title: title.trim(),
    author: author.trim(),
    year: numYear,
    genre: genre ? String(genre).trim() : 'не указан',
    isbn: isbn ? String(isbn).trim() : `978-5-00123-${nextBookId}-0`,
    available: true,
    copies: copies ? Math.max(1, Number(copies)) : 1,
    reviews: []
  };

  books.push(newBook);
  clearCache();
  res.status(201).json(newBook);
});

app.put('/api/books/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  const { title, author, year, genre, available, copies } = req.body;
  if (title !== undefined) books[bookIndex].title = String(title).trim();
  if (author !== undefined) books[bookIndex].author = String(author).trim();
  if (year !== undefined) books[bookIndex].year = Number(year);
  if (genre !== undefined) books[bookIndex].genre = String(genre).trim();
  if (available !== undefined) books[bookIndex].available = Boolean(available);
  if (copies !== undefined) books[bookIndex].copies = Number(copies);

  clearCache();
  res.json(books[bookIndex]);
});

app.delete('/api/books/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  const deleted = books.splice(bookIndex, 1)[0];
  clearCache();
  res.json({ message: 'Книга успешно удалена', id, book: deleted });
});

app.post('/api/books/:id/reviews', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  const { comment, rating } = req.body;
  const numRating = Number(rating);

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Текст отзыва обязателен' });
  }

  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Рейтинг должен быть числом от 1 до 5' });
  }

  const newReview = {
    id: book.reviews.length + 1,
    userName: req.user.name,
    userId: req.user.id,
    rating: numRating,
    comment: comment.trim(),
    createdAt: new Date().toISOString()
  };

  book.reviews.push(newReview);
  clearCache();
  res.status(201).json(newReview);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Swagger документация доступна на http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
