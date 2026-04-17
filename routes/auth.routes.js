const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/auth.middleware');

router.post('/login', (req, res) => {
  const { user, pass } = req.body;

  if (
    user === process.env.ADMIN_USER &&
    pass === process.env.ADMIN_PASS
  ) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }

  res.status(401).json({ error: 'Credenciais inválidas' });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/check', requireAuth, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;