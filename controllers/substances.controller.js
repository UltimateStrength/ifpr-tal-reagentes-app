const dm      = require('../utils/dataManager');
const history = require('../utils/history');

async function getAll(req, res) {
  try {
    const data = await dm.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function add(req, res) {
  try {
    const { name, quantity, expiry, unit, arrival } = req.body;

    if (!name || !quantity || !expiry) {
      return res.status(400).json({ error: 'name, quantity e expiry são obrigatórios' });
    }

    if (isNaN(quantity) || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'quantity deve ser número positivo' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      return res.status(400).json({ error: 'expiry deve seguir o formato YYYY-MM-DD' });
    }

    const updated = await dm.addPackage(
      name,
      Number(quantity),
      expiry,
      req.session.userId,
      unit || 'un',
      arrival || null
    );

    await history.record(
      req.session.userId,
      req.session.displayName,
      history.ACTIONS.ADD,
      { name, quantity: Number(quantity), expiry, unit, arrival },
      req.session.sessionId,
      req.session.fingerprint
    );

    req.app.get('io').emit('data-update', {
      data:   updated,
      action: 'add',
      by:     req.session.displayName,
      detail: { name, expiry }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const { sub } = req.params;

    const all   = await dm.getAll();
    const group = all.find(g => g.packages.some(p => p.subIndex === sub));
    const pkg   = group?.packages.find(p => p.subIndex === sub);

    if (!pkg) return res.status(404).json({ error: `Embalagem ${sub} não encontrada` });

    const updated = await dm.removePackage(sub, req.session.userId);

    await history.record(
      req.session.userId,
      req.session.displayName,
      history.ACTIONS.REMOVE,
      { name: group.name, quantity: pkg.quantity, expiry: pkg.expiry },
      req.session.sessionId,
      req.session.fingerprint
    );

    req.app.get('io').emit('data-update', {
      data:   updated,
      action: 'remove',
      by:     req.session.displayName,
      detail: { name: group.name, expiry: pkg.expiry }
    });

    res.json(updated);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

module.exports = { getAll, add, remove };