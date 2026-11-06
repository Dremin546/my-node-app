async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);

    if (err.code === 'ER_DUP_ENTRY') {
      ctx.status = 409;
      ctx.body = { error: "Conflict", message: "Запись с таким ключом уже существует" };
    } else if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2') {
      ctx.status = 400;
      ctx.body = { error: "Bad Request", message: "Нарушение связи внешнего ключа" };
    } else if (err.code === 'ECONNREFUSED') {
      ctx.status = 503;
      ctx.body = { error: "Service Unavailable", message: "База данных недоступна" };
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
