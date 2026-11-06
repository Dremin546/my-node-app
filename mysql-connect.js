require('dotenv').config();
const mysql = require('mysql2/promise');

async function testSingleConnection() {
  console.log("=== Одиночное соединение ===");
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'student',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'bbmo_01_23'
    });

    console.log("[OK] Подключение установлено");

    const [rows] = await connection.query("SELECT VERSION() AS version, DATABASE() AS db, CURRENT_USER() AS user");
    console.log(`Версия MySQL: ${rows[0].version}`);
    console.log(`Текущая БД: ${rows[0].db}`);
    console.log(`Пользователь: ${rows[0].user}`);

    await connection.end();
    console.log("[OK] Соединение закрыто");
  } catch (err) {
    handleError(err);
  }
}

async function testPoolConnection() {
  console.log("\n=== Пул соединений ===");
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'student',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'bbmo_01_23',
      connectionLimit: 10
    });

    console.log("[OK] Пул создан (лимит: 10)");

    const [rows] = await pool.query("SELECT VERSION() AS version, DATABASE() AS db");
    console.log(`Версия MySQL: ${rows[0].version}`);
    console.log(`Текущая БД: ${rows[0].db}`);
    console.log("Соединений в пуле: 10");
    console.log("[OK] Пул готов к работе");

    await pool.end();
  } catch (err) {
    handleError(err);
  }
}

function handleError(err) {
  if (err.code === 'ECONNREFUSED') {
    console.error(`[ERROR] [ECONNREFUSED] Сервер недоступен: ${err.address}:${err.port}`);
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error(`[ERROR] [ER_ACCESS_DENIED_ERROR] Неверный пароль или логин для пользователя ${process.env.DB_USER}`);
  } else {
    console.error(`[ERROR] ${err.code}: ${err.message}`);
  }
}

async function main() {
  await testSingleConnection();
  await testPoolConnection();
}

main();
