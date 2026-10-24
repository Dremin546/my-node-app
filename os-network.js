const os = require('os');

function maskMac(mac) {
  if (!mac || mac === '00:00:00:00:00:00') return mac || 'нет';
  const parts = mac.split(':');
  if (parts.length === 6) {
    return `${parts[0]}:${parts[1]}:${parts[2]}:**:**:**`;
  }
  return mac;
}

console.log('=== Сетевые интерфейсы ===');
const interfaces = os.networkInterfaces();
let mainInterface = null;
let totalInterfaces = 0;

for (const name of Object.keys(interfaces)) {
  totalInterfaces++;
  const nets = interfaces[name];
  const ipv4 = nets.find(n => n.family === 'IPv4');
  const mac = nets[0] ? nets[0].mac : '';
  const isInternal = nets.some(n => n.internal);

  if (!mainInterface && ipv4 && !ipv4.internal) {
    mainInterface = { name, address: ipv4.address };
  }

  console.log(`Интерфейс: ${name}`);
  console.log(`IPv4:       ${ipv4 ? ipv4.address : 'нет'}`);
  console.log(`MAC:        ${maskMac(mac)}`);
  console.log(`Внутренний: ${isInternal ? 'да' : 'нет'}\n`);
}

console.log(`Всего интерфейсов: ${totalInterfaces}`);
if (mainInterface) {
  console.log(`Основной интерфейс: ${mainInterface.name} (${mainInterface.address})\n`);
} else {
  console.log('Основной интерфейс: не определён\n');
}

console.log('=== Информация о пользователе ===');
const user = os.userInfo();
console.log(`Имя пользователя:    ${user.username}`);
console.log(`UID:                 ${user.uid}`);
console.log(`Домашняя директория: ${user.homedir}`);
console.log('Группа:              ББМО-01-23');

const isRoot = user.username === 'root' || user.uid === 0;
console.log(`Проверка root:       ${isRoot ? 'да' : 'нет'}`);
