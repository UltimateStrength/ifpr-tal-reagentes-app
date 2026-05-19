window.__page = (() => {
  function getData() {
    return window.__substancesData || [];
  }

  function getGreeting(name) {
    const h = new Date().getHours();
    const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    return `${s}, ${name}!`;
  }

  function expiryStatus(expiry) {
    if (!expiry) return 'ok';
    const now  = new Date(); now.setHours(0,0,0,0);
    const exp  = new Date(expiry); exp.setHours(0,0,0,0);
    const diff = (exp - now) / 86400000;
    if (diff < 0)   return 'expired';
    if (diff <= 60) return 'soon';
    return 'ok';
  }

  function statusLabel(s) {
    return { ok: 'OK', soon: 'Vence em breve', expired: 'Vencida' }[s];
  }

  // ─── HOME ────────────────────────────────────────────

  function renderHome(ctx) {
    const greet = document.getElementById('home-greeting');
    if (greet) greet.textContent = getGreeting(ctx?.displayName || 'Visitante');

    const data = getData();
    let total = 0, soon = 0, expired = 0;
    const recent = [];

    for (const g of data) {
      for (const p of g.packages) {
        total++;
        const s = expiryStatus(p.expiry);
        if (s === 'soon')    soon++;
        if (s === 'expired') expired++;
        recent.push({ name: g.name, expiry: p.expiry, addedAt: p.addedAt });
      }
    }

    const el = id => document.getElementById(id);
    if (el('ind-total'))   el('ind-total').textContent   = total;
    if (el('ind-soon'))    el('ind-soon').textContent    = soon;
    if (el('ind-expired')) el('ind-expired').textContent = expired;

    const recentList = document.getElementById('recent-list');
    if (recentList) {
      const sorted = recent
        .filter(r => r.addedAt)
        .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
        .slice(0, 5);

      recentList.innerHTML = sorted.length === 0
        ? `<div class="empty-state" style="padding:20px;">Nenhum reagente ainda.</div>`
        : sorted.map(r => `
            <div style="display:flex;justify-content:space-between;
                        align-items:center;padding:8px 0;
                        border-bottom:1px solid var(--card-bg);">
              <span style="font-size:0.9rem;font-weight:500;">${r.name}</span>
              <span style="font-size:0.82rem;color:var(--muted);">
                ${r.expiry?.slice(5).replace('-','/')}
              </span>
            </div>`).join('');
    }
  }

  // ─── SUBSTANCES ──────────────────────────────────────

  function renderSubstances(filter = '') {
    const list = document.getElementById('substances-list');
    if (!list) return;

    const term = filter.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const data     = getData();
    const filtered = term
      ? data.filter(g => {
          const n = g.name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return n.includes(term);
        })
      : data;

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state">
        ${term ? 'Nada encontrado.'
               : 'Nada cadastrado.'}
      </div>`;
      return;
    }

    list.innerHTML = filtered.map(group => {
      const firstPkg = group.packages[0];
      const totalQty = group.packages.reduce((s, p) => s + p.quantity, 0);
      const unit     = firstPkg?.unit || '';
      const status   = expiryStatus(firstPkg?.expiry);

      return `
        <div class="card substance-card"
             style="padding:0;overflow:hidden;margin-bottom:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;
                      padding:14px 14px 10px;border-bottom:2px solid var(--card-bg);">
            <div>
              <span style="font-size:0.72rem;color:var(--muted);font-weight:600;">
                ${group.index}
              </span>
              <p style="font-size:1rem;font-weight:700;margin-top:1px;">
                ${group.name}
              </p>
            </div>
            <button class="btn-options" data-name="${group.name}"
                    style="width:34px;height:34px;display:flex;flex-direction:column;
                           align-items:center;justify-content:center;gap:4px;
                           background:var(--card-bg);border-radius:8px;border:none;
                           cursor:pointer;">
              <span style="width:14px;height:2px;background:var(--muted);
                           border-radius:2px;display:block;"></span>
              <span style="width:14px;height:2px;background:var(--muted);
                           border-radius:2px;display:block;"></span>
              <span style="width:14px;height:2px;background:var(--muted);
                           border-radius:2px;display:block;"></span>
            </button>
          </div>
          <div style="padding:10px 14px 14px;display:flex;
                      justify-content:space-between;align-items:center;">
            <div>
              <p style="font-size:0.82rem;color:var(--muted);">
                ${group.packages.length} embalagem(ns) · Total: ${totalQty} ${unit}
              </p>
              <p style="font-size:0.82rem;color:var(--muted);margin-top:2px;">
                Mais próx. de vencer:
                <strong style="color:var(--text);">${firstPkg?.expiry || '—'}</strong>
              </p>
            </div>
            <span class="badge ${status}">${statusLabel(status)}</span>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.btn-options').forEach(btn => {
      btn.addEventListener('click', () => openOptions(btn.dataset.name));
    });

    bindSearch();
  }

  function bindSearch() {
    const btn   = document.getElementById('btn-search');
    const input = document.getElementById('search-input');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => renderSubstances(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') renderSubstances(input.value);
    });
    input.addEventListener('input', e => {
      if (!e.target.value) renderSubstances('');
    });
  }

