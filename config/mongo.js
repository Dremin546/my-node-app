require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bbmo_01_23?replicaSet=rs0';
const dbName = process.env.DB_NAME || 'bbmo_01_23';

const client = new MongoClient(uri);

async function connectMongo() {
  await client.connect();
  return client.db(dbName);
}

function getDb() {
  return client.db(dbName);
}

module.exports = {
  client,
  connectMongo,
  getDb
};
