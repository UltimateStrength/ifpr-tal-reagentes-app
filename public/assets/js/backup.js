window.__page = (() => {
  function init() {
    document.getElementById('btn-export')
      ?.addEventListener('click', handleExport);

    document.getElementById('btn-restore')
      ?.addEventListener('click', handleRestore);

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
      a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback('Backup exportado com sucesso!', false);
    } catch (err) {
      setFeedback(`Erro: ${err.message}`, true);
    }
  }

  async function handleRestore() {
    const fileInput = document.getElementById('restore-file');
    const file = fileInput?.files[0];
    if (!file) {
      alert('Selecione um arquivo JSON de backup.');
      return;
    }

    if (!confirm('Isso vai substituir todos os dados atuais. Confirmar?')) return;

    const btn = document.getElementById('btn-restore');
    btn.disabled = true;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await API.post('/backup/restore', json);
      setFeedback('Dados restaurados com sucesso!', false);
      fileInput.value = '';
    } catch (err) {
      setFeedback(`Erro ao restaurar: ${err.message}`, true);
    } finally {
      btn.disabled = false;
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