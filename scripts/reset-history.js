// scripts/reset-history.js
//
// One-off: apaga todos os documentos da collection `history`. O histórico
// atual é só de teste/QA das sessões anteriores — o usuário quer começar
// zerado antes de usar o sistema com dados reais. Não faz parte do código
// de produção, é uma ação manual e deliberada, rodada uma única vez.
//
// Uso: node scripts/reset-history.js
//   --dry-run   mostra quantos documentos seriam apagados sem apagar nada
require('dotenv').config();
const { connectDB } = require('../db/connection');

async function resetHistory({ dryRun = false } = {}) {
  const db  = await connectDB();
  const col = db.collection('history');

  const count = await col.countDocuments({});

  if (count === 0) {
    console.log('Histórico já está vazio. Nada a fazer.');
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] ${count} entrada(s) de histórico seriam apagadas. Nada foi gravado.`);
    return;
  }

  const result = await col.deleteMany({});
  console.log(`${result.deletedCount} entrada(s) de histórico apagadas.`);
}

const dryRun = process.argv.includes('--dry-run');

resetHistory({ dryRun })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro ao resetar histórico:', err);
    process.exit(1);
  });
