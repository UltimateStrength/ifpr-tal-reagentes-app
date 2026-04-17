// Router SPA — carrega páginas HTML dinamicamente no #page-content
const AppRouter = (() => {
  const loginScreen  = document.getElementById('login-screen');
  const appContainer = document.getElementById('app');
  const pageContent  = document.getElementById('page-content');
  const navBtns      = document.querySelectorAll('.nav-btn');

  let currentPage    = null;
  let pollingTimer   = null;
  const PAGE_CACHE   = {};

  // Mapa: nome da página → arquivo HTML + módulo JS
  const PAGES = {
    home:       { html: 'assets/pages/home.html',       js: 'assets/js/substances.js' },
    substances: { html: 'assets/pages/substances.html', js: 'assets/js/substances.js' },
    add:        { html: 'assets/pages/add.html',        js: 'assets/js/substances.js' },
    import:     { html: 'assets/pages/import.html',     js: 'assets/js/import.js'     },
    menu:       { html: 'assets/pages/menu.html',       js: 'assets/js/backup.js'     }
  };

  async function loadPage(name) {
    if (currentPage === name) return;
    currentPage = name;

    // Marca aba ativa
    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === name);
    });

    // Cache do HTML pra não rebuscar sempre
    if (!PAGE_CACHE[name]) {
      const res = await fetch(PAGES[name].html);
      PAGE_CACHE[name] = await res.text();
    }

    pageContent.innerHTML = PAGE_CACHE[name];
    pageContent.scrollTop = 0;

    // Chama o init da página se existir
    // Cada módulo JS expõe window.__page?.init(pageName)
    window.__page?.init?.(name);
  }

  function startPolling() {
    if (pollingTimer) return;
    pollingTimer = setInterval(() => {
      // Só faz polling nas páginas que precisam de dados atualizados
      if (['home', 'substances'].includes(currentPage)) {
        window.__page?.refresh?.();
      }
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
    currentPage = null;
  }

  async function init() {
    loginScreen.hidden  = true;
    appContainer.hidden = false;

    // Cliques na navbar
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => loadPage(btn.dataset.page));
    });

    await loadPage('home');
    startPolling();
  }

  // Expõe pra o auth.js usar
  window.__appRouter = { init, goLogin };

  // Verifica sessão ativa ao carregar (reload de página)
  API.get('/auth/check')
    .then(() => init())
    .catch(() => {}); // não autenticado — fica no login

  return { init, goLogin, loadPage };
})();