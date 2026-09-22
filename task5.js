const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

function getMd5(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fsSync.createReadStream(filePath);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} байт`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

async function getFiles(dir, base = dir) {
  let res = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      res = res.concat(await getFiles(full, base));
    } else if (entry.isFile()) {
      const stat = await fs.stat(full);
      res.push({
        name: entry.name,
        fullPath: full,
        relPath: rel,
        size: stat.size,
        ext: path.extname(entry.name).toLowerCase()
      });
    }
  }
  return res;
}

async function initSource(sourceDir, variant) {
  try {
    await fs.rm(sourceDir, { recursive: true, force: true });
  } catch {}

  const subdirs = ['documents', 'media', 'scripts'];
  for (const d of subdirs) {
    await fs.mkdir(path.join(sourceDir, d), { recursive: true });
  }

  const files = [
    { p: 'app.js', c: 'console.log("App");' },
    { p: 'index.html', c: '<h1>Lab 14</h1>' },
    { p: 'style.css', c: 'body { margin: 0; }' },
    { p: 'config.json', c: JSON.stringify({ variant, app: 'sync' }) },
    { p: 'notes.txt', c: 'Тестовая заметка' },
    { p: 'documents/readme.txt', c: 'Инструкция' },
    { p: 'documents/data1.json', c: '{"id": 1}' },
    { p: 'documents/data2.json', c: '{"id": 2}' },
    { p: 'documents/changelog.txt', c: 'v1.0.0' },
    { p: 'documents/big_file.txt', size: 1200000 },
    { p: 'media/logo.png', c: 'PNG_DATA' },
    { p: 'media/banner.jpg', c: 'JPG_DATA' },
    { p: 'media/icon.gif', c: 'GIF_DATA' },
    { p: 'media/pic1.png', c: 'PNG_PIC' },
    { p: 'media/pic2.jpg', c: 'JPG_PIC' },
    { p: 'media/large_photo.jpg', size: 550000 },
    { p: 'scripts/build.js', c: 'console.log("build");' },
    { p: 'scripts/deploy.js', c: 'console.log("deploy");' },
    { p: 'scripts/test.js', c: 'console.log("test");' },
    { p: 'scripts/server.log', c: 'Server started' }
  ];

  for (const f of files) {
    const full = path.join(sourceDir, f.p);
    if (f.size) {
      await fs.writeFile(full, Buffer.alloc(f.size, 'X'));
    } else {
      await fs.writeFile(full, f.c, 'utf8');
    }
  }

  const all = await getFiles(sourceDir);
  const manifest = {
    created: new Date().toISOString(),
    variant: variant,
    totalFiles: all.length,
    files: all.map(f => ({ name: f.name, path: f.relPath, size: f.size }))
  };

  await fs.writeFile(path.join(sourceDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

async function copyBackup(sourceDir, backupDir, variant) {
  const startTime = Date.now();
  console.log(`📂 Исходная директория: ${sourceDir}`);
  console.log(`📂 Директория назначения: ${backupDir}\n`);

  try {
    await fs.rm(backupDir, { recursive: true, force: true });
  } catch {}
  await fs.mkdir(backupDir, { recursive: true });

  const files = await getFiles(sourceDir);
  console.log(`📋 Обнаружено файлов: ${files.length}`);

  let streamCount = 0;
  let normalCount = 0;
  let totalBytes = 0;
  const md5Checks = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dest = path.join(backupDir, file.relPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });

    if (file.size > 1024 * 1024) {
      await new Promise((resolve, reject) => {
        const reader = fsSync.createReadStream(file.fullPath, { highWaterMark: 512 * 1024 });
        let idx = 0;
        const promises = [];
        reader.on('data', (chunk) => {
          promises.push(fs.writeFile(`${dest}.part${idx++}`, chunk));
        });
        reader.on('end', async () => {
          await Promise.all(promises);
          resolve();
        });
        reader.on('error', reject);
      });
      streamCount++;
    } else if (['.txt', '.js', '.json'].includes(file.ext)) {
      await new Promise((resolve, reject) => {
        const r = fsSync.createReadStream(file.fullPath);
        const w = fsSync.createWriteStream(dest);
        r.pipe(w);
        w.on('finish', resolve);
        r.on('error', reject);
        w.on('error', reject);
      });
      streamCount++;
    } else {
      await fs.copyFile(file.fullPath, dest);
      normalCount++;
    }

    totalBytes += file.size;

    if (file.size > 500 * 1024 && file.size <= 1024 * 1024) {
      const srcMd5 = await getMd5(file.fullPath);
      const dstMd5 = await getMd5(dest);
      md5Checks.push({ file: file.relPath, size: file.size, match: srcMd5 === dstMd5, md5: srcMd5 });
    }

    console.log(`⏳ Прогресс копирования: ${i + 1}/${files.length} файлов`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Копирование завершено!`);
  console.log(`📊 Статистика:`);
  console.log(`- Скопировано файлов: ${files.length}`);
  console.log(`- Потоковое копирование: ${streamCount}`);
  console.log(`- Обычное копирование: ${normalCount}`);
  console.log(`- Общий размер: ${formatBytes(totalBytes)}`);
  console.log(`- Время выполнения: ${duration} сек`);

  if (md5Checks.length > 0) {
    console.log(`\nMD5 проверка (файлы > 500 КБ):`);
    for (const c of md5Checks) {
      console.log(`  ${c.file} [${formatBytes(c.size)}] - MD5: ${c.md5} (${c.match ? 'совпадает' : 'ошибка'})`);
    }
  }
}

