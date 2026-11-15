function setGroupHeader(ctx) {
  try {
    ctx.set('X-Group', Buffer.from(process.env.STUDENT_GROUP || 'ББМО-01-23').toString('latin1'));
  } catch (e) {
    ctx.set('X-Group', 'ББМО-01-23');
  }
}

async function errorMiddleware(ctx, next) {
  setGroupHeader(ctx);
  try {
    await next();
    setGroupHeader(ctx);
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
