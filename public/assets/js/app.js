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

  // Toda escrita em window.__substancesData (seja vinda do polling ou da
  // resposta direta de um POST/PATCH/DELETE) incrementa esta versão. O
  // polling guarda a versão vigente antes de disparar o GET e, se ela mudou
  // até a resposta chegar (porque uma ação do usuário já escreveu um dado
  // mais novo nesse meio-tempo), descarta o resultado em vez de sobrescrever
  // o estado mais recente com um GET desatualizado.
  let dataVersion = 0;
  let substancesDataValue;
  Object.defineProperty(window, '__substancesData', {
    configurable: true,
    get() { return substancesDataValue; },
    set(v) { substancesDataValue = v; dataVersion++; }
  });

  const PAGES = {
    home:       { html: 'assets/pages/home.html',       module: 'assets/js/substances.js' },
    substances: { html: 'assets/pages/substances.html', module: 'assets/js/substances.js' },
    edit:       { html: 'assets/pages/edit.html',       module: 'assets/js/substances.js' },
    import:     { html: 'assets/pages/import.html',     module: 'assets/js/import.js'     },
    menu:       { html: 'assets/pages/menu.html',       module: 'assets/js/backup.js'     },
    about:      { html: 'assets/pages/about-spa.html',  module: 'assets/js/about.js'      },
    users:      { html: 'assets/pages/users.html',      module: 'assets/js/users.js'      },
    tokens:     { html: 'assets/pages/tokens.html',     module: 'assets/js/tokens.js'     },
    history:    { html: 'assets/pages/history.html',    module: 'assets/js/history.js'    },
    armarios:   { html: 'assets/pages/armarios.html',   module: 'assets/js/armarios.js'   },
    solicitacoes: { html: 'assets/pages/solicitacoes.html', module: 'assets/js/solicitacoes.js' }
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

  // Substitui window.confirm() nativo por um modal HTML no padrão visual do
  // app (não se sabe se confirm()/alert() do navegador renderizam bem dentro
  // do WebView do MIT App Inventor quando empacotado como APK).
  // Uso: const ok = await window.confirmModal('Remover mesmo?');
  function confirmModal(message, { title = 'Confirmar ação', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' } = {}) {
    return new Promise(resolve => {
      let modal = document.getElementById('global-confirm-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-confirm-modal';
        modal.className = 'modal-overlay';
        modal.hidden = true;
        modal.innerHTML = `
          <div class="modal-box">
            <p class="modal-title" id="global-confirm-title"></p>
            <p class="modal-message" id="global-confirm-msg"></p>
            <div class="modal-actions">
              <button class="modal-cancel"  id="global-confirm-cancel"></button>
              <button class="modal-confirm" id="global-confirm-ok"></button>
            </div>
          </div>`;
        document.body.appendChild(modal);
      }

      modal.querySelector('#global-confirm-title').textContent = title;
      modal.querySelector('#global-confirm-msg').textContent   = message;

      const btnOk  = modal.querySelector('#global-confirm-ok');
      const btnCan = modal.querySelector('#global-confirm-cancel');
      btnOk.textContent  = confirmLabel;
      btnCan.textContent = cancelLabel;

      const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
      const newOk  = clone(btnOk);
      const newCan = clone(btnCan);

      const close = result => { modal.hidden = true; resolve(result); };
      newOk.addEventListener('click', () => close(true));
      newCan.addEventListener('click', () => close(false));

      modal.hidden = false;
    });
  }

  window.confirmModal = confirmModal;

  // Formatação só de EXIBIÇÃO das datas (ex: "18 SET 2026") — o banco
  // continua salvando ISO (YYYY-MM-DD) e os <input type="date"> dos
  // formulários continuam usando ISO, que é o formato exigido pelo input.
  const MESES_BR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  function formatDateBR(iso) {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    const [, y, mo, d] = m;
    return `${parseInt(d, 10)} ${MESES_BR[parseInt(mo, 10) - 1] || mo} ${y}`;
  }
  window.formatDateBR = formatDateBR;

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
      const versionAtStart = dataVersion;
      try {
        const data = await API.get('/substances');
        // Uma ação do usuário (add/edit/delete) já aplicou um dado mais
        // novo enquanto esse GET estava em voo — não pisar nele.
        if (dataVersion !== versionAtStart) return;
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