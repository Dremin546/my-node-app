const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();
const PORT = 3000;

let users = [
  { id: 1, name: 'Иванов Иван', group: '477 (ББМО-01-23)' },
  { id: 2, name: 'Петров Петр', group: '477 (ББМО-01-23)' },
  { id: 3, name: 'Сидоров Сидор', group: '477 (ББМО-02-23)' }
];
let nextUserId = 4;

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

  const newUser = {
    id: nextUserId++,
    name: name.trim(),
    group: group.trim()
  };

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

  if (!name && !group) {
    ctx.status = 400;
    ctx.body = { error: 'Необходимо указать хотя бы одно поле для обновления: name или group', status: 400 };
    return;
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      ctx.status = 400;
      ctx.body = { error: 'Поле name должно быть непустой строкой', status: 400 };
      return;
    }
    user.name = name.trim();
  }

  if (group !== undefined) {
    if (typeof group !== 'string' || !group.trim()) {
      ctx.status = 400;
      ctx.body = { error: 'Поле group должно быть непустой строкой', status: 400 };
      return;
    }
    user.group = group.trim();
  }

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

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер с REST API запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
