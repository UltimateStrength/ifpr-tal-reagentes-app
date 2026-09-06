// utils/dataManager.js
const { randomUUID } = require('crypto');
const { getDB } = require('../db/connection');

function normalizeName(name) {
  return name.toLowerCase().trim();
}

// Ordena por nome (A-Z) para EXIBIÇÃO, mas o número exibido (index) é o
// groupNumber travado no momento da criação — não muda com a reordenação.
// Sub-índice de embalagem continua dinâmico, por proximidade de validade.
//
// Reagentes cadastrados antes do campo groupNumber existir (migração antiga)
// chegam aqui com esse campo null/undefined. Sem um número, removePackage/
// findBySubIndex (que localizam o grupo por `group.index === groupNum`) não
// conseguem achar essa substância — apagar ou editar dá erro silencioso.
// Como paliativo, atribuímos aqui um número sequencial SÓ EM MEMÓRIA, maior
// que qualquer groupNumber real já em uso (pra nunca colidir com um número
// gravado no banco). Isso não persiste: rodar
// `node scripts/backfill-group-numbers.js` grava os números de verdade.
function sortAndNumber(data) {
  const sorted = [...data].sort((a, b) =>
    normalizeName(a.name).localeCompare(normalizeName(b.name), 'pt-BR')
  );

  const maxRealNumber = data.reduce(
    (max, g) => typeof g.groupNumber === 'number' ? Math.max(max, g.groupNumber) : max,
    0
  );
  let nextFallback = maxRealNumber + 1;

  return sorted.map((group) => {
    const groupNumber = typeof group.groupNumber === 'number'
      ? group.groupNumber
      : nextFallback++;

    return {
      ...group,
      groupNumber,
      index: groupNumber,
      packages: [...group.packages]
        .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))
        .map((pkg, pi) => ({
          ...pkg,
          subIndex: `${groupNumber}.${pi + 1}`
        }))
    };
  });
}

async function getNextGroupNumber(db) {
  const top = await db.collection('substances')
    .find({})
    .sort({ groupNumber: -1 })
    .limit(1)
    .toArray();
  return (top[0]?.groupNumber || 0) + 1;
}

async function isGroupNumberTaken(db, number, excludeNameLower = null) {
  const query = { groupNumber: number };
  if (excludeNameLower) query.nameLower = { $ne: excludeNameLower };
  return db.collection('substances').findOne(query);
}

async function getAll() {
  const db  = getDB();
  const raw = await db.collection('substances').find({}).toArray();
  return sortAndNumber(raw);
}

// pkgExtra: { armario, situacao, localAtual, marca }
// subExtra: { cas, controladoPF, tags, observacoes, incompatibilidades } — só usados na criação da substância
async function addPackage(name, quantity, expiry, userId, unit = 'un', arrival = null, pkgExtra = {}, subExtra = {}) {
  const db  = getDB();
  const key = normalizeName(name);

  const pkg = {
    _id:        randomUUID(), // identifica a embalagem sem depender de expiry+quantity
    quantity,
    expiry,
    unit,
    arrival:    arrival || new Date().toISOString().slice(0, 10),
    armario:    pkgExtra.armario    || null,
    situacao:   pkgExtra.situacao   || null, // 'aberto' | 'fechado'
    localAtual: pkgExtra.localAtual || null,
    marca:      pkgExtra.marca      || null,
    consumption: [],   // histórico de baixa
    queueStatus: null, // null | 'solicitado'
    addedAt: new Date(),
    addedBy: userId
  };

  const existing = await db.collection('substances').findOne({ nameLower: key });

  if (existing) {
    await db.collection('substances').updateOne(
      { nameLower: key },
      {
        $push: { packages: pkg },
        $set:  { updatedAt: new Date(), updatedBy: userId }
      }
    );
  } else {
    const groupNumber = await getNextGroupNumber(db);
    await db.collection('substances').insertOne({
      name:               name.trim(),
      nameLower:          key,
      groupNumber,
      cas:                subExtra.cas                || null,
      controladoPF:       subExtra.controladoPF       || false,
      tags:               subExtra.tags                || [],
      observacoes:        subExtra.observacoes        || null,
      incompatibilidades: subExtra.incompatibilidades || null,
      packages:           [pkg],
      createdAt:          new Date(),
      createdBy:          userId
    });
  }

  return getAll();
}

