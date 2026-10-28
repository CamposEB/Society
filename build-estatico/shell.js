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

  // Controle do Menu Mobile
  function toggleMobileMenu(abrir) {
    document.body.classList.toggle('menu', abrir);
    ['menuBtn', 'mobileMore'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.setAttribute('aria-expanded', String(abrir));
    });
  }
  ['menuBtn', 'mobileMore'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', function () { toggleMobileMenu(!document.body.classList.contains('menu')); });
  });
  ['menuClose', 'scrim'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', function () { toggleMobileMenu(false); });
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

  // ---- SORTEADOR DE HERÓI (FUNÇÃO DO LOBBY) ----
  window.sortearHeroi = function() {
    var catalog = window.HERO_CATALOG || [];
    if (!catalog.length) {
      toast('O catálogo de heróis ainda está carregando...');
      return;
    }
    
    var hero = catalog[Math.floor(Math.random() * catalog.length)];
    
    // Cria um modal simples na tela
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;backdrop-filter:blur(4px);';
    
    var imgUrl = (window.HeroCatalog && window.HeroCatalog.imageUrl) ? window.HeroCatalog.imageUrl(hero) : '';
    
    modal.innerHTML = 
      '<div style="background:#151923;border:1px solid #e6c35c;border-radius:16px;padding:30px;max-width:400px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,0.5);">' +
        '<p style="color:#e6c35c;font-size:0.8rem;letter-spacing:0.1em;font-weight:bold;margin-bottom:20px;">🎲 O DESTINO ESCOLHEU</p>' +
        (imgUrl ? '<img src="' + imgUrl + '" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid #e6c35c;margin-bottom:15px;box-shadow:0 4px 12px rgba(230,195,92,0.3);">' : '') +
        '<h2 style="color:#fff;font-family:Rajdhani;font-size:2rem;margin:0 0 5px 0;text-transform:uppercase;">' + hero.name + '</h2>' +
        '<p style="color:#8a8a93;margin-bottom:25px;">' + (hero.roles && hero.roles.length ? hero.roles.map(r => HeroCatalog.roleLabel(r)).join(' / ') : 'Herói') + '</p>' +
        '<button id="btnSorteioAgain" style="background:#e6c35c;color:#000;border:none;border-radius:8px;padding:12px 24px;font-weight:bold;font-size:1rem;cursor:pointer;width:100%;margin-bottom:10px;">Sortear Novamente</button>' +
        '<button id="btnSorteioClose" style="background:transparent;color:#8a8a93;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:12px 24px;font-weight:bold;font-size:1rem;cursor:pointer;width:100%;">Fechar</button>' +
      '</div>';

    document.body.appendChild(modal);

    // Fecha ao clicar fora do card
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });

    // Botão fechar
    document.getElementById('btnSorteioClose').addEventListener('click', function() {
      modal.remove();
    });

    // Botão sortear novamente
    document.getElementById('btnSorteioAgain').addEventListener('click', function() {
      modal.remove();
      window.sortearHeroi(); // Chama a função recursivamente
    });
  };

  // BIND DO BOTÃO SORTEADOR NA HOME
  document.addEventListener('DOMContentLoaded', function() {
    var btnRandom = document.getElementById('btnRandomHero');
    if (btnRandom) {
      btnRandom.addEventListener('click', window.sortearHeroi);
    }
  });

  // ---- INJETAR BOTÃO DE ENCOLHER A SIDEBAR (Desktop) ----
  document.addEventListener('DOMContentLoaded', function() {
    var sidebarHeading = document.querySelector('.sidebar-heading');
    if (sidebarHeading && !document.getElementById('sidebarToggle')) {
      var btn = document.createElement('button');
      btn.id = 'sidebarToggle';
      btn.setAttribute('aria-label', 'Ocultar menu');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
      
      btn.addEventListener('click', function() {
        if (window.innerWidth > 900) {
          document.body.classList.add('sidebar-collapsed');
        }
      });
      
      sidebarHeading.appendChild(btn);
    }
  });

})();