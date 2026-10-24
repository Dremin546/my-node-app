const os = require('os');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'monitor.log');
const GROUP = 'ББМО-01-23';

function getCpuTimes() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }

  return { idle, total };
}

function formatTime(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const date = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
  const time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
  return `${date} ${time}`;
}

function logAlert(message) {
  const entry = `[${formatTime()}] [${GROUP}] Предупреждение: ${message}\n`;
  fs.appendFileSync(LOG_FILE, entry, 'utf-8');
}

let startCpu = getCpuTimes();
let warningsCount = 0;

console.log(`Мониторинг (группа ${GROUP}). Ctrl+C для выхода.\n`);

const interval = setInterval(() => {
  const currentCpu = getCpuTimes();

  const idleDiff = currentCpu.idle - startCpu.idle;
  const totalDiff = currentCpu.total - startCpu.total;
  startCpu = currentCpu;

  const busyDiff = totalDiff - idleDiff;
  const cpuPercent = totalDiff > 0 ? ((busyDiff / totalDiff) * 100).toFixed(1) : '0.0';

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramPercent = ((usedMem / totalMem) * 100).toFixed(1);
  const freeGB = (freeMem / (1024 ** 3)).toFixed(2);
  const freePercent = (freeMem / totalMem) * 100;

  let alertSuffix = '';
  let warningsForTick = [];

  const cpuNum = parseFloat(cpuPercent);
  if (cpuNum > 80) {
    alertSuffix = ' ⚠⚠';
    warningsForTick.push(`Высокая загрузка CPU: ${cpuPercent}%`);
  } else if (cpuNum > 50) {
    alertSuffix = ' ⚠';
    warningsForTick.push(`Повышенная загрузка CPU: ${cpuPercent}%`);
  }

  if (freePercent < 10) {
    alertSuffix += ' ⚠ (мало RAM)';
    warningsForTick.push(`Критически мало памяти: ${freeGB} ГБ (${freePercent.toFixed(1)}%)`);
  }

  if (warningsForTick.length > 0) {
    warningsCount += warningsForTick.length;
    for (const w of warningsForTick) {
      logAlert(w);
    }
  }

  console.log(`CPU: ${cpuPercent}% | RAM: ${ramPercent}% (${freeGB} ГБ свободно)${alertSuffix}`);
}, 2000);

process.on('SIGINT', () => {
  clearInterval(interval);
  console.log(`\nМониторинг остановлен. Предупреждений: ${warningsCount}`);
  process.exit(0);
});
