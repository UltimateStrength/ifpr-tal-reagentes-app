const { getDB } = require('../db/connection');

// Ações possíveis
const ACTIONS = {
  ADD:         'add',
  REMOVE:      'remove',
  IMPORT:      'import',
  RESTORE:     'restore',
  CONSUME:     'consume',
  QUEUE:       'queue',
  UPDATE_SUB:  'update-details',
  UPDATE_PKG:  'update-package',
  RENUMBER:    'renumber'
};

async function record(userId, username, action, detail, sessionId, fingerprint) {
  const db = getDB();
  await db.collection('history').insertOne({
    userId,
    username,
    action,
    detail,      // { name, quantity, expiry } ou { count } etc
    sessionId,
    fingerprint,
    createdAt: new Date()
  });
}

// Retorna histórico paginado (mais recente primeiro)
async function getHistory(limit = 50, skip = 0) {
  const db = getDB();
  return db.collection('history')
    .find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

// Retorna todas as ações de uma sessão específica
async function getSessionHistory(sessionId) {
  const db = getDB();
  return db.collection('history')
    .find({ sessionId })
    .sort({ createdAt: 1 })
    .toArray();
}

module.exports = { record, getHistory, getSessionHistory, ACTIONS };