const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Normaliza data de qualquer formato pra YYYY-MM-DD
function normalizeDate(raw) {
  if (!raw) return null;
  // Troca / por -
  const normalized = raw.trim().replace(/\//g, '-');
  // Aceita YYYY-MM-DD ou YYYY-MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}$/.test(normalized)) return `${normalized}-01`;
  return null;
}

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');

  const records = parse(raw, {
    columns:           true,
    skip_empty_lines:  true,
    trim:              true,
    bom:               true
  });

  const valid  = [];
  const errors = [];

  for (const [i, row] of records.entries()) {
    const name       = row['nome']       || row['name']      || row['substancia'];
    const quantityRaw = row['quantidade'] || row['quantity']  || row['qtd'];
    const unitRaw    = row['unidade']    || row['unit']      || row['und'];
    const expiryRaw  = row['validade']   || row['expiry']    || row['vencimento'];
    const arrivalRaw = row['chegada']    || row['arrival']   || row['entrada'];

    const quantity = parseFloat(quantityRaw);
    const expiry   = normalizeDate(expiryRaw);
    const arrival  = normalizeDate(arrivalRaw);
    const unit     = unitRaw?.trim() || 'un';

    if (!name?.trim()) {
      errors.push(`Linha ${i + 2}: nome ausente`);
      continue;
    }

    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Linha ${i + 2}: quantidade inválida ("${quantityRaw}")`);
      continue;
    }

    if (!expiry) {
      errors.push(`Linha ${i + 2}: data de validade inválida ("${expiryRaw}") — use AAAA-MM-DD`);
      continue;
    }

    valid.push({ name: name.trim(), quantity, unit, expiry, arrival });
  }

  return { valid, errors };
}

module.exports = { parseCSV };