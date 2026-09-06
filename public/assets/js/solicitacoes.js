window.__page = (() => {
  let queue = [];

  async function loadQueue() {
    try {
      queue = await API.get('/substances/queue/list');
    } catch (err) {
      window.showToast(`Erro ao carregar fila: ${err.message}`);
      queue = [];
    }
    renderList();
  }

  function renderList() {
    const list = document.getElementById('solicitacoes-list');
    if (!list) return;

    if (queue.length === 0) {
      list.innerHTML = `<div class="empty-state">Nenhuma solicitação pendente.</div>`;
      return;
    }

    list.innerHTML = queue.map(item => `
      <div class="card sol-item" data-sub="${item.subIndex}"
           style="margin-bottom:12px;cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:0.72rem;color:var(--muted);font-weight:600;">
              ${item.subIndex}
            </span>
            <p style="font-size:1rem;font-weight:700;">${item.groupName}</p>
            ${item.cas ? `<p style="font-size:0.72rem;color:var(--muted);">CAS: ${item.cas}</p>` : ''}
          </div>
          <span style="font-size:0.85rem;font-weight:700;color:var(--red);">
            ${item.remaining} ${item.unit || ''}
          </span>
        </div>
      </div>`).join('');

    list.querySelectorAll('.sol-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.sub));
    });
  }

  function openDetail(subIndex) {
    const item = queue.find(q => q.subIndex === subIndex);
    if (!item) return;

    const modal = document.getElementById('sol-detail-modal');
    const title = document.getElementById('sol-detail-title');
    const body  = document.getElementById('sol-detail-body');
    if (!modal) return;

    title.textContent = `${item.subIndex} — ${item.groupName}`;

    const historyHtml = item.consumption.length === 0
      ? `<p style="font-size:0.85rem;color:var(--muted);">Nenhum uso registrado ainda.</p>`
      : item.consumption.slice().reverse().map(c => `
          <div style="padding:8px 0;border-bottom:1px solid var(--card-bg);">
            <p style="font-size:0.85rem;">
              ${c.displayName || 'Alguém'} usou ${c.amount} ${item.unit || ''} — ${window.formatDateBR(c.date)}
            </p>
            ${c.note ? `<p style="font-size:0.78rem;color:var(--muted);margin-top:2px;">${c.note}</p>` : ''}
          </div>`).join('');

    body.innerHTML = `
      <p style="font-size:0.85rem;margin-bottom:4px;">
        CAS: <strong>${item.cas || '—'}</strong>
      </p>
      <p style="font-size:0.85rem;margin-bottom:4px;">
        Armário: <strong>${item.armario || '—'}</strong>
      </p>
      <p style="font-size:0.85rem;margin-bottom:12px;">
        Quantidade inicial: <strong>${item.quantity} ${item.unit || ''}</strong> ·
        Restante: <strong>${item.remaining} ${item.unit || ''}</strong>
      </p>
      <p style="font-size:0.82rem;font-weight:700;margin-bottom:6px;">Histórico de uso</p>
      ${historyHtml}
    `;

    modal.hidden = false;

    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const btnManter = clone(document.getElementById('sol-manter'));
    const btnApagar = clone(document.getElementById('sol-apagar'));
    const btnClose  = clone(document.getElementById('sol-detail-close'));

    btnManter.addEventListener('click', () => resolveItem(subIndex, modal,
      'Removido da fila. O reagente continua ativo e pode reaparecer depois.'));
    btnApagar.addEventListener('click', () => resolveItem(subIndex, modal,
      'Removido definitivamente da fila.'));
    btnClose.addEventListener('click', () => { modal.hidden = true; });
  }

  async function resolveItem(subIndex, modal, successMsg) {
    try {
      await API.patch(`/substances/${subIndex}/queue`, { status: null });
      modal.hidden = true;
      window.showToast(successMsg);
      await loadQueue();
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  async function init() {
    document.getElementById('sol-back')
      ?.addEventListener('click', () => window.__appRouter.loadPage('menu'));
    await loadQueue();
  }

  return { init };
})();
