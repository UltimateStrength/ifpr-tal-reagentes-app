document.addEventListener('DOMContentLoaded', () => {
  const btnLogin   = document.getElementById('btn-login');
  const inputUser  = document.getElementById('input-user');
  const inputPass  = document.getElementById('input-pass');
  const loginError = document.getElementById('login-error');

  // Enter no campo de senha faz login
  inputPass.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnLogin.click();
  });

  btnLogin.addEventListener('click', async () => {
    const user = inputUser.value.trim();
    const pass = inputPass.value;

    if (!user || !pass) return;

    btnLogin.disabled = true;
    loginError.hidden = true;

    try {
      await API.post('/auth/login', { user, pass });
      window.__appRouter.init(); // autenticou — inicia o app
    } catch {
      loginError.hidden = false;
      inputPass.value = '';
      inputPass.focus();
    } finally {
      btnLogin.disabled = false;
    }
  });
});