// Hierarquia: developer > admin > staff > viewer
const ROLE_LEVELS = {
  developer: 4,
  admin:     3,
  staff:     2,
  viewer:    1
};

function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

// Exige um role mínimo
// ex: requireRole('admin') bloqueia staff e viewer
function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const userLevel = ROLE_LEVELS[req.session.role] || 0;
    const minLevel  = ROLE_LEVELS[minRole] || 0;

    if (userLevel < minLevel) {
      return res.status(403).json({ error: 'Permissão insuficiente' });
    }

    next();
  };
}

// Viewer não pode escrever — só GET
function requireWrite(req, res, next) {
  return requireRole('staff')(req, res, next);
}

module.exports = { requireAuth, requireRole, requireWrite, ROLE_LEVELS };