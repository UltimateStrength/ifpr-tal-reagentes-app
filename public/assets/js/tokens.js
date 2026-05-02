window.__page = (() => {

  async function init() {
    document.getElementById('tokens-back')
      ?.addEventListener('click', () => window.__appRouter.loadPage('menu'));

    document.getElementById('btn-new-token')
      ?.addEventListener('click', openCreateModal);

    await loadTokens();
  }

  async function loadTokens() {
    const list = document.getElementById('tokens-list');
    list.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

    try {
      const tokens = await API.get('/tokens');

      if (tokens.length === 0) {
        list.innerHTML = `<div class="empty-state">Nenhum token gerado ainda.</div>`;
        return;
      }

      list.innerHTML = tokens.map(t => {
        const expired = t.expiresAt && new Date(t.expiresAt) < new Date();
        const status  = !t.active  ? 'revogado'
                      : expired    ? 'expirado'
                      : 'ativo';

        const statusColor = {
          ativo:    'var(--green)',
          expirado: '#e07b00',
          revogado: 'var(--red)'
        }[status];

        const expiryText = t.expiresAt
          ? `Expira: ${new Date(t.expiresAt).toLocaleDateString('pt-BR')}`
          : 'Sem expiração';

        return `
          <div class="card" style="margin-bottom:10px;">
            <div style="display:flex;align-items:center;
                        justify-content:space-between;margin-bottom:8px;">
              <p style="font-size:0.95rem;font-weight:700;">${t.label}</p>
              <span style="font-size:0.72rem;font-weight:700;padding:2px 8px;
                           border-radius:20px;color:#fff;
                           background:${statusColor};">
                ${status}
              </span>
            </div>
            <p style="font-size:0.82rem;color:var(--muted);margin-bottom:4px;">
              Código: <strong style="font-family:monospace;letter-spacing:0.05em;">
                ${t.code}
              </strong>
            </p>
            <p style="font-size:0.78rem;color:var(--muted);margin-bottom:10px;">
              ${expiryText} · Criado: ${new Date(t.createdAt).toLocaleDateString('pt-BR')}
            </p>
            ${t.active && !expired ? `
              <button class="btn-danger btn-revoke"
                      data-id="${t._id}" data-label="${t.label}"
                      style="width:auto;padding:7px 14px;font-size:0.82rem;">
                Revogar
              </button>` : ''}
          </div>`;
      }).join('');

      list.querySelectorAll('.btn-revoke').forEach(btn => {
        btn.addEventListener('click', () =>
          confirmRevoke(btn.dataset.id, btn.dataset.label)
        );
      });

    } catch (err) {
      list.innerHTML = `<div class="empty-state">Erro ao carregar tokens.</div>`;
    }
  }

  function openCreateModal() {
    const modal  = document.getElementById('token-modal');
    const btnOk  = document.getElementById('t-confirm');
    const btnCan = document.getElementById('t-cancel');

    document.getElementById('t-label').value   = '';
    document.getElementById('t-expires').value = '';
    modal.hidden = false;

    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const newOk  = clone(btnOk);
    const newCan = clone(btnCan);

    newOk.addEventListener('click', handleCreate);
    newCan.addEventListener('click', () => { modal.hidden = true; });
  }

  async function handleCreate() {
    const label     = document.getElementById('t-label').value.trim();
    const expiresIn = document.getElementById('t-expires').value || null;

    if (!label) {
      window.showToast('Preencha a identificação do token.');
      return;
    }

    try {
      const token = await API.post('/tokens', {
        label,
        expiresIn: expiresIn ? parseInt(expiresIn) : null
      });

      document.getElementById('token-modal').hidden = true;
      showTokenResult(token.code);
      await loadTokens();
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  function showTokenResult(code) {
    const modal    = document.getElementById('token-result-modal');
    const codeText = document.getElementById('token-code-text');
    const btnCopy  = document.getElementById('btn-copy-token');
    const btnClose = document.getElementById('btn-close-token-result');

    codeText.textContent = code;
    modal.hidden = false;

    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const newCopy  = clone(btnCopy);
    const newClose = clone(btnClose);

    newCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(code)
        .then(() => window.showToast('Código copiado!'))
        .catch(() => window.showToast('Não foi possível copiar.'));
    });

    newClose.addEventListener('click', () => { modal.hidden = true; });
  }

  function confirmRevoke(id, label) {
    const modal  = document.getElementById('revoke-modal');
    const msg    = document.getElementById('revoke-msg');
    const btnOk  = document.getElementById('rv-confirm');
    const btnCan = document.getElementById('rv-cancel');

    msg.textContent = `Revogar acesso de "${label}"? Esta ação não pode ser desfeita.`;
    modal.hidden = false;

    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const newOk  = clone(btnOk);
    const newCan = clone(btnCan);

    newOk.addEventListener('click', async () => {
      try {
        await API.delete(`/tokens/${id}`);
        modal.hidden = true;
        window.showToast('Token revogado.');
        await loadTokens();
      } catch (err) {
        window.showToast(`Erro: ${err.message}`);
      }
    });

    newCan.addEventListener('click', () => { modal.hidden = true; });
  }

  return { init };
})();