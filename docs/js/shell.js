/* Society MLBB (versão estática): navegação */
(function () {
  'use strict';
  var PAGES = window.SOCIETY_PAGES || {};
  var ALIAS = { winrate: 'tools' };
  
  var timer;

  function toast(msg) {
    var t = document.getElementById('staticToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  window.SocietyToast = toast;

  function ir(chave) {
    var k = ALIAS[chave] || chave;
    if (PAGES[k]) location.href = PAGES[k];
    else toast('Esta seção chega em breve.');
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-shortcut]');
    if (!el) return;
    e.preventDefault();
    ir(el.getAttribute('data-shortcut'));
  });

  // Menu lateral no celular
  function menu(abrir) {
    document.body.classList.toggle('menu', abrir);
    ['menuBtn', 'mobileMore'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.setAttribute('aria-expanded', String(abrir));
    });
  }
  ['menuBtn', 'mobileMore'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', function () { menu(!document.body.classList.contains('menu')); });
  });
  ['menuClose', 'scrim'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', function () { menu(false); });
  });

  // Abrir Herói
  function abrirHeroi(nome) {
    if (!nome) return;
    var slug = (window.HeroOfficial && HeroOfficial.slugify)
      ? HeroOfficial.slugify(nome)
      : String(nome).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    location.href = (PAGES.hero || 'heroi.html') + '#' + slug;
  }
  window.SocietyHero = { open: abrirHeroi };
  window.Society = window.Society || {};
  window.Society.openHero = abrirHeroi;

})();