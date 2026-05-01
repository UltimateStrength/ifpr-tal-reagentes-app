const { getDB } = require('../db/connection');

function normalizeName(name) {
  return name.toLowerCase().trim();
}

function sortAndNumber(data) {
  const sorted = [...data].sort((a, b) =>
    normalizeName(a.name).localeCompare(normalizeName(b.name), 'pt-BR')
  );

  return sorted.map((group, gi) => ({
    ...group,
    index: gi + 1,
    packages: [...group.packages]
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))
      .map((pkg, pi) => ({
        ...pkg,
        subIndex: `${gi + 1}.${pi + 1}`
      }))
  }));
}

async function getAll() {
  const db = getDB();
  const raw = await db.collection('substances').find({}).toArray();
  return sortAndNumber(raw);
}

async function addPackage(name, quantity, expiry, userId) {
  const db = getDB();
  const key = normalizeName(name);

  const existing = await db.collection('substances').findOne({
    nameLower: key
  });

  if (existing) {
    await db.collection('substances').updateOne(
      { nameLower: key },
      {
        $push: { packages: { quantity, expiry } },
        $set:  { updatedAt: new Date(), updatedBy: userId }
      }
    );
  } else {
    await db.collection('substances').insertOne({
      name: name.trim(),
      nameLower: key,
      packages: [{ quantity, expiry }],
      createdAt: new Date(),
      createdBy: userId
    });
  }

  return getAll();
}

async function removePackage(subIndex, userId) {
  const db = getDB();

  // Pega todos pra localizar pelo subIndex gerado dinamicamente
  const all = await getAll();
  const [groupIdx] = subIndex.split('.').map(Number);

  const group = all.find(g => g.index === groupIdx);
  if (!group) throw new Error(`Substância com índice ${groupIdx} não encontrada`);

  const pkg = group.packages.find(p => p.subIndex === subIndex);
  if (!pkg) throw new Error(`Embalagem ${subIndex} não encontrada`);

  if (group.packages.length === 1) {
    // Última embalagem — remove o documento inteiro
    await db.collection('substances').deleteOne({ nameLower: normalizeName(group.name) });
  } else {
    // Remove só essa embalagem pelo expiry + quantidade (identificador único no array)
    await db.collection('substances').updateOne(
      { nameLower: normalizeName(group.name) },
      {
        $pull: { packages: { quantity: pkg.quantity, expiry: pkg.expiry } },
        $set:  { updatedAt: new Date(), updatedBy: userId }
      }
    );
  }

  return getAll();
}

async function replaceAll(data, userId) {
  const db = getDB();
  const col = db.collection('substances');

  // Usado pelo restore de backup
  await col.deleteMany({});

  if (data.length > 0) {
    const docs = data.map(item => ({
      name: item.name.trim(),
      nameLower: normalizeName(item.name),
      packages: item.packages || [],
      restoredAt: new Date(),
      restoredBy: userId
    }));
    await col.insertMany(docs);
  }

  return getAll();
}

module.exports = { getAll, addPackage, removePackage, replaceAll, normalizeName, sortAndNumber };