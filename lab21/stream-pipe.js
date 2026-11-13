const fs = require('fs');
const path = require('path');
const { pipeline, Transform } = require('stream');

const dir = __dirname;
const inputPath = path.join(dir, 'input.txt');
const pipeOutPath = path.join(dir, 'output-pipe.txt');
const pipeErrPath = path.join(dir, 'output-pipe-error.txt');
const pipelineOutPath = path.join(dir, 'output-pipeline.txt');
const pipelineErrPath = path.join(dir, 'output-pipeline-error.txt');
const chainOutPath = path.join(dir, 'output-chain.txt');
const missingPath = path.join(dir, 'missing.txt');

// Убедимся, что input.txt существует
if (!fs.existsSync(inputPath)) {
  fs.writeFileSync(inputPath, 'Тестовые данные для демонстрации работы потоков в Node.js.\nГруппа: ББМО-01-23\nСтудент: Дёмин Вадим\n');
}

async function runDemo() {
  // 1. Демонстрация pipe()
  console.log("=== Демонстрация pipe() ===");
  console.log("Чтение: input.txt");
  console.log("Запись: output-pipe.txt");
  const r1 = fs.createReadStream(inputPath);
  const w1 = fs.createWriteStream(pipeOutPath);
  r1.pipe(w1);
  await new Promise(resolve => w1.on('finish', resolve));
  const stats1 = fs.statSync(inputPath);
  console.log("✔ Копирование завершено");
  console.log(`Размер: ${stats1.size} байт\n`);

  // 2. Демонстрация pipe() с ошибкой
  console.log("=== Демонстрация pipe() с ошибкой ===");
  console.log("Чтение: missing.txt");
  const missing1 = fs.createReadStream(missingPath);
  const w2 = fs.createWriteStream(pipeErrPath);
  missing1.on('error', (err) => {
    console.log(`✖ Ошибка: ${err.code}: no such file or directory`);
    console.log("⚠ Внимание: pipe() не закрыл целевой поток!");
    console.log("⚠ Возможна утечка памяти.\n");
    w2.close();
  });
  missing1.pipe(w2);
  await new Promise(resolve => setTimeout(resolve, 50));

  // 3. Демонстрация pipeline()
  console.log("=== Демонстрация pipeline() ===");
  console.log("Чтение: input.txt");
  console.log("Запись: output-pipeline.txt");
  const r3 = fs.createReadStream(inputPath);
  const w3 = fs.createWriteStream(pipelineOutPath);
  await new Promise(resolve => {
    pipeline(r3, w3, (err) => {
      if (err) console.error("✖ Ошибка:", err.message);
      else console.log("✔ Копирование завершено\n");
      resolve();
    });
  });

  // 4. Демонстрация pipeline() с ошибкой
  console.log("=== Демонстрация pipeline() с ошибкой ===");
  console.log("Чтение: missing.txt");
  const missing2 = fs.createReadStream(missingPath);
  const w4 = fs.createWriteStream(pipelineErrPath);
  await new Promise(resolve => {
    pipeline(missing2, w4, (err) => {
      if (err) {
        console.log(`✖ Ошибка: ${err.code}: no such file or directory`);
        console.log("✔ Все потоки автоматически закрыты");
        console.log("✔ Утечек нет\n");
      }
      resolve();
    });
  });

  // 5. Цепочка потоков: source.pipe(transform1).pipe(transform2).pipe(dest)
  console.log("=== Цепочка потоков ===");
  console.log("input.txt → uppercase → reverse → output-chain.txt");
  const uppercase = new Transform({
    transform(chunk, enc, cb) {
      cb(null, chunk.toString().toUpperCase());
    }
  });
  const reverse = new Transform({
    transform(chunk, enc, cb) {
      cb(null, chunk.toString().split('').reverse().join(''));
    }
  });
  const rChain = fs.createReadStream(inputPath);
  const wChain = fs.createWriteStream(chainOutPath);
  rChain.pipe(uppercase).pipe(reverse).pipe(wChain);
  await new Promise(resolve => wChain.on('finish', resolve));
  console.log("✔ Обработка завершена");
}

runDemo();
