const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

async function run() {
  const repl = await MongoMemoryReplSet.create({
    replSet: { count: 1, name: 'rs0', storageEngine: 'wiredTiger' },
    instanceOpts: [{ port: 27017 }]
  });

  console.log('[INFO] MongoDB Replica Set rs0 запущен на порту 27017');

  const client = new MongoClient('mongodb://127.0.0.1:27017/?replicaSet=rs0');
  await client.connect();
  const db = client.db('bbmo_01_23');
  try {
    await db.command({
      createUser: 'student',
      pwd: 'password',
      roles: [{ role: 'readWrite', db: 'bbmo_01_23' }, { role: 'dbAdmin', db: 'bbmo_01_23' }]
    });
  } catch (e) {}
  await client.close();
  console.log('[INFO] MongoDB готова к подключениям');
}

run();
