const pool = require('../config/db');
const metrics = require('../services/metrics');

async function dbMiddleware(ctx, next) {
  ctx.db = {
    async query(sql, params) {
      const start = Date.now();
      try {
        const [rows, fields] = await pool.query(sql, params);
        const duration = (Date.now() - start) || 1;
        const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const logSql = typeof sql === 'string' ? sql.replace(/\s+/g, ' ').trim() : 'SQL Query';
        console.log(`[${timeStr}] [ББМО-01-23] ${logSql} (${duration}ms)`);
        metrics.recordQuery(duration, false);
        return [rows, fields];
      } catch (err) {
        const duration = (Date.now() - start) || 1;
        metrics.recordQuery(duration, true);
        throw err;
      }
    },
    getConnection() {
      return pool.getConnection();
    }
  };

  await next();
}

module.exports = dbMiddleware;
