const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const { getDB } = require('../db/connection');
const { requireAuth } = require('../utils/auth.middleware');
const { getFingerprint, generateSessionId } = require('../utils/session');

router.post('/login', async (req, res) => {
  const { user, pass, token } = req.body;

  const db = getDB();

  // Login por token de viewer
  if (token) {
    const tk = await db.collection('tokens').findOne({
      code: token,
      active: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (!tk) return res.status(401).json({ error: 'Token inválido ou expirado' });

    req.session.authenticated = true;
    req.session.role           = 'viewer';
    req.session.username       = tk.label || 'Visitante';
    req.session.displayName    = tk.label || 'Visitante';
    req.session.sessionId      = generateSessionId();
    req.session.fingerprint    = getFingerprint(req);

    return res.json({
      ok: true,
      role: 'viewer',
      displayName: req.session.displayName
    });
  }

  // Login normal
  if (!user || !pass) {
    return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  }

  const found = await db.collection('users').findOne({
    $or: [{ username: user }, { email: user }]
  });

  if (!found) return res.status(401).json({ error: 'Credenciais inválidas' });

  const valid = await bcrypt.compare(pass, found.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

  req.session.authenticated = true;
  req.session.userId        = found._id.toString();
  req.session.role          = found.role;
  req.session.username      = found.username;
  req.session.displayName   = found.displayName || found.username;
  req.session.sessionId     = generateSessionId();
  req.session.fingerprint   = getFingerprint(req);

  res.json({
    ok: true,
    role: found.role,
    displayName: req.session.displayName
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/check', requireAuth, (req, res) => {
  res.json({
    ok: true,
    role: req.session.role,
    displayName: req.session.displayName
  });
});

module.exports = router;