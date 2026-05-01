const fs      = require('fs');
const { parseCSV }      = require('../utils/csvParser');
const { mergePackages } = require('../utils/merger');
const history           = require('../utils/history');

async function importCSV(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const strategy = req.body.strategy || 'sum';

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

    const updated = await mergePackages(valid, strategy, req.session.userId);

    await history.record(
      req.session.userId,
      req.session.displayName,
      history.ACTIONS.IMPORT,
      { count: valid.length, strategy },
      req.session.sessionId,
      req.session.fingerprint
    );

    req.app.get('io').emit('data-update', {
      data: updated,
      action: 'import',
      by: req.session.displayName,
      detail: { count: valid.length }
    });

    res.json({ imported: valid.length, skipped: errors.length, errors, data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
  }
}

module.exports = { importCSV };