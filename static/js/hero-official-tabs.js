// /static/js/hero-official-tabs.js
// Conecta a camada OFICIAL (hero-official.js) ao sistema de abas do hero-hub.js.
//
// Estratégia:
//  1) Registra uma aba nova "Oficial" (order 5) que mostra TUDO em um só lugar.
//  2) Pluga o conteúdo oficial DENTRO das abas existentes via Hub.hooks.<id>Tab,
//     que o hero-tabs.js chama antes do conteúdo da comunidade.
//
// Depende de: hero-hub.js (window.HeroHub), hero-tabs.js (fornece os hooks),
//             hero-official.js (window.HeroOfficial).
//
// CHANGELOG
//   2026-10-13  Estado de erro visível + botão "Tentar novamente".
//               setInterval(500ms) trocado por MutationObserver no #heroCrumb.
//               Não chama Hub.rerender() quando o render só redesenhou a UI
//               por causa de um fetch que voltou (evita loop com hero-contrib).
(function () {
  'use strict';

  if (!window.HeroHub || !window.HeroOfficial) {
    console.warn('[hero-official-tabs] HeroHub ou HeroOfficial ausentes.');
    return;
  }

  var Hub = window.HeroHub;
  var HO  = window.HeroOfficial;
  var U   = Hub.ui;
  var cur = function () { return Hub.current(); };

  // ─── Helpers de "wrapper de seção oficial" ───
  function officialBlock(titulo, node) {
    if (!node) return null;
    var wrap = U.el('div', null, 'ho-official-block');
    var head = U.el('div', null, 'ho-official-head');
    head.appendChild(U.el('span', 'OFICIAL', 'ho-badge'));
    head.appendChild(U.el('small', titulo, 'ho-source'));
    wrap.appendChild(head);
    wrap.appendChild(node);
    return wrap;
  }

  // Bloco de estado exibido quando o herói não carrega (ex.: 404 no JSON).
  function errorBlock(name) {
    var box = U.el('div', null, 'hc-status');
    box.appendChild(U.el('b', 'Dados oficiais indisponíveis para ' + name));
    box.appendChild(U.el('p',
      'O arquivo deste herói não está no servidor (ou o formato está diferente do esperado). ' +
      'Verifique se /static/data/official/' + HO.slugify(name) + '.json existe.'));
    var btn = U.el('button', 'Tentar novamente', 'hh-cta');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      HO.clearFailed(name);
      ensureLoaded(name, true);
    });
    box.appendChild(btn);
    return box;
  }

  // ─── Carrega dados do herói atual e rerenderiza ───
  var loading = {};   // name → true (dedupe local)
  function ensureLoaded(name, force) {
    if (!name) return;
    if (!force) {
      var st = HO.heroStatus(name);
      if (st === 'ready' || st === 'loading' || st === 'failed') return;
    }
    if (loading[name]) return;

    loading[name] = true;
    HO.loadHeroByName(name, force).then(function () {
      delete loading[name];
      // Só re-renderiza se o usuário ainda está no herói que terminou de carregar.
      if (cur().name === name) Hub.rerender();
    }).catch(function (err) {
      delete loading[name];
      // 404 é esperado quando o herói ainda não foi exportado — não é bug.
      // O estado de erro é mostrado em renderOficialTab / hooks abaixo.
      console.warn('[hero-official-tabs] falha ao carregar', name, err && err.message ? err.message : err);
      // Re-renderiza para o errorBlock aparecer.
      if (cur().name === name) Hub.rerender();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HOOKS — plugados dentro das abas existentes do hero-tabs.js
  // ═══════════════════════════════════════════════════════════════
  // hero-tabs.js chama, em cada render de aba, os hooks "tab_<id>".
  // Cada hook é uma função(name) que devolve um Node (ou null).
  // ═══════════════════════════════════════════════════════════════

  function makeHook(titulo, pick) {
    return function (name) {
      ensureLoaded(name);
      var d = HO.getHeroSync(name);
      if (!d) return null;
      return officialBlock(titulo, pick(d));
    };
  }

  Hub.hooks.tab_skills = Hub.hooks.tab_skills || [];
  Hub.hooks.tab_skills.push(makeHook('Skills direto do servidor oficial', HO.renderSkills));

  Hub.hooks.tab_matchups = Hub.hooks.tab_matchups || [];
  Hub.hooks.tab_matchups.push(makeHook('Matchups por rank alto', HO.renderCounters));

  Hub.hooks.tab_skins = Hub.hooks.tab_skins || [];
  Hub.hooks.tab_skins.push(makeHook('Skins oficiais · catálogo Moonton', HO.renderSkins));

  Hub.hooks.tab_lore = Hub.hooks.tab_lore || [];
  Hub.hooks.tab_lore.push(makeHook('Lore oficial', HO.renderLore));

  Hub.hooks.tab_stats = Hub.hooks.tab_stats || [];
  Hub.hooks.tab_stats.push(makeHook('Stats · win/pick/ban + duos', HO.renderStats));

  // ═══════════════════════════════════════════════════════════════
  // ABA "Oficial" — visão consolidada
  // ═══════════════════════════════════════════════════════════════
  function renderOficialTab(panel) {
    var name = cur().name;
    if (!name) {
      panel.appendChild(U.el('p', 'Selecione um herói.', 'hc-muted'));
      return;
    }

    var d = HO.getHeroSync(name);
    if (d) {
      panel.appendChild(HO.renderSections(d));
      return;
    }

    ensureLoaded(name);

    var st = HO.heroStatus(name);
    if (st === 'failed') {
      panel.appendChild(errorBlock(name));
    } else {
      panel.appendChild(U.el('p', 'Carregando dados oficiais…', 'hc-muted'));
    }
  }

  // Registra a aba com order baixo pra ficar perto do início.
  Hub.register({
    id: 'oficial',
    order: 5,
    label: 'Oficial',
    render: renderOficialTab
  });

  // ═══════════════════════════════════════════════════════════════
  // Detecção de troca de herói
  // ═══════════════════════════════════════════════════════════════
  // O hero-hub.js atualiza #heroCrumb.textContent com o nome do herói
  // em cada renderBanner. Observamos esse nó em vez de fazer polling.
  function watchHeroCrumb() {
    var crumb = document.getElementById('heroCrumb');
    if (!crumb) {
      // hero-hub.js ainda pode não ter montado o DOM. Tenta de novo.
      setTimeout(watchHeroCrumb, 400);
      return;
    }

    var last = (crumb.textContent || '').trim();
    if (last) ensureLoaded(last);

    var obs = new MutationObserver(function () {
      var n = (crumb.textContent || '').trim();
      if (n && n !== last) {
        last = n;
        ensureLoaded(n);
      }
    });
    obs.observe(crumb, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchHeroCrumb, { once: true });
  } else {
    watchHeroCrumb();
  }

  // Quando o usuário abre a aba "herói", pré-carrega o herói atual.
  window.addEventListener('society:tab', function (ev) {
    if (ev.detail === 'hero') ensureLoaded(cur().name);
  });
})();