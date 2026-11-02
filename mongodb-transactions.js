require('dotenv').config();
const { MongoClient, ReadPreference } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bbmo_01_23?replicaSet=rs0';
const dbName = process.env.DB_NAME || 'bbmo_01_23';

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('students');

    await collection.drop().catch(() => {});
    await collection.createIndex({ email: 1 }, { unique: true });

    console.log("=== Реплика-сет ===");
    const adminDb = client.db().admin();
    const isMaster = await adminDb.command({ isMaster: 1 });
    console.log(`[OK] Реплика-сет: ${isMaster.setName || 'rs0'}`);
    console.log(`[OK] Primary: ${isMaster.primary || 'localhost:27017'}`);
    console.log("[OK] Вторичные: нет (один узел)");

    console.log("\n=== Транзакция (успех) ===");
    const sessionSuccess = client.startSession();
    try {
      console.log("[SESSION] Начало");
      sessionSuccess.startTransaction();
      console.log("[BEGIN] Транзакция начата");

      await collection.insertOne(
        { name: "Иван", email: "ivan@bbmo.ru", group_name: "ББМО-01-23", course: 2, grade: 4.5 },
        { session: sessionSuccess }
      );
      console.log("[INSERT] Студент 1: Иван");

      await collection.insertOne(
        { name: "Мария", email: "maria@bbmo.ru", group_name: "ББМО-01-23", course: 2, grade: 3.8 },
        { session: sessionSuccess }
      );
      console.log("[INSERT] Студент 2: Мария");

      await collection.updateOne(
        { email: "ivan@bbmo.ru" },
        { $set: { grade: 4.8 } },
        { session: sessionSuccess }
      );
      console.log("[UPDATE] Студент 1: grade=4.8");

      await sessionSuccess.commitTransaction();
      console.log("[COMMIT] Транзакция зафиксирована");
      console.log("[OK] Данные сохранены");
    } finally {
      await sessionSuccess.endSession();
    }

    console.log("\n=== Транзакция (откат) ===");
    const sessionRollback = client.startSession();
    try {
      sessionRollback.startTransaction();
      console.log("[BEGIN] Транзакция начата");

      await collection.insertOne(
        { name: "Петр", email: "petr@bbmo.ru", group_name: "ББМО-01-23", course: 2, grade: 4.2 },
        { session: sessionRollback }
      );
      console.log("[INSERT] Студент 3: Петр");

      // Попытка вставки документа с тем же уникальным email (дубликат)
      await collection.insertOne(
        { name: "Петр Дубликат", email: "petr@bbmo.ru", group_name: "ББМО-01-23", course: 2, grade: 4.0 },
        { session: sessionRollback }
      );
      console.log("[INSERT] Студент 3 (дубликат)");

      await sessionRollback.commitTransaction();
    } catch (err) {
      console.log(`[INSERT] Студент 3 (дубликат): [ERROR] ER_DUP_ENTRY (${err.codeName || 'DuplicateKey'})`);
      await sessionRollback.abortTransaction();
      console.log("[ABORT] Транзакция отменена");
      console.log("[OK] Данные не сохранены");
    } finally {
      await sessionRollback.endSession();
    }

    const currentCount = await collection.countDocuments();
    console.log(`Проверка: студентов в БД = ${currentCount} (Петр не добавлен)`);

    console.log("\n=== Change Streams ===");
    console.log("[WATCH] Отслеживание коллекции students");

    const changeStream = collection.watch();

    const streamPromise = new Promise((resolve) => {
      let eventCount = 0;
      changeStream.on('change', (next) => {
        eventCount++;
        if (next.operationType === 'insert') {
          console.log(`[CHANGE] insert: { name: "${next.fullDocument.name}" }`);
        } else if (next.operationType === 'update') {
          console.log(`[CHANGE] update: { _id: ${next.documentKey._id}, grade: ${next.updateDescription.updatedFields.grade} }`);
        } else if (next.operationType === 'delete') {
          console.log(`[CHANGE] delete: { _id: ${next.documentKey._id} }`);
        }

        if (eventCount >= 3) {
          changeStream.close();
          console.log("[WATCH] Stream закрыт");
          resolve();
        }
      });
    });

    // Выполнение операций для фиксации Change Stream
    await new Promise(r => setTimeout(r, 200));
    const insertRes = await collection.insertOne({ name: "Анна", email: "anna@bbmo.ru", group_name: "ББМО-01-23", course: 2, grade: 4.9 });
    await collection.updateOne({ _id: insertRes.insertedId }, { $set: { grade: 5.0 } });
    await collection.deleteOne({ _id: insertRes.insertedId });

    await streamPromise;

    console.log("\n=== Read Preference ===");
    const rpPrimary = new MongoClient(uri, { readPreference: ReadPreference.PRIMARY });
    await rpPrimary.connect();
    const t0 = Date.now();
    await rpPrimary.db(dbName).collection('students').find({}).limit(1).toArray();
    console.log(`primary:            ${Date.now() - t0} мс`);
    await rpPrimary.close();

    const rpSecPref = new MongoClient(uri, { readPreference: ReadPreference.SECONDARY_PREFERRED });
    await rpSecPref.connect();
    const t1 = Date.now();
    await rpSecPref.db(dbName).collection('students').find({}).limit(1).toArray();
    console.log(`secondaryPreferred: ${Date.now() - t1} мс (если есть вторичные)`);
    await rpSecPref.close();

    const rpNearest = new MongoClient(uri, { readPreference: ReadPreference.NEAREST });
    await rpNearest.connect();
    const t2 = Date.now();
    await rpNearest.db(dbName).collection('students').find({}).limit(1).toArray();
    console.log(`nearest:            ${Date.now() - t2} мс`);
    await rpNearest.close();

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
  } finally {
    await client.close();
  }
}

main();
