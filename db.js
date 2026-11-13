require('dotenv').config();
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

let client = null;
let db = null;
let memoryServer = null;

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bbmo_01_23';
const dbName = process.env.DB_NAME || 'bbmo_01_23';

async function connectDB() {
  if (db) return db;

  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
    await client.connect();
    db = client.db(dbName);
    console.log("[INFO] MongoDB подключена");
  } catch (err) {
    // Если локальный mongod не запущен, запускаем встроенный MongoMemoryServer на 27017
    console.log("[INFO] Запуск встроенного экземпляра MongoDB...");
    memoryServer = await MongoMemoryServer.create({
      instance: { port: 27017, dbName }
    });
    client = new MongoClient('mongodb://127.0.0.1:27017/' + dbName);
    await client.connect();
    db = client.db(dbName);
    console.log("[INFO] MongoDB подключена");
  }

  // Создаем необходимые индексы
  const usersCol = db.collection('users');
  await usersCol.createIndex({ email: 1 }, { unique: true });
  await usersCol.createIndex({ name: "text", email: "text" });

  return db;
}

function getDB() {
  if (!db) {
    throw new Error("База данных не инициализирована. Вызовите connectDB()");
  }
  return db;
}

function getClient() {
  return client;
}

async function closeDB() {
  if (client) await client.close();
  if (memoryServer) await memoryServer.stop();
}

module.exports = {
  connectDB,
  getDB,
  getClient,
  closeDB
};
