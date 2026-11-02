require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bbmo_01_23?replicaSet=rs0';
const dbName = process.env.DB_NAME || 'bbmo_01_23';

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('students');

    await collection.drop().catch(() => {});

    console.log("=== Коллекция students (группа ББМО-01-23) ===");

    await collection.createIndex({ group_name: 1 });

    console.log("\n--- INSERT ---");
    const singleStudent = {
      name: "Иван",
      group_name: "ББМО-01-23",
      course: 2,
      grade: 4.5,
      created_at: new Date()
    };
    const insertOneResult = await collection.insertOne(singleStudent);
    console.log(`[OK] Вставлен: insertedId=ObjectId("${insertOneResult.insertedId}")`);

    const manyStudents = [
      { name: "Мария", group_name: "ББМО-01-23", course: 2, grade: 3.8, created_at: new Date() },
      { name: "Петр", group_name: "ББМО-01-23", course: 2, grade: 4.2, created_at: new Date() },
      { name: "Анна", group_name: "ББМО-01-23", course: 2, grade: 4.9, created_at: new Date() },
      { name: "Алексей", group_name: "ББМО-01-23", course: 2, grade: 4.0, created_at: new Date() },
      { name: "Сергей", group_name: "ББМО-02-23", course: 1, grade: 2.8, created_at: new Date() },
      { name: "Дмитрий", group_name: "ББМО-02-23", course: 1, grade: 2.5, created_at: new Date() },
      { name: "Елена", group_name: "ББМО-02-23", course: 1, grade: 2.9, created_at: new Date() },
      { name: "Ольга", group_name: "ББМО-03-23", course: 3, grade: 4.7, created_at: new Date() },
      { name: "Вадим", group_name: "ББМО-01-23", course: 2, grade: 5.0, created_at: new Date() }
    ];
    const insertManyResult = await collection.insertMany(manyStudents);
    console.log(`[OK] Вставлено 9 документов: count=${insertManyResult.insertedCount}`);

    console.log("\n--- SELECT ---");
    const allStudents = await collection.find({}).toArray();
    console.log(`Все документы (${allStudents.length}):`);
    for (const s of allStudents.slice(0, 5)) {
      console.log(`{ _id: ${s._id}, name: "${s.name}", group: "${s.group_name}", grade: ${s.grade} }`);
    }

    const groupStudents = await collection.find({ group_name: "ББМО-01-23" }).toArray();
    console.log(`\nС фильтром по группе (${groupStudents.length}):`);
    for (const s of groupStudents.slice(0, 4)) {
      console.log(`{ name: "${s.name}", group: "${s.group_name}", grade: ${s.grade} }`);
    }

    console.log("\nСортировка по grade (desc):");
    const sorted = await collection.find({ group_name: "ББМО-01-23" }).sort({ grade: -1 }).limit(3).toArray();
    for (const s of sorted) {
      console.log(`{ name: "${s.name}", grade: ${s.grade} }`);
    }

    console.log("\nС проекцией (только name, grade):");
    const projected = await collection.find({}, { projection: { name: 1, grade: 1, _id: 0 } }).limit(4).toArray();
    for (const s of projected) {
      console.log(`{ name: "${s.name}", grade: ${s.grade} }`);
    }

    console.log("\n--- UPDATE ---");
    const updateOneResult = await collection.updateOne(
      { _id: insertOneResult.insertedId },
      { $set: { grade: 4.8 } }
    );
    console.log(`[OK] updateOne: matchedCount=${updateOneResult.matchedCount}, modifiedCount=${updateOneResult.modifiedCount}`);

    const updateManyResult = await collection.updateMany(
      { group_name: "ББМО-01-23" },
      { $inc: { course: 1 } }
    );
    console.log(`[OK] updateMany (group=ББМО-01-23, $inc: course+1): matchedCount=${updateManyResult.matchedCount}`);

    console.log("\n--- DELETE ---");
    const deleteOneResult = await collection.deleteOne({ _id: insertOneResult.insertedId });
    console.log(`[OK] deleteOne: deletedCount=${deleteOneResult.deletedCount}`);

    const deleteManyResult = await collection.deleteMany({ grade: { $lt: 3.0 } });
    console.log(`[OK] deleteMany (grade < 3): deletedCount=${deleteManyResult.deletedCount}`);

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
  } finally {
    await client.close();
  }
}

main();
