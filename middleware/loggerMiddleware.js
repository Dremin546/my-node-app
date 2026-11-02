async function loggerMiddleware(ctx, next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${timeStr}] [${process.env.STUDENT_GROUP || 'ББМО-01-23'}] ${ctx.method} ${ctx.url} (${ms}ms)`);
}

module.exports = loggerMiddleware;
