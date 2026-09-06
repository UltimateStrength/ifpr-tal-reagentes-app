// utils/merger.js
const { randomUUID } = require('crypto');
const { getDB } = require('../db/connection');
const { getAll, normalizeName, getNextGroupNumber } = require('./dataManager');

// item: { name, quantity, expiry, unit, arrival, armario, situacao, localAtual, marca,
//         cas, controladoPF, tags, observacoes, incompatibilidades }
async function mergePackages(incoming, duplicateStrategy = 'sum', userId) {
  const db = getDB();

  for (const item of incoming) {
    const key      = normalizeName(item.name);
    const existing = await db.collection('substances').findOne({ nameLower: key });

    const pkg = {
      _id:         randomUUID(),
      quantity:    item.quantity,
      expiry:      item.expiry,
      unit:        item.unit || 'un',
      arrival:     item.arrival || new Date().toISOString().slice(0, 10),
      armario:     item.armario    || null,
      situacao:    item.situacao   || null,
      localAtual:  item.localAtual || null,
      marca:       item.marca      || null,
      consumption: [],
      queueStatus: null,
      addedAt:     new Date(),
      addedBy:     userId
    };

    if (!existing) {
      const groupNumber = await getNextGroupNumber(db);
      await db.collection('substances').insertOne({
        name:               item.name.trim(),
        nameLower:          key,
        groupNumber,
        cas:                item.cas                || null,
        controladoPF:       item.controladoPF       || false,
        tags:               item.tags                || [],
        observacoes:        item.observacoes        || null,
        incompatibilidades: item.incompatibilidades || null,
        packages:           [pkg],
        createdAt:          new Date(),
        createdBy:          userId
      });
      continue;
    }

    const dupIdx = existing.packages.findIndex(p => p.expiry === item.expiry);

    if (dupIdx === -1) {
      await db.collection('substances').updateOne(
        { nameLower: key },
        {
          $push: { packages: pkg },
          $set:  { updatedAt: new Date(), updatedBy: userId }
        }
      );
      continue;
    }

    // Duplicata — aplica estratégia
    if (duplicateStrategy === 'sum') {
      const newQty = existing.packages[dupIdx].quantity + item.quantity;
      await db.collection('substances').updateOne(
        { nameLower: key, 'packages.expiry': item.expiry },
        { $set: { 'packages.$.quantity': newQty, updatedAt: new Date() } }
      );
    } else if (duplicateStrategy === 'replace') {
      await db.collection('substances').updateOne(
        { nameLower: key, 'packages.expiry': item.expiry },
        {
          $set: {
            'packages.$.quantity':    item.quantity,
            'packages.$.armario':     item.armario    || existing.packages[dupIdx].armario,
            'packages.$.situacao':    item.situacao   || existing.packages[dupIdx].situacao,
            'packages.$.localAtual':  item.localAtual || existing.packages[dupIdx].localAtual,
            'packages.$.marca':       item.marca      || existing.packages[dupIdx].marca,
            updatedAt: new Date()
          }
        }
      );
    }
    // 'ignore' — não faz nada
  }

  return getAll();
}

module.exports = { mergePackages };