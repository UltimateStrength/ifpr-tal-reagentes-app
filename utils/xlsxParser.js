const ExcelJS = require('exceljs');

async function parseXLSX(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet  = workbook.worksheets[0];
  const valid  = [];
  const errors = [];

  const headerRow = sheet.getRow(1);
  const headers   = {};
  headerRow.eachCell((cell, col) => {
    headers[cell.value?.toString().toLowerCase().trim()] = col;
  });

  const col = (name) => headers[name];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const name        = row.getCell(col('nome'))?.text?.trim();
    const quantityRaw = row.getCell(col('quantidade'))?.value;
    const unitRaw     = row.getCell(col('unidade'))?.text?.trim();
    const expiryRaw   = row.getCell(col('validade'))?.value;
    const arrivalRaw  = row.getCell(col('chegada'))?.value;

    const quantity = parseFloat(quantityRaw);

    if (!name) {
      errors.push(`Linha ${rowNumber}: nome ausente`);
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Linha ${rowNumber}: quantidade inválida ("${quantityRaw}")`);
      return;
    }

    function normalizeDate(val) {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      const str = val.toString().trim().replace(/\//g, '-');
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      if (/^\d{4}-\d{2}$/.test(str))        return `${str}-01`;
      return null;
    }

    const expiry  = normalizeDate(expiryRaw);
    const arrival = normalizeDate(arrivalRaw);

    if (!expiry) {
      errors.push(`Linha ${rowNumber}: data de validade inválida ("${expiryRaw}")`);
      return;
    }

    valid.push({ name, quantity, unit: unitRaw || 'un', expiry, arrival });
  });

  return { valid, errors };
}

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet('Reagentes');

  sheet.columns = [
    { header: 'nome',       key: 'nome',       width: 30 },
    { header: 'quantidade', key: 'quantidade',  width: 14 },
    { header: 'unidade',    key: 'unidade',     width: 12 },
    { header: 'validade',   key: 'validade',    width: 16 },
    { header: 'chegada',    key: 'chegada',     width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2f9e3f' } };
    cell.alignment = { horizontal: 'center' };
    cell.border    = { bottom: { style: 'thin', color: { argb: 'FF000000' } } };
  });

  sheet.addRow({
    nome:       'Exemplo (remover)',
    quantidade: 1,
    unidade:    'L',
    validade:   '2026-12-01',
    chegada:    '2024-01-15'
  });

  sheet.dataValidations.add('C2:C1000', {
    type:       'list',
    allowBlank: true,
    formulae:   ['"un,L,mL,kg,g,mg"']
  });

  for (let i = 2; i <= 1000; i++) {
    sheet.getCell(`D${i}`).numFmt = 'yyyy-mm-dd';
    sheet.getCell(`E${i}`).numFmt = 'yyyy-mm-dd';
  }

  return workbook;
}

async function generateExport(data) {
  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet('Reagentes');

  sheet.columns = [
    { header: 'Nº',       key: 'num',      width: 8  },
    { header: 'Nome',     key: 'nome',     width: 30 },
    { header: 'Qtd',      key: 'qtd',      width: 10 },
    { header: 'Unidade',  key: 'unidade',  width: 12 },
    { header: 'Validade', key: 'validade', width: 16 },
    { header: 'Chegada',  key: 'chegada',  width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2f9e3f' } };
    cell.alignment = { horizontal: 'center' };
    cell.border    = { bottom: { style: 'thin' } };
  });

  for (const group of data) {
    const groupRow = sheet.addRow({
      num:  group.index,
      nome: group.name.toUpperCase(),
    });
    groupRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe8e7e0' } };
    });

    for (const pkg of group.packages) {
      const pkgRow = sheet.addRow({
        num:      pkg.subIndex,
        nome:     group.name,
        qtd:      pkg.quantity,
        unidade:  pkg.unit    || '',
        validade: pkg.expiry  || '',
        chegada:  pkg.arrival || '',
      });

      const now  = new Date(); now.setHours(0,0,0,0);
      const exp  = new Date(pkg.expiry); exp.setHours(0,0,0,0);
      const diff = (exp - now) / 86400000;

      if (diff < 0) {
        pkgRow.getCell('validade').font = { color: { argb: 'FFca191f' }, bold: true };
      } else if (diff <= 60) {
        pkgRow.getCell('validade').font = { color: { argb: 'FFe07b00' }, bold: true };
      }

      pkgRow.eachCell(cell => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFdddddd' } } };
      });
    }
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook;
}

module.exports = { parseXLSX, generateTemplate, generateExport };