require('dotenv').config();
const mysql = require('mysql2/promise');

class StudentDAO {
  constructor(pool) {
    this.pool = pool;
  }

  validate(data, isUpdate = false) {
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 100) {
        throw new Error("name слишком короткое (мин. 2 символа)");
      }
    }

    if (!isUpdate || data.group_name !== undefined) {
      const groupRegex = /^ББМО-\d{2}-\d{2}$/;
      if (!data.group_name || !groupRegex.test(data.group_name)) {
        throw new Error("group_name не соответствует формату ББМО-XX-XX");
      }
    }

    if (!isUpdate || data.course !== undefined) {
      const course = Number(data.course);
      if (!Number.isInteger(course) || course < 1 || course > 4) {
        throw new Error("course должен быть целым числом от 1 до 4");
      }
    }

    if (data.grade !== undefined && data.grade !== null) {
      const grade = Number(data.grade);
      if (isNaN(grade) || grade < 0 || grade > 5) {
        throw new Error("grade должен быть в диапазоне от 0 до 5");
      }
    }
  }

  async create(data) {
    this.validate(data);
    const sql = "INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)";
    const [result] = await this.pool.query(sql, [data.name, data.group_name, data.course, data.grade ?? null]);
    return { id: result.insertId, ...data };
  }

  async findById(id) {
    const [rows] = await this.pool.query("SELECT * FROM students WHERE id = ?", [id]);
    return rows[0] || null;
  }

  async findAll(options = {}) {
    const limit = Math.max(1, Number(options.limit) || 10);
    const offset = Math.max(0, Number(options.offset) || 0);

    const whereClauses = [];
    const params = [];

    if (options.group_name) {
      whereClauses.push("group_name = ?");
      params.push(options.group_name);
    }
    if (options.course) {
      whereClauses.push("course = ?");
      params.push(Number(options.course));
    }
    if (options.grade_min !== undefined) {
      whereClauses.push("grade >= ?");
      params.push(Number(options.grade_min));
    }
    if (options.grade_max !== undefined) {
      whereClauses.push("grade <= ?");
      params.push(Number(options.grade_max));
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Подсчет общего количества
    const [countResult] = await this.pool.query(`SELECT COUNT(*) AS total FROM students ${whereSql}`, params);
    const total = countResult[0].total;

    // Сортировка
    let orderBy = 'id ASC';
    if (options.sortBy === 'name') {
      orderBy = `name ${options.order === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (options.sortBy === 'grade') {
      orderBy = `grade ${options.order === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (options.sortBy === 'created_at') {
      orderBy = `created_at ${options.order === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const dataParams = [...params, limit, offset];
    const [rows] = await this.pool.query(
      `SELECT * FROM students ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      dataParams
    );

    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: rows,
      pagination: {
        total,
        limit,
        offset,
        page: currentPage,
        totalPages
      }
    };
  }

  async update(id, data) {
    this.validate(data, true);
    const fields = [];
    const params = [];

    if (data.name !== undefined) {
      fields.push("name = ?");
      params.push(data.name);
    }
    if (data.group_name !== undefined) {
      fields.push("group_name = ?");
      params.push(data.group_name);
    }
    if (data.course !== undefined) {
      fields.push("course = ?");
      params.push(data.course);
    }
    if (data.grade !== undefined) {
      fields.push("grade = ?");
      params.push(data.grade);
    }

    if (fields.length === 0) return null;

    params.push(id);
    const [result] = await this.pool.query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return result.affectedRows > 0;
  }

  async delete(id) {
    const [result] = await this.pool.query("DELETE FROM students WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }

  async search(query) {
    const [rows] = await this.pool.query(
      "SELECT * FROM students WHERE name LIKE ? ORDER BY id ASC",
      [`%${query}%`]
    );
    return rows;
  }

  async getStats() {
    const [summary] = await this.pool.query(`
      SELECT 
        COUNT(*) AS total,
        ROUND(AVG(grade), 2) AS averageGrade,
        MIN(grade) AS minGrade,
        MAX(grade) AS maxGrade
      FROM students
    `);

    const [byGroupRows] = await this.pool.query(`
      SELECT group_name, COUNT(*) AS count
      FROM students
      GROUP BY group_name
      ORDER BY group_name ASC
    `);

    const [byCourseRows] = await this.pool.query(`
      SELECT course, COUNT(*) AS count
      FROM students
      GROUP BY course
      ORDER BY course ASC
    `);

    return {
      total: summary[0].total,
      averageGrade: summary[0].averageGrade,
      minGrade: summary[0].minGrade,
      maxGrade: summary[0].maxGrade,
      byGroup: byGroupRows,
      byCourse: byCourseRows
    };
  }
}

async function seedData(pool) {
  await pool.query("DROP TABLE IF EXISTS students");
  await pool.query(`
    CREATE TABLE students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      group_name VARCHAR(20) NOT NULL,
      course INT NOT NULL,
      grade DECIMAL(3,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const groups = [
    { name: "ББМО-01-23", count: 40 },
    { name: "ББМО-02-23", count: 35 },
    { name: "ББМО-03-23", count: 25 }
  ];

  const firstNames = ["Иван", "Алексей", "Сергей", "Дмитрий", "Михаил", "Анна", "Мария", "Елена", "Ольга", "Татьяна"];
  const lastNames = ["Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Новиков", "Морозов"];

  const rows = [];
  let studentIndex = 1;

  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      const fName = firstNames[(studentIndex + i) % firstNames.length];
      const lName = lastNames[(studentIndex * 3 + i) % lastNames.length];
      const fullName = (studentIndex === 1) ? "Иван Иванов" : (studentIndex === 15) ? "Иван Петров" : (studentIndex === 42) ? "Иван Сидоров" : `${fName} ${lName}`;
      
      let course = 1;
      if (studentIndex <= 30) course = 1;
      else if (studentIndex <= 65) course = 2;
      else if (studentIndex <= 85) course = 3;
      else course = 4;

      const grade = (2.5 + ((studentIndex * 7) % 26) * 0.1).toFixed(2);
      rows.push([fullName, g.name, course, grade]);
      studentIndex++;
    }
  }

  await pool.query(
    "INSERT INTO students (name, group_name, course, grade) VALUES ?",
    [rows]
  );
}

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'student',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'bbmo_01_23',
    connectionLimit: 10
  });

  try {
    await seedData(pool);
    const dao = new StudentDAO(pool);

    console.log("=== StudentDAO (группа ББМО-01-23) ===");

    console.log("\n--- Создание с валидацией ---");
    const newStudent = await dao.create({
      name: "Вадим Дёмин",
      group_name: "ББМО-01-23",
      course: 2,
      grade: 4.90
    });
    console.log(`[OK] Создан: id=${newStudent.id}, name=${newStudent.name}`);

    try {
      await dao.create({ name: "A", group_name: "ББМО-01-23", course: 2 });
    } catch (err) {
      console.log(`[ERROR] Ошибка: ${err.message}`);
    }

    try {
      await dao.create({ name: "Алексей", group_name: "INVALID_GROUP", course: 2 });
    } catch (err) {
      console.log(`[ERROR] Ошибка: ${err.message}`);
    }

    console.log("\n--- Пагинация ---");
    console.log("findAll({ limit: 5, offset: 0 }):");
    const pageResult = await dao.findAll({ limit: 5, offset: 0 });
    console.log(`Всего: ${pageResult.pagination.total}, Страница: ${pageResult.pagination.page}/${pageResult.pagination.totalPages}`);
    for (const s of pageResult.data) {
      console.log(`id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${Number(s.grade).toFixed(2)}`);
    }

    console.log("\n--- Фильтры ---");
    const groupResult = await dao.findAll({ group_name: 'ББМО-01-23', course: 2 });
    console.log(`findAll({ group_name: 'ББМО-01-23', course: 2 }):\nНайдено: ${groupResult.pagination.total} студентов`);

    const gradeResult = await dao.findAll({ grade_min: 4.0, grade_max: 5.0 });
    console.log(`findAll({ grade_min: 4.0, grade_max: 5.0 }):\nНайдено: ${gradeResult.pagination.total} студента`);

    console.log("\n--- Поиск ---");
    console.log("search('Иван'):");
    const searchResult = await dao.search('Иван');
    console.log(`Найдено: ${searchResult.length} студента`);
    for (const s of searchResult.slice(0, 3)) {
      console.log(`id=${s.id}, name=${s.name}`);
    }

    console.log("\n--- Статистика ---");
    const stats = await dao.getStats();
    console.log(`Всего студентов:    ${stats.total}`);
    console.log(`Средний балл:       ${stats.averageGrade}`);
    console.log(`Минимальная оценка: ${Number(stats.minGrade).toFixed(2)}`);
    console.log(`Максимальная оценка: ${Number(stats.maxGrade).toFixed(2)}`);

    console.log("\nПо группам:");
    for (const g of stats.byGroup) {
      console.log(`${g.group_name}: ${g.count}`);
    }

    console.log("\nПо курсам:");
    for (const c of stats.byCourse) {
      console.log(`${c.course} курс: ${c.count}`);
    }

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
  } finally {
    await pool.end();
  }
}

main();
