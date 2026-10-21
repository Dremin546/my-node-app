const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log('Использование: my-cli <команда> [аргументы]\n');
  console.log('Доступные команды:');
  console.log('  greet <имя> - поприветствовать пользователя');
  console.log('  info        - вывести информацию о группе');
}

if (!command || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (command === 'greet') {
  const name = args[1] || 'Вадим';
  console.log(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ББМО-01-23.`);
  process.exit(0);
}

if (command === 'info') {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  console.log('Группа: ББМО-01-23');
  console.log('Студент: Дёмин Вадим');
  console.log('Лабораторная работа: №17');
  console.log(`Дата: ${dateStr}`);
  process.exit(0);
}

console.error(`Ошибка: неизвестная команда "${command}"`);
console.error('Для справки используйте: my-cli --help');
process.exit(1);
