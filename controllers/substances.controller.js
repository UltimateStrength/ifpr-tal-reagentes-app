// controllers/substances.controller.js
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
    const {
      name, quantity, expiry, unit, arrival,
      armario, situacao, localAtual, marca,
      cas, controladoPF, tags, observacoes, incompatibilidades
    } = req.body;

    if (!name || !quantity || !expiry) {
      return res.status(400).json({ error: 'name, quantity e expiry são obrigatórios' });
    }

    if (isNaN(quantity) || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'quantity deve ser número positivo' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      return res.status(400).json({ error: 'expiry deve seguir o formato YYYY-MM-DD' });
    }

    if (situacao && !['aberto', 'fechado'].includes(situacao)) {
      return res.status(400).json({ error: "situacao deve ser 'aberto' ou 'fechado'" });
    }

    const updated = await dm.addPackage(
      name,
      Number(quantity),
      expiry,
      req.session.userId,
      unit || 'un',
      arrival || null,
      { armario, situacao, localAtual, marca },
      { cas, controladoPF: !!controladoPF, tags, observacoes, incompatibilidades }
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

// Renumera uma substância. Sem force: recusa se o número já está ocupado
// e devolve quem ocupa, pro frontend perguntar "mover ele pro nº X?".
// Com force: confirma o deslocamento do ocupante.
async function setNumber(req, res) {
  try {
    const nameLower = decodeURIComponent(req.params.nameLower);
    const { number, force } = req.body;

    if (!Number.isInteger(number) || number < 1) {
      return res.status(400).json({ error: 'number deve ser um inteiro positivo' });
    }

    const result = await dm.setGroupNumber(nameLower, number, req.session.userId, { force: !!force });

    if (!result.ok) {
      return res.status(409).json({
        error:    'number_conflict',
        conflict: result.conflict
      });
    }

    await history.record(
      req.session.userId,
      req.session.displayName,
      history.ACTIONS.RENUMBER,
      { nameLower, number },
      req.session.sessionId,
      req.session.fingerprint
    );

    req.app.get('io').emit('data-update', {
      data:   result.data,
      action: 'renumber',
      by:     req.session.displayName
    });

    res.json(result.data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Registra uso/baixa numa embalagem específica. O threshold de "quase
// acabando" é só sugestão visual — entrar na fila é sempre manual (via setQueue).
async function addConsumption(req, res) {
  try {
    const { sub } = req.params;
    const { amount, note } = req.body;

    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'amount deve ser número positivo' });
    }

    const updated = await dm.addConsumption(
      sub, Number(amount), note || null,
      req.session.userId, req.session.displayName
    );

    await history.record(
      req.session.userId,
      req.session.displayName,
      history.ACTIONS.CONSUME,
      { subIndex: sub, amount: Number(amount), note: note || null },
      req.session.sessionId,
      req.session.fingerprint
    );

    req.app.get('io').emit('data-update', {
      data:   updated,
      action: 'consume',
      by:     req.session.displayName,
      detail: { subIndex: sub, amount: Number(amount) }
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// status: 'solicitado' | null — decisão sempre manual de quem usa o sistema.
async function setQueue(req, res) {
  try {
    const { sub } = req.params;
    const { status } = req.body;

    if (status && status !== 'solicitado') {
      return res.status(400).json({ error: "status deve ser 'solicitado' ou null" });
    }

    const updated = await dm.setQueueStatus(sub, status || null, req.session.userId);

    await history.record(
      req.session.userId,
      req.session.displayName,
      history.ACTIONS.QUEUE,
      { subIndex: sub, status: status || null },
      req.session.sessionId,
      req.session.fingerprint
    );

    req.app.get('io').emit('data-update', {
      data:   updated,
      action: 'queue',
      by:     req.session.displayName,
      detail: { subIndex: sub, status: status || null }
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getQueue(req, res) {
  try {
    const queue = await dm.getQueue();
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Edita campos de nível de substância (cas/controladoPF/tags/observacoes/incompatibilidades)
// sem recriar a embalagem.
async function updateDetails(req, res) {
  try {
    const nameLower = decodeURIComponent(req.params.nameLower);
    const { cas, controladoPF, tags, observacoes, incompatibilidades } = req.body;

    const updated = await dm.updateSubstanceDetails(nameLower, {
      cas, controladoPF, tags, observacoes, incompatibilidades
    }, req.session.userId);

    await history.record(
      req.session.userId,
      req.session.displayName,
      history.ACTIONS.UPDATE_SUB,
      { nameLower },
      req.session.sessionId,
      req.session.fingerprint
    );

    req.app.get('io').emit('data-update', {
      data:   updated,
      action: 'update-details',
      by:     req.session.displayName,
      detail: { nameLower }
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Edita uma embalagem existente (quantidade/validade/unidade/chegada e
// armário/situação/local/marca) num único PATCH, sem recriá-la — preserva
// _id, histórico de consumo e queueStatus.
async function updatePackage(req, res) {
  try {
    const { sub } = req.params;
    const { quantity, expiry, unit, arrival, armario, situacao, localAtual, marca } = req.body;

    if (quantity !== undefined && (isNaN(quantity) || Number(quantity) <= 0)) {
      return res.status(400).json({ error: 'quantity deve ser número positivo' });
    }

    if (expiry !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      return res.status(400).json({ error: 'expiry deve seguir o formato YYYY-MM-DD' });
    }

    if (situacao && !['aberto', 'fechado'].includes(situacao)) {
      return res.status(400).json({ error: "situacao deve ser 'aberto' ou 'fechado'" });
    }

    const updated = await dm.updatePackageDetails(sub, {
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      expiry, unit, arrival,
      armario, situacao, localAtual, marca
    }, req.session.userId);

    await history.record(
      req.session.userId,
      req.session.displayName,
      history.ACTIONS.UPDATE_PKG,
      { subIndex: sub, armario, situacao },
      req.session.sessionId,
      req.session.fingerprint
    );

    req.app.get('io').emit('data-update', {
      data:   updated,
      action: 'update-package',
      by:     req.session.displayName,
      detail: { subIndex: sub }
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  getAll, add, remove, setNumber,
  addConsumption, setQueue, getQueue,
  updateDetails, updatePackage
};