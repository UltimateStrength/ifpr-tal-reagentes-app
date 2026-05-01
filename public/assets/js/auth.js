document.addEventListener('DOMContentLoaded', () => {
  const btnLogin      = document.getElementById('btn-login');
  const inputUser     = document.getElementById('input-user');
  const inputPass     = document.getElementById('input-pass');
  const loginError    = document.getElementById('login-error');
  const linkToken     = document.getElementById('link-token');
  const linkBack      = document.getElementById('link-back-login');
  const btnTokenLogin = document.getElementById('btn-token-login');
  const inputToken    = document.getElementById('input-token');
  const tokenError    = document.getElementById('token-error');
  const loginScreen   = document.getElementById('login-screen');
  const tokenScreen   = document.getElementById('token-screen');

  inputPass?.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnLogin.click();
  });

  inputToken?.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnTokenLogin.click();
  });

  linkToken?.addEventListener('click', e => {
    e.preventDefault();
    loginScreen.hidden = true;
    tokenScreen.hidden = false;
  });

  linkBack?.addEventListener('click', e => {
    e.preventDefault();
    tokenScreen.hidden = true;
    loginScreen.hidden = false;
  });

  btnLogin?.addEventListener('click', async () => {
    const user = inputUser.value.trim();
    const pass = inputPass.value;
    if (!user || !pass) return;

    btnLogin.disabled  = true;
    loginError.hidden  = true;

    try {
      const result = await API.post('/auth/login', { user, pass });
      window.__appRouter.init(result.displayName, result.role);
    } catch {
      loginError.hidden = false;
      inputPass.value   = '';
      inputPass.focus();
    } finally {
      btnLogin.disabled = false;
    }
  });

  btnTokenLogin?.addEventListener('click', async () => {
    const token = inputToken.value.trim();
    if (!token) return;

    btnTokenLogin.disabled = true;
    tokenError.hidden      = true;

    try {
      const result = await API.post('/auth/login', { token });
      window.__appRouter.init(result.displayName, result.role);
    } catch {
      tokenError.hidden = false;
    } finally {
      btnTokenLogin.disabled = false;
    }
  });
});