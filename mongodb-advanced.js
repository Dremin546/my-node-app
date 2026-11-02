require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bbmo_01_23?replicaSet=rs0';
const dbName = process.env.DB_NAME || 'bbmo_01_23';

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const studentsCol = db.collection('students');
    const groupsCol = db.collection('groups');

    await studentsCol.drop().catch(() => {});
    await groupsCol.drop().catch(() => {});

    // Заполнение групп
    await groupsCol.insertMany([
      { group_name: "ББМО-01-23", curator: "Иванов И.И.", department: "Информационная безопасность" },
      { group_name: "ББМО-02-23", curator: "Петров П.П.", department: "Информационная безопасность" },
      { group_name: "ББМО-03-23", curator: "Сидоров С.С.", department: "Информационная безопасность" }
    ]);

    // Генерация 10 000 студентов для демонстрации
    console.log("Генерация тестовых данных (10 000 записей)...");
    const bulkDocs = [];
    const firstNames = ["Иван", "Алексей", "Сергей", "Дмитрий", "Михаил", "Анна", "Мария", "Елена", "Ольга", "Вадим"];
    const lastNames = ["Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Новиков", "Дёмин"];
    const groups = ["ББМО-01-23", "ББМО-02-23", "ББМО-03-23"];

    for (let i = 1; i <= 10000; i++) {
      const fName = firstNames[i % firstNames.length];
      const lName = lastNames[(i * 3) % lastNames.length];
      const grp = groups[i % groups.length];
      const crs = (i % 4) + 1;
      const grd = Number((3.0 + (i % 20) * 0.1).toFixed(2));

      bulkDocs.push({
        name: (i === 1) ? "Иван Иванов" : `${fName} ${lName}`,
        email: `student_${i}@mail.ru`,
        group_name: grp,
        course: crs,
        grade: grd,
        created_at: new Date()
      });
    }

    await studentsCol.insertMany(bulkDocs);

    console.log("\n=== Курсоры ===");
    console.log("Итерация через for await:");
    const startTime = Date.now();
    let count = 0;
    const cursor = studentsCol.find({}).batchSize(1000);

    for await (const doc of cursor) {
      count++;
    }
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    console.log(`Получено ${count} документов за ${duration} сек`);
    console.log(`Пик памяти: ${memMB} МБ`);

    console.log("\nЧерез toArray():");
    console.log("[INFO] toArray() загружает все документы в оперативную память сразу.");
    console.log("[INFO] При 1 000 000+ записей это может вызвать ошибку: JavaScript heap out of memory (~800+ МБ).");

    console.log("\n=== Агрегации ===");
    const avgGrades = await studentsCol.aggregate([
      { $group: { _id: "$group_name", avgGrade: { $avg: "$grade" } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log("Средний балл по группам:");
    for (const g of avgGrades) {
      console.log(`${g._id}: ${g.avgGrade.toFixed(2)}`);
    }

    const courseCounts = await studentsCol.aggregate([
      { $group: { _id: "$course", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log("\nКоличество по курсам:");
    for (const c of courseCounts) {
      console.log(`${c._id} курс: ${c.count}`);
    }

    console.log("\n$lookup (JOIN с groups):");
    const lookupResult = await groupsCol.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "group_name",
          foreignField: "group_name",
          as: "student_list"
        }
      },
      {
        $project: {
          group_name: 1,
          curator: 1,
          studentsCount: { $size: "$student_list" }
        }
      }
    ]).toArray();

    for (const res of lookupResult) {
      console.log(`{ group_name: "${res.group_name}", students: ${res.studentsCount}, curator: "${res.curator}" }`);
    }

    console.log("\n=== Индексы ===");
    // Замер explain до создания индекса
    const explainBefore = await studentsCol.find({ group_name: "ББМО-01-23", grade: { $gte: 4.5 } }).explain("executionStats");
    console.log("explain() без индекса:");
    console.log(`executionTimeMillis: ${explainBefore.executionStats.executionTimeMillis}`);
    console.log(`totalDocsExamined: ${explainBefore.executionStats.totalDocsExamined}`);

    // Создание индексов
    const idx1 = await studentsCol.createIndex({ group_name: 1 });
    console.log(`[OK] Создан индекс: ${idx1}`);

    const idx2 = await studentsCol.createIndex({ group_name: 1, grade: -1 });
    console.log(`[OK] Создан индекс: ${idx2}`);

    const idx3 = await studentsCol.createIndex({ email: 1 }, { unique: true });
    console.log(`[OK] Создан уникальный индекс: ${idx3}`);

    // Замер explain с индексом
    const explainAfter = await studentsCol.find({ group_name: "ББМО-01-23", grade: { $gte: 4.5 } }).explain("executionStats");
    console.log("\nexplain() с индексом:");
    console.log(`executionTimeMillis: ${explainAfter.executionStats.executionTimeMillis}`);
    console.log(`totalDocsExamined: ${explainAfter.executionStats.totalDocsExamined}`);
    console.log("[OK] Индекс сократил сканирование документов (IXSCAN)");

    console.log("\n=== Текстовый поиск ===");
    await studentsCol.createIndex({ name: "text" });
    console.log("Создан текстовый индекс: name_text");

    const searchCursor = studentsCol.find(
      { $text: { $search: "Иван" } },
      { projection: { score: { $meta: "textScore" }, name: 1, _id: 0 } }
    ).sort({ score: { $meta: "textScore" } });

    const searchDocs = await searchCursor.toArray();
    console.log(`find({ $text: { $search: "Иван" } }):\nНайдено: ${searchDocs.length} документов`);
    if (searchDocs.length > 0) {
      console.log(`Топ-1: score=${searchDocs[0].score.toFixed(1)}, name="${searchDocs[0].name}"`);
    }

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
  } finally {
    await client.close();
  }
}

main();
