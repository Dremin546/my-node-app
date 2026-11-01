const cache = require('../services/cache');

async function getStudents(ctx) {
  const limit = Math.max(1, Number(ctx.query.limit) || 10);
  const offset = Math.max(0, Number(ctx.query.offset) || 0);

  const cacheKey = `students_${limit}_${offset}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    ctx.body = cachedData;
    return;
  }

  const [countResult] = await ctx.db.query("SELECT COUNT(*) AS total FROM students");
  const total = countResult[0].total;

  const [rows] = await ctx.db.query(
    "SELECT id, name, group_name, grade FROM students ORDER BY id ASC LIMIT ? OFFSET ?",
    [limit, offset]
  );

  const pages = Math.ceil(total / limit) || 1;
  const result = {
    data: rows.map(r => ({
      id: r.id,
      name: r.name,
      group_name: r.group_name,
      grade: r.grade !== null ? Number(r.grade) : null
    })),
    pagination: {
      total,
      limit,
      offset,
      pages
    }
  };

  cache.set(cacheKey, result, 60);
  ctx.body = result;
}

async function getStudentById(ctx) {
  const id = Number(ctx.params.id);
  const [rows] = await ctx.db.query("SELECT * FROM students WHERE id = ?", [id]);
  if (rows.length === 0) {
    ctx.status = 404;
    ctx.body = { error: "Not Found", message: "Студент не найден" };
    return;
  }
  ctx.body = rows[0];
}

async function createStudent(ctx) {
  const { name, group_name, course, grade } = ctx.request.body || {};
  if (!name || !group_name) {
    ctx.status = 400;
    ctx.body = { error: "Bad Request", message: "name и group_name обязательны" };
    return;
  }

  const [result] = await ctx.db.query(
    "INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)",
    [name, group_name, course || 1, grade || null]
  );

  cache.clear();
  ctx.status = 201;
  ctx.body = {
    id: result.insertId,
    name,
    group_name,
    course: course || 1,
    grade
  };
}

async function updateStudent(ctx) {
  const id = Number(ctx.params.id);
  const { name, group_name, course, grade } = ctx.request.body || {};

  const [result] = await ctx.db.query(
    "UPDATE students SET name = COALESCE(?, name), group_name = COALESCE(?, group_name), course = COALESCE(?, course), grade = COALESCE(?, grade) WHERE id = ?",
    [name, group_name, course, grade, id]
  );

  if (result.affectedRows === 0) {
    ctx.status = 404;
    ctx.body = { error: "Not Found", message: "Студент не найден" };
    return;
  }

  cache.clear();
  ctx.body = { message: "Студент обновлен", id };
}

async function deleteStudent(ctx) {
  const id = Number(ctx.params.id);
  const [result] = await ctx.db.query("DELETE FROM students WHERE id = ?", [id]);

  if (result.affectedRows === 0) {
    ctx.status = 404;
    ctx.body = { error: "Not Found", message: "Студент не найден" };
    return;
  }

  cache.clear();
  ctx.body = { message: "Студент удален", id };
}

async function getStats(ctx) {
  const [summary] = await ctx.db.query(`
    SELECT COUNT(*) AS total, ROUND(AVG(grade), 2) AS averageGrade
    FROM students
  `);

  const [byGroupRows] = await ctx.db.query(`
    SELECT group_name, COUNT(*) AS count
    FROM students
    GROUP BY group_name
  `);

  const byGroup = {};
  for (const row of byGroupRows) {
    byGroup[row.group_name] = row.count;
  }

  ctx.body = {
    total: summary[0].total,
    averageGrade: summary[0].averageGrade !== null ? Number(summary[0].averageGrade) : 0,
    byGroup
  };
}

async function batchCreateStudents(ctx) {
  const students = ctx.request.body;
  if (!Array.isArray(students) || students.length === 0) {
    ctx.status = 400;
    ctx.body = { error: "Bad Request", message: "Ожидался массив студентов" };
    return;
  }

  const conn = await ctx.db.getConnection();
  const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  try {
    console.log(`[${timeStr}] [ББМО-01-23] BEGIN TRANSACTION`);
    await conn.beginTransaction();

    let createdCount = 0;
    for (const s of students) {
      if (s.fail_test) {
        throw new Error("Симуляция ошибки транзакции");
      }
      const [res] = await conn.query(
        "INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)",
        [s.name, s.group_name || 'ББМО-01-23', s.course || 1, s.grade || null]
      );
      createdCount++;
      console.log(`[${timeStr}] [ББМО-01-23] INSERT INTO students ... (id=${res.insertId})`);
    }

    await conn.commit();
    console.log(`[${timeStr}] [ББМО-01-23] COMMIT`);
    cache.clear();

    ctx.body = {
      created: createdCount,
      transaction: "committed"
    };
  } catch (err) {
    await conn.rollback();
    console.log(`[${timeStr}] [ББМО-01-23] ROLLBACK (изменения отменены)`);
    ctx.status = 500;
    ctx.body = {
      error: "Transaction Error",
      message: err.message,
      transaction: "rolled back"
    };
  } finally {
    conn.release();
  }
}

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStats,
  batchCreateStudents
};