function openOptions(groupName) {
  const modal      = document.getElementById('options-modal');
  const title      = document.getElementById('options-modal-title');
  if (!modal) return;

  title.textContent = groupName;
  modal.hidden = false;

  // Clona só se o elemento existir
  const clone = el => {
    if (!el) return null;
    const n = el.cloneNode(true);
    el.replaceWith(n);
    return n;
  };

  const newAdd     = clone(document.getElementById('opt-edit'));
  const newEditPkg = clone(document.getElementById('opt-edit-pkg'));
  const newDel     = clone(document.getElementById('opt-delete'));
  const newCan     = clone(document.getElementById('opt-cancel'));

  newAdd?.addEventListener('click', () => {
    modal.hidden = true;
    openQuickAdd(groupName);
  });

  newEditPkg?.addEventListener('click', () => {
    modal.hidden = true;
    openEditPkgModal(groupName);
  });

  newDel?.addEventListener('click', () => {
    modal.hidden = true;
    openDeleteModal(groupName);
  });

  newCan?.addEventListener('click', () => { modal.hidden = true; });
}

function openQuickAdd(groupName) {
  const modal   = document.getElementById('quick-add-modal');
  const title   = document.getElementById('quick-add-title');
  const btnOk   = document.getElementById('qa-confirm');
  const btnNo   = document.getElementById('qa-cancel');
  const qty     = document.getElementById('qa-qty');
  const unit    = document.getElementById('qa-unit');
  const expiry  = document.getElementById('qa-expiry');
  const arrival = document.getElementById('qa-arrival');
  if (!modal) return;

  title.textContent = `+ ${groupName}`;
  qty.value = ''; expiry.value = ''; arrival.value = '';
  if (unit) unit.value = 'un';
  modal.hidden = false;

  const clone = el => {
    if (!el) return null;
    const n = el.cloneNode(true);
    el.replaceWith(n);
    return n;
  };
  const newOk = clone(btnOk);
  const newNo = clone(btnNo);

  newOk?.addEventListener('click', async () => {
    const q = parseFloat(document.getElementById('qa-qty')?.value);
    const e = document.getElementById('qa-expiry')?.value;
    const u = document.getElementById('qa-unit')?.value || 'un';
    const a = document.getElementById('qa-arrival')?.value || null;

    if (!e || isNaN(q) || q <= 0) {
      window.showToast('Preencha quantidade e validade.');
      return;
    }
    newOk.disabled = true;
    try {
      window.__substancesData = await API.post('/substances', {
        name: groupName, quantity: q, expiry: e, unit: u, arrival: a
      });
      modal.hidden = true;
      renderSubstances(document.getElementById('search-input')?.value || '');
      window.showToast('Adicionado com sucesso!');
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
      newOk.disabled = false;
    }
  });

  newNo?.addEventListener('click', () => { modal.hidden = true; });
}

