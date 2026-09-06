// routes/armarios.routes.js
const express = require('express');
const router  = express.Router();
const { requireAuth, requireWrite, requireRole } = require('../utils/auth.middleware');
const ctrl = require('../controllers/armarios.controller');

router.get('/',        requireAuth,          ctrl.list);   // viewer pode ver (pra popular o select)
router.post('/',       requireWrite,         ctrl.create); // staff+ pode criar
router.delete('/:id',  requireRole('admin'), ctrl.remove); // só admin+ pode apagar

module.exports = router;