const { Writable } = require('stream');

const writable = new Writable({
  highWaterMark: 16,
  write(chunk, encoding, callback) {
    console.log(`[WRITE] ${chunk.toString().trim()}`);
    setTimeout(callback, 100); 
  }
});

const data = [
  "Группа: ББМО-01-23",
  "Студент: Вадим",
  "Лабораторная работа: №21",
  "Тема: Потоки в Node.js"
];

let i = 0;

function writeData() {
  while (i < data.length) {
    const chunk = data[i];
    const canWrite = writable.write(chunk);
    console.log(`write() вернул: ${canWrite}`);
    i++;
    if (!canWrite) {
      console.log("... буфер переполнен!");
      return;
    }
  }
  writable.end();
}

writable.on('drain', () => {
  console.log("[DRAIN] Буфер освобождён, продолжаем запись");
  writeData();
});

writable.on('finish', () => {
  console.log("[FINISH] Все данные записаны");
  console.log(`Всего записано: ${data.length} чанка`);
});

console.log("=== Демонстрация Writable-потока ===");
writeData();
