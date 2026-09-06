window.__page = (() => {
  let allEntries = [];
  let currentFilter = 'all';

  const ACTION_LABELS = {
    add:              'Adicionou',
    remove:           'Removeu',
    import:           '⬆Importou',
    restore:          'Restaurou',
    revert:           '↩Reverteu',
    consume:          'Registrou uso em',
    queue:            'Atualizou fila de',
    'update-details': 'Editou informações gerais de',
    'update-package': 'Editou embalagem de',
    renumber:         'Renumerou'
  };

  const ACTION_COLORS = {
    add:              '#2f9e3f',
    remove:           '#ca191f',
    import:           '#0284c7',
    restore:          '#7c3aed',
    revert:           '#e07b00',
    consume:          '#0284c7',
    queue:            '#e07b00',
    'update-details': '#6b7280',
    'update-package': '#6b7280',
    renumber:         '#7c3aed'
  };

  // Constrói a descrição de cada ação a partir do `detail` salvo — formatos
  // variam por tipo de ação, então trata caso a caso; ações antigas (salvas
  // antes desses campos existirem) caem no fallback genérico no fim.
  function describeDetail(a) {
    const d = a.detail || {};
    switch (a.action) {
      case 'consume':
        return `${d.amount ?? '?'} em ${d.subIndex || '—'}${d.note ? ` (${d.note})` : ''}`;
      case 'queue':
        return `${d.subIndex || '—'} → ${d.status === 'solicitado' ? 'quase acabando' : 'removido da fila'}`;
      case 'update-details':
        return d.nameLower || '';
      case 'update-package':
        return `${d.subIndex || '—'}${d.armario ? ` · ${d.armario}` : ''}${d.situacao ? ` · ${d.situacao}` : ''}`;
      case 'renumber':
        return `${d.nameLower || ''} → nº ${d.number ?? '?'}`;
      default:
        return d.name
          ? `${d.name}${d.expiry ? ` (${d.expiry})` : ''}`
          : d.count
            ? `${d.count} item(ns)`
            : '';
    }
  }

  async function init() {
    document.getElementById('history-back')
      ?.addEventListener('click', () => window.__appRouter.loadPage('menu'));

    document.querySelectorAll('.history-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.history-filter')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderEntries();
      });
    });

    await loadHistory();
  }

  async function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

    try {
      allEntries = await API.get('/history');
      renderEntries();
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Erro ao carregar histórico.</div>`;
    }
  }

  function renderEntries() {
    const list = document.getElementById('history-list');

    const filtered = currentFilter === 'all'
      ? allEntries
      : allEntries.filter(e => e.action === currentFilter);

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state">Nenhuma ação encontrada.</div>`;
      return;
    }

    // Agrupa por sessão
    const sessions = {};
    for (const entry of filtered) {
      const sid = entry.sessionId || 'unknown';
      if (!sessions[sid]) {
        sessions[sid] = {
          sessionId:   sid,
          username:    entry.username,
          fingerprint: entry.fingerprint,
          actions:     [],
          firstAt:     entry.createdAt,
          lastAt:      entry.createdAt,
          reverted:    entry.reverted || false
        };
      }
      sessions[sid].actions.push(entry);
      if (new Date(entry.createdAt) > new Date(sessions[sid].lastAt)) {
        sessions[sid].lastAt = entry.createdAt;
      }
    }

    const sessionList = Object.values(sessions)
      .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

    list.innerHTML = sessionList.map(s => {
      const date    = new Date(s.lastAt).toLocaleString('pt-BR');
      const count   = s.actions.length;
      const preview = s.actions.slice(0, 2).map(a =>
        `${ACTION_LABELS[a.action] || a.action} ${describeDetail(a)}`
      ).join(', ');

      return `
        <div class="card session-card" data-sid="${s.sessionId}"
             style="margin-bottom:10px;cursor:pointer;
                    ${s.reverted ? 'opacity:0.5;' : ''}">
          <div style="display:flex;align-items:center;
                      justify-content:space-between;margin-bottom:6px;">
            <p style="font-size:0.95rem;font-weight:700;">${s.username || 'Desconhecido'}</p>
            <span style="font-size:0.72rem;color:var(--muted);">${date}</span>
          </div>
          <p style="font-size:0.8rem;color:var(--muted);margin-bottom:4px;">
            ${count} ação(ões) · ${preview}${count > 2 ? '...' : ''}
          </p>
          ${s.reverted
            ? `<span style="font-size:0.72rem;font-weight:700;color:var(--red);">
                 ↩️ Sessão revertida
               </span>`
            : `<span style="font-size:0.72rem;color:var(--muted);">
                 Toque para ver detalhes
               </span>`
          }
        </div>`;
    }).join('');

    list.querySelectorAll('.session-card').forEach(card => {
      card.addEventListener('click', () => {
        const sid     = card.dataset.sid;
        const session = sessions[sid];
        openSessionModal(session);
      });
    });
  }

  function openSessionModal(session) {
    const modal    = document.getElementById('session-modal');
    const title    = document.getElementById('session-modal-title');
    const actList  = document.getElementById('session-actions-list');
    const btnClose = document.getElementById('sm-close');
    const btnRevert = document.getElementById('sm-revert');

    title.textContent = `${session.username} — ${
      new Date(session.firstAt).toLocaleString('pt-BR')
    }`;

    actList.innerHTML = session.actions.map(a => {
      const color  = ACTION_COLORS[a.action] || '#6b7280';
      const detail = describeDetail(a);

      return `
        <div style="display:flex;align-items:center;gap:10px;
                    padding:8px 0;border-bottom:1px solid var(--card-bg);">
          <span style="width:8px;height:8px;border-radius:50%;
                       background:${color};flex-shrink:0;"></span>
          <div>
            <p style="font-size:0.85rem;font-weight:600;">
              ${ACTION_LABELS[a.action] || a.action} ${detail}
            </p>
            <p style="font-size:0.75rem;color:var(--muted);">
              ${new Date(a.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>`;
    }).join('');

    // Esconde botão reverter se já revertida
    btnRevert.hidden = session.reverted;
    modal.hidden = false;

    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const newClose  = clone(btnClose);
    const newRevert = clone(btnRevert);

    newClose.addEventListener('click', () => { modal.hidden = true; });

    newRevert.addEventListener('click', async () => {
      if (!await window.confirmModal(
        `Reverter TODAS as ações desta sessão de "${session.username}"?`,
        { confirmLabel: 'Reverter' }
      )) return;
      newRevert.disabled = true;
      try {
        await API.delete(`/history/session/${session.sessionId}`);
        modal.hidden = true;
        window.showToast('Sessão revertida com sucesso!');
        await loadHistory();
      } catch (err) {
        window.showToast(`Erro: ${err.message}`);
      } finally {
        // cloneNode carrega o disabled adiante — sem isto, reverter uma
        // segunda sessão reabriria o modal com o botão travado pra sempre.
        newRevert.disabled = false;
      }
    });
  }

  return { init };
})();