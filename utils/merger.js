const { readData, writeData, normalizeName, sortAndNumber } = require('./dataManager');

/**
 * Faz merge de uma lista de novas embalagens com o estado atual do disco.
 * 
 * Estratégia otimista: lê o estado mais recente na hora do merge,
 * não no momento em que o usuário abriu a tela.
 * 
 * duplicateStrategy: 'sum' | 'replace' | 'ignore'
 *   - sum: soma as quantidades de embalagens com mesmo nome+validade
 *   - replace: substitui a embalagem existente
 *   - ignore: mantém a existente, descarta a nova
 */
function mergePackages(incoming, duplicateStrategy = 'sum') {
  // Lê o estado ATUAL do disco (não o que estava na memória do cliente)
  const current = readData();

  for (const item of incoming) {
    const key = normalizeName(item.name);
    let group = current.find(g => normalizeName(g.name) === key);

    if (!group) {
      current.push({
        name: item.name.trim(),
        packages: [{ quantity: item.quantity, expiry: item.expiry }]
      });
      continue;
    }

    // Verifica duplicata exata (mesmo nome + mesma validade)
    const dupIdx = group.packages.findIndex(p => p.expiry === item.expiry);

    if (dupIdx === -1) {
      // Sem duplicata — insere normalmente
      group.packages.push({ quantity: item.quantity, expiry: item.expiry });
      continue;
    }

    // Tem duplicata — aplica estratégia
    switch (duplicateStrategy) {
      case 'sum':
        group.packages[dupIdx].quantity += item.quantity;
        break;
      case 'replace':
        group.packages[dupIdx].quantity = item.quantity;
        break;
      case 'ignore':
        // não faz nada
        break;
    }
  }

  return writeData(current);
}

module.exports = { mergePackages };