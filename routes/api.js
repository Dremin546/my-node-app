const Router = require('@koa/router');
const studentsController = require('../controllers/studentsController');
const groupsController = require('../controllers/groupsController');
const metrics = require('../services/metrics');
const cache = require('../services/cache');

const router = new Router({ prefix: '/api' });

// Students routes
router.get('/students', studentsController.getStudents);
router.get('/students/stats', studentsController.getStats);
router.get('/students/:id', studentsController.getStudentById);
router.post('/students', studentsController.createStudent);
router.post('/students/batch', studentsController.batchCreateStudents);
router.put('/students/:id', studentsController.updateStudent);
router.delete('/students/:id', studentsController.deleteStudent);

// Groups routes
router.get('/groups', groupsController.getGroups);
router.post('/groups', groupsController.createGroup);
router.get('/groups/:id/students', groupsController.getGroupStudents);

// Metrics & Cache
router.get('/metrics', (ctx) => {
  ctx.body = metrics.getMetrics();
});

router.get('/cache/stats', (ctx) => {
  ctx.body = cache.getStats();
});

module.exports = router;