function openEditPkgModal(groupName) {
  const modal  = document.getElementById('edit-pkg-modal');
  const title  = document.getElementById('edit-pkg-title');
  const list   = document.getElementById('edit-pkg-list');
  const form   = document.getElementById('edit-pkg-form');
  const btnOk  = document.getElementById('epf-confirm');
  const btnCan = document.getElementById('epf-cancel');
  if (!modal) return;

  const group = getData().find(g => g.name === groupName);
  if (!group) return;

  title.textContent = groupName;
  form.hidden  = true;
  btnOk.hidden = true;
  modal.hidden = false;

  let selectedPkg = null;

  list.innerHTML = group.packages.map(p => `
    <div class="pkg-select-item" data-sub="${p.subIndex}"
         style="display:flex;align-items:center;justify-content:space-between;
                padding:10px 12px;background:var(--card-bg);border-radius:8px;
                margin-bottom:8px;cursor:pointer;border:2px solid transparent;
                transition:border-color 0.15s;">
      <div>
        <span style="font-size:0.75rem;color:var(--muted);font-weight:600;">
          ${p.subIndex}
        </span>
        <p style="font-size:0.85rem;">
          Val: ${p.expiry} | Qtd: ${p.quantity} ${p.unit || ''}
        </p>
      </div>
      <span style="color:var(--green);font-size:0.8rem;font-weight:700;">
        selecionar
      </span>
    </div>`).join('');

  list.querySelectorAll('.pkg-select-item').forEach(item => {
    item.addEventListener('click', () => {
      list.querySelectorAll('.pkg-select-item').forEach(i => {
        i.style.borderColor = 'transparent';
      });
      item.style.borderColor = 'var(--green)';

      const sub = item.dataset.sub;
      selectedPkg = group.packages.find(p => p.subIndex === sub);

      document.getElementById('epf-qty').value    = selectedPkg.quantity;
      document.getElementById('epf-expiry').value  = selectedPkg.expiry;
      document.getElementById('epf-unit').value    = selectedPkg.unit || 'un';
      document.getElementById('epf-arrival').value = selectedPkg.arrival || '';

      form.hidden  = false;
      btnOk.hidden = false;
    });
  });

  const clone = el => {
    if (!el) return null;
    const n = el.cloneNode(true);
    el.replaceWith(n);
    return n;
  };
  const newOk  = clone(btnOk);
  const newCan = clone(btnCan);

  newOk?.addEventListener('click', async () => {
    if (!selectedPkg) return;

    const qty    = parseFloat(document.getElementById('epf-qty')?.value);
    const expiry = document.getElementById('epf-expiry')?.value;
    const unit   = document.getElementById('epf-unit')?.value || 'un';
    const arrival = document.getElementById('epf-arrival')?.value || null;

    if (!expiry || isNaN(qty) || qty <= 0) {
      window.showToast('Preencha quantidade e validade.');
      return;
    }

    newOk.disabled = true;
    try {
      await API.delete(`/substances/${selectedPkg.subIndex}`);
      window.__substancesData = await API.post('/substances', {
        name: groupName, quantity: qty, expiry, unit, arrival
      });
      modal.hidden = true;
      renderSubstances(document.getElementById('search-input')?.value || '');
      window.showToast('Embalagem atualizada!');
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
      newOk.disabled = false;
    }
  });

  newCan?.addEventListener('click', () => { modal.hidden = true; });
}

  function openDeleteModal(groupName) {
    const modal = document.getElementById('remove-modal');
    const msg   = document.getElementById('modal-remove-msg');
    const btnOk = document.getElementById('modal-confirm');
    const btnNo = document.getElementById('modal-cancel');
    if (!modal) return;

    const group = getData().find(g => g.name === groupName);
    if (!group) return;

    msg.innerHTML = group.packages.map(p => `
      <label style="display:flex;align-items:center;gap:8px;padding:8px 0;
                    border-bottom:1px solid var(--card-bg);cursor:pointer;">
        <input type="radio" name="del-pkg" value="${p.subIndex}"
               style="width:16px;height:16px;">
        <span style="font-size:0.85rem;">
          ${p.subIndex} — Val: ${p.expiry} | Qtd: ${p.quantity} ${p.unit || ''}
          ${p.arrival ? `| Chegada: ${p.arrival}` : ''}
        </span>
      </label>`).join('') +
      `<label style="display:flex;align-items:center;gap:8px;
                     padding:8px 0;cursor:pointer;">
        <input type="radio" name="del-pkg" value="all"
               style="width:16px;height:16px;">
        <span style="font-size:0.85rem;color:var(--red);font-weight:700;">
          Deletar tudo (${groupName})
        </span>
      </label>`;

    modal.hidden = false;

    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const newOk = clone(btnOk);
    const newNo = clone(btnNo);

    newOk.addEventListener('click', async () => {
      const selected = document.querySelector('input[name="del-pkg"]:checked');
      if (!selected) { window.showToast('Você deve selecionar ao menos um.'); return; }

      newOk.disabled = true;
      try {
        if (selected.value === 'all') {
          let g = getData().find(x => x.name === groupName);
          while (g && g.packages.length > 0) {
            window.__substancesData = await API.delete(
              `/substances/${g.packages[0].subIndex}`
            );
            g = getData().find(x => x.name === groupName);
          }
        } else {
          window.__substancesData = await API.delete(`/substances/${selected.value}`);
        }
        modal.hidden = true;
        renderSubstances(document.getElementById('search-input')?.value || '');
        window.showToast('Removido com sucesso.');
      } catch (err) {
        window.showToast(`Erro: ${err.message}`);
        newOk.disabled = false;
      }
    });

    newNo.addEventListener('click', () => { modal.hidden = true; });
  }

  // ─── EDIT ────────────────────────────────────────────

  function renderEdit() {
    const pageEdit    = document.getElementById('page-edit');
    const panelCriar  = document.getElementById('panel-criar');
    const panelEditar = document.getElementById('panel-editar');
    const panelDel    = document.getElementById('panel-deletar');

    function showPanel(panel) {
      [pageEdit, panelCriar, panelEditar, panelDel].forEach(p => {
        if (p) p.hidden = true;
      });
      panel.hidden = false;
      document.getElementById('page-content').scrollTop = 0;
    }

    function showMain() {
      [panelCriar, panelEditar, panelDel].forEach(p => {
        if (p) p.hidden = true;
      });
      if (pageEdit) pageEdit.hidden = false;
    }

document.getElementById('edit-btn-criar')
  ?.addEventListener('click', () => showPanel(panelCriar));

document.getElementById('edit-btn-editar')
  ?.addEventListener('click', async () => {
    // Vai pra aba substâncias e abre painel editar
    await window.__appRouter.loadPage('substances');
    // Aguarda o DOM carregar e abre o painel
    setTimeout(() => {
      const panelEditar = document.getElementById('panel-editar');
      const pageEdit    = document.getElementById('page-edit');
      // Como trocou de página, precisamos injetar o painel na substances
      // Solução: abre modal de busca direto
      window.__substancesEditMode = 'edit';
      window.showToast('Busque a substância para editar.');
    }, 100);
  });

document.getElementById('edit-btn-deletar')
  ?.addEventListener('click', async () => {
    await window.__appRouter.loadPage('substances');
    setTimeout(() => {
      window.__substancesEditMode = 'delete';
      window.showToast('Busque a substância para deletar.');
    }, 100);
  });

    document.getElementById('criar-close')
      ?.addEventListener('click', showMain);
    document.getElementById('editar-close')
      ?.addEventListener('click', showMain);
    document.getElementById('deletar-close')
      ?.addEventListener('click', showMain);

    const nameInput = document.getElementById('c-name');
    const suggBox   = document.getElementById('c-suggestions');

    nameInput?.addEventListener('input', () => {
      const term = nameInput.value.toLowerCase().trim();
      if (!term) { suggBox.style.display = 'none'; return; }

      const matches = getData()
        .filter(g => g.name.toLowerCase().includes(term))
        .slice(0, 5);

      if (!matches.length) { suggBox.style.display = 'none'; return; }

      suggBox.style.display = 'block';
      suggBox.innerHTML = matches.map(g => `
        <div style="padding:10px 12px;cursor:pointer;
                    border-bottom:1px solid #eee;font-size:0.9rem;"
             data-name="${g.name}">${g.name}</div>`).join('');

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

    document.getElementById('btn-criar-confirmar')
      ?.addEventListener('click', handleCriar);

    bindPanelSearch('edit-search',   'edit-search-btn',   'edit-results',   'edit');
    bindPanelSearch('delete-search', 'delete-search-btn', 'delete-results', 'delete');
  }

  async function handleCriar() {
    const name    = document.getElementById('c-name')?.value.trim();
    const qty     = parseFloat(document.getElementById('c-qty')?.value);
    const unit    = document.getElementById('c-unit')?.value || 'un';
    const expiry  = document.getElementById('c-expiry')?.value;
    const arrival = document.getElementById('c-arrival')?.value;
    const fb      = document.getElementById('criar-feedback');
    const btn     = document.getElementById('btn-criar-confirmar');

    if (!name || !expiry || isNaN(qty) || qty <= 0) {
      fb.style.color = 'var(--red)';
      fb.textContent = 'Preencha nome, quantidade e validade.';
      return;
    }

    btn.disabled = true;
    try {
      window.__substancesData = await API.post('/substances', {
        name, quantity: qty, unit, expiry, arrival
      });
      fb.style.color = 'var(--green)';
      fb.textContent = `"${name}" adicionado!`;
      document.getElementById('c-name').value    = '';
      document.getElementById('c-qty').value     = '';
      document.getElementById('c-expiry').value  = '';
      document.getElementById('c-arrival').value = '';
    } catch (err) {
      fb.style.color = 'var(--red)';
      fb.textContent = `Erro: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  }

  function bindPanelSearch(inputId, btnId, containerId, mode) {
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    const box   = document.getElementById(containerId);
    if (!btn || !input || btn.dataset.bound) return;
    btn.dataset.bound = '1';

    function doSearch() {
      const term = input.value.toLowerCase().trim();
      if (!term) { box.innerHTML = ''; return; }

      const matches = getData().filter(g =>
        g.name.toLowerCase().includes(term)
      );

      if (!matches.length) {
        box.innerHTML = `<div class="empty-state">Nenhuma encontrada.</div>`;
        return;
      }

      box.innerHTML = matches.map(g => `
        <div class="card" style="margin-bottom:10px;">
          <p style="font-weight:700;margin-bottom:8px;">${g.name}</p>
          ${g.packages.map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:8px 10px;background:var(--card-bg);
                        border-radius:8px;margin-bottom:6px;">
              <div>
                <span style="font-size:0.75rem;color:var(--muted);">${p.subIndex}</span>
                <p style="font-size:0.85rem;">
                  Val: ${p.expiry} | Qtd: ${p.quantity} ${p.unit || ''}
                  ${p.arrival ? `| Chegada: ${p.arrival}` : ''}
                </p>
              </div>
              ${mode === 'edit'
                ? `<button class="btn-primary pkg-edit-btn"
                           data-sub="${p.subIndex}" data-name="${g.name}"
                           data-qty="${p.quantity}" data-expiry="${p.expiry}"
                           data-unit="${p.unit || 'un'}"
                           data-arrival="${p.arrival || ''}"
                           style="width:auto;padding:6px 14px;font-size:0.8rem;">
                     Editar
                   </button>`
                : `<button class="btn-danger pkg-del-btn"
                           data-sub="${p.subIndex}"
                           style="width:auto;padding:6px 14px;font-size:0.8rem;">
                     Remover
                   </button>`
              }
            </div>`).join('')}
          ${mode === 'delete'
            ? `<button class="btn-danger del-all-btn" data-name="${g.name}"
                       style="margin-top:4px;font-size:0.85rem;padding:10px;">
                 Deletar tudo (${g.name})
               </button>`
            : ''}
        </div>`).join('');

      if (mode === 'delete') {
        box.querySelectorAll('.pkg-del-btn').forEach(b => {
          b.addEventListener('click', () => confirmDeletePkg(b.dataset.sub, doSearch));
        });
        box.querySelectorAll('.del-all-btn').forEach(b => {
          b.addEventListener('click', () => confirmDeleteAll(b.dataset.name, doSearch));
        });
      } else {
        box.querySelectorAll('.pkg-edit-btn').forEach(b => {
          b.addEventListener('click', () => openEditForm(
            b.dataset.name, b.dataset.sub,
            parseFloat(b.dataset.qty), b.dataset.expiry,
            b.dataset.unit, b.dataset.arrival
          ));
        });
      }
    }

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  }

  async function confirmDeletePkg(subIndex, cb) {
    if (!confirm('Você quer remover mesmo?')) return;
    try {
      window.__substancesData = await API.delete(`/substances/${subIndex}`);
      window.showToast('Removida.');
      cb();
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  async function confirmDeleteAll(groupName, cb) {
    if (!confirm(`Deletar TODOS os registros de "${groupName}"?`)) return;
    try {
      let g = getData().find(x => x.name === groupName);
      while (g && g.packages.length > 0) {
        window.__substancesData = await API.delete(
          `/substances/${g.packages[0].subIndex}`
        );
        g = getData().find(x => x.name === groupName);
      }
      window.showToast(`"${groupName}" removido.`);
      cb();
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  function openEditForm(name, subIndex, qty, expiry, unit, arrival) {
    const panelCriar  = document.getElementById('panel-criar');
    const panelEditar = document.getElementById('panel-editar');
    const title       = panelCriar?.querySelector('p');

    if (panelEditar) panelEditar.hidden = true;
    if (panelCriar)  panelCriar.hidden  = false;
    if (title)       title.textContent  = `Editar: ${name}`;

    const nameInput = document.getElementById('c-name');
    if (nameInput) {
      nameInput.value    = name;
      nameInput.disabled = true;
    }

    const qtyEl     = document.getElementById('c-qty');
    const expiryEl  = document.getElementById('c-expiry');
    const unitEl    = document.getElementById('c-unit');
    const arrivalEl = document.getElementById('c-arrival');

    if (qtyEl)     qtyEl.value     = qty;
    if (expiryEl)  expiryEl.value  = expiry;
    if (unitEl)    unitEl.value    = unit || 'un';
    if (arrivalEl) arrivalEl.value = arrival || '';

    const btn    = document.getElementById('btn-criar-confirmar');
    const newBtn = btn.cloneNode(true);
    btn.replaceWith(newBtn);
    newBtn.textContent = 'salvar';

    newBtn.addEventListener('click', async () => {
      const newQty    = parseFloat(qtyEl?.value);
      const newExpiry = expiryEl?.value;
      const newUnit   = unitEl?.value || 'un';
      const newArr    = arrivalEl?.value || null;
      const fb        = document.getElementById('criar-feedback');

      if (!newExpiry || isNaN(newQty) || newQty <= 0) {
        fb.style.color = 'var(--red)';
        fb.textContent = 'Preencha quantidade e validade.';
        return;
      }

      newBtn.disabled = true;
      try {
        await API.delete(`/substances/${subIndex}`);
        window.__substancesData = await API.post('/substances', {
          name, quantity: newQty, unit: newUnit,
          expiry: newExpiry, arrival: newArr
        });
        fb.style.color = 'var(--green)';
        fb.textContent = 'Salvo!';
        if (nameInput) nameInput.disabled = false;
      } catch (err) {
        fb.style.color = 'var(--red)';
        fb.textContent = `Erro: ${err.message}`;
        newBtn.disabled = false;
      }
    });
  }

  // ─── CORE ────────────────────────────────────────────

  async function init(pageName, ctx) {
    if (!window.__substancesData) {
      try {
        window.__substancesData = await API.get('/substances');
      } catch { /* ignora */ }
    }

    if (pageName === 'home')       renderHome(ctx);
    if (pageName === 'substances') renderSubstances();
    if (pageName === 'edit')       renderEdit();
  }

  function onDataUpdate(data) {
    window.__substancesData = data;
    const isHome = !!document.getElementById('page-home');
    const isSubs = !!document.getElementById('page-substances');
    if (isHome) renderHome();
    if (isSubs) renderSubstances(
      document.getElementById('search-input')?.value || ''
    );
  }

  return { init, onDataUpdate };
})();