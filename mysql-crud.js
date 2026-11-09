require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'student',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'bbmo_01_23',
  connectionLimit: 10
});

async function run() {
  try {
    console.log("=== Создание таблицы ===");
    await pool.query("DROP TABLE IF EXISTS students");
    const createTableSql = `
      CREATE TABLE students (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        group_name VARCHAR(20) NOT NULL,
        course INT NOT NULL,
        grade DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createTableSql);
    console.log("[OK] Таблица students создана");

    console.log("\n=== INSERT ===");
    const [insertSingle] = await pool.query(
      "INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)",
      ["Иван", "ББМО-01-23", 2, 4.50]
    );
    console.log(`[OK] Вставлен студент: id=${insertSingle.insertId}, affectedRows=${insertSingle.affectedRows}`);

    const multipleStudents = [
      ["Мария", "ББМО-01-23", 2, 3.80],
      ["Петр", "ББМО-01-23", 2, 4.20],
      ["Анна", "ББМО-01-23", 2, 4.90]
    ];
    const [insertMany] = await pool.query(
      "INSERT INTO students (name, group_name, course, grade) VALUES ?",
      [multipleStudents]
    );
    console.log(`[OK] Вставлено 3 студента: affectedRows=${insertMany.affectedRows}`);

    console.log("\n=== SELECT ===");
    console.log("Все студенты:");
    const [allStudents] = await pool.query("SELECT * FROM students");
    for (const s of allStudents) {
      console.log(`id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${Number(s.grade).toFixed(2)}`);
    }

    console.log("\nСтуденты группы ББМО-01-23 (сортировка по grade):");
    const [sortedStudents] = await pool.query(
      "SELECT id, name, grade FROM students WHERE group_name = ? ORDER BY grade DESC",
      ["ББМО-01-23"]
    );
    for (const s of sortedStudents) {
      console.log(`id=${s.id}, name=${s.name}, grade=${Number(s.grade).toFixed(2)}`);
    }

    console.log("\nВыборка с LIMIT и OFFSET (пагинация: limit 2, offset 1):");
    const [pagedStudents] = await pool.query(
      "SELECT id, name, grade FROM students LIMIT ? OFFSET ?",
      [2, 1]
    );
    for (const s of pagedStudents) {
      console.log(`id=${s.id}, name=${s.name}, grade=${Number(s.grade).toFixed(2)}`);
    }

    console.log("\n=== UPDATE ===");
    const [updateResult1] = await pool.query(
      "UPDATE students SET grade = ? WHERE id = ?",
      [4.85, 1]
    );
    console.log(`[OK] Обновлён студент id=1: affectedRows=${updateResult1.affectedRows}, changedRows=${updateResult1.changedRows}`);

    const [updateResult2] = await pool.query(
      "UPDATE students SET grade = ? WHERE id = ?",
      [4.85, 1]
    );
    console.log(`[OK] Повторное обновление: affectedRows=${updateResult2.affectedRows}, changedRows=${updateResult2.changedRows}`);

    console.log("\n=== DELETE ===");
    const [deleteResult] = await pool.query(
      "DELETE FROM students WHERE id = ?",
      [1]
    );
    console.log(`[OK] Удалён студент id=1: affectedRows=${deleteResult.affectedRows}`);

    console.log("\n=== Защита от SQL-инъекции ===");
    const maliciousInput = "'; DROP TABLE students; --";
    console.log(`Попытка инъекции: "${maliciousInput}"`);

    const [safeResult] = await pool.query(
      "SELECT * FROM students WHERE name = ?",
      [maliciousInput]
    );
    console.log(`[OK] Параметризованный запрос безопасен (найдено совпадений: ${safeResult.length})`);
    console.log("[INFO] Конкатенация привела бы к удалению таблицы");

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
  } finally {
    await pool.end();
  }
}

run();
