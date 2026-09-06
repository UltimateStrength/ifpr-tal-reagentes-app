// public/assets/js/armarios.js
window.__page = (() => {
  let ctx = { role: 'viewer' };

  async function init(pageName, pageCtx) {
    ctx = pageCtx || ctx;
    await load();

    document.getElementById('arm-back')
      ?.addEventListener('click', () => window.__appRouter.loadPage('menu'));

    const btn   = document.getElementById('arm-add');
    const input = document.getElementById('arm-nome');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', handleAdd);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });
    }
  }

  async function load() {
    const list = document.getElementById('arm-list');
    if (!list) return;
    try {
      const armarios = await API.get('/armarios');
      render(armarios);
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Erro ao carregar: ${err.message}</div>`;
    }
  }

  function render(armarios) {
    const list = document.getElementById('arm-list');
    const canDelete = ['developer', 'admin'].includes(ctx.role);

    if (!armarios.length) {
      list.innerHTML = `<div class="empty-state">Nenhum armário cadastrado.</div>`;
      return;
    }

    list.innerHTML = armarios.map(a => `
      <div class="card" style="display:flex;align-items:center;
           justify-content:space-between;padding:14px 16px;margin-bottom:10px;">
        <p style="font-size:0.95rem;font-weight:700;">${a.nome}</p>
        ${canDelete
          ? `<button class="btn-danger arm-del" data-id="${a._id}" data-nome="${a.nome}"
                     style="padding:8px 14px;font-size:0.82rem;width:auto;">
               ✕
             </button>`
          : ''}
      </div>`).join('');

    list.querySelectorAll('.arm-del').forEach(b => {
      b.addEventListener('click', () => handleDelete(b.dataset.id));
    });
  }

  async function handleAdd() {
    const input = document.getElementById('arm-nome');
    const fb    = document.getElementById('arm-feedback');
    const nome  = input.value.trim();

    if (!nome) {
      fb.style.color = 'var(--red)';
      fb.textContent = 'Digite um nome.';
      return;
    }

    try {
      await API.post('/armarios', { nome });
      input.value = '';
      fb.style.color = 'var(--green)';
      fb.textContent = 'Armário adicionado!';
      await load();
    } catch (err) {
      fb.style.color = 'var(--red)';
      fb.textContent = `Erro: ${err.message}`;
    }
  }

  async function handleDelete(id) {
    if (!await window.confirmModal(
      'Remover este armário da lista? Reagentes já cadastrados não são afetados.',
      { confirmLabel: 'Remover' }
    )) return;
    try {
      await API.delete(`/armarios/${id}`);
      window.showToast('Removido.');
      await load();
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  return { init };
})();