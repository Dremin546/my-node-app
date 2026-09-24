const Koa = require('koa');

const app = new Koa();
const PORT = 3000;

function getFormattedDate() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-');
  const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(':');
  return `${date} ${time}`;
}

app.use(async (ctx) => {
  if (ctx.path === '/' && ctx.method === 'GET') {
    ctx.type = 'html';
    ctx.body = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Лабораторная работа №15</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 40px; display: flex; justify-content: center; }
          .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); max-width: 500px; width: 100%; }
          h1 { color: #2c3e50; margin-top: 0; }
          p { font-size: 16px; color: #555; line-height: 1.5; }
          .highlight { font-weight: bold; color: #2980b9; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Лабораторная работа №15</h1>
          <p>Студент: <span class="highlight">Дёмин Вадим</span></p>
          <p>Группа: <span class="highlight">477 (ББМО-01-23)</span></p>
          <p>Текущая дата и время: <span class="highlight">${getFormattedDate()}</span></p>
          <p>Приветственное сообщение: <span class="highlight">Добро пожаловать на базовый веб-сервер Koa.js!</span></p>
        </div>
      </body>
      </html>
    `;
  } else {
    ctx.status = 404;
    ctx.body = 'Not Found';
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
