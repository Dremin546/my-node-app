const Router = require('@koa/router');
const AuthController = require('../controllers/authController');

const router = new Router({ prefix: '/api/auth' });

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

module.exports = router;
