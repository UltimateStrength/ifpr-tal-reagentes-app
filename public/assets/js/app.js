const AppRouter = (() => {
  const loginScreen  = document.getElementById('login-screen');
  const tokenScreen  = document.getElementById('token-screen');
  const appContainer = document.getElementById('app');
  const pageContent  = document.getElementById('page-content');
  const navBtns      = document.querySelectorAll('.nav-btn');

  let currentPage  = null;
  let currentRole  = null;
  let displayName  = null;
  const PAGE_CACHE = {};

  const PAGES = {
    home:       { html: 'assets/pages/home.html',       js: 'assets/js/substances.js' },
    substances: { html: 'assets/pages/substances.html', js: 'assets/js/substances.js' },
    edit:       { html: 'assets/pages/edit.html',       js: 'assets/js/substances.js' },
    import:     { html: 'assets/pages/import.html',     js: 'assets/js/import.js'     },
    menu:       { html: 'assets/pages/menu.html',       js: 'assets/js/backup.js'     }
  };

  // Socket.IO — atualização em tempo real
  let socket = null;

  function connectSocket() {
    socket = io();

    socket.on('data-update', ({ data, action, by, detail }) => {
      // Atualiza cache global de dados
      window.__substancesData = data;

      // Rerenderiza se estiver numa página que usa dados
      window.__page?.onDataUpdate?.(data);

      // Toast de atividade
      const msgs = {
        add:     `${by} adicionou ${detail?.name || ''}`,
        remove:  `${by} removeu ${detail?.name || ''}`,
        import:  `${by} importou ${detail?.count} reagentes`,
        restore: `${by} restaurou um backup`,
        revert:  `Sessão de ${by} foi revertida`
      };

      const msg = msgs[action];
      if (msg) showToast(msg, 4000);
    });

    socket.on('disconnect', () => {
      showToast('Conexão perdida. Reconectando...', 3000);
    });

    socket.on('reconnect', () => {
      showToast('Reconectado.', 2000);
    });
  }

  function showToast(msg, duration = 2500) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  window.showToast = showToast;

  async function loadPage(name) {
    if (!PAGES[name]) return;

    // Viewer não acessa edit nem import
    if (currentRole === 'viewer' && ['edit', 'import'].includes(name)) {
      showToast('Sem permissão para esta ação.');
      return;
    }

    currentPage = name;

    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === name);
    });

    if (!PAGE_CACHE[name]) {
      const res = await fetch(PAGES[name].html);
      PAGE_CACHE[name] = await res.text();
    }

    pageContent.innerHTML = PAGE_CACHE[name];
    pageContent.scrollTop = 0;

    window.__page?.init?.(name, { displayName, role: currentRole });
  }

  function goLogin() {
    if (socket) socket.disconnect();
    appContainer.hidden = true;
    loginScreen.hidden  = false;
    if (tokenScreen) tokenScreen.hidden = true;
    currentPage = null;
  }

  async function init(name, role) {
    displayName = name;
    currentRole = role;

    loginScreen.hidden  = true;
    if (tokenScreen) tokenScreen.hidden = true;
    appContainer.hidden = false;

    // Esconde abas restritas pra viewer
    if (role === 'viewer') {
      navBtns.forEach(btn => {
        if (['edit', 'import'].includes(btn.dataset.page)) {
          btn.style.display = 'none';
        }
      });
    }

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => loadPage(btn.dataset.page));
    });

    connectSocket();
    await loadPage('home');
  }

  window.__appRouter = { init, goLogin, loadPage };

  // Verifica sessão ativa no reload
  API.get('/auth/check')
    .then(r => init(r.displayName, r.role))
    .catch(() => {});

  return { init, goLogin, loadPage };
})();