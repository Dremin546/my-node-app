require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const pool = require('./config/db');
const dbMiddleware = require('./middleware/db');
const errorHandler = require('./middleware/errorHandler');
const apiRouter = require('./routes/api');
const { runMigrations } = require('./migrations/migrate');

const app = new Koa();

app.use(errorHandler);
app.use(bodyParser({
  jsonLimit: '10mb'
}));
app.use(dbMiddleware);

app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Проверка подключения пула
    await pool.query("SELECT 1");
    console.log("[INFO] Пул MySQL создан (лимит: 10)");

    // Применение миграций
    const migrationsCount = await runMigrations();
    console.log(`[INFO] Миграции применены: ${migrationsCount}`);

    app.listen(PORT, () => {
      console.log(`[INFO] Koa-сервер запущен на порту ${PORT}`);
      console.log("[INFO] Группа: ББМО-01-23");
    });
  } catch (err) {
    console.error("[ERROR] Ошибка запуска сервера:", err.message);
    process.exit(1);
  }
}

start();
