const os = require('os');

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h} ч ${m} мин ${s} сек`;
}

console.log('=== Информация о системе (группа ББМО-01-23) ===');
console.log(`Платформа: ${os.platform()}`);
console.log(`Тип ОС: ${os.type()}`);
console.log(`Архитектура: ${os.arch()}`);
console.log(`Версия ОС: ${os.release()}`);
console.log(`Имя хоста: ${os.hostname()}`);
console.log(`Время работы: ${formatUptime(os.uptime())}\n`);

const platform = os.platform();
if (platform === 'win32') {
  console.log('Вы работаете в Windows');
} else if (platform === 'linux') {
  console.log('Вы работаете в Linux');
} else if (platform === 'darwin') {
  console.log('Вы работаете в macOS');
} else {
  console.log('Неизвестная платформа');
}
