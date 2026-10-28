/* Society MLBB (versão estática): navegação e adaptações sem servidor */
(function () {
  'use strict';
  var PAGES = window.SOCIETY_PAGES || {};
  var ALIAS = { winrate: 'tools' };
  // Recursos que dependiam de servidor/conta e saíram nesta versão
  var REMOVIDOS = '[data-shortcut="lfg"],[data-shortcut="lobby"],[data-shortcut="tournaments"],' +
                  '[data-shortcut="dm"],[data-shortcut="quiz"],.home-event-section';
  var timer;

  function toast(msg) {
    var t = document.getElementById('staticToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'staticToast';
      t.className = 'static-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

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

  document.querySelectorAll(REMOVIDOS).forEach(function (n) { n.hidden = true; n.style.display = 'none'; });

  // hero-official.js chama isto ao clicar num herói dos matchups
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

  // Início: faixa "Bombando" a partir do catálogo; blocos ainda sem dados ficam "em breve"
  function preencherInicio() {
    var faixa = document.getElementById('homeTickerTrack');
    if (faixa) {
      var top = (window.HERO_CATALOG || [])
        .filter(function (h) { return typeof h.win === 'number'; })
        .sort(function (a, b) { return b.win - a.win; })
        .slice(0, 12);
      if (top.length) {
        faixa.replaceChildren();
        top.forEach(function (h) {
          var s = document.createElement('span');
          s.className = 'home-ticker-item';
          s.textContent = h.name + ' · ' + h.win.toFixed(1).replace('.', ',') + '% WR';
          faixa.appendChild(s);
        });
      }
    }
    ['homeTierPreview', 'homeBuildTrending', 'homeBuildRecent', 'homeMetaLanes'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n && !n.dataset.pronto) {
        n.dataset.pronto = '1';
        n.replaceChildren();
        var p = document.createElement('p');
        p.className = 'home-preview-empty';
        p.textContent = 'Em breve nesta versão do site.';
        n.appendChild(p);
      }
    });
  }
  window.addEventListener('hero-catalog-ready', preencherInicio);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preencherInicio);
  else preencherInicio();
})();