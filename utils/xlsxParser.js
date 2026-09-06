// utils/xlsxParser.js
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

// --- Parser dedicado ao formato oficial do TAL (aba "Organizado") ---
// Colunas: Nº | Nome do Reagente | C.A.S | Controlado P.F | (vazia) |
//          Incompatibilidades | Armário Sugerido | Validade | Situação |
//          Local Atual | Vencido
//
// Diferenças em relação ao template próprio do sistema:
// - Não tem coluna de quantidade/unidade — a planilha oficial nunca
//   controlou isso. Itens entram com quantity:null e ficam marcados em
//   "warnings" pra completar manualmente depois do import.
// - Situação vem com valores sujos (Aberto/Fechado + variações e erros
//   de digitação) e às vezes com "Finalizou"/"Acabou" — que não é um
//   estado de embalagem, é o reagente tendo sido extinto. Essas linhas
//   NÃO entram como reagente ativo: vão pra "finalizados", pra revisão
//   manual (etapa 9 vai automatizar esse fluxo via sistema de baixa).

const ARMARIOS_CONHECIDOS = [
  'Armário 2', 'Armário Solventes', 'Armário Ácidos',
  'Armário Sais', 'Armário Bases', 'Geladeira'
];

function normalizeArmario(raw) {
  if (!raw) return null;
  const clean = raw.toString().trim();
  const match = ARMARIOS_CONHECIDOS.find(
    a => a.toLowerCase() === clean.toLowerCase()
  );
  return match || clean; // desconhecido: mantém como veio (etapa 4 resolve isso)
}

function normalizeControladoPF(raw) {
  if (!raw) return false;
  return raw.toString().trim().toUpperCase() === 'SIM';
}

// Retorna 'aberto' | 'fechado' | 'finalizado' | null (não reconhecido)
function normalizeSituacao(raw) {
  if (!raw) return null;
  const clean = raw.toString().trim().toLowerCase();

  if (clean.startsWith('finaliz') || clean.startsWith('acabou')) return 'finalizado';
  if (clean.startsWith('abert'))  return 'aberto';
  if (clean.startsWith('fech'))   return 'fechado'; // cobre "fechado", "fechada", "fecahdo"

  return null;
}

function normalizeDateFromCell(val) {
  if (!val || val === '-') return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const str = val.toString().trim().replace(/\//g, '-');
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}$/.test(str))        return `${str}-01`;
  return null;
}

async function parseOrganizado(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('Organizado') || workbook.worksheets[0];

  const valid       = [];   // reagentes prontos pra importar
  const finalizados = [];   // situação = finalizou/acabou — fora do import, pra revisão
  const warnings     = [];  // entrou, mas com dado incompleto (ex: sem quantidade)
  const errors        = []; // linha rejeitada

  const headerRow = sheet.getRow(1);
  const headers   = {};
  headerRow.eachCell((cell, colNum) => {
    const key = cell.value?.toString().trim().toLowerCase();
    if (key) headers[key] = colNum;
  });

  const col = (name) => headers[name];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const numeroOriginalRaw   = row.getCell(col('nº'))?.value;
    const name                = row.getCell(col('nome do reagente'))?.text?.trim();
    const cas                  = row.getCell(col('c.a.s'))?.text?.trim() || null;
    const controladoPFRaw     = row.getCell(col('controlado p. f'))?.text;
    const incompatibilidadesRaw = row.getCell(col('incompatibilidades'))?.text;
    const armarioRaw           = row.getCell(col('armário sugerido'))?.text;
    const validadeRaw          = row.getCell(col('validade'))?.value;
    const situacaoRaw          = row.getCell(col('situação'))?.text;
    const localAtualRaw        = row.getCell(col('local atual'))?.text;

    if (!name) {
      errors.push(`Linha ${rowNumber}: nome ausente`);
      return;
    }

    const situacao = normalizeSituacao(situacaoRaw);

    if (situacao === 'finalizado') {
      finalizados.push({
        name,
        cas,
        situacaoOriginal: situacaoRaw?.trim() || null,
        linha: rowNumber
      });
      return;
    }

    if (situacaoRaw && !situacao) {
      errors.push(`Linha ${rowNumber}: situação não reconhecida ("${situacaoRaw}")`);
      return;
    }

    const expiry = normalizeDateFromCell(validadeRaw);
    const item = {
      name,
      cas,
      controladoPF:       normalizeControladoPF(controladoPFRaw),
      incompatibilidades: incompatibilidadesRaw?.trim() || null,
      armario:            normalizeArmario(armarioRaw),
      situacao:           situacao || null,
      localAtual:         localAtualRaw?.trim() || null,
      quantity:           null,          // planilha oficial não tem quantidade
      unit:               'un',
      expiry,
      arrival:            null,
      numeroOriginal:     numeroOriginalRaw ? Number(numeroOriginalRaw) : null
    };

    if (item.quantity === null) {
      warnings.push(`Linha ${rowNumber} (${name}): sem quantidade na planilha — completar manualmente após o import`);
    }
    if (!expiry) {
      warnings.push(`Linha ${rowNumber} (${name}): sem data de validade`);
    }

    valid.push(item);
  });

  return { valid, finalizados, warnings, errors };
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
    { header: 'Nº',                key: 'num',                width: 8  },
    { header: 'Nome',              key: 'nome',               width: 28 },
    { header: 'C.A.S',             key: 'cas',                width: 14 },
    { header: 'Controlado P.F',    key: 'controladoPF',       width: 14 },
    { header: 'Incompatibilidades',key: 'incompatibilidades', width: 24 },
    { header: 'Armário',           key: 'armario',            width: 18 },
    { header: 'Qtd',               key: 'qtd',                width: 10 },
    { header: 'Unidade',           key: 'unidade',            width: 10 },
    { header: 'Validade',          key: 'validade',           width: 14 },
    { header: 'Chegada',           key: 'chegada',            width: 14 },
    { header: 'Situação',          key: 'situacao',           width: 12 },
    { header: 'Local Atual',       key: 'localAtual',         width: 18 },
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
      num:                group.index,
      nome:               group.name.toUpperCase(),
      cas:                group.cas || '',
      controladoPF:       group.controladoPF ? 'SIM' : '',
      incompatibilidades: group.incompatibilidades || '',
    });
    groupRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe8e7e0' } };
    });

    for (const pkg of group.packages) {
      const pkgRow = sheet.addRow({
        num:        pkg.subIndex,
        nome:       group.name,
        qtd:        pkg.quantity,
        unidade:    pkg.unit       || '',
        validade:   pkg.expiry     || '',
        chegada:    pkg.arrival    || '',
        armario:    pkg.armario    || '',
        situacao:   pkg.situacao   || '',
        localAtual: pkg.localAtual || '',
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

module.exports = {
  parseXLSX,
  parseOrganizado,
  generateTemplate,
  generateExport,
  normalizeArmario,
  normalizeControladoPF,
  normalizeSituacao
};