// Localiza grupo + embalagem por subIndex (ex: "3.2"), lançando se não achar.
function findBySubIndex(all, subIndex) {
  const [groupNum] = subIndex.split('.').map(Number);
  const group = all.find(g => g.index === groupNum);
  if (!group) throw new Error(`Substância com número ${groupNum} não encontrada`);

  const pkg = group.packages.find(p => p.subIndex === subIndex);
  if (!pkg) throw new Error(`Embalagem ${subIndex} não encontrada`);

  return { group, pkg };
}

// Embalagens antigas (criadas antes do campo _id existir) ainda casam por
// expiry+quantity — risco de colisão conhecido, mas mantido só como fallback.
function pkgMatchQuery(group, pkg) {
  return pkg._id
    ? { nameLower: normalizeName(group.name), 'packages._id': pkg._id }
    : {
        nameLower: normalizeName(group.name),
        'packages.expiry':   pkg.expiry,
        'packages.quantity': pkg.quantity
      };
}

function computeRemaining(pkg) {
  const used = (pkg.consumption || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  return Math.max(0, pkg.quantity - used);
}

// Registra uso/baixa numa embalagem específica. O restante nunca é gravado
// direto — é sempre recalculado (quantity inicial − soma do consumo).
async function addConsumption(subIndex, amount, note, userId, displayName) {
  const db  = getDB();
  const all = await getAll();
  const { group, pkg } = findBySubIndex(all, subIndex);

  const entry = {
    amount:      Number(amount),
    note:        note || null,
    date:        new Date().toISOString().slice(0, 10),
    userId,
    displayName: displayName || null
  };

  await db.collection('substances').updateOne(
    pkgMatchQuery(group, pkg),
    {
      $push: { 'packages.$.consumption': entry },
      $set:  { updatedAt: new Date(), updatedBy: userId }
    }
  );

  return getAll();
}

// status: 'solicitado' | null — sempre decisão manual, nunca automática.
async function setQueueStatus(subIndex, status, userId) {
  const db  = getDB();
  const all = await getAll();
  const { group, pkg } = findBySubIndex(all, subIndex);

  await db.collection('substances').updateOne(
    pkgMatchQuery(group, pkg),
    {
      $set: { 'packages.$.queueStatus': status || null, updatedAt: new Date(), updatedBy: userId }
    }
  );

  return getAll();
}

// Lista achatada das embalagens marcadas 'solicitado', com o histórico de uso.
async function getQueue() {
  const all   = await getAll();
  const queue = [];

  for (const group of all) {
    for (const pkg of group.packages) {
      if (pkg.queueStatus === 'solicitado') {
        queue.push({
          groupName:   group.name,
          groupIndex:  group.index,
          cas:         group.cas,
          subIndex:    pkg.subIndex,
          armario:     pkg.armario,
          unit:        pkg.unit,
          quantity:    pkg.quantity,
          remaining:   computeRemaining(pkg),
          consumption: pkg.consumption || []
        });
      }
    }
  }

  return queue;
}

// Edita campos de nível de substância já existente (não mexe em embalagens).
async function updateSubstanceDetails(nameLower, fields, userId) {
  const db      = getDB();
  const allowed = ['cas', 'controladoPF', 'tags', 'observacoes', 'incompatibilidades'];

  const set = { updatedAt: new Date(), updatedBy: userId };
  for (const key of allowed) {
    if (fields[key] !== undefined) set[key] = fields[key];
  }

  const result = await db.collection('substances').updateOne({ nameLower }, { $set: set });
  if (result.matchedCount === 0) throw new Error('Substância não encontrada');

  return getAll();
}

// Edita campos de nível de embalagem já existente: quantidade/validade/
// unidade/chegada e armário/situação/local/marca, tudo num único PATCH.
async function updatePackageDetails(subIndex, fields, userId) {
  const db      = getDB();
  const all     = await getAll();
  const { group, pkg } = findBySubIndex(all, subIndex);
  const allowed = [
    'quantity', 'expiry', 'unit', 'arrival',
    'armario', 'situacao', 'localAtual', 'marca'
  ];

  const set = { updatedAt: new Date(), updatedBy: userId };
  for (const key of allowed) {
    if (fields[key] !== undefined) set[`packages.$.${key}`] = fields[key];
  }

  await db.collection('substances').updateOne(pkgMatchQuery(group, pkg), { $set: set });

  return getAll();
}

async function removePackage(subIndex, userId) {
  const db  = getDB();
  const all = await getAll();

  const [groupNum] = subIndex.split('.').map(Number);
  const group = all.find(g => g.index === groupNum);
  if (!group) throw new Error(`Substância com número ${groupNum} não encontrada`);

  const pkg = group.packages.find(p => p.subIndex === subIndex);
  if (!pkg) throw new Error(`Embalagem ${subIndex} não encontrada`);

  if (group.packages.length === 1) {
    await db.collection('substances').deleteOne({
      nameLower: normalizeName(group.name)
    });
  } else {
    const pullMatch = pkg._id ? { _id: pkg._id } : { expiry: pkg.expiry, quantity: pkg.quantity };
    await db.collection('substances').updateOne(
      { nameLower: normalizeName(group.name) },
      {
        $pull: { packages: pullMatch },
        $set:  { updatedAt: new Date(), updatedBy: userId }
      }
    );
  }

  return getAll();
}

// Renumeração travável: sem force, recusa se o número já está ocupado
// e devolve quem ocupa. Com force, empurra o ocupante pro próximo
// número livre e libera o número desejado.
async function setGroupNumber(nameLower, desiredNumber, userId, { force = false } = {}) {
  const db = getDB();

  const target = await db.collection('substances').findOne({ nameLower });
  if (!target) throw new Error('Substância não encontrada');

  const occupant = await isGroupNumberTaken(db, desiredNumber, nameLower);

  if (occupant && !force) {
    return { ok: false, conflict: { name: occupant.name, number: desiredNumber } };
  }

  if (occupant && force) {
    const nextFree = await getNextGroupNumber(db);
    await db.collection('substances').updateOne(
      { nameLower: occupant.nameLower },
      { $set: { groupNumber: nextFree, updatedAt: new Date(), updatedBy: userId } }
    );
  }

  await db.collection('substances').updateOne(
    { nameLower },
    { $set: { groupNumber: desiredNumber, updatedAt: new Date(), updatedBy: userId } }
  );

  return { ok: true, data: await getAll() };
}

async function replaceAll(data, userId) {
  const db  = getDB();
  const col = db.collection('substances');

  await col.deleteMany({});

  if (data.length > 0) {
    let nextNum = 1;
    const docs = data.map(item => ({
      name:               item.name.trim(),
      nameLower:          normalizeName(item.name),
      groupNumber:        item.groupNumber || nextNum++,
      cas:                item.cas                || null,
      controladoPF:       item.controladoPF       || false,
      tags:               item.tags                || [],
      observacoes:        item.observacoes        || null,
      incompatibilidades: item.incompatibilidades || null,
      packages:           item.packages || [],
      restoredAt:         new Date(),
      restoredBy:         userId
    }));
    await col.insertMany(docs);
  }

  return getAll();
}

module.exports = {
  getAll,
  addPackage,
  removePackage,
  replaceAll,
  setGroupNumber,
  getNextGroupNumber,
  normalizeName,
  sortAndNumber,
  computeRemaining,
  addConsumption,
  setQueueStatus,
  getQueue,
  updateSubstanceDetails,
  updatePackageDetails
};