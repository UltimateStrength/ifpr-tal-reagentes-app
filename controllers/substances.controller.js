const dm = require('../utils/dataManager');

function getAll(req, res) {
  try {
    const data = dm.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function add(req, res) {
  try {
    const { name, quantity, expiry } = req.body;

    if (!name || !quantity || !expiry) {
      return res.status(400).json({ error: 'name, quantity e expiry são obrigatórios' });
    }

    if (isNaN(quantity) || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'quantity deve ser número positivo' });
    }

    if (!/^\d{4}-\d{2}/.test(expiry)) {
      return res.status(400).json({ error: 'expiry deve seguir o formato YYYY-MM' });
    }

    const updated = dm.addPackage(name, Number(quantity), expiry);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function remove(req, res) {
  try {
    const { sub } = req.params;
    const updated = dm.removePackage(sub);
    res.json(updated);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

module.exports = { getAll, add, remove };