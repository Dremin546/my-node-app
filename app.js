require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const { connectDB } = require('./db');
const dbMiddleware = require('./middleware/dbMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');

const app = new Koa();

app.use(errorMiddleware);
app.use(loggerMiddleware);
app.use(bodyParser());
app.use(dbMiddleware);

app.use(usersRouter.routes());
app.use(usersRouter.allowedMethods());
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

const PORT = process.env.PORT || 3000;
const STUDENT_GROUP = process.env.STUDENT_GROUP || 'ББМО-01-23';

async function seedInitialUsers(db) {
  const collection = db.collection('users');
  const count = await collection.countDocuments();
  if (count === 0) {
    const firstNames = ["Иван", "Алексей", "Сергей", "Дмитрий", "Михаил", "Анна", "Мария", "Елена", "Ольга", "Татьяна"];
    const lastNames = ["Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Новиков", "Морозов"];
    const groups = [
      { name: "ББМО-01-23", count: 40 },
      { name: "ББМО-02-23", count: 35 },
      { name: "ББМО-03-23", count: 25 }
    ];

    const users = [];
    let idx = 1;

    for (const g of groups) {
      for (let i = 0; i < g.count; i++) {
        let course = 1;
        if (idx <= 30) course = 1;
        else if (idx <= 65) course = 2;
        else if (idx <= 85) course = 3;
        else course = 4;

        const age = 18 + (idx % 6); // 18 - 23 (average ~20.5)
        const fName = firstNames[(idx + i) % firstNames.length];
        const lName = lastNames[(idx * 3 + i) % lastNames.length];
        const name = (idx === 1) ? "Иван" : (idx === 2) ? "Мария" : (idx === 3) ? "Петр" : (idx === 4) ? "Вадим Дёмин" : `${fName} ${lName}`;
        const email = (idx === 1) ? "ivan@example.com" : (idx === 2) ? "maria@example.com" : (idx === 3) ? "petr@example.com" : `user_${idx}@example.com`;

        users.push({
          name,
          email,
          group_name: g.name,
          age,
          course,
          role: idx === 1 ? 'admin' : 'user',
          created_at: new Date(Date.now() - (100 - idx) * 3600000)
        });
        idx++;
      }
    }

    await collection.insertMany(users);
  }
}

async function start() {
  try {
    const db = await connectDB();
    await seedInitialUsers(db);

    app.listen(PORT, () => {
      console.log(`[INFO] Koa-сервер на порту ${PORT}`);
      console.log(`[INFO] Группа: ${STUDENT_GROUP}`);
    });
  } catch (err) {
    console.error("[ERROR] Ошибка запуска:", err.message);
    process.exit(1);
  }
}

start();
