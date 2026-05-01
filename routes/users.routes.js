const express = require('express');
const router  = express.Router();
const { requireRole } = require('../utils/auth.middleware');
const ctrl = require('../controllers/users.controller');

router.get('/',        requireRole('admin'), ctrl.list);
router.post('/',       requireRole('admin'), ctrl.create);
router.put('/:id',     requireRole('admin'), ctrl.update);
router.delete('/:id',  requireRole('developer'), ctrl.remove);

module.exports = router;