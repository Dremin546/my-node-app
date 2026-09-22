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
  const authHeader = ctx.headers['authorization'];
  if (!authHeader) {
    ctx.status = 401;
    ctx.body = { error: 'Не авторизован', status: 401 };
    return;
  }
  await next();
};

router.get('/protected', authMiddleware, async (ctx) => {
  ctx.status = 200;
  ctx.body = { message: 'Доступ разрешен!', user: 'authorized' };
});

router.get('/error', async () => {
  throw new Error('Тестовая ошибка сервера');
});

router.get('/', async (ctx) => {
  ctx.type = 'html';
  ctx.body = '<h1>Лабораторная работа №15</h1><p>Группа: 477 (ББМО-01-23)</p>';
});

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.on('error', () => {});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер с middleware запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
