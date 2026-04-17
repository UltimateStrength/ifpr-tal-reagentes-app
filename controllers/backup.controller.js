const fs = require('fs');
const path = require('path');
const dm = require('../utils/dataManager');

const BACKUP_DIR = path.join(__dirname, '../data/backups');

function exportJSON(req, res) {
  try {
    const data = dm.getAll();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;

    // Salva uma cópia local no servidor também
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(data, null, 2));

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function restoreJSON(req, res) {
  try {
    const incoming = req.body;

    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'JSON inválido — esperado array de substâncias' });
    }

    // Valida estrutura mínima de cada item antes de sobrescrever
    for (const item of incoming) {
      if (!item.name || !Array.isArray(item.packages)) {
        return res.status(400).json({
          error: `Item inválido no JSON: ${JSON.stringify(item)}`
        });
      }
    }

    const restored = dm.writeData(incoming);
    res.json({ ok: true, data: restored });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportJSON, restoreJSON };