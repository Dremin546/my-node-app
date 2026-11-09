const express = require('express');

const app = express();
const PORT = 3000;

function getFormattedDate() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-');
  const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(':');
  return `${date} ${time}`;
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Лабораторная работа №16</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 40px; display: flex; justify-content: center; }
        .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 600px; width: 100%; }
        h1 { color: #1a365d; margin-top: 0; }
        p { font-size: 16px; color: #4a5568; line-height: 1.6; }
        .badge { font-weight: bold; color: #2b6cb0; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
        a { color: #3182ce; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Лабораторная работа №16</h1>
        <p>Группа: <span class="badge">ББМО-01-23</span></p>
        <p>Текущая дата и время: <span class="badge">${getFormattedDate()}</span></p>
        <p>Приветственное сообщение: <span class="badge">Добро пожаловать на базовый веб-сервер Express.js!</span></p>
        <p>Список доступных маршрутов:</p>
        <ul>
          <li><a href="/">/</a> - Главная страница</li>
          <li><a href="/about">/about</a> - О разработчике</li>
          <li><a href="/contacts">/contacts</a> - Контактная информация</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

app.get('/about', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>О разработчике</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 40px; display: flex; justify-content: center; }
        .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 600px; width: 100%; }
        h1 { color: #1a365d; margin-top: 0; }
        p { font-size: 16px; color: #4a5568; line-height: 1.6; }
        a { color: #3182ce; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Информация о разработчике</h1>
        <p>Студент: Дёмин Вадим</p>
        <p>Группа: ББМО-01-23</p>
        <p>Лабораторная работа: №16 (Исследование методов создания простого сервера с использованием Express.js)</p>
        <p><a href="/">← Назад на главную</a></p>
      </div>
    </body>
    </html>
  `);
});

app.get('/contacts', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Контакты</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 40px; display: flex; justify-content: center; }
        .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 600px; width: 100%; }
        h1 { color: #1a365d; margin-top: 0; }
        p { font-size: 16px; color: #4a5568; line-height: 1.6; }
        a { color: #3182ce; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Контактная информация</h1>
        <p>GitHub: <a href="https://github.com/Dremin546" target="_blank">https://github.com/Dremin546</a></p>
        <p>Репозиторий: <a href="https://github.com/Dremin546/my-node-app" target="_blank">Dremin546/my-node-app</a></p>
        <p><a href="/">← Назад на главную</a></p>
      </div>
    </body>
    </html>
  `);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
