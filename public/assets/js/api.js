// Wrapper central de fetch — todas as chamadas passam por aqui
const API = (() => {
  async function request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };

    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`/api${endpoint}`, opts);

    // Sessão expirou — volta pro login
    if (res.status === 401) {
      window.__appRouter?.goLogin();
      throw new Error('Sessão expirada');
    }

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

    return data;
  }

  async function upload(endpoint, formData) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData // sem Content-Type — o browser define o boundary do multipart
    });

    if (res.status === 401) {
      window.__appRouter?.goLogin();
      throw new Error('Sessão expirada');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
    return data;
  }

  return {
    get:    (ep)       => request('GET',    ep),
    post:   (ep, body) => request('POST',   ep, body),
    delete: (ep)       => request('DELETE', ep),
    upload: (ep, form) => upload(ep, form)
  };
})();