// scripts/backfill-group-numbers.js
//
// One-off: reagentes cadastrados antes do campo `groupNumber` existir têm
// esse campo null/undefined no banco. Isso quebra a exclusão/edição deles,
// porque removePackage/findBySubIndex localizam o grupo por
// `group.index === groupNum` (index vem de groupNumber). O dataManager já
// tem um paliativo em memória pra isso (sortAndNumber), mas esse paliativo
// não persiste — este script grava o número de verdade no documento.
//
// Uso: node scripts/backfill-group-numbers.js
//   --dry-run   mostra o que seria alterado sem gravar nada
require('dotenv').config();
const { connectDB } = require('../db/connection');

async function backfill({ dryRun = false } = {}) {
  const db  = await connectDB();
  const col = db.collection('substances');

  const semNumero = await col
    .find({ $or: [{ groupNumber: null }, { groupNumber: { $exists: false } }] })
    .sort({ createdAt: 1 }) // mais antigo primeiro, pra manter uma ordem estável
    .toArray();

  if (semNumero.length === 0) {
    console.log('Nenhum reagente sem groupNumber. Nada a fazer.');
    return;
  }

  const top = await col
    .find({ groupNumber: { $type: 'number' } })
    .sort({ groupNumber: -1 })
    .limit(1)
    .toArray();
  let nextNumber = (top[0]?.groupNumber || 0) + 1;

  console.log(`${semNumero.length} reagente(s) sem groupNumber. Atribuindo a partir de ${nextNumber}.`);

  for (const doc of semNumero) {
    const numero = nextNumber++;
    console.log(`  ${dryRun ? '[dry-run] ' : ''}"${doc.name}" (_id ${doc._id}) -> groupNumber ${numero}`);
    if (!dryRun) {
      await col.updateOne({ _id: doc._id }, { $set: { groupNumber: numero } });
    }
  }

  console.log(dryRun ? 'Dry-run concluído — nada foi gravado.' : 'Backfill concluído.');
}

const dryRun = process.argv.includes('--dry-run');

backfill({ dryRun })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro no backfill:', err);
    process.exit(1);
  });
