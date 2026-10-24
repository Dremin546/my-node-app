const EventEmitter = require('events');

const emitter = new EventEmitter();

emitter.on('greet', (name) => {
  console.log(`[greet] Привет, ${name}!`);
});

emitter.on('info', (group) => {
  console.log(`[info] Группа: ${group}`);
});

emitter.on('bye', () => {
  console.log('[bye] До свидания!');
});

console.log('=== Демонстрация EventEmitter ===');
emitter.emit('greet', 'Вадим');
emitter.emit('info', 'ББМО-01-23');
emitter.emit('bye');

console.log('');
const hasUnknown = emitter.emit('unknown');
console.log(`Событие "unknown" без слушателей: ${hasUnknown}`);

const hasGreet = emitter.emit('greet', 'Вадим');
console.log(`Событие "greet" со слушателями: ${hasGreet}`);
