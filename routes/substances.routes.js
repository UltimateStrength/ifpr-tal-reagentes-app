const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/auth.middleware');
const ctrl = require('../controllers/substances.controller');

router.get('/',        requireAuth, ctrl.getAll);
router.post('/',       requireAuth, ctrl.add);
router.delete('/:sub', requireAuth, ctrl.remove);

module.exports = router;