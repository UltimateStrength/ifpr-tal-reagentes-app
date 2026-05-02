window.__page = (() => {
  let selectedStrategy = 'sum';

  function init() {
    document.getElementById('imp-btn-importar')
      ?.addEventListener('click', () => showPanel('panel-importar'));

    document.getElementById('imp-btn-exportar')
      ?.addEventListener('click', handleExport);

    document.getElementById('importar-close')
      ?.addEventListener('click', showMain);

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
    document.getElementById('panel-importar').hidden  = true;
    document.getElementById('page-import').hidden     = false;
    document.getElementById('imp-upload-area').hidden = true;
  }

  function downloadTemplate() {
    window.location.href = '/assets/resources/Template.xlsx';
  }

  async function handleImport() {
    const file = document.getElementById('csv-file')?.files[0];
    if (!file) { window.showToast('Selecione um arquivo.'); return; }

    const btn = document.getElementById('btn-import-confirm');
    btn.disabled    = true;
    btn.textContent = 'Importando...';

    const form = new FormData();
    form.append('file', file);
    form.append('strategy', selectedStrategy);

    try {
      const result = await API.upload('/import', form);
      window.__substancesData = result.data;

      const resDiv  = document.getElementById('import-result');
      const summary = document.getElementById('import-summary');
      const errBox  = document.getElementById('import-errors');

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
      window.showToast(`${result.imported} reagente(s) importado(s)!`);
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Importar';
    }
  }

  async function handleExport() {
    try {
      const a    = document.createElement('a');
      a.href     = '/api/backup/export-xlsx';
      a.download = `reagentes_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.showToast('Exportado com sucesso!');
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  return { init };
})();