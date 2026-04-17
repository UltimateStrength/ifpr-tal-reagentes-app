window.__page = (() => {
  let allData = []; // cache local dos dados

  // ─── UTILITÁRIOS ──────────────────────────────────────────────

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia!';
    if (h < 18) return 'Boa tarde!';
    return 'Boa noite!';
  }

  // Retorna status de validade baseado em meses até vencer
  function expiryStatus(expiry) {
    const now   = new Date();
    const exp   = new Date(expiry + '-01');
    const diff  = (exp.getFullYear() - now.getFullYear()) * 12
                + (exp.getMonth()   - now.getMonth());

    if (diff < 0)  return 'expired';
    if (diff <= 2) return 'soon';
    return 'ok';
  }

  function statusLabel(status) {
    return { ok: 'OK', soon: 'Vence em breve', expired: 'Vencida' }[status];
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
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ─── HOME ─────────────────────────────────────────────────────

  function renderHome() {
    const greet = document.getElementById('home-greeting');
    if (greet) greet.textContent = getGreeting();

    let total = 0, soon = 0, expired = 0;

    for (const group of allData) {
      for (const pkg of group.packages) {
        total++;
        const s = expiryStatus(pkg.expiry);
        if (s === 'soon')    soon++;
        if (s === 'expired') expired++;
      }
    }

    const safe = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    safe('ind-total',   total);
    safe('ind-soon',    soon);
    safe('ind-expired', expired);
  }

  // ─── SUBSTANCES ───────────────────────────────────────────────

  function renderSubstances(filter = '') {
    const list = document.getElementById('substances-list');
    if (!list) return;

    const term = filter.toLowerCase().trim();
    const filtered = term
      ? allData.filter(g => g.name.toLowerCase().includes(term))
      : allData;

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>${term ? 'Nenhuma substância encontrada.' : 'Nenhuma substância cadastrada.'}</p>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(group => `
      <div class="substance-group">
        <div class="substance-group-header">
          <span class="substance-index">${group.index}</span>
          <span class="substance-name">${group.name}</span>
        </div>
        ${group.packages.map(pkg => {
          const status = expiryStatus(pkg.expiry);
          return `
            <div class="package-item">
              <div class="package-info">
                <span class="package-sub">${pkg.subIndex}</span>
                <span class="package-details">Qtd: ${pkg.quantity}</span>
                <span class="package-expiry">Val: ${pkg.expiry}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="badge ${status}">${statusLabel(status)}</span>
                <button class="btn-remove" data-sub="${pkg.subIndex}">✕</button>
              </div>
            </div>`;
        }).join('')}
      </div>`
    ).join('');

    // Bind dos botões de remover
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => confirmRemove(btn.dataset.sub));
    });

    // Search input bind (só na primeira vez que a página carrega)
    const search = document.getElementById('search-input');
    if (search && !search.dataset.bound) {
      search.dataset.bound = '1';
      search.addEventListener('input', e => renderSubstances(e.target.value));
    }
  }

  // Modal de confirmação de remoção
  function confirmRemove(subIndex) {
    const modal  = document.getElementById('remove-modal');
    const msg    = document.getElementById('modal-remove-msg');
    const btnOk  = document.getElementById('modal-confirm');
    const btnNo  = document.getElementById('modal-cancel');
    if (!modal) return;

    const group = allData.find(g =>
      g.packages.some(p => p.subIndex === subIndex)
    );
    const pkg = group?.packages.find(p => p.subIndex === subIndex);

    msg.textContent = `${subIndex} — ${group?.name} | Val: ${pkg?.expiry}`;
    modal.hidden = false;

    // Usa clones pra evitar listeners duplicados
    const newOk = btnOk.cloneNode(true);
    const newNo = btnNo.cloneNode(true);
    btnOk.replaceWith(newOk);
    btnNo.replaceWith(newNo);

    newOk.addEventListener('click', async () => {
      modal.hidden = true;
      try {
        allData = await API.delete(`/substances/${subIndex}`);
        renderSubstances(document.getElementById('search-input')?.value || '');
        showToast('Embalagem removida.');
      } catch (err) {
        showToast(`Erro: ${err.message}`);
      }
    });

    newNo.addEventListener('click', () => { modal.hidden = true; });
  }

  // ─── ADD ──────────────────────────────────────────────────────

  function renderAdd() {
    const nameInput = document.getElementById('add-name');
    const suggBox   = document.getElementById('add-suggestions');
    const btnAdd    = document.getElementById('btn-add');
    const feedback  = document.getElementById('add-feedback');
    if (!btnAdd) return;

    // Autocomplete com nomes já cadastrados
    nameInput?.addEventListener('input', () => {
      const term = nameInput.value.toLowerCase().trim();
      if (!term || allData.length === 0) {
        suggBox.style.display = 'none';
        return;
      }

      const matches = allData
        .filter(g => g.name.toLowerCase().includes(term))
        .slice(0, 5);

      if (matches.length === 0) {
        suggBox.style.display = 'none';
        return;
      }

      suggBox.style.display = 'block';
      suggBox.innerHTML = matches.map(g => `
        <div style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #eee;font-size:0.9rem;"
             data-name="${g.name}">${g.name}</div>
      `).join('');

      suggBox.querySelectorAll('[data-name]').forEach(el => {
        el.addEventListener('click', () => {
          nameInput.value = el.dataset.name;
          suggBox.style.display = 'none';
        });
      });
    });

    // Fecha sugestões ao clicar fora
    document.addEventListener('click', e => {
      if (!nameInput?.contains(e.target) && !suggBox?.contains(e.target)) {
        if (suggBox) suggBox.style.display = 'none';
      }
    }, { once: false });

    btnAdd.addEventListener('click', async () => {
      const name   = document.getElementById('add-name')?.value.trim();
      const qty    = parseFloat(document.getElementById('add-qty')?.value);
      const expiry = document.getElementById('add-expiry')?.value;

      if (!name || !expiry || isNaN(qty) || qty <= 0) {
        feedback.style.color = 'var(--red)';
        feedback.textContent = 'Preencha todos os campos corretamente.';
        return;
      }

      btnAdd.disabled = true;
      feedback.textContent = '';

      try {
        allData = await API.post('/substances', { name, quantity: qty, expiry });
        feedback.style.color = 'var(--green)';
        feedback.textContent = `"${name}" adicionado com sucesso!`;

        // Limpa o form
        document.getElementById('add-name').value   = '';
        document.getElementById('add-qty').value    = '';
        document.getElementById('add-expiry').value = '';
        if (suggBox) suggBox.style.display = 'none';
      } catch (err) {
        feedback.style.color = 'var(--red)';
        feedback.textContent = `Erro: ${err.message}`;
      } finally {
        btnAdd.disabled = false;
      }
    });
  }

  // ─── ROUTER INTERNO ───────────────────────────────────────────

  async function fetchData() {
    try {
      allData = await API.get('/substances');
    } catch {
      // silencia — o polling vai tentar de novo em 5s
    }
  }

  async function init(pageName) {
    await fetchData();

    if (pageName === 'home')        renderHome();
    if (pageName === 'substances')  renderSubstances();
    if (pageName === 'add')         renderAdd();
  }

  // Chamado pelo polling do app.js nas páginas home e substances
  async function refresh() {
    await fetchData();
    const current = document.getElementById('page-home')
      ? 'home'
      : document.getElementById('page-substances')
        ? 'substances'
        : null;

    if (current === 'home')        renderHome();
    if (current === 'substances')  renderSubstances(
      document.getElementById('search-input')?.value || ''
    );
  }

  return { init, refresh };
})();