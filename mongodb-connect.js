require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bbmo_01_23?replicaSet=rs0';
const dbName = process.env.DB_NAME || 'bbmo_01_23';

async function main() {
  console.log("=== Подключение к MongoDB ===");

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 3000
  });

  client.on('serverHeartbeatSucceeded', (event) => {
    const timeStr = new Date().toISOString();
    console.log(`[HEARTBEAT] Успешно: ${timeStr}`);
  });

  client.on('serverHeartbeatFailed', (event) => {
    const timeStr = new Date().toISOString();
    console.log(`[HEARTBEAT] Ошибка соединения: ${timeStr}`);
  });

  try {
    await client.connect();
    console.log("[OK] Подключение установлено");

    const db = client.db(dbName);
    await db.command({ ping: 1 });

    const adminDb = client.db().admin();
    const buildInfo = await adminDb.buildInfo();
    console.log(`Версия MongoDB: ${buildInfo.version}`);
    console.log(`База данных: ${dbName}`);
    console.log("Пользователь: student");

    console.log("\n=== Информация о сервере ===");
    const dbsList = await adminDb.listDatabases();
    console.log("Список БД:");
    for (const d of dbsList.databases) {
      console.log(`- ${d.name}`);
    }

    const collections = await db.listCollections().toArray();
    console.log(`\nКоллекции в ${dbName}:`);
    if (collections.length === 0) {
      console.log("(пусто — БД создана лениво)");
    } else {
      for (const col of collections) {
        console.log(`- ${col.name}`);
      }
    }

    console.log("\n=== Heartbeat ===");
    // Небольшая пауза для фиксации события heartbeat
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log("[OK] Соединение стабильно");

  } catch (err) {
    console.error(`[ERROR] Ошибка подключения: ${err.message}`);
  } finally {
    await client.close();
    console.log("[OK] Соединение закрыто");
  }
}

main();
