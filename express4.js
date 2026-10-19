const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const LOG_FILE = path.join(__dirname, 'operations.log');

app.use(express.json());

function logOperation(action, details) {
  const line = `[${new Date().toISOString()}] [${action}] ${details}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

let books = [
  { id: 1, title: 'Война и мир', author: 'Лев Толстой', year: 1869, genre: 'роман' },
  { id: 2, title: 'Преступление и наказание', author: 'Федор Достоевский', year: 1866, genre: 'роман' },
  { id: 3, title: 'Мастер и Маргарита', author: 'Михаил Булгаков', year: 1967, genre: 'роман' },
  { id: 4, title: 'Анна Каренина', author: 'Лев Толстой', year: 1877, genre: 'роман' },
  { id: 5, title: 'Идиот', author: 'Федор Достоевский', year: 1869, genre: 'роман' },
  { id: 6, title: 'Евгений Онегин', author: 'Александр Пушкин', year: 1833, genre: 'поэма' },
  { id: 7, title: 'Капитанская дочка', author: 'Александр Пушкин', year: 1836, genre: 'повесть' },
  { id: 8, title: 'Мертвые души', author: 'Николай Гоголь', year: 1842, genre: 'поэма' },
  { id: 9, title: 'Ревизор', author: 'Николай Гоголь', year: 1836, genre: 'комедия' },
  { id: 10, title: 'Отцы и дети', author: 'Иван Тургенев', year: 1862, genre: 'роман' },
  { id: 11, title: 'Герой нашего времени', author: 'Михаил Лермонтов', year: 1840, genre: 'роман' },
  { id: 12, title: 'Собачье сердце', author: 'Михаил Булгаков', year: 1925, genre: 'повесть' }
];

let nextId = 13;

app.get('/api/books/stats', (req, res) => {
  if (books.length === 0) {
    return res.json({
      totalBooks: 0,
      byAuthor: {},
      oldestYear: null,
      newestYear: null,
      byGenre: {}
    });
  }

  const byAuthor = {};
  const byGenre = {};
  let oldestYear = books[0].year;
  let newestYear = books[0].year;

  for (const book of books) {
    byAuthor[book.author] = (byAuthor[book.author] || 0) + 1;
    if (book.genre) {
      byGenre[book.genre] = (byGenre[book.genre] || 0) + 1;
    }
    if (book.year < oldestYear) oldestYear = book.year;
    if (book.year > newestYear) newestYear = book.year;
  }

  const stats = {
    totalBooks: books.length,
    byAuthor,
    oldestYear,
    newestYear,
    byGenre
  };

  logOperation('GET_STATS', `Запрошена статистика по ${books.length} книгам`);
  res.json(stats);
});

app.get('/api/books', (req, res) => {
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
      b.author.toLowerCase().includes(s)
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

  const total = result.length;

  if (limit) {
    const lim = Math.max(1, parseInt(limit, 10));
    const p = Math.max(1, parseInt(page || 1, 10));
    const startIndex = (p - 1) * lim;
    const paginatedItems = result.slice(startIndex, startIndex + lim);

    logOperation('GET_BOOKS', `Найдено ${total}, отдано ${paginatedItems.length} (стр. ${p})`);
    return res.json({
      total,
      page: p,
      limit: lim,
      totalPages: Math.ceil(total / lim),
      data: paginatedItems
    });
  }

  logOperation('GET_BOOKS', `Отдано ${result.length} книг`);
  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  logOperation('GET_BOOK_BY_ID', `Книга id=${id}`);
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, year, genre } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Название книги не должно быть пустым' });
  }

  if (!author || typeof author !== 'string' || !author.trim()) {
    return res.status(400).json({ error: 'Автор книги не должен быть пустым' });
  }

  const numYear = Number(year);
  if (year === undefined || isNaN(numYear) || numYear < 0 || numYear > new Date().getFullYear() + 1) {
    return res.status(400).json({ error: 'Укажите корректный год издания' });
  }

  const trimmedTitle = title.trim();
  const trimmedAuthor = author.trim();

  const isDuplicate = books.some(
    b => b.title.toLowerCase() === trimmedTitle.toLowerCase() &&
         b.author.toLowerCase() === trimmedAuthor.toLowerCase()
  );

  if (isDuplicate) {
    return res.status(409).json({ error: 'Книга с таким названием и автором уже существует' });
  }

  const newBook = {
    id: nextId++,
    title: trimmedTitle,
    author: trimmedAuthor,
    year: numYear,
    genre: genre ? String(genre).trim() : 'не указан'
  };

  books.push(newBook);
  logOperation('CREATE_BOOK', `Создана книга id=${newBook.id}: "${newBook.title}" (${newBook.author})`);
  res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  const { title, author, year, genre } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Название не должно быть пустым' });
    }
    books[bookIndex].title = title.trim();
  }

  if (author !== undefined) {
    if (typeof author !== 'string' || !author.trim()) {
      return res.status(400).json({ error: 'Автор не должен быть пустым' });
    }
    books[bookIndex].author = author.trim();
  }

  if (year !== undefined) {
    const numYear = Number(year);
    if (isNaN(numYear) || numYear < 0 || numYear > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: 'Некорректный год издания' });
    }
    books[bookIndex].year = numYear;
  }

  if (genre !== undefined) {
    books[bookIndex].genre = String(genre).trim();
  }

  logOperation('UPDATE_BOOK', `Обновлена книга id=${id}`);
  res.json(books[bookIndex]);
});

app.delete('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  const deleted = books.splice(bookIndex, 1)[0];
  logOperation('DELETE_BOOK', `Удалена книга id=${id} "${deleted.title}"`);
  res.json({ message: 'Книга успешно удалена', id, book: deleted });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
