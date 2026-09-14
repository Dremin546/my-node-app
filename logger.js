const fs = require('fs');
const path = require('path');

function setupLogger(app) {
  const logFile = path.join(__dirname, 'logs.txt');

  const writeLog = (event, data) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event}: ${JSON.stringify(data)}\n`;
    
    fs.appendFile(logFile, logEntry, (err) => {
      if (err) console.error('Ошибка записи в лог:', err);
    });
  };

  app.on('server:started', (port) => writeLog('server:started', { port }));
  app.on('server:stopped', () => writeLog('server:stopped', {}));
  app.on('request:received', (req) => writeLog('request:received', req));

  console.log('Логгер инициализирован');
}

module.exports = { setupLogger };