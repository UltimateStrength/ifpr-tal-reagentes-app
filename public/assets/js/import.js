window.__page = (() => {
  let selectedStrategy = 'sum';

  function init() {
    // Seleção de estratégia
    document.querySelectorAll('.strategy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.strategy-btn')
          .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedStrategy = btn.dataset.strategy;
      });
    });

    document.getElementById('btn-import')
      ?.addEventListener('click', handleImport);
  }

  async function handleImport() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput?.files[0];
    if (!file) {
      alert('Selecione um arquivo CSV.');
      return;
    }

    const btn = document.getElementById('btn-import');
    btn.disabled = true;
    btn.textContent = 'Importando...';

    const form = new FormData();
    form.append('file', file);
    form.append('strategy', selectedStrategy);

    try {
      const result = await API.upload('/import', form);

      const summary = document.getElementById('import-summary');
      const errBox  = document.getElementById('import-errors');
      const resDiv  = document.getElementById('import-result');

      resDiv.style.display = 'block';
      summary.textContent =
        `✅ ${result.imported} embalagem(ns) importada(s).` +
        (result.skipped ? ` ⚠️ ${result.skipped} linha(s) ignorada(s).` : '');

      if (result.errors?.length > 0) {
        errBox.style.display = 'block';
        errBox.innerHTML = result.errors.map(e => `<div>• ${e}</div>`).join('');
      } else {
        errBox.style.display = 'none';
      }

      fileInput.value = '';
    } catch (err) {
      alert(`Erro na importação: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Importar';
    }
  }

  return { init };
})();