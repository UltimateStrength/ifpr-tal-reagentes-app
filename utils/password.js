const bcrypt = require('bcrypt');

// PASSWORD_PEPPER é um segredo só do servidor, somado à senha antes do
// bcrypt — defesa contra o cenário "o banco vazou mas o servidor não": sem
// o pepper, quem roubou só os hashes não consegue nem tentar força bruta
// offline, porque falta metade do material.
function withPepper(plain) {
  return plain + (process.env.PASSWORD_PEPPER || '');
}

function hashPassword(plain) {
  return bcrypt.hash(withPepper(plain), 12);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(withPepper(plain), hash);
}

module.exports = { hashPassword, comparePassword };
