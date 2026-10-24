const EventEmitter = require('events');

const emitter = new EventEmitter();

let onCount = 0;
let onceCount = 0;

emitter.on('tick', (num) => {
  onCount++;
  console.log(`[tick #${num}] on-слушатель`);
});

emitter.once('tick', (num) => {
  onceCount++;
  console.log(`[tick #${num}] once-слушатель`);
});

console.log('=== Сравнение on и once ===');
emitter.emit('tick', 1);
emitter.emit('tick', 2);
emitter.emit('tick', 3);

console.log(`\non-слушатель вызван: ${onCount} раза`);
console.log(`once-слушатель вызван: ${onceCount} раз\n`);

console.log('=== Управление подписками ===');
const subEmitter = new EventEmitter();

function listenerA() {}
function listenerB() {}
function listenerC() {}

subEmitter.on('myEvent', listenerA);
subEmitter.on('myEvent', listenerB);
subEmitter.on('myEvent', listenerC);

console.log(`Слушателей до удаления: ${subEmitter.listenerCount('myEvent')}`);

subEmitter.removeListener('myEvent', listenerB);
console.log(`Слушателей после удаления одного: ${subEmitter.listenerCount('myEvent')}`);

subEmitter.removeAllListeners('myEvent');
console.log(`Слушателей после removeAllListeners: ${subEmitter.listenerCount('myEvent')}\n`);

console.log('=== Порядок вызова ===');
const orderEmitter = new EventEmitter();

orderEmitter.on('call', () => console.log('1. Первый слушатель (группа ББМО-01-23)'));
orderEmitter.on('call', () => console.log('2. Второй слушатель'));
orderEmitter.on('call', () => console.log('3. Третий слушатель'));

orderEmitter.emit('call');
