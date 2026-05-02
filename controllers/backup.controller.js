const dm      = require('../utils/dataManager');
const history = require('../utils/history');
const { generateExport } = require('../utils/xlsxParser');

async function exportJSON(req, res) {
  try {
    const data      = await dm.getAll();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename  = `backup_${timestamp}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function exportXLSX(req, res) {
  try {
    const data     = await dm.getAll();
    const workbook = await generateExport(data);
    const buffer   = await workbook.xlsx.writeBuffer();
    const filename = `reagentes_${new Date().toISOString().slice(0,10)}.xlsx`;

    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function restoreJSON(req, res) {
  try {
    const incoming = req.body;

    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'JSON inválido — esperado array' });
    }

    for (const item of incoming) {
      if (!item.name || !Array.isArray(item.packages)) {
        return res.status(400).json({ error: `Item inválido: ${JSON.stringify(item)}` });
      }
    }

    const restored = await dm.replaceAll(incoming, req.session.userId);

    req.app.get('io').emit('data-update', {
      data:   restored,
      action: 'restore',
      by:     req.session.displayName
    });

    res.json({ ok: true, data: restored });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportJSON, exportXLSX, restoreJSON };