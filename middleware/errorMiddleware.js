function setGroupHeader(ctx) {
  try {
    // В Node.js HTTP заголовки должны содержать байты в ASCII/Latin1
    ctx.set('X-Group', encodeURI(process.env.STUDENT_GROUP || 'ББМО-01-23'));
  } catch (e) {
    ctx.set('X-Group', 'BBMO-01-23');
  }
}

async function errorMiddleware(ctx, next) {
  try {
    setGroupHeader(ctx);
    await next();
  } catch (err) {
    setGroupHeader(ctx);

    if (err.isJoi) {
      ctx.status = 400;
      ctx.body = {
        error: "Validation failed",
        details: err.details.map(d => ({
          field: d.path.join('.'),
          message: d.message.replace(/['"]/g, '')
        }))
      };
      return;
    }

    if (err.code === 11000) {
      ctx.status = 409;
      ctx.body = {
        error: "Email already exists",
        status: 409
      };
      return;
    }

    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message || "Internal Server Error",
      status: ctx.status,
      ...(err.details ? { details: err.details } : {})
    };
  }
}

module.exports = errorMiddleware;
