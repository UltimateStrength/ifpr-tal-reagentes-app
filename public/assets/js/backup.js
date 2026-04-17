window.__page = (() => {
  function init() {
    // Troca de abas
    document.querySelectorAll('.menu-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.menu-tab')
          .forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.tab-panel')
          .forEach(p => { p.hidden = true; });
        document.getElementById(`tab-${tab.dataset.tab}`).hidden = false;
      });
    });

    document.getElementById('btn-export')
      ?.addEventListener('click', handleExport);

    // Restore dispara ao selecionar o arquivo
    document.getElementById('restore-file')
      ?.addEventListener('change', handleRestore);

    document.getElementById('btn-logout')
      ?.addEventListener('click', handleLogout);
  }

  async function handleExport() {
    try {
      const data = await API.get('/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)],
                            { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback('Backup exportado!', false);
    } catch (err) {
      setFeedback(`Erro: ${err.message}`, true);
    }
  }

  async function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Isso vai substituir todos os dados atuais. Confirmar?')) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await API.post('/backup/restore', json);
      setFeedback('Dados restaurados com sucesso!', false);
    } catch (err) {
      setFeedback(`Erro ao restaurar: ${err.message}`, true);
    } finally {
      e.target.value = '';
    }
  }

  async function handleLogout() {
    try {
      await API.post('/auth/logout');
    } finally {
      window.__appRouter.goLogin();
    }
  }

  function setFeedback(msg, isError) {
    const el = document.getElementById('menu-feedback');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? 'var(--red)' : 'var(--green)';
  }

  return { init };
})();