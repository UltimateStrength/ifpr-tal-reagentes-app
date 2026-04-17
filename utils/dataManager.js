const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/substances.json');

// Lê o JSON do disco
function readData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Escreve no disco (sempre sobrescreve com a lista reordenada)
function writeData(data) {
  const sorted = sortAndNumber(data);
  fs.writeFileSync(DATA_PATH, JSON.stringify(sorted, null, 2), 'utf-8');
  return sorted;
}

// Normaliza o nome pra comparação (evita duplicatas por case/espaço)
function normalizeName(name) {
  return name.toLowerCase().trim();
}

// Ordena grupos A-Z e embalagens por validade (asc), depois renumera tudo
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

// Adiciona uma embalagem. Se a substância já existe, insere no grupo.
// Retorna o estado atualizado.
function addPackage(name, quantity, expiry) {
  const data = readData();
  const key = normalizeName(name);
  const existing = data.find(g => normalizeName(g.name) === key);

  if (existing) {
    existing.packages.push({ quantity, expiry });
  } else {
    data.push({
      name: name.trim(),
      packages: [{ quantity, expiry }]
    });
  }

  return writeData(data);
}

// Remove uma embalagem pelo subIndex (ex: "2.1")
// Se o grupo ficar vazio, remove o grupo inteiro.
function removePackage(subIndex) {
  const data = readData();
  const [groupIdx] = subIndex.split('.').map(Number);

  const group = data.find(g => g.index === groupIdx);
  if (!group) throw new Error(`Substância com índice ${groupIdx} não encontrada`);

  const pkgIdx = group.packages.findIndex(p => p.subIndex === subIndex);
  if (pkgIdx === -1) throw new Error(`Embalagem ${subIndex} não encontrada`);

  group.packages.splice(pkgIdx, 1);

  // Remove o grupo se não sobrou nenhuma embalagem
  const filtered = group.packages.length === 0
    ? data.filter(g => g.index !== groupIdx)
    : data;

  return writeData(filtered);
}

// Retorna todos os dados já ordenados e numerados
function getAll() {
  return readData();
}

module.exports = { readData, writeData, addPackage, removePackage, getAll, normalizeName, sortAndNumber };