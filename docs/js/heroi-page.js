/* Página de um herói: usa as funções de render do hero-official.js */
(function () {
  'use strict';
  var root = document.getElementById('heroPage');
  if (!root) return;

  function slugAtual() {
    var h = decodeURIComponent(location.hash || '').replace(/^#\/?(heroi\/)?/, '').trim();
    return h || new URLSearchParams(location.search).get('h') || '';
  }

  function aviso(texto) {
    root.replaceChildren();
    var p = document.createElement('p');
    p.className = 'hc-empty';
    p.textContent = texto;
    root.appendChild(p);
    var a = document.createElement('a');
    a.href = 'herois.html';
    a.textContent = '← Ver todos os heróis';
    root.appendChild(a);
  }

  function mostrar() {
    var slug = slugAtual();
    if (!slug) return aviso('Escolha um herói no catálogo.');
    root.replaceChildren();
    root.appendChild(HeroOfficial.el('p', 'Carregando herói...', 'hc-empty'));

    HeroOfficial.loadHero(slug).catch(function () {
      return HeroOfficial.loadHeroByName(slug);
    }).then(function (d) {
      root.replaceChildren();
      var voltar = document.createElement('a');
      voltar.href = 'herois.html';
      voltar.textContent = '← Heróis';
      voltar.className = 'hero-back';
      root.appendChild(voltar);
      root.appendChild(HeroOfficial.renderHeader(d));
      root.appendChild(HeroOfficial.renderSections(d));
      if (d.hero && d.hero.name) document.title = d.hero.name + ' · Society MLBB';
    }).catch(function () {
      aviso('Não encontramos esse herói.');
    });
  }

  window.addEventListener('hashchange', mostrar);
  mostrar();
})();