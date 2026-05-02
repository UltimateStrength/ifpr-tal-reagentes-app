window.__page = (() => {
  function init() {
    // Esconde navbar ao entrar no sobre
    document.getElementById('bottom-nav').style.display = 'none';

    document.getElementById('about-back')
      ?.addEventListener('click', () => {
        // Mostra navbar ao voltar
        document.getElementById('bottom-nav').style.display = '';
        window.__appRouter.loadPage('menu');
      });
  }
  return { init };
})();