window.__page = (() => {
  let selectedStrategy = 'sum';

  function init() {
    document.getElementById('imp-btn-importar')
      ?.addEventListener('click', () => showPanel('panel-importar'));
    document.getElementById('imp-btn-exportar')
      ?.addEventListener('click', handleExport);
    document.getElementById('importar-close')
      ?.addEventListener('click', () => showMain());

    document.querySelectorAll('.strategy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.strategy-btn')
          .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedStrategy = btn.dataset.strategy;
      });
    });

    document.getElementById('imp-nao-tem-modelo')
      ?.addEventListener('click', downloadTemplate);
    document.getElementById('imp-tem-modelo')
      ?.addEventListener('click', () => {
        document.getElementById('imp-upload-area').hidden = false;
      });
    document.getElementById('btn-import-confirm')
      ?.addEventListener('click', handleImport);
  }

  function showPanel(id) {
    document.getElementById('page-import').hidden = true;
    document.getElementById(id).hidden = false;
  }

  function showMain() {
    document.getElementById('panel-importar').hidden = true;
    document.getElementById('page-import').hidden = false;
    document.getElementById('imp-upload-area').hidden = true;
  }

  function downloadTemplate() {
    const header = 'nome,quantidade,unidade,validade,chegada\n';
    const example = 'Álcool Etílico,2,L,2026-12-01,2024-01-15\n';
    const blob = new Blob([header + example], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'modelo_reagentes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const file = document.getElementById('csv-file')?.files[0];
    if (!file) { window.showToast('Selecione um arquivo.'); return; }

    const btn = document.getElementById('btn-import-confirm');
    btn.disabled = true;
    btn.textContent = 'Importando...';

    const form = new FormData();
    form.append('file', file);
    form.append('strategy', selectedStrategy);

    try {
      const result = await API.upload('/import', form);
      window.__substancesData = result.data;

      const resDiv   = document.getElementById('import-result');
      const summary  = document.getElementById('import-summary');
      const errBox   = document.getElementById('import-errors');
      resDiv.style.display = 'block';
      summary.textContent  =
        `✅ ${result.imported} importado(s).` +
        (result.skipped ? ` ⚠️ ${result.skipped} ignorado(s).` : '');

      if (result.errors?.length) {
        errBox.style.display = 'block';
        errBox.innerHTML = result.errors.map(e => `<div>• ${e}</div>`).join('');
      } else {
        errBox.style.display = 'none';
      }
      document.getElementById('csv-file').value = '';
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Importar';
    }
  }

  async function handleExport() {
    try {
      const data = await API.get('/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)],
                            { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `reagentes_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      window.showToast('Exportado com sucesso!');
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  return { init };
})();