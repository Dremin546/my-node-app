const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

function generateData(filePath, totalLines, variant) {
  return new Promise((resolve, reject) => {
    const stream = fsSync.createWriteStream(filePath, { encoding: 'utf8' });
    let i = 1;

    function write() {
      let ok = true;
      while (i <= totalLines && ok) {
        const rand = Math.floor(Math.random() * 1000) + 1;
        const line = `${i}, ${rand}, Вариант ${variant}\n`;
        if (i === totalLines) {
          stream.write(line);
        } else {
          ok = stream.write(line);
        }
        i++;
      }
      if (i <= totalLines) {
        stream.once('drain', write);
      } else {
        stream.end();
      }
    }

    stream.on('finish', resolve);
    stream.on('error', reject);
    write();
  });
}

async function main() {
  const variant = 6;
  const dataFile = path.join('.', `data_${variant}.txt`);
  const outFile = path.join('.', `processed_${variant}.txt`);
  const totalRows = 100000;

  try {
    try {
      await fs.access(dataFile);
    } catch {
      console.log(`Генерация ${dataFile}...`);
      await generateData(dataFile, totalRows, variant);
    }

    const stat = await fs.stat(dataFile);
    console.log(`📊 Обработка файла: ${path.basename(dataFile)}`);
    console.log(`Размер файла: ${(stat.size / (1024 * 1024)).toFixed(2)} МБ\n`);

    const startTime = Date.now();

    const readStream = fsSync.createReadStream(dataFile, {
      highWaterMark: 64 * 1024,
      encoding: 'utf8'
    });

    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity
    });

    let count = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    const freq = new Map();
    let step = 10000;

    for await (const line of rl) {
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length < 2) continue;

      const num = parseInt(parts[1].trim(), 10);
      if (isNaN(num)) continue;

      count++;
      sum += num;
      if (num > max) max = num;
      if (num < min) min = num;

      freq.set(num, (freq.get(num) || 0) + 1);

      if (count % step === 0) {
        console.log(`⏳ Прогресс: ${(count / totalRows) * 100}% (${count} строк обработано)`);
      }
    }

    const avg = (sum / count).toFixed(2);
    const top10 = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const time = ((Date.now() - startTime) / 1000).toFixed(2);

    let output = [
      '✅ Обработка завершена!',
      '📊 Результаты:',
      `- Всего строк: ${count}`,
      `- Сумма чисел: ${sum}`,
      `- Среднее значение: ${avg}`,
      `- Максимальное число: ${max}`,
      `- Минимальное число: ${min}`,
      '',
      '- Топ-10 часто встречающихся чисел:',
      ...top10.map(([n, c], i) => `  ${i + 1}. Число ${n}: ${c} раз`),
      '',
      `📄 Результаты сохранены в: ${path.basename(outFile)}`,
      `⏱ Время выполнения: ${time} сек`
    ].join('\n');

    console.log('\n' + output);
    await fs.writeFile(outFile, output, 'utf8');

  } catch (err) {
    console.error(`Ошибка при обработке файла: ${err.message}`);
  }
}

main();
