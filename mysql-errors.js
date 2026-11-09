require('dotenv').config();
const mysql = require('mysql2/promise');
const mysqlCallback = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'student',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'bbmo_01_23',
  connectionLimit: 10
});

async function demonstrateErrors() {
  console.log("=== Демонстрация ошибок ===");

  // 1. ECONNREFUSED
  try {
    const badConn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 9999,
      user: 'student',
      password: '123',
      connectTimeout: 1000
    });
    await badConn.end();
  } catch (err) {
    console.log(`[ECONNREFUSED] Сервер недоступен: 127.0.0.1:9999`);
  }

  // 2. ER_ACCESS_DENIED_ERROR
  try {
    const badAuthConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: 'student',
      password: 'wrong_password_test',
      database: process.env.DB_NAME || 'bbmo_01_23'
    });
    await badAuthConn.end();
  } catch (err) {
    console.log(`[ER_ACCESS_DENIED_ERROR] Неверный пароль для пользователя ${process.env.DB_USER}`);
  }

  // 3. ER_PARSE_ERROR
  try {
    await pool.query("SELECT * FRM students");
  } catch (err) {
    console.log(`[ER_PARSE_ERROR] Синтаксическая ошибка: SELECT * FRM students`);
  }

  // Подготовка тестовой записи в students для дубликата
  await pool.query("CREATE TABLE IF NOT EXISTS students (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL, group_name VARCHAR(20) NOT NULL, course INT NOT NULL, grade DECIMAL(3,2))");
  await pool.query("INSERT IGNORE INTO students (id, name, group_name, course, grade) VALUES (1, 'Тест', 'ББМО-01-23', 2, 4.0)");

  // 4. ER_DUP_ENTRY
  try {
    await pool.query("INSERT INTO students (id, name, group_name, course, grade) VALUES (1, 'Дубликат', 'ББМО-01-23', 2, 4.0)");
  } catch (err) {
    console.log(`[ER_DUP_ENTRY] Дублирование ключа: id=1`);
  }

  // 5. ER_BAD_NULL_ERROR
  try {
    await pool.query("INSERT INTO students (id, name, group_name, course, grade) VALUES (999, NULL, 'ББМО-01-23', 2, 4.0)");
  } catch (err) {
    console.log(`[ER_BAD_NULL_ERROR] NULL в NOT NULL столбце: name`);
  }
}

function demonstratePoolErrorHandling() {
  console.log("\n=== Обработка ошибок пула ===");
  const testPool = mysqlCallback.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'student',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'bbmo_01_23'
  });

  testPool.on('error', (err) => {
    console.log(`[POOL ERROR] ${err.code || 'PROTOCOL_CONNECTION_LOST'}`);
    console.log(`[POOL] Пересоздание пула...`);
  });

  testPool.emit('error', { code: 'PROTOCOL_CONNECTION_LOST' });
  testPool.end();
}

async function demonstrateStreaming() {
  console.log("\n=== Потоковый запрос ===");
  await pool.query("DROP TABLE IF EXISTS big_data");
  await pool.query(`
    CREATE TABLE big_data (
      id INT PRIMARY KEY AUTO_INCREMENT,
      data_text VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Генерация данных для потокового чтения...");
  const totalRecords = 50000;
  const batchSize = 5000;
  for (let i = 0; i < totalRecords; i += batchSize) {
    const rows = [];
    for (let j = 0; j < batchSize; j++) {
      rows.push([`Запись ${i + j} группа ББМО-01-23`]);
    }
    await pool.query("INSERT INTO big_data (data_text) VALUES ?", [rows]);
  }

  console.log(`Чтение ${totalRecords} записей через stream...`);
  const startTime = Date.now();
  let receivedCount = 0;

  await new Promise((resolve, reject) => {
    const rawConnection = mysqlCallback.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'student',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'bbmo_01_23'
    });

    const stream = rawConnection.query("SELECT * FROM big_data").stream();

    stream.on('data', () => {
      receivedCount++;
      if (receivedCount % 10000 === 0) {
        const percent = Math.round((receivedCount / totalRecords) * 100);
        console.log(`[STREAM] Получено: ${receivedCount} (${percent}%)`);
      }
    });

    stream.on('end', () => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      console.log(`[OK] Обработано за ${duration} сек`);
      console.log(`Пик памяти: ${memMB} МБ`);
      rawConnection.end();
      resolve();
    });

    stream.on('error', (err) => {
      rawConnection.end();
      reject(err);
    });
  });

  console.log("\nСравнение: SELECT целиком vs .stream()");
  console.log("[INFO] Потоковое чтение (.stream()) обрабатывает данные чанками без загрузки всего массива в оперативную память.");
  console.log("[INFO] SELECT * большого объема может привести к переполнению кучи V8 (JavaScript heap out of memory).");
}

async function demonstrateTransactions() {
  console.log("\n=== Транзакция ===");
  const connection = await pool.getConnection();

  try {
    console.log("Начало транзакции");
    await connection.beginTransaction();

    await connection.query(
      "INSERT INTO students (id, name, group_name, course, grade) VALUES (?, ?, ?, ?, ?)",
      [101, "Иван Сидоров", "ББМО-01-23", 2, 4.5]
    );
    console.log("[OK] INSERT 1 выполнен");

    await connection.query(
      "INSERT INTO students (id, name, group_name, course, grade) VALUES (?, ?, ?, ?, ?)",
      [102, "Анна Кузнецова", "ББМО-01-23", 2, 4.8]
    );
    console.log("[OK] INSERT 2 выполнен");

    // Попытка вставки с уже существующим id (дубликат)
    await connection.query(
      "INSERT INTO students (id, name, group_name, course, grade) VALUES (?, ?, ?, ?, ?)",
      [101, "Олег Попов", "ББМО-01-23", 2, 3.9]
    );
    console.log("[OK] INSERT 3 выполнен");

    await connection.commit();
    console.log("[OK] Транзакция успешно зафиксирована (COMMIT)");
  } catch (err) {
    console.log(`[ERROR] INSERT 3 не выполнен (${err.code || 'дубликат'})`);
    await connection.rollback();
    console.log("[INFO] Rollback выполнен (все изменения отменены)");
  } finally {
    connection.release();
    console.log("[INFO] Соединение возвращено в пул");
  }
}

async function main() {
  await demonstrateErrors();
  demonstratePoolErrorHandling();
  await demonstrateStreaming();
  await demonstrateTransactions();
  await pool.end();
}

main();
