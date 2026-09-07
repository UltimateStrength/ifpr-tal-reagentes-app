const express = require('express');
const router  = express.Router();

// Chave pública do Turnstile — pública por natureza, não precisa de auth.
router.get('/', (req, res) => {
  res.json({ turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null });
});

module.exports = router;
