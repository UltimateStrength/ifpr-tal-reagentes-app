// routes/substances.routes.js
const express = require('express');
const router  = express.Router();
const { requireAuth, requireWrite, requireRole } = require('../utils/auth.middleware');
const ctrl = require('../controllers/substances.controller');

router.get('/queue/list',            requireAuth,  ctrl.getQueue);   // lista da fila de solicitações
router.get('/',                      requireAuth,  ctrl.getAll);   // viewer pode ver
router.post('/',                     requireWrite, ctrl.add);      // staff+ pode adicionar
router.delete('/:sub',               requireRole('admin'), ctrl.remove); // admin+ pode remover
router.patch('/:nameLower/number',   requireWrite, ctrl.setNumber);      // staff+ pode renumerar
router.patch('/:nameLower/details',  requireWrite, ctrl.updateDetails);  // staff+ edita cas/tags/etc
router.patch('/:sub/package',        requireWrite, ctrl.updatePackage);  // staff+ edita armário/situação/etc
router.patch('/:sub/queue',          requireWrite, ctrl.setQueue);       // staff+ marca/desmarca fila
router.post('/:sub/consumption',     requireWrite, ctrl.addConsumption); // staff+ registra uso

module.exports = router;