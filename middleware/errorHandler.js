async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);

    if (err.code === 11000) {
      ctx.status = 409;
      ctx.body = { error: "Conflict", message: "Документ с таким уникальным полем уже существует" };
    } else {
      ctx.status = err.status || 500;
      ctx.body = {
        error: err.name || "Internal Server Error",
        message: err.message || "Ошибка сервера"
      };
    }
  }
}

module.exports = errorHandler;
