const fs = require('fs');
const { parseCSV } = require('../utils/csvParser');
const { mergePackages } = require('../utils/merger');

function importCSV(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const strategy = req.body.strategy || 'sum'; // sum | replace | ignore

  if (!['sum', 'replace', 'ignore'].includes(strategy)) {
    return res.status(400).json({ error: 'strategy inválida' });
  }

  try {
    const { valid, errors } = parseCSV(req.file.path);

    if (valid.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma linha válida encontrada no CSV',
        details: errors
      });
    }

    const updated = mergePackages(valid, strategy);

    res.json({
      imported: valid.length,
      skipped: errors.length,
      errors,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // sempre limpa o arquivo temporário
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
}

module.exports = { importCSV };