const inquirer = require('inquirer');
const { Command } = require('commander');

const program = new Command();

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data.trim()));
    setTimeout(() => {
      process.stdin.pause();
      resolve(data.trim());
    }, 50);
  });
}

program
  .name('my-cli')
  .description('CLI-приложение с поддержкой интерактивного режима');

program
  .command('init')
  .description('инициализировать новый проект')
  .option('-n, --name <name>', 'название проекта')
  .option('-t, --type <type>', 'тип проекта')
  .option('--typescript', 'использовать TypeScript')
  .option('--eslint', 'использовать ESLint')
  .option('--prettier', 'использовать Prettier')
  .option('--jest', 'использовать Jest')
  .option('--git', 'инициализировать Git')
  .option('--no-interactive', 'отключить интерактивный режим')
  .action(async (options) => {
    const pipedData = await readStdin();
    if (pipedData && !options.name) {
      options.name = pipedData;
    }

    const isInteractive = options.interactive !== false && process.stdin.isTTY && !options.name && !options.type;

    if (!isInteractive) {
      if (options.name && !options.type) {
        console.error('Ошибка: недостаточно данных. Укажите --type');
        process.exit(1);
      }

      if (!options.name || !options.type) {
        console.error('Ошибка: в неинтерактивном режиме необходимо указать --name и --type');
        process.exit(1);
      }

      const selectedOptions = [];
      if (options.typescript) selectedOptions.push('TypeScript');
      if (options.eslint) selectedOptions.push('ESLint');
      if (options.prettier) selectedOptions.push('Prettier');
      if (options.jest) selectedOptions.push('Jest');

      const typeMap = {
        'cli': 'CLI-утилита',
        'web': 'Web-приложение',
        'lib': 'Библиотека',
        'microservice': 'Микросервис'
      };

      const displayType = typeMap[options.type.toLowerCase()] || options.type;

      console.log(`✓ Проект "${options.name}" успешно инициализирован!`);
      console.log(`Тип: ${displayType}`);
      console.log(`Опции: ${selectedOptions.join(', ') || 'нет'}`);
      console.log(`Git: ${options.git ? 'да' : 'нет'}`);
      process.exit(0);
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Введите название проекта:',
        default: 'my-project'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Выберите тип проекта:',
        choices: ['Web-приложение', 'CLI-утилита', 'Библиотека', 'Микросервис']
      },
      {
        type: 'checkbox',
        name: 'options',
        message: 'Выберите дополнительные опции:',
        choices: ['TypeScript', 'ESLint', 'Prettier', 'Jest']
      },
      {
        type: 'confirm',
        name: 'git',
        message: 'Использовать Git?',
        default: true
      },
      {
        type: 'password',
        name: 'token',
        message: 'Введите токен доступа:',
        mask: '*'
      }
    ]);

    console.log(`\n✓ Проект "${answers.name}" успешно инициализирован!`);
    console.log(`Тип: ${answers.type}`);
    console.log(`Опции: ${answers.options.join(', ') || 'нет'}`);
    console.log(`Git: ${answers.git ? 'да' : 'нет'}`);
  });

program.parse(process.argv);
