const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();
const PORT = 3000;

let students = [
  { id: 1, name: 'Анна', group: '477 (ББМО-01-23)', course: 2 },
  { id: 2, name: 'Иван', group: '477 (ББМО-01-23)', course: 2 },
  { id: 3, name: 'Сергей', group: '477 (ББМО-02-23)', course: 3 }
];
let nextStudentId = 4;

router.get('/students', async (ctx) => {
  const { group } = ctx.query;
  if (group) {
    ctx.body = students.filter(s => s.group.toLowerCase() === group.toLowerCase());
  } else {
    ctx.body = students;
  }
});

router.get('/students/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const student = students.find(s => s.id === id);
  if (!student) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден', status: 404 };
    return;
  }
  ctx.body = student;
});

router.post('/students', async (ctx) => {
  const { name, group, course } = ctx.request.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    ctx.status = 400;
    ctx.body = { error: 'Поле name обязательно и должно быть строкой', status: 400 };
    return;
  }

  if (!group || typeof group !== 'string' || !group.trim()) {
    ctx.status = 400;
    ctx.body = { error: 'Поле group обязательно и должно быть строкой', status: 400 };
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
      ctx.body = { error: 'Поле name должно быть непустой строкой', status: 400 };
      return;
    }
    student.name = name.trim();
  }

  if (group !== undefined) {
    if (typeof group !== 'string' || !group.trim()) {
      ctx.status = 400;
      ctx.body = { error: 'Поле group должно быть непустой строкой', status: 400 };
      return;
    }
    student.group = group.trim();
  }

  if (course !== undefined) {
    const courseNum = Number(course);
    if (isNaN(courseNum) || courseNum < 1 || courseNum > 6) {
      ctx.status = 400;
      ctx.body = { error: 'Поле course должно быть числом от 1 до 6', status: 400 };
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер управления студентами запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
