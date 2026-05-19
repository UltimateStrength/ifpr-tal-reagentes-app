const AppRouter = (() => {
  const loginScreen  = document.getElementById('login-screen');
  const tokenScreen  = document.getElementById('token-screen');
  const appContainer = document.getElementById('app');
  const pageContent  = document.getElementById('page-content');
  const navBtns      = document.querySelectorAll('.nav-btn');

  let currentPage  = null;
  let currentRole  = null;
  let displayName  = null;
  let pollingTimer = null;
  const PAGE_CACHE = {};

  const PAGES = {
    home:       { html: 'assets/pages/home.html',       module: 'assets/js/substances.js' },
    substances: { html: 'assets/pages/substances.html', module: 'assets/js/substances.js' },
    edit:       { html: 'assets/pages/edit.html',       module: 'assets/js/substances.js' },
    import:     { html: 'assets/pages/import.html',     module: 'assets/js/import.js'     },
    menu:       { html: 'assets/pages/menu.html',       module: 'assets/js/backup.js'     },
    about:      { html: 'assets/pages/about-spa.html',  module: 'assets/js/about.js'      },
    users:      { html: 'assets/pages/users.html',      module: 'assets/js/users.js'      },
    tokens:     { html: 'assets/pages/tokens.html',     module: 'assets/js/tokens.js'     },
    history:    { html: 'assets/pages/history.html',    module: 'assets/js/history.js'    }
  };

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

  function loadModule(src) {
    return new Promise((resolve) => {
      const existing = document.querySelector(`script[data-page-module="${src}"]`);
      if (existing) existing.remove();
      window.__page = null;
      const script = document.createElement('script');
      script.src = `${src}?v=${Date.now()}`;
      script.dataset.pageModule = src;
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }

  async function loadPage(name) {
    if (!PAGES[name]) return;

    if (currentRole === 'viewer' && ['edit', 'import'].includes(name)) {
      showToast('Sem permissão para esta ação.');
      return;
    }

    currentPage = name;

    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === name);
    });

    if (!PAGE_CACHE[name] || name === 'substances') {
      const res = await fetch(PAGES[name].html + `?v=${Date.now()}`);
      PAGE_CACHE[name] = await res.text();
    }

    pageContent.innerHTML = PAGE_CACHE[name];
    pageContent.scrollTop = 0;

    await loadModule(PAGES[name].module);
    window.__page?.init?.(name, { displayName, role: currentRole });
  }

  function startPolling() {
    if (pollingTimer) return;
    pollingTimer = setInterval(async () => {
      if (!['home', 'substances'].includes(currentPage)) return;
      try {
        const data = await API.get('/substances');
        window.__substancesData = data;
        window.__page?.onDataUpdate?.(data);
      } catch { /* tenta de novo em 5s */ }
    }, 5000);
  }

  function stopPolling() {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }

  function goLogin() {
    stopPolling();
    appContainer.hidden = true;
    loginScreen.hidden  = false;
    if (tokenScreen) tokenScreen.hidden = true;
    currentPage = null;
    window.__page = null;
  }

  async function init(name, role) {
    displayName = name;
    currentRole = role;

    loginScreen.hidden  = true;
    if (tokenScreen) tokenScreen.hidden = true;
    appContainer.hidden = false;

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

    startPolling();
    await loadPage('home');
  }

  window.__appRouter = { init, goLogin, loadPage };

  API.get('/auth/check')
    .then(r => init(r.displayName, r.role))
    .catch(() => {});

  return { init, goLogin, loadPage };
})();