async function syncDirs(sourceDir, backupDir, variant) {
  await fs.writeFile(path.join(sourceDir, 'new_file.txt'), 'новый файл', 'utf8');
  await fs.appendFile(path.join(sourceDir, 'notes.txt'), ' (изменено)', 'utf8');

  const srcFiles = await getFiles(sourceDir);
  const dstFiles = await getFiles(backupDir);

  const dstMap = new Map(dstFiles.map(f => [f.relPath, f]));
  const srcMap = new Map(srcFiles.map(f => [f.relPath, f]));

  let same = 0;
  let changed = 0;
  let added = 0;
  let deleted = 0;

  for (const sf of srcFiles) {
    if (sf.size > 1024 * 1024) {
      if (dstMap.has(`${sf.relPath}.part0`)) same++;
      else added++;
      continue;
    }
    if (!dstMap.has(sf.relPath)) {
      added++;
    } else {
      const df = dstMap.get(sf.relPath);
      if (sf.size !== df.size) changed++;
      else same++;
    }
  }

  for (const df of dstFiles) {
    const orig = df.relPath.replace(/\.part\d+$/, '');
    if (!srcMap.has(orig)) deleted++;
  }

  console.log(`\n🔄 Сравнение директорий:`);
  console.log(`- Совпадают: ${same} файла`);
  console.log(`- Изменены: ${changed} файла`);
  console.log(`- Добавлены: ${added} файл`);
  console.log(`- Удалены: ${deleted} файлов`);

  const report = [
    `Отчет синхронизации (Вариант ${variant})`,
    `Дата: ${new Date().toLocaleString()}`,
    `Совпадают: ${same}`,
    `Изменены: ${changed}`,
    `Добавлены: ${added}`,
    `Удалены: ${deleted}`
  ].join('\n');

  await fs.writeFile(path.join('.', `sync_report_${variant}.txt`), report, 'utf8');
  console.log(`\n📄 Отчет сохранен: sync_report_${variant}.txt`);
}

async function main() {
  const variant = 6;
  const src = path.join('.', `source_${variant}`);
  const dst = path.join('.', `backup_${variant}`);

  try {
    await initSource(src, variant);
    await copyBackup(src, dst, variant);
    await syncDirs(src, dst, variant);
    console.log('\n✅ Задание 5 успешно выполнено!');
  } catch (err) {
    console.error(`Ошибка в задании 5: ${err.message}`);
  }
}

main();
