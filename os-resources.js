const os = require('os');

const cpus = os.cpus();
const totalSpeed = cpus.reduce((sum, cpu) => sum + cpu.speed, 0);
const avgSpeed = Math.round(totalSpeed / cpus.length);

console.log('=== Информация о процессоре ===');
console.log(`Количество логических ядер: ${cpus.length}`);
console.log(`Модель процессора: ${cpus[0].model.trim()}`);
console.log(`Средняя частота: ${avgSpeed} МГц\n`);

const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const usedPercent = ((usedMem / totalMem) * 100).toFixed(1);
const freePercent = ((freeMem / totalMem) * 100).toFixed(1);

const toGB = (bytes) => (bytes / (1024 ** 3)).toFixed(2);

console.log('=== Информация о памяти ===');
console.log(`Общий объём: ${toGB(totalMem)} ГБ`);
console.log(`Свободно:    ${toGB(freeMem)} ГБ (${freePercent}%)`);
console.log(`Использовано: ${toGB(usedMem)} ГБ (${usedPercent}%)\n`);

console.log('=== Средняя загрузка системы ===');
const load = os.loadavg();
if (os.platform() === 'win32') {
  console.log(`За 1, 5, 15 мин: [${load.join(', ')}] (недоступно в Windows)\n`);
} else {
  console.log(`За 1, 5, 15 мин: [${load.map(v => v.toFixed(2)).join(', ')}]\n`);
}

console.log('Группа: ББМО-01-23');
if (freePercent < 20) {
  console.log('⚠ Внимание: мало свободной памяти (меньше 20%)!');
} else {
  console.log('Память в норме');
}
