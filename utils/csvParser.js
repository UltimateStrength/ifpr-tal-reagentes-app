const fs = require('fs');
const { parse } = require('csv-parse/sync');

/**
 * Lê um arquivo CSV e retorna array padronizado pra usar no merger.
 * 
 * Formato esperado do CSV:
 * nome,quantidade,validade
 * Álcool Etílico,2,2026-05
 * Ácido Sulfúrico,1,2026-03
 * 
 * - validade aceita YYYY-MM ou YYYY-MM-DD
 * - quantidade deve ser número positivo
 * - linhas inválidas são descartadas (com log de aviso)
 */
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');

  const records = parse(raw, {
    columns: true,          // usa a primeira linha como header
    skip_empty_lines: true,
    trim: true,
    bom: true               // remove BOM de arquivos Excel
  });

  const valid = [];
  const errors = [];

  for (const [i, row] of records.entries()) {
    const name = row['nome'] || row['name'] || row['substancia'] || row['substance'];
    const quantityRaw = row['quantidade'] || row['quantity'] || row['qtd'];
    const expiry = row['validade'] || row['expiry'] || row['vencimento'];

    const quantity = parseFloat(quantityRaw);

    if (!name || !expiry) {
      errors.push(`Linha ${i + 2}: nome ou validade ausente`);
      continue;
    }

    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Linha ${i + 2}: quantidade inválida ("${quantityRaw}")`);
      continue;
    }

    if (!/^\d{4}-\d{2}/.test(expiry)) {
      errors.push(`Linha ${i + 2}: formato de validade inválido ("${expiry}") — use YYYY-MM`);
      continue;
    }

    valid.push({ name, quantity, expiry });
  }

  return { valid, errors };
}

module.exports = { parseCSV };