const { Writable } = require('stream');

const data = [
  "Группа: ББМО-01-23",
  "Студент: Дёмин Вадим",
  "Лабораторная работа: №21",
  "Тема: Потоки в Node.js"
];

let i = 0;

const writable = new Writable({
  highWaterMark: 75,
  write(chunk, encoding, callback) {
    setTimeout(callback, 50);
  }
});

function writeData() {
  while (i < data.length) {
    const chunk = data[i];
    console.log(`[WRITE] ${chunk}`);
    const canWrite = writable.write(chunk);
    i++;
    if (!canWrite) {
      console.log(`write() вернул: false ← буфер переполнен!\n`);
      return;
    } else {
      console.log(`write() вернул: true\n`);
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

writable.on('error', (err) => {
  console.error("Ошибка записи:", err);
});

console.log("=== Демонстрация Writable-потока ===\n");
writeData();
