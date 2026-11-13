const { Readable, Transform, Writable } = require('stream');

// 1. UpperCaseTransform
class UpperCaseTransform extends Transform {
  constructor(options = {}) {
    super(options);
  }
  _transform(chunk, encoding, callback) {
    const str = chunk.toString();
    this.push(`[BBMO-01-23] ${str.toUpperCase()}`);
    callback();
  }
}

// 2. JsonParserTransform
class JsonParserTransform extends Transform {
  constructor() {
    super({ readableObjectMode: true, writableObjectMode: false });
  }
  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        this.push(obj);
      } catch (e) {
        // Пропускаем невалидный JSON
      }
    }
    callback();
  }
}

// 3. FilterTransform
class FilterTransform extends Transform {
  constructor(predicate) {
    super({ objectMode: true });
    this.predicate = predicate;
  }
  _transform(chunk, encoding, callback) {
    if (this.predicate(chunk)) {
      this.push(chunk);
    }
    callback();
  }
}

async function run() {
  // Демонстрация 1: UpperCaseTransform
  console.log("=== Демонстрация Transform-потока ===");
  const inputs = ['группа ббмо-01-23', 'студент демин вадим'];
  for (const text of inputs) {
    console.log(`Вход: "${text}"`);
    const upper = new UpperCaseTransform();
    await new Promise(resolve => {
      upper.on('data', (out) => {
        console.log(`Выход: "${out}"\n`);
        resolve();
      });
      upper.write(text);
      upper.end();
    });
  }

  // Демонстрация 2: Object Mode
  console.log("=== Демонстрация Object Mode ===");
  const students = [
    { id: 1, name: "Вадим Дёмин", group: "ББМО-01-23" },
    { id: 2, name: "Мария", group: "ББМО-02-23" },
    { id: 3, name: "Петр", group: "ББМО-01-23" }
  ];
  for (const s of students) {
    console.log(`[OBJECT]`, s);
  }

  console.log("\nПосле фильтрации (только ББМО-01-23):");
  const filter = new FilterTransform(s => s.group === 'ББМО-01-23');
  const studentSource = Readable.from(students);
  studentSource.pipe(filter).on('data', (s) => {
    console.log(`[OBJECT]`, s);
  });
  await new Promise(r => filter.on('end', r));

  // Демонстрация 3: Async Iterator
  console.log("\n=== Демонстрация async iterator ===");
  const asyncSource = Readable.from(["Данные 1", "Данные 2", "Данные 3"]);
  let chunkNum = 1;
  for await (const chunk of asyncSource) {
    console.log(`[ASYNC] Получен чанк ${chunkNum}: "${chunk}"`);
    chunkNum++;
  }
  console.log("[ASYNC] Поток завершён");

  // Демонстрация 4: Цепочка Transform
  console.log("\n=== Цепочка Transform ===");
  console.log("Читаем → UpperCase → Filter → Записываем");
  
  const testRows = [
    "студент 1 ББМО-01-23", "студент 2 ББМО-01-23", "студент 3 ББМО-02-23",
    "студент 4 ББМО-01-23", "студент 5 ББМО-01-23", "студент 6 ББМО-03-23",
    "студент 7 ББМО-01-23", "студент 8 ББМО-01-23", "студент 9 ББМО-04-23",
    "студент 10 ББМО-01-23"
  ];
  let processed = 0;
  let filtered = 0;

  const countUpper = new Transform({
    transform(chunk, enc, cb) {
      processed++;
      cb(null, chunk.toString().toUpperCase());
    }
  });

  const countFilter = new Transform({
    transform(chunk, enc, cb) {
      if (chunk.toString().includes("ББМО-01-23")) {
        filtered++;
        cb(null, chunk);
      } else {
        cb();
      }
    }
  });

  const nullWriter = new Writable({
    write(chunk, enc, cb) { cb(); }
  });

  const chainSource = Readable.from(testRows);
  chainSource.pipe(countUpper).pipe(countFilter).pipe(nullWriter);
  await new Promise(r => nullWriter.on('finish', r));

  console.log(`✔ Обработано ${processed} строк, отфильтровано ${filtered}`);
}

run();
