const { getDB }    = require('../db/connection');
const { ObjectId } = require('mongodb');
const crypto       = require('crypto');

function generateCode() {
  // Gera código legível — ex: ABC1-23DE
  return crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
}

async function list(req, res) {
  try {
    const db     = getDB();
    const tokens = await db.collection('tokens')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const { label, expiresIn } = req.body;
    // expiresIn: número de dias, null = ilimitado

    if (!label) {
      return res.status(400).json({ error: 'label é obrigatório' });
    }

    const db   = getDB();
    const code = generateCode();

    const doc = {
      code,
      label:     label.trim(),
      active:    true,
      createdAt: new Date(),
      createdBy: req.session.userId,
      expiresAt: expiresIn
        ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
        : null
    };

    await db.collection('tokens').insertOne(doc);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function revoke(req, res) {
  try {
    const db = getDB();
    await db.collection('tokens').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { active: false, revokedAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, create, revoke };