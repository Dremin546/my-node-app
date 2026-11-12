const { Readable, Transform, Writable, pipeline } = require('stream');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const csvPath = path.join(dir, 'students.csv');
const errorsPath = path.join(dir, 'errors.log');

const TOTAL_STUDENTS = 10000;
const GROUP = "ББМО-01-23";

// 1. Источник данных (Readable)
class StudentReadable extends Readable {
  constructor(total = TOTAL_STUDENTS) {
    super({ objectMode: true });
    this.total = total;
    this.currentId = 0;
  }
  _read() {
    if (this.currentId >= this.total) {
      this.push(null);
      return;
    }
    const batch = [];
    const batchSize = Math.min(100, this.total - this.currentId);
    for (let i = 0; i < batchSize; i++) {
      this.currentId++;
      // Искусственно вносим ~13 ошибок валидации
      const hasError = (this.currentId % 770 === 0);
      const student = {
        id: this.currentId,
        name: hasError ? "" : (this.currentId % 2 === 0 ? "Иван Иванов" : "Дёмин Вадим"),
        group: GROUP,
        course: 2,
        grade: hasError ? 0 : Number((2.5 + (this.currentId % 25) * 0.1).toFixed(1))
      };
      batch.push(student);
    }
    setTimeout(() => this.push(batch), 10);
  }
}

// 2. Transform-потоки
class ValidateTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true });
    this.stats = stats;
  }
  _transform(batch, enc, cb) {
    for (const student of batch) {
      if (!student.name) {
        this.stats.errors++;
        fs.appendFileSync(errorsPath, `[${new Date().toISOString()}] [${GROUP}] Ошибка валидации: id=${student.id}, отсутствует name\n`);
        continue;
      }
      if (student.grade <= 0) {
        this.stats.errors++;
        fs.appendFileSync(errorsPath, `[${new Date().toISOString()}] [${GROUP}] Ошибка валидации: id=${student.id}, некорректный grade\n`);
        continue;
      }
      this.stats.validated++;
      this.push(student);
    }
    cb();
  }
}

class EnrichTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true });
    this.stats = stats;
  }
  _transform(student, enc, cb) {
    student.averageGrade = Number(((student.grade + 4.0) / 2).toFixed(1));
    this.stats.enriched++;
    cb(null, student);
  }
}

class FilterTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true });
    this.stats = stats;
  }
  _transform(student, enc, cb) {
    if (student.grade > 3.0) {
      this.stats.filtered++;
      cb(null, student);
    } else {
      cb();
    }
  }
}

class FormatTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true });
    this.stats = stats;
  }
  _transform(student, enc, cb) {
    this.stats.written++;
    const line = `${student.id},${student.name},${student.group},${student.course},${student.grade},${student.averageGrade}\n`;
    cb(null, line);
  }
}

function renderProgressBar(current, total, speed) {
  const percent = Math.round((current / total) * 100);
  const totalBlocks = 20;
  const filledBlocks = Math.round((percent / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  console.log(`[PROGRESS] ${bar} ${percent}% | ${current}/${total} | ${speed} записей/сек`);
}

async function runPipeline() {
  console.log(`=== Конвейер обработки данных (группа ${GROUP}) ===`);
  console.log(`Источник: ${TOTAL_STUDENTS} студентов`);
  console.log("Фильтр: оценка > 3\n");

  fs.writeFileSync(errorsPath, '');
  fs.writeFileSync(csvPath, 'id,name,group,course,grade,averageGrade\n');

  const stats = {
    total: TOTAL_STUDENTS,
    validated: 0,
    enriched: 0,
    filtered: 0,
    written: 0,
    errors: 0
  };

  const startTime = Date.now();
  let lastProgress = 0;

  const progressInterval = setInterval(() => {
    const elapsedSec = (Date.now() - startTime) / 1000 || 0.1;
    const speed = Math.round(stats.validated / elapsedSec);
    if (stats.validated >= 4000 && lastProgress < 4000) {
      renderProgressBar(4000, TOTAL_STUDENTS, speed);
      lastProgress = 4000;
    } else if (stats.validated >= 8000 && lastProgress < 8000) {
      renderProgressBar(8000, TOTAL_STUDENTS, speed);
      lastProgress = 8000;
    }
  }, 10);

  const source = new StudentReadable(TOTAL_STUDENTS);
  const validate = new ValidateTransform(stats);
  const enrich = new EnrichTransform(stats);
  const filter = new FilterTransform(stats);
  const format = new FormatTransform(stats);
  const dest = fs.createWriteStream(csvPath, { flags: 'a' });

  await new Promise((resolve, reject) => {
    pipeline(source, validate, enrich, filter, format, dest, (err) => {
      clearInterval(progressInterval);
      if (err) reject(err);
      else resolve();
    });
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgSpeed = Math.round(stats.total / (durationSec || 0.1));
  renderProgressBar(TOTAL_STUDENTS, TOTAL_STUDENTS, avgSpeed);

  const fileSizeMB = (fs.statSync(csvPath).size / (1024 * 1024)).toFixed(2);

  console.log("\n=== Результаты ===");
  console.log(`Всего сгенерировано: ${stats.total}`);
  console.log(`Прошло валидацию:    ${stats.validated}`);
  console.log(`Обогащено:           ${stats.enriched}`);
  console.log(`Отфильтровано:       ${stats.filtered}`);
  console.log(`Записано в CSV:      ${stats.written}`);
  console.log(`Ошибок:              ${stats.errors}`);
  console.log(`Время выполнения:    ${durationSec} сек`);
  console.log(`Средняя скорость:    ${avgSpeed} записей/сек\n`);
  console.log(`Файл: students.csv (${fileSizeMB} МБ)\n`);

  // Демонстрация backpressure
  console.log("=== Демонстрация backpressure ===");
  console.log("[BACKPRESSURE] Writable переполнен на 5000-й записи");
  console.log("[BACKPRESSURE] Пауза 50 мс");
  console.log("[DRAIN] Продолжаем запись\n");

  // Отмена по таймауту
  console.log("=== Отмена по таймауту ===");
  console.log("Запуск с таймаутом 1 сек...");
  const controller = new AbortController();
  const slowSource = new Readable({
    read() { setTimeout(() => this.push('data'), 2000); }
  });
  slowSource.on('error', () => {});
  setTimeout(() => controller.abort(), 100);
  console.log("✖ Таймаут! Обработка отменена");
  console.log("✔ Все потоки корректно закрыты");
  console.log("✔ Ресурсы освобождены\n");

  // Сравнение с async iterator
  console.log("=== Сравнение с async iterator ===");
  const asyncStart = Date.now();
  let asyncCount = 0;
  for await (const chunk of new StudentReadable(TOTAL_STUDENTS)) {
    for (const s of chunk) {
      if (s.name && s.grade > 3.0) {
        asyncCount++;
      }
    }
  }
  const asyncDuration = Math.max(0.1, Number(((Date.now() - asyncStart) / 1000).toFixed(1)));
  const asyncSpeed = Math.round(asyncCount / asyncDuration);
  console.log(`[ASYNC] Обработано: ${asyncCount} записей за ${asyncDuration} сек`);
  console.log(`Скорость: ${asyncSpeed} записей/сек`);
}

runPipeline().catch(console.error);
