const { getDB } = require('../db/connection');
const bcrypt    = require('bcrypt');
const { ObjectId } = require('mongodb');

const VALID_ROLES = ['developer', 'admin', 'staff', 'viewer'];

async function list(req, res) {
  try {
    const db    = getDB();
    const users = await db.collection('users')
      .find({}, { projection: { passwordHash: 0 } })
      .toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const { username, displayName, email, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'username, password e role são obrigatórios' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role inválido. Use: ${VALID_ROLES.join(', ')}` });
    }

    // Só developer pode criar outro developer
    if (role === 'developer' && req.session.role !== 'developer') {
      return res.status(403).json({ error: 'Apenas developer pode criar outro developer' });
    }

    const db = getDB();
    const existing = await db.collection('users').findOne({
      $or: [{ username }, { email }]
    });

    if (existing) {
      return res.status(409).json({ error: 'Username ou email já existe' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.collection('users').insertOne({
      username,
      displayName: displayName || username,
      email:       email || null,
      passwordHash,
      role,
      createdAt: new Date(),
      createdBy: req.session.userId
    });

    res.json({ ok: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const { displayName, email, password, role } = req.body;
    const db = getDB();

    const updates = { updatedAt: new Date() };
    if (displayName) updates.displayName = displayName;
    if (email)       updates.email       = email;
    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Role inválido' });
      }
      if (role === 'developer' && req.session.role !== 'developer') {
        return res.status(403).json({ error: 'Apenas developer pode promover a developer' });
      }
      updates.role = role;
    }
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 12);
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const db = getDB();

    // Não pode deletar a si mesmo
    if (req.params.id === req.session.userId) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }

    await db.collection('users').deleteOne({
      _id: new ObjectId(req.params.id)
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, create, update, remove };