// Valida o token do widget Cloudflare Turnstile contra a API de verificação.
// Bloqueia scripts simples que tentem autenticar direto contra a API sem
// passar por um navegador de verdade — não é proteção contra bots
// sofisticados usando navegador automatizado (isso é papel do rate limit).
async function verifyTurnstile(token, remoteIp) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true; // sem chave configurada, não bloqueia
  if (!token) return false;

  const body = new URLSearchParams();
  body.append('secret', process.env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body
    });
    const data = await resp.json();
    return !!data.success;
  } catch {
    return false;
  }
}

module.exports = { verifyTurnstile };
