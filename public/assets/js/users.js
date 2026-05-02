window.__page = (() => {
  const ROLE_LABELS = {
    developer: 'Desenvolvedor',
    admin:     'Administrador',
    staff:     'Suporte',
    viewer:    'Visualizador'
  };

  const ROLE_COLORS = {
    developer: '#7c3aed',
    admin:     '#2f9e3f',
    staff:     '#0284c7',
    viewer:    '#6b7280'
  };

  let editingId = null;

  async function init(pageName, ctx) {
    document.getElementById('users-back')
      ?.addEventListener('click', () => window.__appRouter.loadPage('menu'));

    document.getElementById('btn-new-user')
      ?.addEventListener('click', () => openModal());

    await loadUsers();
  }

  async function loadUsers() {
    const list = document.getElementById('users-list');
    list.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

    try {
      const users = await API.get('/users');

      if (users.length === 0) {
        list.innerHTML = `<div class="empty-state">Nenhum usuário cadastrado.</div>`;
        return;
      }

      list.innerHTML = users.map(u => `
        <div class="card" style="display:flex;align-items:center;
                                  justify-content:space-between;
                                  padding:14px 16px;margin-bottom:10px;">
          <div>
            <p style="font-size:0.95rem;font-weight:700;">${u.displayName || u.username}</p>
            <p style="font-size:0.8rem;color:var(--muted);">@${u.username}</p>
            <span style="display:inline-block;margin-top:4px;
                         font-size:0.72rem;font-weight:700;
                         padding:2px 8px;border-radius:20px;color:#fff;
                         background:${ROLE_COLORS[u.role] || '#6b7280'};">
              ${ROLE_LABELS[u.role] || u.role}
            </span>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-secondary btn-edit-user"
                    data-id="${u._id}"
                    data-displayname="${u.displayName || ''}"
                    data-username="${u.username}"
                    data-email="${u.email || ''}"
                    data-role="${u.role}"
                    style="padding:8px 14px;font-size:0.82rem;">
              editar
            </button>
            <button class="btn-danger btn-delete-user"
                    data-id="${u._id}"
                    data-name="${u.displayName || u.username}"
                    style="padding:8px 14px;font-size:0.82rem;width:auto;">
              ✕
            </button>
          </div>
        </div>`).join('');

      list.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => openModal({
          id:          btn.dataset.id,
          displayName: btn.dataset.displayname,
          username:    btn.dataset.username,
          email:       btn.dataset.email,
          role:        btn.dataset.role
        }));
      });

      list.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(
          btn.dataset.id,
          btn.dataset.name
        ));
      });

    } catch (err) {
      list.innerHTML = `<div class="empty-state">Erro ao carregar usuários.</div>`;
    }
  }

  function openModal(user = null) {
    const modal    = document.getElementById('user-modal');
    const title    = document.getElementById('user-modal-title');
    const btnOk    = document.getElementById('u-confirm');
    const btnCan   = document.getElementById('u-cancel');
    const passInput = document.getElementById('u-password');

    editingId = user?._id || user?.id || null;

    title.textContent = user ? 'Editar usuário' : 'Novo usuário';

    document.getElementById('u-displayname').value = user?.displayName || '';
    document.getElementById('u-username').value    = user?.username    || '';
    document.getElementById('u-email').value       = user?.email       || '';
    document.getElementById('u-password').value    = '';
    document.getElementById('u-role').value        = user?.role        || 'staff';

    // Username não editável no modo edição
    document.getElementById('u-username').disabled = !!user;

    // Senha opcional no modo edição
    passInput.placeholder = user
      ? 'deixe em branco para não alterar'
      : 'mínimo 6 caracteres';

    modal.hidden = false;

    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const newOk  = clone(btnOk);
    const newCan = clone(btnCan);

    newOk.addEventListener('click', () => handleSave(user));
    newCan.addEventListener('click', () => { modal.hidden = true; });
  }

  async function handleSave(existing) {
    const displayName = document.getElementById('u-displayname').value.trim();
    const username    = document.getElementById('u-username').value.trim();
    const email       = document.getElementById('u-email').value.trim();
    const password    = document.getElementById('u-password').value;
    const role        = document.getElementById('u-role').value;

    if (!displayName || (!existing && !username) || (!existing && !password)) {
      window.showToast('Preencha nome, usuário e senha.');
      return;
    }

    if (!existing && password.length < 6) {
      window.showToast('Senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const btn = document.getElementById('u-confirm') ||
                document.querySelector('#user-modal .modal-ok');

    try {
      if (existing) {
        const body = { displayName, email, role };
        if (password) body.password = password;
        await API.put(`/users/${existing.id || existing._id}`, body);
      } else {
        await API.post('/users', { username, displayName, email, password, role });
      }

      document.getElementById('user-modal').hidden = true;
      window.showToast(existing ? 'Usuário atualizado!' : 'Usuário criado!');
      await loadUsers();
    } catch (err) {
      window.showToast(`Erro: ${err.message}`);
    }
  }

  function confirmDelete(id, name) {
    const modal  = document.getElementById('delete-user-modal');
    const msg    = document.getElementById('delete-user-msg');
    const btnOk  = document.getElementById('du-confirm');
    const btnCan = document.getElementById('du-cancel');

    msg.textContent = `Remover "${name}" permanentemente?`;
    modal.hidden = false;

    const clone = el => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const newOk  = clone(btnOk);
    const newCan = clone(btnCan);

    newOk.addEventListener('click', async () => {
      try {
        await API.delete(`/users/${id}`);
        modal.hidden = true;
        window.showToast('Usuário removido.');
        await loadUsers();
      } catch (err) {
        window.showToast(`Erro: ${err.message}`);
      }
    });

    newCan.addEventListener('click', () => { modal.hidden = true; });
  }

  return { init };
})();