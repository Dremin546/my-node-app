const fs = require('fs').promises;
const path = require('path');

function getFormattedDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function printTree(dirPath, indent = '') {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    const nextIndent = indent + (isLast ? '    ' : '│   ');

    if (entry.isDirectory()) {
      console.log(`${indent}${branch}${entry.name}/`);
      await printTree(path.join(dirPath, entry.name), nextIndent);
    } else {
      console.log(`${indent}${branch}${entry.name}`);
    }
  }
}

async function main() {
  const variant = 6;
  const root = path.join('.', `project_${variant}`);

  try {
    try {
      await fs.rm(root, { recursive: true, force: true });
    } catch {}

    const dirs = [
      root,
      path.join(root, 'src'),
      path.join(root, 'src', 'modules'),
      path.join(root, 'src', 'components'),
      path.join(root, 'src', 'utils'),
      path.join(root, 'data'),
      path.join(root, 'data', 'input'),
      path.join(root, 'data', 'output'),
      path.join(root, 'temp')
    ];

    for (const d of dirs) {
      await fs.mkdir(d, { recursive: true });

      const folderName = path.basename(d);
      await fs.writeFile(
        path.join(d, 'info.txt'),
        `Папка: ${folderName}\nНазначение: директория ${folderName} проекта.`,
        'utf8'
      );

      if (variant % 2 === 0) {
        await fs.writeFile(
          path.join(d, 'README.md'),
          `# ${folderName}\nДата: ${getFormattedDate()}\n`,
          'utf8'
        );
      }
    }

    console.log(`\nСтруктура ${root}/:`);
    console.log(`${root}/`);
    await printTree(root);

    await fs.rename(path.join(root, 'temp'), path.join(root, 'data', 'temp'));
    await fs.rename(path.join(root, 'data', 'output'), path.join(root, 'data', 'results'));
    await fs.rm(path.join(root, 'data', 'temp'), { recursive: true, force: true });

    console.log(`\nОбновленная структура:`);
    console.log(`${root}/`);
    await printTree(root);

  } catch (err) {
    console.error(`Ошибка при работе с каталогами: ${err.message}`);
  }
}

main();
