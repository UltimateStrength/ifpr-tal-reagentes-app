window.__page = (() => {
  const ROLE_LABELS = {
    developer: 'Desenvolvedor',
    admin:     'Administrador',
    staff:     'Suporte',
    viewer:    'Visualizador'
  };

  // Opções do grid por role
  const GRID_OPTIONS = {
    developer: [
      { id: 'opt-users',   icon: '👥', label: 'Usuários'     },
      { id: 'opt-tokens',  icon: '🔑', label: 'Tokens'       },
      { id: 'opt-history', icon: '📋', label: 'Histórico'    },
      { id: 'opt-export',  icon: '⬇️', label: 'Backup'       },
      { id: 'opt-restore', icon: '🔄', label: 'Restaurar'    },
      { id: 'opt-about',   icon: 'ℹ️', label: 'Sobre'        },
    ],
    admin: [
      { id: 'opt-users',   icon: '👥', label: 'Usuários'     },
      { id: 'opt-tokens',  icon: '🔑', label: 'Tokens'       },
      { id: 'opt-history', icon: '📋', label: 'Histórico'    },
      { id: 'opt-export',  icon: '⬇️', label: 'Backup'       },
      { id: 'opt-about',   icon: 'ℹ️', label: 'Sobre'        },
    ],
    staff: [
      { id: 'opt-export',  icon: '⬇️', label: 'Backup'       },
      { id: 'opt-about',   icon: 'ℹ️', label: 'Sobre'        },
      { id: 'opt-logout',  icon: '↪',  label: 'Sair'         },
    ],
    viewer: [
      { id: 'opt-about',   icon: 'ℹ️', label: 'Sobre'        },
      { id: 'opt-logout',  icon: '↪',  label: 'Sair'         },
    ]
  };

  function init(pageName, ctx) {
    // Header
    const nameEl = document.getElementById('menu-username');
    const roleEl = document.getElementById('menu-role');
    if (nameEl) nameEl.textContent = ctx?.displayName || '—';
    if (roleEl) roleEl.textContent = ROLE_LABELS[ctx?.role] || ctx?.role || '—';

    // Grid dinâmico por role
    const grid    = document.getElementById('menu-grid');
    const role    = ctx?.role || 'viewer';
    const options = GRID_OPTIONS[role] || GRID_OPTIONS.viewer;

    grid.innerHTML = options.map(op => `
      <button class="menu-grid-item" id="${op.id}">
        <div class="menu-grid-icon">${op.icon}</div>
        <span>${op.label}</span>
      </button>`).join('');

    // Estilos do grid inline
    grid.querySelectorAll('.menu-grid-item').forEach(btn => {
      btn.style.cssText = `
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:8px;padding:18px 8px;
        background:var(--white);border-radius:var(--radius);
        border:none;cursor:pointer;font-family:inherit;
        font-size:0.78rem;font-weight:700;color:var(--text);
        text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.06);
      `;
    });

    grid.querySelectorAll('.menu-grid-icon').forEach(el => {
      el.style.cssText = `
        width:52px;height:52px;border-radius:50%;
        background:var(--green);display:flex;
        align-items:center;justify-content:center;font-size:1.3rem;
      `;
    });

    // Bind das opções
    document.getElementById('opt-export')
      ?.addEventListener('click', handleExport);
    document.getElementById('opt-restore')
      ?.addEventListener('click', () => document.getElementById('restore-file').click());
    document.getElementById('restore-file')
      ?.addEventListener('change', handleRestore);
    document.getElementById('opt-logout')
      ?.addEventListener('click', handleLogout);
    document.getElementById('opt-about')
      ?.addEventListener('click', () => {
        window.location.href = 'assets/pages/about.html';
      });

    // Placeholders pra funções em construção
    ['opt-users', 'opt-tokens', 'opt-history'].forEach(id => {
      document.getElementById(id)
        ?.addEventListener('click', () => {
          window.showToast('Em construção.');
        });
    });
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
      setFeedback('Backup exportado!', false);
    } catch (err) {
      setFeedback(`Erro: ${err.message}`, true);
    }
  }

  async function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Substituir todos os dados atuais com este backup?')) {
      e.target.value = ''; return;
    }
    try {
      const json = JSON.parse(await file.text());
      await API.post('/backup/restore', json);
      setFeedback('Dados restaurados!', false);
    } catch (err) {
      setFeedback(`Erro: ${err.message}`, true);
    } finally {
      e.target.value = '';
    }
  }

  async function handleLogout() {
    try { await API.post('/auth/logout'); } finally {
      window.__appRouter.goLogin();
    }
  }

  function setFeedback(msg, isError) {
    const el = document.getElementById('menu-feedback');
    if (!el) return;
    el.textContent  = msg;
    el.style.color  = isError ? 'var(--red)' : 'var(--green)';
  }

  return { init };
})();