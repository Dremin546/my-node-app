const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_bbmo_01_23';

async function authMiddleware(ctx, next) {
  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = { error: "Unauthorized", status: 401 };
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    ctx.user = payload;
    await next();
  } catch (err) {
    ctx.status = 401;
    ctx.body = { error: "Invalid or expired token", status: 401 };
  }
}

function requireRole(role) {
  return async (ctx, next) => {
    if (!ctx.user || ctx.user.role !== role) {
      ctx.status = 403;
      ctx.body = { error: `Forbidden: ${role} role required`, status: 403 };
      return;
    }
    await next();
  };
}

module.exports = {
  authMiddleware,
  requireRole
};
