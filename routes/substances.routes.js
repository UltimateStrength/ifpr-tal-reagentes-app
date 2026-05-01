const express = require('express');
const router  = express.Router();
const { requireAuth, requireWrite, requireRole } = require('../utils/auth.middleware');
const ctrl = require('../controllers/substances.controller');

router.get('/',        requireAuth,  ctrl.getAll); // viewer pode ver
router.post('/',       requireWrite, ctrl.add);    // staff+ pode adicionar
router.delete('/:sub', requireRole('admin'), ctrl.remove); // admin+ pode remover

module.exports = router;