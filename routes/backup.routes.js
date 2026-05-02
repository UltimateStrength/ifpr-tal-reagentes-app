const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../utils/auth.middleware');
const ctrl = require('../controllers/backup.controller');

router.get('/export',      requireAuth, ctrl.exportJSON);
router.get('/export-xlsx', requireAuth, ctrl.exportXLSX);
router.post('/restore',    requireAuth, ctrl.restoreJSON);

module.exports = router;