const express = require('express');

const app = express();
const PORT = 3000;

app.use(express.json());

let books = [
  { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 },
  { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 },
  { id: 3, title: 'Мастер и Маргарита', author: 'Булгаков', year: 1967 },
  { id: 4, title: 'Анна Каренина', author: 'Толстой', year: 1877 }
];

let nextId = 5;

app.get('/api/books', (req, res) => {
  res.json(books);
});

app.get('/api/books/search', (req, res) => {
  const author = req.query.author;
  if (!author) {
    return res.status(400).json({ error: 'Параметр author обязателен' });
  }

  const result = books.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, year } = req.body;

  if (!title || !author || year === undefined || isNaN(Number(year))) {
    return res.status(400).json({ error: 'Поля title, author и корректный year обязательны' });
  }

  const newBook = {
    id: nextId++,
    title: String(title).trim(),
    author: String(author).trim(),
    year: Number(year)
  };

  books.push(newBook);
  res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  const { title, author, year } = req.body;
  if (year !== undefined && isNaN(Number(year))) {
    return res.status(400).json({ error: 'Некорректный год издания' });
  }

  if (title !== undefined) books[bookIndex].title = String(title).trim();
  if (author !== undefined) books[bookIndex].author = String(author).trim();
  if (year !== undefined) books[bookIndex].year = Number(year);

  res.json(books[bookIndex]);
});

app.delete('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bookIndex = books.findIndex(b => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  const deleted = books.splice(bookIndex, 1)[0];
  res.json({ message: 'Книга успешно удалена', book: deleted });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
