const fs = require('fs').promises;
const path = require('path');

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} байт`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

async function scanDir(currentDir, state) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative('.', fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      state.foldersCount++;
      await scanDir(fullPath, state);
    } else if (entry.isFile()) {
      const stats = await fs.stat(fullPath);
      const ext = path.extname(entry.name).toLowerCase() || 'без расширения';

      state.filesCount++;
      state.totalBytes += stats.size;

      state.files.push({
        name: entry.name,
        path: relPath,
        size: stats.size,
        ext: ext
      });

      if (!state.byExt[ext]) {
        state.byExt[ext] = { count: 0, bytes: 0 };
      }
      state.byExt[ext].count++;
      state.byExt[ext].bytes += stats.size;
    }
  }
}

async function main() {
  const targetDir = process.argv[2] || '.';
  const variant = 6;
  const reportName = `report_${variant}.json`;

  const state = {
    foldersCount: 0,
    filesCount: 0,
    totalBytes: 0,
    files: [],
    byExt: {}
  };

  try {
    await scanDir(targetDir, state);

    const largest = [...state.files].sort((a, b) => b.size - a.size).slice(0, 5);
    const smallest = [...state.files].sort((a, b) => a.size - b.size).slice(0, 5);

    console.log(`📊 Анализ директории: ${targetDir}`);
    console.log(`📁 Общее количество папок: ${state.foldersCount}`);
    console.log(`📄 Общее количество файлов: ${state.filesCount}`);
    console.log(`💾 Общий размер: ${formatSize(state.totalBytes)} (${state.totalBytes} байт)\n`);

    console.log('📂 Расширения файлов:');
    for (const [ext, data] of Object.entries(state.byExt)) {
      console.log(`  ${ext}: ${data.count} файлов (${formatSize(data.bytes)})`);
    }

    console.log('\n🏆 Топ-5 самых больших файлов:');
    largest.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${formatSize(f.size)}) - ${f.path}`));

    console.log('\n🔍 Топ-5 самых маленьких файлов:');
    smallest.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${formatSize(f.size)}) - ${f.path}`));

    const report = {
      variant: variant,
      directory: targetDir,
      date: new Date().toISOString(),
      stats: {
        folders: state.foldersCount,
        files: state.filesCount,
        totalBytes: state.totalBytes,
        extensions: state.byExt
      },
      top5Largest: largest,
      top5Smallest: smallest
    };

    await fs.writeFile(path.join('.', reportName), JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📄 Отчет сохранен: ${reportName}`);

  } catch (err) {
    console.error(`Ошибка при сканировании: ${err.message}`);
  }
}

main();
