document.addEventListener('DOMContentLoaded', async () => {
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

  // Captcha Cloudflare Turnstile — bloqueia scripts simples que tentem
  // autenticar direto contra a API sem passar por um navegador de verdade.
  const turnstileTokens = { login: null, token: null };

  function waitForTurnstile() {
    return new Promise(resolve => {
      if (window.turnstile) return resolve();
      const check = setInterval(() => {
        if (window.turnstile) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 8000);
    });
  }

  try {
    const { turnstileSiteKey } = await API.get('/config');
    if (turnstileSiteKey) {
      await waitForTurnstile();
      if (window.turnstile) {
        window.turnstile.render('#turnstile-login-widget', {
          sitekey: turnstileSiteKey,
          callback: t => { turnstileTokens.login = t; }
        });
        window.turnstile.render('#turnstile-token-widget', {
          sitekey: turnstileSiteKey,
          callback: t => { turnstileTokens.token = t; }
        });
      }
    }
  } catch { /* sem chave configurada, segue sem captcha */ }

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
      const result = await API.post('/auth/login', { user, pass, turnstileToken: turnstileTokens.login });
      window.__appRouter.init(result.displayName, result.role, result.birthDate);
    } catch {
      loginError.hidden = false;
      inputPass.value   = '';
      inputPass.focus();
      if (window.turnstile) window.turnstile.reset('#turnstile-login-widget');
      turnstileTokens.login = null;
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
      const result = await API.post('/auth/login', { token, turnstileToken: turnstileTokens.token });
      window.__appRouter.init(result.displayName, result.role);
    } catch {
      tokenError.hidden = false;
      if (window.turnstile) window.turnstile.reset('#turnstile-token-widget');
      turnstileTokens.token = null;
    } finally {
      btnTokenLogin.disabled = false;
    }
  });
});
