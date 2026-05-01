const { getHistory, getSessionHistory } = require('../utils/history');
const { getDB } = require('../db/connection');
const dm = require('../utils/dataManager');

async function list(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip  = parseInt(req.query.skip)  || 0;
    const data  = await getHistory(limit, skip);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function bySession(req, res) {
  try {
    const data = await getSessionHistory(req.params.sid);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Reverte todas as ações de uma sessão suspeita
async function revertSession(req, res) {
  try {
    const db      = getDB();
    const actions = await getSessionHistory(req.params.sid);

    if (actions.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada ou sem ações' });
    }

    // Processa em ordem inversa
    for (const action of [...actions].reverse()) {
      if (action.action === 'add') {
        // Desfaz adição — remove a embalagem que foi adicionada
        const all = await dm.getAll();
        const group = all.find(g =>
          g.name.toLowerCase() === action.detail.name.toLowerCase()
        );
        if (group) {
          const pkg = group.packages.find(p =>
            p.expiry === action.detail.expiry &&
            p.quantity === action.detail.quantity
          );
          if (pkg) await dm.removePackage(pkg.subIndex, 'system-revert');
        }
      } else if (action.action === 'remove') {
        // Desfaz remoção — readiciona a embalagem
        await dm.addPackage(
          action.detail.name,
          action.detail.quantity,
          action.detail.expiry,
          'system-revert'
        );
      }
    }

    // Marca a sessão como revertida no histórico
    await db.collection('history').updateMany(
      { sessionId: req.params.sid },
      { $set: { reverted: true, revertedAt: new Date(), revertedBy: req.session.userId } }
    );

    const updated = await dm.getAll();

    // Notifica todos via Socket.IO
    req.app.get('io').emit('data-update', {
      data: updated,
      action: 'revert',
      by: req.session.displayName,
      sessionReverted: req.params.sid
    });

    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, bySession, revertSession };