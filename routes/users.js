const Router = require('@koa/router');
const UsersController = require('../controllers/users');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = new Router({ prefix: '/api' });

// Публичные маршруты пользователей
router.get('/users/stats', UsersController.getStats);
router.get('/users/search', UsersController.search);
router.get('/users/export', UsersController.exportCSV);
router.get('/users', UsersController.getAll);
router.get('/users/:id', UsersController.getById);

// Маршруты создания/обновления (поддерживают создание как публично, так и через JWT токен)
router.post('/users', UsersController.create);
router.put('/users/:id', UsersController.update);
router.delete('/users/:id', UsersController.delete);

// Защищенный административный маршрут
router.get('/admin/users', authMiddleware, requireRole('admin'), UsersController.getAll);

module.exports = router;
