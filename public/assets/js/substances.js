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
    const byStatus = { total: [], soon: [], expired: [] };

    for (const g of data) {
      for (const p of g.packages) {
        total++;
        const s = expiryStatus(p.expiry);
        const item = { name: g.name, subIndex: p.subIndex, expiry: p.expiry, addedAt: p.addedAt };
        byStatus.total.push(item);
        if (s === 'soon')    { soon++;    byStatus.soon.push(item); }
        if (s === 'expired') { expired++; byStatus.expired.push(item); }
        recent.push(item);
      }
    }

    const el = id => document.getElementById(id);
    if (el('ind-total'))   el('ind-total').textContent   = total;
    if (el('ind-soon'))    el('ind-soon').textContent    = soon;
    if (el('ind-expired')) el('ind-expired').textContent = expired;

    bindHomeIndicators(byStatus);

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
                ${window.formatDateBR(r.expiry)}
              </span>
            </div>`).join('');
    }
  }

  const HOME_KIND_LABELS = { total: 'Todos os reagentes', soon: 'Vencendo em breve', expired: 'Vencidos' };

  function bindHomeIndicators(byStatus) {
    document.querySelectorAll('.home-ind').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => openHomeDetail(btn.dataset.kind, byStatus));
    });
  }

  function openHomeDetail(kind, byStatus) {
    const modal = document.getElementById('home-detail-modal');
    const title = document.getElementById('home-detail-title');
    const list  = document.getElementById('home-detail-list');
    const close = document.getElementById('home-detail-close');
    if (!modal) return;

    const items = byStatus[kind] || [];
    title.textContent = `${HOME_KIND_LABELS[kind] || kind} (${items.length})`;

    list.innerHTML = items.length === 0
      ? `<div class="empty-state" style="padding:20px;">Nenhum reagente aqui.</div>`
      : items
          .sort((a, b) => new Date(a.expiry || '9999-12-31') - new Date(b.expiry || '9999-12-31'))
          .map(i => `
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:8px 0;border-bottom:1px solid var(--card-bg);">
              <span style="font-size:0.9rem;font-weight:500;">${i.name}</span>
              <span style="font-size:0.82rem;color:var(--muted);">
                ${i.expiry ? window.formatDateBR(i.expiry) : '—'}
              </span>
            </div>`).join('');

    modal.hidden = false;
    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    clone(close).addEventListener('click', () => { modal.hidden = true; });
  }

  // ─── SUBSTANCES ──────────────────────────────────────

  function applyFilter(data, filterType) {
    let result = [...data];
    switch (filterType) {
      case 'recent':
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case 'expiring':
        result.sort((a, b) =>
          new Date(a.packages[0]?.expiry || '9999-12-31') -
          new Date(b.packages[0]?.expiry || '9999-12-31')
        );
        break;
      case 'pf':
        result = result.filter(g => g.controladoPF);
        break;
      case 'aberto':
        result = result.filter(g => g.packages.some(p => p.situacao === 'aberto'));
        break;
      case 'fechado':
        result = result.filter(g => g.packages.some(p => p.situacao === 'fechado'));
        break;
    }
    return result;
  }

  function renderSubstances(filter = '') {
    const list = document.getElementById('substances-list');
    if (!list) return;

    const term = filter.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filterType = document.getElementById('filter-select')?.value || '';

    let data = getData();

    if (term) {
      data = data.filter(g => {
        const n = g.name.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const casMatch = g.cas ? g.cas.toLowerCase().includes(term) : false;
        const numMatch = g.index != null ? g.index.toString() === filter.trim() : false;
        const tagMatch = (g.tags || []).some(t => t.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term));
        return n.includes(term) || casMatch || numMatch || tagMatch;
      });
    }

    data = applyFilter(data, filterType);

    if (data.length === 0) {
      list.innerHTML = `<div class="empty-state">
        ${term ? 'Nada encontrado.' : 'Nada cadastrado.'}
      </div>`;
      bindSearch();
      bindFilter();
      return;
    }

    list.innerHTML = data.map(group => {
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
                ${group.controladoPF
                  ? `<span style="font-size:0.65rem;background:var(--red);color:#fff;
                             padding:2px 6px;border-radius:4px;margin-left:6px;
                             vertical-align:middle;">PF</span>`
                  : ''}
              </p>
              ${group.cas
                ? `<p style="font-size:0.72rem;color:var(--muted);margin-top:2px;">CAS: ${group.cas}</p>`
                : ''}
              ${(group.tags || []).length
                ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
                     ${group.tags.map(t => `<span class="badge tag">${t}</span>`).join('')}
                   </div>`
                : ''}
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
                <strong style="color:var(--text);">${firstPkg?.expiry ? window.formatDateBR(firstPkg.expiry) : '—'}</strong>
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
    bindFilter();
  }

  function bindSearch() {
    const btn     = document.getElementById('btn-search');
    const input   = document.getElementById('search-input');
    const clearEl = document.getElementById('search-clear');
    const wrap    = input?.closest('.search-wrap');
    const sugg    = document.getElementById('search-tags-suggestions');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';

    const toggleClear = () => wrap?.classList.toggle('has-text', !!input.value);

    btn.addEventListener('click', () => renderSubstances(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') renderSubstances(input.value);
    });
    input.addEventListener('input', () => {
      toggleClear();
      if (!input.value) renderSubstances('');
      updateSearchTagSuggestions(input, sugg);
    });
    clearEl?.addEventListener('click', () => {
      input.value = '';
      toggleClear();
      if (sugg) sugg.style.display = 'none';
      input.focus();
      renderSubstances('');
    });
    toggleClear();

    document.addEventListener('click', e => {
      if (sugg && !input.contains(e.target) && !sugg.contains(e.target)) {
        sugg.style.display = 'none';
      }
    });
  }

  // Sugere tags já cadastradas conforme o usuário digita no campo de busca,
  // igual ao autopreenchimento já existente no formulário de criação.
  function updateSearchTagSuggestions(input, sugg) {
    if (!sugg) return;
    const term = input.value.trim().toLowerCase();
    if (!term) { sugg.style.display = 'none'; return; }

    const allTags = new Set();
    getData().forEach(g => (g.tags || []).forEach(t => allTags.add(t)));

    const matches = [...allTags]
      .filter(t => t.toLowerCase().includes(term))
      .slice(0, 5);

    if (!matches.length) { sugg.style.display = 'none'; return; }

    sugg.style.display = 'block';
    sugg.innerHTML = matches.map(t => `
      <div style="padding:10px 12px;cursor:pointer;
                  border-bottom:1px solid #eee;font-size:0.9rem;"
           data-tag="${t}">${t}</div>`).join('');

    sugg.querySelectorAll('[data-tag]').forEach(el => {
      el.addEventListener('click', () => {
        input.value = el.dataset.tag;
        sugg.style.display = 'none';
        renderSubstances(input.value);
      });
    });
  }

  function bindFilter() {
    const select = document.getElementById('filter-select');
    if (!select || select.dataset.bound) return;
    select.dataset.bound = '1';
    select.addEventListener('change', () => {
      renderSubstances(document.getElementById('search-input')?.value || '');
    });
  }

function openOptions(groupName) {
  const modal      = document.getElementById('options-modal');
  const title      = document.getElementById('options-modal-title');
  if (!modal) return;

  title.textContent = groupName;
  modal.hidden = false;

  const clone = el => {
    if (!el) return null;
    const n = el.cloneNode(true);
    el.replaceWith(n);
    return n;
  };

  const newAdd     = clone(document.getElementById('opt-edit'));
  const newEditPkg = clone(document.getElementById('opt-edit-pkg'));
  const newEditSub = clone(document.getElementById('opt-edit-sub'));
  const newConsumo = clone(document.getElementById('opt-consumo'));
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

  newEditSub?.addEventListener('click', () => {
    modal.hidden = true;
    openEditSubstanceModal(groupName);
  });

  newConsumo?.addEventListener('click', () => {
    modal.hidden = true;
    openConsumoModal(groupName);
  });

  newDel?.addEventListener('click', () => {
    modal.hidden = true;
    openDeleteModal(groupName);
  });

  newCan?.addEventListener('click', () => { modal.hidden = true; });
}

function computeRemaining(pkg) {
  const used = (pkg.consumption || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  return Math.max(0, pkg.quantity - used);
}

function openConsumoModal(groupName) {
  const modal  = document.getElementById('consumo-modal');
  const title  = document.getElementById('consumo-modal-title');
  const list   = document.getElementById('consumo-pkg-list');
  const form   = document.getElementById('consumo-form');
  const btnOk  = document.getElementById('cons-confirm');
  const btnCan = document.getElementById('cons-cancel');
  if (!modal) return;

  const group = getData().find(g => g.name === groupName);
  if (!group) return;

  title.textContent = `Registrar uso — ${groupName}`;
  form.hidden  = true;
  modal.hidden = false;

  // Clona ANTES de ligar os itens da lista: os itens abaixo escondem/mostram
  // o botão de confirmar ao selecionar um pacote, e precisam mexer no nó que
  // de fato fica no DOM. Clonar depois (como estava) troca btnOk por um nó
  // novo e deixa a referência dos itens apontando pro nó antigo e órfão —
  // btnOk.hidden = false nunca aparecia na tela.
  const clone = el => {
    if (!el) return null;
    const n = el.cloneNode(true);
    el.replaceWith(n);
    return n;
  };
  const newOk  = clone(btnOk);
  const newCan = clone(btnCan);
  newOk.hidden = true;

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
          Val: ${window.formatDateBR(p.expiry)} | Restante: ${computeRemaining(p)} ${p.unit || ''}
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

      document.getElementById('consumo-restante').textContent =
        `${computeRemaining(selectedPkg)} ${selectedPkg.unit || ''}`;
      document.getElementById('cons-amount').value = '';
      document.getElementById('cons-note').value   = '';
      document.getElementById('cons-queue').checked = selectedPkg.queueStatus === 'solicitado';

      form.hidden  = false;
      newOk.hidden = false;
    });
  });

  newOk?.addEventListener('click', async () => {
    if (!selectedPkg) return;

    const amount = parseFloat(document.getElementById('cons-amount')?.value);
    const note   = document.getElementById('cons-note')?.value.trim() || null;
    const wantsQueue = document.getElementById('cons-queue')?.checked || false;

    if (isNaN(amount) || amount <= 0) {
      window.showToast('Informe a quantidade usada.');
      return;
    }

    newOk.disabled = true;
    try {
      window.__substancesData = await API.post(
        `/substances/${selectedPkg.subIndex}/consumption`,
        { amount, note }
      );

      const desiredStatus = wantsQueue ? 'solicitado' : null;
      if (desiredStatus !== (selectedPkg.queueStatus || null)) {
        window.__substancesData = await API.patch(
          `/substances/${selectedPkg.subIndex}/queue`,
          { status: desiredStatus }
        );
      }

      modal.hidden = true;
      renderSubstances(document.getElementById('search-input')?.value || '');
      window.showToast('Uso registrado!');
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    } finally {
      // cloneNode copia o atributo disabled — sem isto, um segundo "Registrar
      // uso" (ou qualquer ação seguinte que reabra este modal) herdaria o
      // botão desabilitado do sucesso anterior e o clique não faria nada.
      newOk.disabled = false;
    }
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
    } finally {
      newOk.disabled = false;
    }
  });

  newNo?.addEventListener('click', () => { modal.hidden = true; });
}

async function openEditPkgModal(groupName) {
  const modal  = document.getElementById('edit-pkg-modal');
  const title  = document.getElementById('edit-pkg-title');
  const list   = document.getElementById('edit-pkg-list');
  const form   = document.getElementById('edit-pkg-form');
  const btnOk  = document.getElementById('epf-confirm');
  const btnCan = document.getElementById('epf-cancel');
  if (!modal) return;

  const group = getData().find(g => g.name === groupName);
  if (!group) return;

  title.textContent = `Editar embalagem — ${groupName}`;
  form.hidden  = true;
  modal.hidden = false;

  await populateArmarioSelect('epf-armario');

  // Clona ANTES de ligar os itens da lista (mesmo motivo do openConsumoModal
  // acima): os itens escondem/mostram o botão de salvar, e precisam mexer no
  // nó que de fato está no DOM, não num que já foi substituído pelo clone.
  const clone = el => {
    if (!el) return null;
    const n = el.cloneNode(true);
    el.replaceWith(n);
    return n;
  };
  const newOk  = clone(btnOk);
  const newCan = clone(btnCan);
  newOk.hidden = true;

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
          Val: ${window.formatDateBR(p.expiry)} | Qtd: ${p.quantity} ${p.unit || ''}
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

      document.getElementById('epf-qty').value      = selectedPkg.quantity;
      document.getElementById('epf-expiry').value   = selectedPkg.expiry;
      document.getElementById('epf-unit').value     = selectedPkg.unit || 'un';
      document.getElementById('epf-arrival').value  = selectedPkg.arrival || '';
      document.getElementById('epf-armario').value  = selectedPkg.armario || '';
      document.getElementById('epf-situacao').value = selectedPkg.situacao || '';
      document.getElementById('epf-local').value    = selectedPkg.localAtual || '';
      document.getElementById('epf-marca').value    = selectedPkg.marca || '';

      form.hidden  = false;
      newOk.hidden = false;
    });
  });

  newOk?.addEventListener('click', async () => {
    if (!selectedPkg) return;

    const qty        = parseFloat(document.getElementById('epf-qty')?.value);
    const expiry      = document.getElementById('epf-expiry')?.value;
    const unit        = document.getElementById('epf-unit')?.value || 'un';
    const arrival     = document.getElementById('epf-arrival')?.value || null;
    const armario     = document.getElementById('epf-armario')?.value || null;
    const situacao    = document.getElementById('epf-situacao')?.value || null;
    const localAtual  = document.getElementById('epf-local')?.value.trim() || null;
    const marca       = document.getElementById('epf-marca')?.value.trim() || null;

    if (!expiry || isNaN(qty) || qty <= 0) {
      window.showToast('Preencha quantidade e validade.');
      return;
    }

    newOk.disabled = true;
    try {
      window.__substancesData = await API.patch(`/substances/${selectedPkg.subIndex}/package`, {
        quantity: qty, expiry, unit, arrival, armario, situacao, localAtual, marca
      });
      modal.hidden = true;
      renderSubstances(document.getElementById('search-input')?.value || '');
      window.showToast('Embalagem atualizada!');
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    } finally {
      newOk.disabled = false;
    }
  });

  newCan?.addEventListener('click', () => { modal.hidden = true; });
}

function openEditSubstanceModal(groupName) {
  const modal  = document.getElementById('edit-sub-modal');
  const title  = document.getElementById('edit-sub-title');
  const btnOk  = document.getElementById('es-confirm');
  const btnCan = document.getElementById('es-cancel');
  if (!modal) return;

  const group = getData().find(g => g.name === groupName);
  if (!group) return;

  title.textContent = `Editar informações gerais — ${groupName}`;
  prepareNumberField('es-number', 'es-number-unlock', group.index);
  document.getElementById('es-cas').value       = group.cas || '';
  document.getElementById('es-pf').checked      = !!group.controladoPF;
  document.getElementById('es-tags').value      = (group.tags || []).join(', ');
  document.getElementById('es-obs').value       = group.observacoes || '';
  document.getElementById('es-incompat').value  = group.incompatibilidades || '';
  modal.hidden = false;

  const clone = el => {
    if (!el) return null;
    const n = el.cloneNode(true);
    el.replaceWith(n);
    return n;
  };
  const newOk  = clone(btnOk);
  const newCan = clone(btnCan);

  newOk?.addEventListener('click', async () => {
    const cas          = document.getElementById('es-cas')?.value.trim() || null;
    const controladoPF = document.getElementById('es-pf')?.checked || false;
    const tagsRaw      = document.getElementById('es-tags')?.value.trim();
    const tags         = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const observacoes  = document.getElementById('es-obs')?.value.trim() || null;
    const incompatibilidades = document.getElementById('es-incompat')?.value.trim() || null;

    const numberUnlock = document.getElementById('es-number-unlock');
    const desiredNumber = numberUnlock?.checked
      ? parseInt(document.getElementById('es-number')?.value, 10)
      : null;

    newOk.disabled = true;
    try {
      window.__substancesData = await API.patch(
        `/substances/${encodeURIComponent(group.nameLower)}/details`,
        { cas, controladoPF, tags, observacoes, incompatibilidades }
      );

      if (desiredNumber && desiredNumber !== group.index) {
        await applyGroupNumber(group.nameLower, desiredNumber);
      }

      modal.hidden = true;
      renderSubstances(document.getElementById('search-input')?.value || '');
      window.showToast('Substância atualizada!');
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    } finally {
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
          ${p.subIndex} — Val: ${window.formatDateBR(p.expiry)} | Qtd: ${p.quantity} ${p.unit || ''}
          ${p.arrival ? `| Chegada: ${window.formatDateBR(p.arrival)}` : ''}
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
      } finally {
        // Causa raiz do "só apaga uma vez por visita à aba": cloneNode copia
        // o atributo disabled do botão anterior. Sem resetar aqui no sucesso
        // também (e não só no catch), a segunda exclusão clonava um botão
        // já desabilitado pra sempre e o clique não tinha efeito nenhum.
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
  ?.addEventListener('click', () => {
    showPanel(panelCriar);
    prepareNumberField('c-number', 'c-number-unlock');
  });

document.getElementById('edit-btn-editar')
  ?.addEventListener('click', async () => {
    await window.__appRouter.loadPage('substances');
    setTimeout(() => {
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

    // Autopreenchimento de tags — sugere tags já usadas noutros reagentes
    const tagsInput = document.getElementById('c-tags');
    const tagsSugg  = document.getElementById('c-tags-suggestions');

    tagsInput?.addEventListener('input', () => {
      if (!tagsSugg) return;
      const parts    = tagsInput.value.split(',');
      const current  = parts[parts.length - 1].trim().toLowerCase();
      if (!current) { tagsSugg.style.display = 'none'; return; }

      const allTags = new Set();
      getData().forEach(g => (g.tags || []).forEach(t => allTags.add(t)));

      const matches = [...allTags]
        .filter(t => t.toLowerCase().includes(current) &&
                     !parts.slice(0, -1).map(p => p.trim().toLowerCase()).includes(t.toLowerCase()))
        .slice(0, 5);

      if (!matches.length) { tagsSugg.style.display = 'none'; return; }

      tagsSugg.style.display = 'block';
      tagsSugg.innerHTML = matches.map(t => `
        <div style="padding:10px 12px;cursor:pointer;
                    border-bottom:1px solid #eee;font-size:0.9rem;"
             data-tag="${t}">${t}</div>`).join('');

      tagsSugg.querySelectorAll('[data-tag]').forEach(el => {
        el.addEventListener('click', () => {
          parts[parts.length - 1] = ` ${el.dataset.tag}`;
          tagsInput.value = parts.join(',').replace(/^ /, '') + ', ';
          tagsSugg.style.display = 'none';
          tagsInput.focus();
        });
      });
    });

    document.addEventListener('click', e => {
      if (!tagsInput?.contains(e.target) && !tagsSugg?.contains(e.target)) {
        if (tagsSugg) tagsSugg.style.display = 'none';
      }
    });

    document.getElementById('btn-criar-confirmar')
      ?.addEventListener('click', handleCriar);

    bindPanelSearch('edit-search',   'edit-search-btn',   'edit-results',   'edit');
    bindPanelSearch('delete-search', 'delete-search-btn', 'delete-results', 'delete');

    populateArmarioSelect();
  }

  // Preenche o campo de número travável com o próximo número disponível
  // (desabilitado por padrão) e liga o checkbox "editar manualmente" que o
  // destrava. numberId/unlockId permitem reutilizar no painel de criação
  // (c-number) e no modal de editar substância (es-number).
  function prepareNumberField(numberId, unlockId, currentValue = null) {
    const numberInput = document.getElementById(numberId);
    const unlock       = document.getElementById(unlockId);
    if (!numberInput || !unlock) return;

    const nextFree = getData().reduce((max, g) => Math.max(max, g.index || 0), 0) + 1;
    numberInput.value    = currentValue ?? nextFree;
    numberInput.disabled = true;
    unlock.checked        = false;

    if (!unlock.dataset.bound) {
      unlock.dataset.bound = '1';
      unlock.addEventListener('change', () => {
        numberInput.disabled = !unlock.checked;
      });
    }
  }

  // Aplica o número escolhido a uma substância já criada, tratando o
  // conflito 409 (número já ocupado por outra) com uma pergunta de
  // confirmação antes de reenviar com force:true.
  async function applyGroupNumber(nameLower, desiredNumber) {
    try {
      window.__substancesData = await API.patch(
        `/substances/${encodeURIComponent(nameLower)}/number`,
        { number: desiredNumber }
      );
    } catch (err) {
      const conflict = err.conflict;
      const ocupante = conflict?.name || 'outro reagente';
      const confirmed = await window.confirmModal(
        `"${ocupante}" já ocupa o número ${desiredNumber}. Mover ele para o próximo número livre?`,
        { confirmLabel: 'Mover e confirmar' }
      );
      if (!confirmed) return;
      window.__substancesData = await API.patch(
        `/substances/${encodeURIComponent(nameLower)}/number`,
        { number: desiredNumber, force: true }
      );
    }
  }

  async function populateArmarioSelect(selectId = 'c-armario') {
    const select = document.getElementById(selectId);
    if (!select || select.dataset.loaded) return;
    select.dataset.loaded = '1';
    try {
      const armarios = await API.get('/armarios');
      select.innerHTML = '<option value="">—</option>' +
        armarios.map(a => `<option value="${a.nome}">${a.nome}</option>`).join('');
    } catch { /* select fica só com "—" se falhar */ }
  }

  async function handleCriar() {
    const name    = document.getElementById('c-name')?.value.trim();
    const qty     = parseFloat(document.getElementById('c-qty')?.value);
    const unit    = document.getElementById('c-unit')?.value || 'un';
    const expiry  = document.getElementById('c-expiry')?.value;
    const arrival = document.getElementById('c-arrival')?.value;

    const cas          = document.getElementById('c-cas')?.value.trim() || null;
    const controladoPF = document.getElementById('c-pf')?.checked || false;
    const armario       = document.getElementById('c-armario')?.value || null;
    const situacao       = document.getElementById('c-situacao')?.value || null;
    const localAtual     = document.getElementById('c-local')?.value.trim() || null;
    const marca           = document.getElementById('c-marca')?.value.trim() || null;
    const tagsRaw          = document.getElementById('c-tags')?.value.trim();
    const tags               = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const observacoes         = document.getElementById('c-obs')?.value.trim() || null;
    const incompatibilidades  = document.getElementById('c-incompat')?.value.trim() || null;

    const fb  = document.getElementById('criar-feedback');
    const btn = document.getElementById('btn-criar-confirmar');

    if (!name || !expiry || isNaN(qty) || qty <= 0) {
      fb.style.color = 'var(--red)';
      fb.textContent = 'Preencha nome, quantidade e validade.';
      return;
    }

    const numberUnlock = document.getElementById('c-number-unlock');
    const desiredNumber = numberUnlock?.checked
      ? parseInt(document.getElementById('c-number')?.value, 10)
      : null;

    btn.disabled = true;
    try {
      window.__substancesData = await API.post('/substances', {
        name, quantity: qty, unit, expiry, arrival,
        cas, controladoPF, armario, situacao, localAtual, marca, tags, observacoes,
        incompatibilidades
      });

      if (desiredNumber) {
        const created = getData().find(g => g.nameLower === name.toLowerCase().trim());
        if (created && created.index !== desiredNumber) {
          await applyGroupNumber(created.nameLower, desiredNumber);
        }
      }

      fb.style.color = 'var(--green)';
      fb.textContent = `"${name}" adicionado!`;
      ['c-name','c-qty','c-expiry','c-arrival','c-cas','c-local','c-marca','c-tags','c-obs','c-incompat']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const pf  = document.getElementById('c-pf');  if (pf)  pf.checked = false;
      const arm = document.getElementById('c-armario'); if (arm) arm.value = '';
      const sit = document.getElementById('c-situacao'); if (sit) sit.value = '';
      prepareNumberField('c-number', 'c-number-unlock');
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
                  Val: ${window.formatDateBR(p.expiry)} | Qtd: ${p.quantity} ${p.unit || ''}
                  ${p.arrival ? `| Chegada: ${window.formatDateBR(p.arrival)}` : ''}
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
    if (!await window.confirmModal('Você quer remover mesmo?', { confirmLabel: 'Remover' })) return;
    try {
      window.__substancesData = await API.delete(`/substances/${subIndex}`);
      window.showToast('Removida.');
      cb();
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  async function confirmDeleteAll(groupName, cb) {
    if (!await window.confirmModal(`Deletar TODOS os registros de "${groupName}"?`, { confirmLabel: 'Deletar tudo' })) return;
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
      } finally {
        newBtn.disabled = false;
      }
    });
  }

  // ─── CORE ────────────────────────────────────────────

  async function init(pageName, ctx) {
    // Guardado globalmente porque onDataUpdate (disparado pelo polling a
    // cada 5s, para atualizações de QUALQUER usuário) não recebe ctx de
    // novo — sem isso, renderHome() cai no fallback "Visitante".
    if (ctx) window.__userCtx = ctx;

    if (!window.__substancesData) {
      try {
        window.__substancesData = await API.get('/substances');
      } catch { /* ignora */ }
    }

    if (pageName === 'home')       renderHome(window.__userCtx);
    if (pageName === 'substances') renderSubstances();
    if (pageName === 'edit')       renderEdit();
  }

  function onDataUpdate(data) {
    window.__substancesData = data;
    const isHome = !!document.getElementById('page-home');
    const isSubs = !!document.getElementById('page-substances');
    if (isHome) renderHome(window.__userCtx);
    if (isSubs) renderSubstances(
      document.getElementById('search-input')?.value || ''
    );
  }

  return { init, onDataUpdate };
})();