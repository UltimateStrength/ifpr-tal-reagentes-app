// controllers/armarios.controller.js
const { getDB }    = require('../db/connection');
const { ObjectId } = require('mongodb');

async function list(req, res) {
  try {
    const db = getDB();
    const armarios = await db.collection('armarios')
      .find({})
      .sort({ nome: 1 })
      .toArray();
    res.json(armarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const { nome } = req.body;

    if (!nome?.trim()) {
      return res.status(400).json({ error: 'nome é obrigatório' });
    }

    const db = getDB();
    const nomeTrim = nome.trim();

    const existing = await db.collection('armarios').findOne({
      nome: { $regex: `^${nomeTrim}$`, $options: 'i' }
    });
    if (existing) {
      return res.status(409).json({ error: 'Já existe um armário com esse nome' });
    }

    const doc = {
      nome:      nomeTrim,
      createdAt: new Date(),
      createdBy: req.session.userId
    };

    await db.collection('armarios').insertOne(doc);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const db = getDB();
    await db.collection('armarios').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, create, remove };