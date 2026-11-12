const { Readable } = require('stream');

const data = [
  "Группа: ББМО-01-23",
  "Студент: Дёмин Вадим",
  "Лабораторная работа: №21",
  "Тема: Потоки в Node.js"
];

let index = 0;
let totalBytes = 0;

class MyReadable extends Readable {
  _read(size) {
    if (index < data.length) {
      const chunkStr = `[CHUNK ${index + 1}] ${data[index]}\n`;
      this.push(chunkStr);
      index++;
    } else {
      this.push(null);
    }
  }
}

const readable = new MyReadable();

console.log("=== Демонстрация Readable-потока ===");

readable.on('data', (chunk) => {
  totalBytes += Buffer.byteLength(chunk);
  process.stdout.write(chunk);
});

readable.on('end', () => {
  console.log("[END] Поток завершён");
  console.log(`Всего получено чанков: ${index}`);
  console.log(`Общий размер данных: ${totalBytes} байт`);
});

readable.on('error', (err) => {
  console.error("Ошибка потока:", err);
});
