const Joi = require('joi');
const UserService = require('../services/userService');

const userCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'минимум 2 символа',
    'string.empty': 'имя обязательно'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'неверный формат',
    'string.empty': 'email обязателен'
  }),
  group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'формат группы должен быть ББМО-XX-XX'
  }),
  age: Joi.number().integer().min(16).max(100).messages({
    'number.min': 'возраст должен быть от 16 до 100',
    'number.max': 'возраст должен быть от 16 до 100'
  }),
  course: Joi.number().integer().min(1).max(4),
  role: Joi.string().valid('user', 'admin', 'moderator').default('user'),
  password: Joi.string().min(6)
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/),
  age: Joi.number().integer().min(16).max(100),
  course: Joi.number().integer().min(1).max(4),
  role: Joi.string().valid('user', 'admin', 'moderator'),
  password: Joi.string().min(6)
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).messages({
    'number.min': 'должно быть больше 0'
  }),
  limit: Joi.number().integer().min(1).max(100),
  group_name: Joi.string(),
  course: Joi.number(),
  age_min: Joi.number(),
  age_max: Joi.number(),
  sort: Joi.string(),
  search: Joi.string(),
  q: Joi.string()
});

class UsersController {
  static async getAll(ctx) {
    const { error, value } = querySchema.validate(ctx.query, { abortEarly: false });
    if (error) {
      ctx.status = 400;
      ctx.body = {
        error: "Validation failed",
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message.replace(/['"]/g, '')
        }))
      };
      return;
    }

    const result = await UserService.getAllUsers(value);
    ctx.body = result;
  }

  static async getById(ctx) {
    const user = await UserService.getUserById(ctx.params.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        error: "User not found",
        status: 404
      };
      return;
    }
    ctx.body = { data: user };
  }

  static async create(ctx) {
    const { error, value } = userCreateSchema.validate(ctx.request.body, { abortEarly: false });
    if (error) {
      ctx.status = 400;
      ctx.body = {
        error: "Validation failed",
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message.replace(/['"]/g, '')
        }))
      };
      return;
    }

    const created = await UserService.createUser(value);
    ctx.status = 201;
    ctx.body = { data: created };
  }

  static async update(ctx) {
    const { error, value } = userUpdateSchema.validate(ctx.request.body, { abortEarly: false });
    if (error) {
      ctx.status = 400;
      ctx.body = {
        error: "Validation failed",
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message.replace(/['"]/g, '')
        }))
      };
      return;
    }

    const updated = await UserService.updateUser(ctx.params.id, value);
    if (!updated) {
      ctx.status = 404;
      ctx.body = { error: "User not found", status: 404 };
      return;
    }
    ctx.body = { data: updated };
  }

  static async delete(ctx) {
    const deleted = await UserService.deleteUser(ctx.params.id);
    if (!deleted) {
      ctx.status = 404;
      ctx.body = { error: "User not found", status: 404 };
      return;
    }
    ctx.body = { message: "User deleted" };
  }

  static async search(ctx) {
    const query = ctx.query.q || ctx.query.search || '';
    const result = await UserService.getAllUsers({ search: query, limit: 50 });
    ctx.body = {
      found: result.pagination.total,
      data: result.data
    };
  }

  static async getStats(ctx) {
    const stats = await UserService.getStats();
    ctx.body = stats;
  }

  static async exportCSV(ctx) {
    const csv = await UserService.exportToCSV();
    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', 'attachment; filename=users.csv');
    ctx.body = csv;
  }
}

module.exports = UsersController;
