const express = require('express');
const router  = express.Router();
const { requireRole } = require('../utils/auth.middleware');
const ctrl = require('../controllers/history.controller');

router.get('/',              requireRole('admin'), ctrl.list);
router.get('/session/:sid',  requireRole('admin'), ctrl.bySession);
router.delete('/session/:sid', requireRole('admin'), ctrl.revertSession);

module.exports = router;