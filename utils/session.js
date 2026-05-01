const crypto = require('crypto');

// Gera um fingerprint baseado em user-agent + IP
// Não é 100% único mas é suficiente pra detectar dispositivos diferentes
function getFingerprint(req) {
  const raw = `${req.ip}|${req.headers['user-agent'] || 'unknown'}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

// Gera um sessionId único pra cada login
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { getFingerprint, generateSessionId };