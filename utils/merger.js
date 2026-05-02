const { getDB } = require('../db/connection');
const { getAll, normalizeName, sortAndNumber } = require('./dataManager');

async function mergePackages(incoming, duplicateStrategy = 'sum', userId) {
  const db = getDB();

  for (const item of incoming) {
    const key      = normalizeName(item.name);
    const existing = await db.collection('substances').findOne({ nameLower: key });

    const pkg = {
      quantity: item.quantity,
      expiry:   item.expiry,
      unit:     item.unit || 'un',
      arrival:  item.arrival || new Date().toISOString().slice(0, 10),
      addedAt:  new Date(),
      addedBy:  userId
    };

    if (!existing) {
      await db.collection('substances').insertOne({
        name:      item.name.trim(),
        nameLower: key,
        packages:  [pkg],
        createdAt: new Date(),
        createdBy: userId
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
        { $set: { 'packages.$.quantity': item.quantity, updatedAt: new Date() } }
      );
    }
    // 'ignore' — não faz nada
  }

  return getAll();
}

module.exports = { mergePackages };