require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const { connectMongo, getDb } = require('./config/mongo');
const mongoApi = require('./routes/mongoApi');
const errorHandler = require('./middleware/errorHandler');
const { setupChangeStreams } = require('./streams/changeStreams');
const metrics = require('./services/metrics');

const app = new Koa();

app.use(errorHandler);
app.use(bodyParser({ jsonLimit: '10mb' }));

// Middleware логирования запросов
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start || 1;
  const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${timeStr}] [ББМО-01-23] ${ctx.method} ${ctx.url} (${ms}ms)`);
  metrics.recordQuery(ms, ctx.status >= 400);
});

app.use(mongoApi.routes());
app.use(mongoApi.allowedMethods());

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

async function seedData(db) {
  const col = db.collection('students');
  const count = await col.countDocuments();
  if (count === 0) {
    const students = [
      { name: "Иван Иванов", group_name: "ББМО-01-23", course: 2, grade: 4.5, created_at: new Date() },
      { name: "Мария Смирнова", group_name: "ББМО-01-23", course: 2, grade: 3.8, created_at: new Date() },
      { name: "Петр Кузнецов", group_name: "ББМО-01-23", course: 2, grade: 4.2, created_at: new Date() },
      { name: "Анна Попова", group_name: "ББМО-01-23", course: 2, grade: 4.9, created_at: new Date() },
      { name: "Вадим Дёмин", group_name: "ББМО-01-23", course: 2, grade: 5.0, created_at: new Date() },
      { name: "Алексей Соколов", group_name: "ББМО-02-23", course: 1, grade: 4.1, created_at: new Date() },
      { name: "Сергей Морозов", group_name: "ББМО-03-23", course: 3, grade: 4.3, created_at: new Date() }
    ];
    await col.insertMany(students);
  }
}

async function start() {
  try {
    const db = await connectMongo();
    console.log("[INFO] MongoDB подключена: bbmo_01_23");

    const col = db.collection('students');
    await col.createIndex({ group_name: 1 });
    await col.createIndex({ name: "text" });
    console.log("[INFO] Индексы созданы: group_name_1, name_text");

    await seedData(db);

    setupChangeStreams(db, WS_PORT);
    console.log("[INFO] Change Stream запущен");

    app.listen(PORT, () => {
      console.log(`[INFO] Koa-сервер на порту ${PORT}`);
      console.log(`[INFO] WebSocket на порту ${WS_PORT}`);
      console.log("[INFO] Группа: ББМО-01-23");
    });
  } catch (err) {
    console.error("[ERROR] Ошибка запуска:", err.message);
    process.exit(1);
  }
}

start();
