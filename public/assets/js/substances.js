window.__page = (() => {
  let allData = [];

  // ─── UTILITÁRIOS ──────────────────────────────────────────────

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia!';
    if (h < 18) return 'Boa tarde!';
    return 'Boa noite!';
  }

  // Agora compara data completa (YYYY-MM-DD)
  function expiryStatus(expiry) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(expiry);
    exp.setHours(0, 0, 0, 0);
    const diffDays = (exp - now) / (1000 * 60 * 60 * 24);

    if (diffDays < 0)   return 'expired';
    if (diffDays <= 60) return 'soon';
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
        <div class="substance-group-header" data-group-name="${group.name}">
          <span class="substance-index">${group.index}</span>
          <span class="substance-name">${group.name}</span>
          <span class="substance-edit-hint">+ add</span>
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

    // Bind remoção
    list.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => confirmRemove(btn.dataset.sub));
    });

    // Bind clique no header do grupo → quick add
    list.querySelectorAll('.substance-group-header').forEach(header => {
      header.addEventListener('click', () => {
        openQuickAdd(header.dataset.groupName);
      });
    });

    // Bind botão buscar
    const btnSearch = document.getElementById('btn-search');
    const searchInput = document.getElementById('search-input');

    if (btnSearch && !btnSearch.dataset.bound) {
      btnSearch.dataset.bound = '1';
      btnSearch.addEventListener('click', () => {
        renderSubstances(searchInput?.value || '');
      });
    }

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = '1';
      // Enter também busca
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') renderSubstances(searchInput.value);
      });
      // Limpar campo reseta a lista
      searchInput.addEventListener('input', e => {
        if (e.target.value === '') renderSubstances('');
      });
    }
  }

  // Modal remoção
  function confirmRemove(subIndex) {
    const modal  = document.getElementById('remove-modal');
    const msg    = document.getElementById('modal-remove-msg');
    const btnOk  = document.getElementById('modal-confirm');
    const btnNo  = document.getElementById('modal-cancel');
    if (!modal) return;

    const group = allData.find(g => g.packages.some(p => p.subIndex === subIndex));
    const pkg   = group?.packages.find(p => p.subIndex === subIndex);

    msg.textContent = `${subIndex} — ${group?.name} | Val: ${pkg?.expiry}`;
    modal.hidden = false;

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

  // Modal quick add (clicar no grupo)
  function openQuickAdd(groupName) {
    const modal   = document.getElementById('quick-add-modal');
    const title   = document.getElementById('quick-add-title');
    const btnOk   = document.getElementById('qa-confirm');
    const btnNo   = document.getElementById('qa-cancel');
    const qtyInput    = document.getElementById('qa-qty');
    const expiryInput = document.getElementById('qa-expiry');
    if (!modal) return;

    title.textContent = `+ ${groupName}`;
    qtyInput.value    = '';
    expiryInput.value = '';
    modal.hidden = false;

    const newOk = btnOk.cloneNode(true);
    const newNo = btnNo.cloneNode(true);
    btnOk.replaceWith(newOk);
    btnNo.replaceWith(newNo);

    newOk.addEventListener('click', async () => {
      const qty    = parseFloat(qtyInput.value);
      const expiry = expiryInput.value;

      if (!expiry || isNaN(qty) || qty <= 0) {
        showToast('Preencha quantidade e validade.');
        return;
      }

      newOk.disabled = true;
      try {
        allData = await API.post('/substances', {
          name: groupName,
          quantity: qty,
          expiry
        });
        modal.hidden = true;
        renderSubstances(document.getElementById('search-input')?.value || '');
        showToast('Embalagem adicionada!');
      } catch (err) {
        showToast(`Erro: ${err.message}`);
        newOk.disabled = false;
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

    // Autocomplete
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
        <div style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #eee;
                    font-size:0.9rem;" data-name="${g.name}">${g.name}</div>
      `).join('');

      suggBox.querySelectorAll('[data-name]').forEach(el => {
        el.addEventListener('click', () => {
          nameInput.value = el.dataset.name;
          suggBox.style.display = 'none';
        });
      });
    });

    document.addEventListener('click', e => {
      if (!nameInput?.contains(e.target) && !suggBox?.contains(e.target)) {
        if (suggBox) suggBox.style.display = 'none';
      }
    });

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

  // ─── CORE ─────────────────────────────────────────────────────

  async function fetchData() {
    try {
      allData = await API.get('/substances');
    } catch { /* polling tenta de novo */ }
  }

  async function init(pageName) {
    await fetchData();
    if (pageName === 'home')       renderHome();
    if (pageName === 'substances') renderSubstances();
    if (pageName === 'add')        renderAdd();
  }

  async function refresh() {
    await fetchData();
    const isHome = !!document.getElementById('page-home');
    const isSubs = !!document.getElementById('page-substances');
    if (isHome) renderHome();
    if (isSubs) renderSubstances(
      document.getElementById('search-input')?.value || ''
    );
  }

  return { init, refresh };
})();