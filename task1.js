const fs = require('fs').promises;
const path = require('path');

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
  const t = [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(':');
  return `${d} ${t}`;
}

async function main() {
  const variant = 6;
  const fileName = `student_${variant}.txt`;
  const filePath = path.join('.', fileName);

  try {
    const info = [
      'Студент: Дёмин Вадим',
      'Группа: 477',
      `Вариант: ${variant}`,
      `Дата: ${formatDate(new Date())}`,
      '',
      'Любимые книги:',
      '1. "Война и мир" - Л. Толстой',
      '2. "Преступление и наказание" - Ф. Достоевский',
      '3. "Мастер и Маргарита" - М. Булгаков',
      '4. "1984" - Дж. Оруэлл',
      '5. "Гарри Поттер" - Дж. Роулинг'
    ].join('\n');

    await fs.writeFile(filePath, info, 'utf8');
    console.log(`Создан файл: ${fileName}`);

    const content = await fs.readFile(filePath, 'utf8');
    const linesCount = content.split('\n').filter(l => l.trim().length > 0).length;

    await fs.appendFile(filePath, `\nКоличество записей: ${linesCount}\n`, 'utf8');

    const result = await fs.readFile(filePath, 'utf8');
    console.log('Содержимое файла:');
    console.log('─'.repeat(35));
    console.log(result.trim());
    console.log('─'.repeat(35));

  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Файл не найден: ${filePath}`);
    } else if (err.code === 'EACCES') {
      console.error(`Нет прав доступа: ${filePath}`);
    } else {
      console.error(`Ошибка: ${err.message}`);
    }
  }
}

main();
