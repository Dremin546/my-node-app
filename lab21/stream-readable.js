const { Readable } = require('stream');

const data = [
  "Группа: ББМО-01-23",
  "Студент: Вадим",
  "Лабораторная работа: №21",
  "Тема: Потоки в Node.js"
];

let index = 0;

const readable = new Readable({
  read(size) {
    if (index < data.length) {
      this.push(`[CHUNK ${index + 1}] ${data[index]}\n`);
      index++;
    } else {
      this.push(null);
    }
  }
});

console.log("=== Демонстрация Readable-потока ===");

readable.on('data', (chunk) => {
  process.stdout.write(chunk);
});

readable.on('end', () => {
  console.log("[END] Поток завершён");
  console.log(`Всего получено чанков: ${index}`);
});
