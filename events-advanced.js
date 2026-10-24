const EventEmitter = require('events');

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.on('newListener', (event) => {
      if (event !== 'newListener' && event !== 'removeListener') {
        console.log(`[newListener] Добавлен слушатель "${event}"`);
      }
    });

    this.on('removeListener', (event) => {
      if (event !== 'newListener' && event !== 'removeListener') {
        console.log(`[removeListener] Удалён слушатель "${event}"`);
      }
    });
  }

  register(name, eventName, handler) {
    console.log(`[PLUGIN] Зарегистрирован: ${name}`);
    this.on(eventName, handler);
  }

  unregister(name, eventName, handler) {
    this.removeListener(eventName, handler);
    console.log(`[PLUGIN] Удалён: ${name}`);
  }
}

console.log('=== Система плагинов ===');
const pm = new PluginManager();

pm.on('plugin:registered', () => {});
pm.on('plugin:removed', () => {});

function logHandler() {}
function alertHandler() {}

pm.register('LoggerPlugin', 'log', logHandler);
pm.register('AlertPlugin', 'alert', alertHandler);
pm.unregister('LoggerPlugin', 'log', logHandler);

console.log('\n=== Демонстрация утечки памяти ===');
const leakEmitter = new EventEmitter();

for (let i = 0; i < 10; i++) {
  leakEmitter.on('data', () => {});
}
console.log(`Слушателей до: ${leakEmitter.listenerCount('data')}`);

for (let i = 0; i < 1000; i++) {
  leakEmitter.on('data', () => {});
}
console.log(`Слушателей после добавления 1000: ${leakEmitter.listenerCount('data')}`);

leakEmitter.removeAllListeners('data');
console.log(`Слушателей после removeAllListeners: ${leakEmitter.listenerCount('data')}`);

console.log('\n=== Асинхронные слушатели ===');
const asyncEmitter = new EventEmitter();

asyncEmitter.on('asyncEvent', async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log('[BBMO-01-23] async-слушатель завершён через 100ms');
});

asyncEmitter.emit('asyncEvent');
console.log('[BBMO-01-23] emit вызван (не ждёт async-слушатель)');
