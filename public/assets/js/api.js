const API = (() => {
  async function request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };

    if (body) opts.body = JSON.stringify(body);

    const res  = await fetch(`/api${endpoint}`, opts);

    if (res.status === 401) {
      window.__appRouter?.goLogin();
      throw new Error('Sessão expirada');
    }

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Erro desconhecido');
      // Preserva campos extras do corpo de erro (ex: `conflict` do 409 de
      // renumeração) pra quem chamou decidir o que fazer com eles.
      Object.assign(err, data);
      throw err;
    }
    return data;
  }

  async function upload(endpoint, formData) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData
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
    get:    ep       => request('GET',    ep),
    post:   (ep, b)  => request('POST',   ep, b),
    put:    (ep, b)  => request('PUT',    ep, b),
    patch:  (ep, b)  => request('PATCH',  ep, b),
    delete: ep       => request('DELETE', ep),
    upload: (ep, f)  => upload(ep, f)
  };
})();