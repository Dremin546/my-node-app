const EventEmitter = require('events');

class DatabaseConnection extends EventEmitter {
  constructor(dbName) {
    super();
    this.dbName = dbName;
  }

  connect() {
    console.log('[EVENT] Подключение к БД...');
    this.emit('connect');
  }

  query(sql, result) {
    console.log(`[EVENT] Выполнение запроса: ${sql}`);
    this.emit('query', sql, result);
  }

  close() {
    console.log('[EVENT] Закрытие соединения');
    this.emit('close');
  }

  triggerError(message) {
    this.emit('error', new Error(message));
  }
}

console.log('=== DatabaseConnection (группа ББМО-01-23, Дёмин Вадим) ===');
const db = new DatabaseConnection('university');

db.on('connect', () => {
  console.log('[EVENT] Соединение установлено');
});

db.on('query', (sql, result) => {
  console.log(`[EVENT] Результат: ${result}`);
});

db.on('close', () => {
  console.log('[EVENT] Соединение закрыто');
});

db.on('error', (err) => {
  console.log(`[EVENT] Ошибка: ${err.message}`);
});

db.connect();
db.query('SELECT * FROM students', '50 записей');
db.query('INSERT INTO students', '1 запись добавлена');
db.close();

console.log('\n=== Демонстрация ошибки ===');
db.triggerError('Connection timeout');
console.log('(без слушателя error — процесс упал бы с неперехваченным исключением)');
