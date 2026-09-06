window.__page = (() => {
  const ROLE_LABELS = {
    developer: 'Desenvolvedor',
    admin:     'Administrador',
    staff:     'Suporte',
    viewer:    'Visualizador'
  };

  const GRID_OPTIONS = {
// (developer, admin e staff podem ver/criar; exclusão é bloqueada no backend pra quem não é admin+)
    developer: [
      { id: 'opt-users',    img: 'assets/img/menu/users.png',    label: 'Usuários'  },
      { id: 'opt-armarios', img: 'assets/img/menu/armarios.png', label: 'Armários'  },
      { id: 'opt-solicitacoes', img: 'assets/img/menu/solicitacoes.png', label: 'Solicitações' },
      { id: 'opt-tokens',   img: 'assets/img/menu/tokens.png',   label: 'Tokens'    },
      { id: 'opt-history',  img: 'assets/img/menu/history.png',  label: 'Histórico' },
      { id: 'opt-export',   img: 'assets/img/menu/export.png',   label: 'Backup'    },
      { id: 'opt-restore',  img: 'assets/img/menu/restore.png',  label: 'Restaurar' },
      { id: 'opt-about',    img: 'assets/img/menu/about.png',    label: 'Sobre'     },
    ],
    admin: [
      { id: 'opt-users',    img: 'assets/img/menu/users.png',    label: 'Usuários'  },
      { id: 'opt-armarios', img: 'assets/img/menu/armarios.png', label: 'Armários'  },
      { id: 'opt-solicitacoes', img: 'assets/img/menu/solicitacoes.png', label: 'Solicitações' },
      { id: 'opt-tokens',   img: 'assets/img/menu/tokens.png',   label: 'Tokens'    },
      { id: 'opt-history',  img: 'assets/img/menu/history.png',  label: 'Histórico' },
      { id: 'opt-export',   img: 'assets/img/menu/export.png',   label: 'Backup'    },
      { id: 'opt-about',    img: 'assets/img/menu/about.png',    label: 'Sobre'     },
      { id: 'opt-logout',   img: 'assets/img/menu/logout.png',   label: 'Sair'      },
    ],
    staff: [
      { id: 'opt-armarios', img: 'assets/img/menu/armarios.png', label: 'Armários'  },
      { id: 'opt-solicitacoes', img: 'assets/img/menu/solicitacoes.png', label: 'Solicitações' },
      { id: 'opt-export',   img: 'assets/img/menu/export.png',   label: 'Backup'    },
      { id: 'opt-about',    img: 'assets/img/menu/about.png',    label: 'Sobre'     },
      { id: 'opt-logout',   img: 'assets/img/menu/logout.png',   label: 'Sair'      },
    ],
    viewer: [
      { id: 'opt-about',   img: 'assets/img/menu/about.png',   label: 'Sobre'     },
      { id: 'opt-logout',  img: 'assets/img/menu/logout.png',  label: 'Sair'      },
    ]
  };

  function init(pageName, ctx) {
    const nameEl = document.getElementById('menu-username');
    const roleEl = document.getElementById('menu-role');
    if (nameEl) nameEl.textContent = ctx?.displayName || '—';
    if (roleEl) roleEl.textContent = ROLE_LABELS[ctx?.role] || ctx?.role || '—';

    const grid    = document.getElementById('menu-grid');
    const role    = ctx?.role || 'viewer';
    const options = GRID_OPTIONS[role] || GRID_OPTIONS.viewer;

    // Placeholder 80x80 cinza com borda verde enquanto não tem imagem real
    grid.innerHTML = options.map(op => `
      <button class="menu-grid-item" id="${op.id}"
              style="display:flex;flex-direction:column;align-items:center;
                    justify-content:center;gap:8px;padding:16px 8px;
                    background:var(--white);border-radius:var(--radius);
                    border:none;cursor:pointer;font-family:inherit;
                    font-size:0.78rem;font-weight:700;color:var(--text);
                    text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        
        <img src="${op.img}" alt="${op.label}"
            onerror="this.style.background='#c8c8c8'"
            style="width:56px;height:56px;object-fit:contain;
                    background:transparent;border-radius:0;
                    filter: invert(42%) sepia(93%) saturate(463%)
                            hue-rotate(82deg) brightness(95%) contrast(90%);">
        
        <span>${op.label}</span>
      </button>
    `).join('');

    // Binds
    document.getElementById('opt-users')
    ?.addEventListener('click', () => window.__appRouter.loadPage('users'));
    document.getElementById('opt-tokens')
    ?.addEventListener('click', () => window.__appRouter.loadPage('tokens'));
    document.getElementById('opt-history')
    ?.addEventListener('click', () => window.__appRouter.loadPage('history'));
    document.getElementById('opt-armarios')
    ?.addEventListener('click', () => window.__appRouter.loadPage('armarios'));
    document.getElementById('opt-solicitacoes')
    ?.addEventListener('click', () => window.__appRouter.loadPage('solicitacoes'));
    document.getElementById('opt-export')
      ?.addEventListener('click', handleExport);
    document.getElementById('opt-restore')
      ?.addEventListener('click', () => {
        document.getElementById('restore-file').click();
      });
    document.getElementById('restore-file')
      ?.addEventListener('change', handleRestore);
    document.getElementById('opt-logout')
      ?.addEventListener('click', handleLogout);
    document.getElementById('opt-about')
      ?.addEventListener('click', () => {
        window.__appRouter.loadPage('about');
      });

    ['opt-users', 'opt-tokens', 'opt-history'].forEach(id => {
      document.getElementById(id)
        ?.addEventListener('click', () => window.showToast('Em construção.'));
    });
  }

  async function handleExport() {
    try {
      const a    = document.createElement('a');
      a.href     = '/api/backup/export';
      a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setFeedback('Backup exportado!', false);
    } catch (err) {
      setFeedback(`Erro: ${err.message}`, true);
    }
  }

  async function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!await window.confirmModal(
      'Substituir todos os dados atuais com este backup?',
      { confirmLabel: 'Substituir' }
    )) {
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
    el.textContent = msg;
    el.style.color = isError ? 'var(--red)' : 'var(--green)';
  }

  return { init };
})();