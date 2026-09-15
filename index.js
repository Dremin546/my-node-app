const http = require('http');
const { EventEmitter } = require('events');
const logger = require('./logger');

function calculatePi(precision) {
  let pi = 3;
  let sign = 1;
  for (let i = 2; i < 100000; i += 2) {
    pi += sign * (4 / (i * (i + 1) * (i + 2)));
    sign *= -1;
  }
  return pi.toFixed(precision);
}

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

      if (req.method === 'GET' && req.url.startsWith('/order/')) {
        const orderId = req.url.split('/')[2];
        orderHandler.processOrder(orderId);
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Заказ #${orderId} принят в обработку`);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
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
    console.log(`[order:start] Заказ #${orderId} начат`);
    this.emit('order:start', orderId);

    setTimeout(() => {
      console.log(`[order:processing] Заказ #${orderId}: Идёт обработка...`);
      this.emit('order:processing', orderId);

      setTimeout(() => {
        const sum = Math.floor(Math.random() * 901) + 100;
        this.emit('order:complete', { orderId, sum });
      }, 2000);
    }, 2000);
  }
}

class UserTracker extends EventEmitter {
  trackAction(userId, action, metadata) {
    this.emit('user:action', {
      userId,
      action,
      timestamp: new Date().toISOString(),
      metadata,
      id: Math.random().toString(36).substr(2, 9)
    });
  }
}

const app = new AppServer();
const orderHandler = new OrderHandler();
const userTracker = new UserTracker();

app.on('server:started', (port) => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
});

app.on('request:received', (req) => {
  console.log(`📨 Получен запрос: ${req.method} ${req.url}`);
});

app.on('server:stopped', () => {
  console.log('🛑 Сервер остановлен');
});

orderHandler.on('order:complete', ({ orderId, sum }) => {
  const pi = calculatePi(7);
  console.log(`💰 Заказ #${orderId} завершён на сумму ${sum} руб. PI = ${pi}`);
});

userTracker.on('user:action', (data) => {
  console.log(`👤 Пользователь ${data.userId} совершил действие "${data.action}"`);
  console.log(`   Время: ${data.timestamp}`);
  console.log(`   ID события: ${data.id}`);
  console.log(`   Доп. данные: ${JSON.stringify(data.metadata)}`);
});

logger.setupLogger(app);

app.start(3000);

userTracker.trackAction('user1', 'login', { ip: '127.0.0.1' });
userTracker.trackAction('user2', 'view_page', { page: '/home' });

setTimeout(() => {
  app.stop();
}, 10000);
