const fs = require('fs');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const { Command } = require('commander');

const program = new Command();

program
  .name('my-cli')
  .description('CLI с цветным выводом, спиннерами и прогресс-барами');

program
  .command('process')
  .description('обработка файлов')
  .option('--files <files...>', 'список файлов для обработки')
  .action(async (options) => {
    const files = options.files || [];

    if (files.length === 0) {
      console.error(chalk.red('✖ Ошибка: укажите файлы через --files'));
      process.exit(1);
    }

    const isTTY = process.stdout.isTTY;

    if (isTTY) {
      const spinner = ora('Поиск файлов...').start();
      await new Promise((r) => setTimeout(r, 600));

      const existingCount = files.filter((f) => fs.existsSync(f)).length;
      spinner.succeed(chalk.green(`Файлы найдены (${existingCount} шт.)`));
    }

    const isProgressBarNeeded = isTTY && files.length > 3;
    let bar;

    if (isProgressBarNeeded) {
      bar = new cliProgress.SingleBar({
        format: `${chalk.cyan('{bar}')} {percentage}% | {value}/{total} | ETA: {eta}s`,
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true
      });
      bar.start(files.length, 0);
    }

    const processedData = [];
    let errorsCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await new Promise((r) => setTimeout(r, 150));

      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        processedData.push({
          file,
          size: stats.size,
          modified: stats.mtime
        });
        if (isTTY && !isProgressBarNeeded) {
          console.error(chalk.green(`✔ Файл ${file} обработан`));
        }
      } else {
        errorsCount++;
        console.error(chalk.red(`✖ Файл ${file} не найден`));
      }

      if (bar) {
        bar.update(i + 1);
      }
    }

    if (bar) {
      bar.stop();
    }

    if (errorsCount > 0) {
      console.error(chalk.yellow(`⚠ Пропущено ${errorsCount} файл(а)`));
    }

    if (isTTY) {
      console.log(chalk.green('✔ Обработка завершена'));
      fs.writeFileSync('output.json', JSON.stringify(processedData, null, 2), 'utf-8');
      console.log('Результат сохранён: output.json');
    } else {
      process.stdout.write(JSON.stringify(processedData, null, 2) + '\n');
    }

    if (errorsCount > 0) {
      process.exit(1);
    }
  });

program.parse(process.argv);
