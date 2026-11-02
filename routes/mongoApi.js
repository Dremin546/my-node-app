const Router = require('@koa/router');
const controller = require('../controllers/mongoStudentsController');
const metrics = require('../services/metrics');

const router = new Router({ prefix: '/api' });

router.get('/students', controller.getStudents);
router.get('/students/stats', controller.getStats);
router.get('/students/search', controller.searchStudents);
router.get('/students/:id', controller.getStudentById);
router.post('/students', controller.createStudent);
router.post('/students/batch', controller.batchCreate);
router.put('/students/:id', controller.updateStudent);
router.delete('/students/:id', controller.deleteStudent);

router.get('/metrics', (ctx) => {
  ctx.body = metrics.getMetrics();
});

module.exports = router;
