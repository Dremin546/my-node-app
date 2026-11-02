const StudentDAO = require('../dao/StudentDAO');
const { getDb, client } = require('../config/mongo');
const cache = require('../services/cache');

function getDAO() {
  return new StudentDAO(getDb(), client);
}

async function getStudents(ctx) {
  const limit = Math.max(1, Number(ctx.query.limit) || 10);
  const offset = Math.max(0, Number(ctx.query.offset) || 0);

  const cacheKey = `mongo_students_${limit}_${offset}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    ctx.body = cached;
    return;
  }

  const dao = getDAO();
  const result = await dao.findAll({ limit, offset });

  cache.set(cacheKey, result, 60);
  ctx.body = result;
}

async function getStudentById(ctx) {
  const dao = getDAO();
  const student = await dao.findById(ctx.params.id);
  if (!student) {
    ctx.status = 404;
    ctx.body = { error: "Not Found", message: "Студент не найден" };
    return;
  }
  ctx.body = student;
}

async function createStudent(ctx) {
  const dao = getDAO();
  const result = await dao.create(ctx.request.body);
  cache.clear();
  ctx.status = 201;
  ctx.body = result;
}

async function updateStudent(ctx) {
  const dao = getDAO();
  const updated = await dao.update(ctx.params.id, ctx.request.body);
  if (!updated) {
    ctx.status = 404;
    ctx.body = { error: "Not Found", message: "Студент не найден" };
    return;
  }
  cache.clear();
  ctx.body = { message: "Студент обновлен", id: ctx.params.id };
}

async function deleteStudent(ctx) {
  const dao = getDAO();
  const deleted = await dao.delete(ctx.params.id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: "Not Found", message: "Студент не найден" };
    return;
  }
  cache.clear();
  ctx.body = { message: "Студент удален", id: ctx.params.id };
}

async function getStats(ctx) {
  const dao = getDAO();
  ctx.body = await dao.getStats();
}

async function searchStudents(ctx) {
  const query = ctx.query.q || '';
  const dao = getDAO();
  const results = await dao.search(query);
  ctx.body = {
    found: results.length,
    data: results
  };
}

async function batchCreate(ctx) {
  const students = ctx.request.body;
  if (!Array.isArray(students)) {
    ctx.status = 400;
    ctx.body = { error: "Bad Request", message: "Ожидался массив студентов" };
    return;
  }

  const dao = getDAO();
  try {
    const res = await dao.batchCreate(students);
    cache.clear();
    ctx.body = res;
  } catch (err) {
    ctx.status = 500;
    ctx.body = {
      error: "Transaction Error",
      message: err.message,
      transaction: "rolled back"
    };
  }
}

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStats,
  searchStudents,
  batchCreate
};
