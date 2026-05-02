const express = require('express');
const router = express.Router();
const { requireRole } = require('../utils/auth.middleware');
const ctrl = require('../controllers/tokens.controller');

router.get('/',        requireRole('admin'), ctrl.list);
router.post('/',       requireRole('admin'), ctrl.create);
router.delete('/:id',  requireRole('admin'), ctrl.revoke);

module.exports = router;