const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();
const PORT = 3000;

function formatLogDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const date = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
  const time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
  return `${date} ${time}`;
}

const firstNames = ['Александр', 'Алексей', 'Андрей', 'Анна', 'Артем', 'Виктория', 'Даниил', 'Дарья', 'Дмитрий', 'Екатерина', 'Иван', 'Максим', 'Мария', 'Михаил', 'Никита', 'Ольга', 'Полина', 'Сергей', 'София', 'Юлия'];
const lastNames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 'Новиков', 'Федоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семенов', 'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев'];
const groups = ['477 ];

let students = [];
let nextStudentId = 1;

for (let i = 0; i < 50; i++) {
  const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
  const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
  const grp = groups[i % groups.length];
  const course = (i % 4) + 1;

  students.push({
    id: nextStudentId++,
    name: `${fn} ${ln}`,
    group: grp,
    course: course
  });
}

let users = [
  { id: 1, name: 'Иванов Иван', group: '477  },
  { id: 2, name: 'Петров Петр', group: '477 ' },
  { id: 3, name: 'Сидоров Сидор', group: '477 ' }
];
let nextUserId = 4;

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message || 'Внутренняя ошибка сервера',
      status: ctx.status
    };
    ctx.app.emit('error', err, ctx);
  }
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`[${formatLogDate(new Date())}] ${ctx.method} ${ctx.path} - ${ms}ms`);
});

const authMiddleware = async (ctx, next) => {
  const token = ctx.headers['authorization'];
  if (!token) {
    ctx.status = 401;
    ctx.body = { error: 'Не авторизован', status: 401 };
    return;
  }
  await next();
};

router.get('/', async (ctx) => {
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
        <p>Текущая дата и время: <span class="highlight">${formatLogDate(new Date())}</span></p>
        <p>Приветственное сообщение: <span class="highlight">Добро пожаловать на полнофункциональный сервер Koa.js!</span></p>
      </div>
    </body>
    </html>
  `;
});

router.get('/protected', authMiddleware, async (ctx) => {
  ctx.status = 200;
  ctx.body = { message: 'Доступ разрешен!', user: 'authorized' };
});

router.get('/error', async () => {
  throw new Error('Тестовая ошибка сервера');
});

router.get('/api/users', async (ctx) => {
  ctx.status = 200;
  ctx.body = users;
});

router.post('/api/users', async (ctx) => {
  const { name, group } = ctx.request.body || {};
  if (!name || !group || typeof name !== 'string' || typeof group !== 'string' || !name.trim() || !group.trim()) {
    ctx.status = 400;
    ctx.body = { error: 'Поля name и group обязательны и должны быть строками', status: 400 };
    return;
  }
  const newUser = { id: nextUserId++, name: name.trim(), group: group.trim() };
  users.push(newUser);
  ctx.status = 201;
  ctx.body = newUser;
});

router.put('/api/users/:id', async (ctx) => {
  const userId = parseInt(ctx.params.id, 10);
  const user = users.find(u => u.id === userId);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден', status: 404 };
    return;
  }
  const { name, group } = ctx.request.body || {};
  if (name !== undefined) user.name = String(name).trim();
  if (group !== undefined) user.group = String(group).trim();
  ctx.status = 200;
  ctx.body = user;
});

router.delete('/api/users/:id', async (ctx) => {
  const userId = parseInt(ctx.params.id, 10);
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден', status: 404 };
    return;
  }
  users.splice(index, 1);
  ctx.status = 200;
  ctx.body = { message: 'Пользователь успешно удален', id: userId };
});

router.get('/students', async (ctx) => {
  let result = [...students];
  const { group, search, sort, limit, offset } = ctx.query;

  if (group) {
    result = result.filter(s => s.group.toLowerCase().includes(group.toLowerCase()));
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(s => s.name.toLowerCase().includes(q));
  }

  if (sort) {
    if (sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else if (sort === '-name') {
      result.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
    } else if (sort === 'course') {
      result.sort((a, b) => a.course - b.course);
    }
  }

  const total = result.length;
  const lim = limit !== undefined ? parseInt(limit, 10) : 10;
  const off = offset !== undefined ? parseInt(offset, 10) : 0;

  const paginatedData = result.slice(off, off + lim);

  ctx.status = 200;
  ctx.body = {
    total: total,
    limit: lim,
    offset: off,
    data: paginatedData
  };
});

router.get('/students/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const student = students.find(s => s.id === id);
  if (!student) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден', status: 404 };
    return;
  }
  ctx.status = 200;
  ctx.body = student;
});

router.post('/students', async (ctx) => {
  const { name, group, course } = ctx.request.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    ctx.status = 400;
    ctx.body = { error: 'Поле name обязательно', status: 400 };
    return;
  }

  if (!group || typeof group !== 'string' || !group.trim()) {
    ctx.status = 400;
    ctx.body = { error: 'Поле group обязательно', status: 400 };
    return;
  }

  const courseNum = Number(course);
  if (!course || isNaN(courseNum) || courseNum < 1 || courseNum > 6) {
    ctx.status = 400;
    ctx.body = { error: 'Поле course должно быть числом от 1 до 6', status: 400 };
    return;
  }

  const newStudent = {
    id: nextStudentId++,
    name: name.trim(),
    group: group.trim(),
    course: courseNum
  };

  students.push(newStudent);
  ctx.status = 201;
  ctx.body = newStudent;
});

router.put('/students/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const student = students.find(s => s.id === id);

  if (!student) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден', status: 404 };
    return;
  }

  const { name, group, course } = ctx.request.body || {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      ctx.status = 400;
      ctx.body = { error: 'Поле name не должно быть пустым', status: 400 };
      return;
    }
    student.name = name.trim();
  }

  if (group !== undefined) {
    if (typeof group !== 'string' || !group.trim()) {
      ctx.status = 400;
      ctx.body = { error: 'Поле group не должно быть пустым', status: 400 };
      return;
    }
    student.group = group.trim();
  }

  if (course !== undefined) {
    const courseNum = Number(course);
    if (isNaN(courseNum) || courseNum < 1 || courseNum > 6) {
      ctx.status = 400;
      ctx.body = { error: 'Поле course должно быть от 1 до 6', status: 400 };
      return;
    }
    student.course = courseNum;
  }

  ctx.status = 200;
  ctx.body = student;
});

router.delete('/students/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const index = students.findIndex(s => s.id === id);

  if (index === -1) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден', status: 404 };
    return;
  }

  students.splice(index, 1);
  ctx.status = 200;
  ctx.body = { message: 'Студент успешно удален', id };
});

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.on('error', () => {});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервак епта здесь http://localhost:${PORT}`);
  });
}

module.exports = app;
