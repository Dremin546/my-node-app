const { getDB } = require('../db');

async function dbMiddleware(ctx, next) {
  ctx.db = getDB();
  await next();
}

module.exports = dbMiddleware;
