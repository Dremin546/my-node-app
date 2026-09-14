const http = require('http');
const { EventEmitter } = require('events');
class AppServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
  }
  start(port) {
    this.server = http.createServer((req, res) => {
      this.emit('request:received', {
        url: req.url,
        method: req.method
      });

      if (req.url.startsWith('/order/')) {
        const orderId = req.url.split('/')[2];
        orderHandler.processOrder(orderId);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`Order ${orderId} started processing`);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello from Event-Driven Server!');
    });

    this.server.listen(port, () => {
      this.emit('server:started', port);
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        this.emit('server:stopped');
      });
    }
  }
}
class OrderHandler extends EventEmitter {
  processOrder(orderId) {
    console.log(`[order:start] Заказ#${orderId} начат`);
    this.emit('order:start', orderId);

    setTimeout(() => {
      console.log(`[order:processing] Заказ#${orderId}: Идёт обработка...`);
      this.emit('order:processing', 'Идёт обработка...');

      setTimeout(() => {
        const sum = Math.floor(Math.random() * 901) + 100;
        const pi = 3.1415926;
        console.log(` Заказ#${orderId} завершён на сумму ${sum} руб. PI= ${pi}`);
        this.emit('order:complete', { orderId, sum });
      }, 2000);
    }, 2000);
  }
}
const app = new AppServer();
const orderHandler = new OrderHandler();
app.on('server:started', (port) => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
});
app.on('request:received', (req) => {
  console.log(`📨 Получен запрос: ${req.method} ${req.url}`);
});
app.on('server:stopped', () => {
  console.log('🛑 Сервер остановлен');
});
const logger = require('./logger');
logger.setupLogger(app);
app.start(3000);
setTimeout(() => {
  app.stop();
}, 10000);

module.exports = { AppServer, OrderHandler, app, orderHandler };