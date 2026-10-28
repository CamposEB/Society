// /static/js/meta-picker.js
// Seletor de herói do formulário "Meta por rota" — mostra os retratos do
// catálogo (window.HERO_CATALOG) em uma grade buscável.
//
// Depende de: hero-catalog.js (window.HERO_CATALOG, window.HeroCatalog.routeImg).
// Expõe: window.MetaPicker.select(nome), .clear(), .current(), .refresh().
//
// O formulário é injetado por app.js depois do fetch de /static/views/meta.html,
// por isso o módulo se monta quando o DOM aparece (evento society-app-ready,
// troca de aba ou um poll curto de segurança).
(function () {
  'use strict';

  var ui = null;                 // referências do DOM
  var options = [];              // heróis na ordem exibida
  var active = -1;               // índice destacado pelo teclado
  var open = false;
  var mountTimer = null;
  var renderTimer = null;

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function norm(value) {
    return String(value || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function heroes() { return window.HERO_CATALOG || []; }

  function routeImg(url) {
    if (!url) return '';
    if (window.HeroCatalog && typeof window.HeroCatalog.routeImg === 'function') {
      return window.HeroCatalog.routeImg(url);
    }
    return url;
  }

  function heroImage(hero) {
    return hero ? routeImg(hero.file || hero.head || hero.wallpaper || '') : '';
  }

  function roleLabel(role) {
    return (window.HeroCatalog && window.HeroCatalog.roleLabel)
      ? window.HeroCatalog.roleLabel(role) : role;
  }

  function rolesText(hero) {
    return (hero && hero.roles && hero.roles.length)
      ? hero.roles.map(roleLabel).join(' / ') : '';
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    return parts.slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join('');
  }

  function findHero(name) {
    var n = norm(name);
    if (!n) return null;
    var list = heroes();
    for (var i = 0; i < list.length; i++) {
      if (norm(list[i].name) === n) return list[i];
    }
    return null;
  }

  // ───────────── render da grade de heróis ─────────────
  function optionNode(hero, index) {
    var button = el('button', 'hero-picker-option');
    button.type = 'button';
    button.id = 'metaHeroOption' + index;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');
    button.dataset.hero = hero.name;

    var thumb = el('span', 'hero-picker-thumb');
    var url = heroImage(hero);
    if (!url) {
      thumb.classList.add('is-empty');
      thumb.textContent = initials(hero.name);
    } else {
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = url;
      img.addEventListener('error', function () {
        thumb.classList.add('is-empty');
        thumb.textContent = initials(hero.name);
      }, { once: true });
      thumb.appendChild(img);
    }
    button.appendChild(thumb);

    var copy = el('span', 'hero-picker-copy');
    copy.appendChild(el('b', null, hero.name));
    var sub = [hero.tier ? 'Tier ' + hero.tier : '', rolesText(hero)].filter(Boolean).join(' · ');
    if (sub) copy.appendChild(el('small', null, sub));
    button.appendChild(copy);

    if (hero.tier) {
      var tier = el('span', 'hero-picker-tier', hero.tier);
      tier.dataset.tier = hero.tier;
      button.appendChild(tier);
    }

    button.addEventListener('click', function (event) {
      event.preventDefault();
      select(hero.name, true);
    });
    return button;
  }

  function renderOptions(query) {
    if (!ui) return;
    var q = norm(query);
    var list = heroes().slice();

    if (q) {
      list = list.filter(function (hero) {
        if (norm(hero.name).indexOf(q) !== -1) return true;
        return (hero.roles || []).some(function (role) {
          return norm(role).indexOf(q) !== -1 || norm(roleLabel(role)).indexOf(q) !== -1;
        });
      });
    }

    list.sort(function (a, b) {
      var an = norm(a.name), bn = norm(b.name);
      var ap = q && an.indexOf(q) === 0 ? 0 : 1;
      var bp = q && bn.indexOf(q) === 0 ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return an.localeCompare(bn, 'pt-BR');
    });

    options = list;
    active = -1;
    ui.input.removeAttribute('aria-activedescendant');

    var frag = document.createDocumentFragment();
    var count = el('p', 'hero-picker-count');
    count.textContent = list.length
      ? list.length + (list.length === 1 ? ' herói' : ' heróis') + ' · digite para filtrar'
      : '';
    if (count.textContent) frag.appendChild(count);

    if (!list.length) {
      frag.appendChild(el('p', 'hero-picker-empty',
        q ? 'Nenhum herói encontrado para “' + query.trim() + '”.' : 'Catálogo de heróis carregando…'));
    } else {
      list.forEach(function (hero, index) { frag.appendChild(optionNode(hero, index)); });
    }

    ui.list.replaceChildren(frag);
    if (open) ui.list.hidden = false;
    markSelected(ui.hidden.value);
  }

  function scheduleRender(query) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function () { renderOptions(query); }, 90);
  }

  // ───────────── estado de seleção ─────────────
  function showAvatar(hero) {
    if (!ui || !ui.avatar) return;
    var url = hero ? heroImage(hero) : '';
    ui.avatar.replaceChildren();
    if (!url) {
      ui.avatar.innerHTML = ui.defaultAvatar;
      return;
    }
    var img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', function () {
      ui.avatar.innerHTML = ui.defaultAvatar;
    }, { once: true });
    ui.avatar.appendChild(img);
  }

  function updateHint(hero) {
    if (!ui || !ui.hint) return;
    if (!hero) {
      ui.hint.textContent = heroes().length
        ? 'Escolha um herói do catálogo.'
        : 'Carregando o catálogo de heróis…';
      return;
    }
    var bits = [];
    if (hero.tier) bits.push('Tier ' + hero.tier);
    if (rolesText(hero)) bits.push(rolesText(hero));
    if (hero.win != null) bits.push(Number(hero.win).toFixed(1) + '% de win');
    ui.hint.textContent = bits.join(' · ') || ('Selecionado: ' + hero.name);
  }

  function markSelected(name) {
    if (!ui) return;
    var n = norm(name);
    ui.list.querySelectorAll('.hero-picker-option').forEach(function (node) {
      node.setAttribute('aria-selected', String(!!n && norm(node.dataset.hero) === n));
    });
  }

  function updatePreview() {
    if (!ui) return;
    var hero = findHero(ui.hidden.value);
    if (hero) {
      showAvatar(hero);
      updateHint(hero);
    } else {
      showAvatar(null);
      updateHint(null);
    }
    if (ui.clear) ui.clear.hidden = !ui.hidden.value;
  }

  function select(name, focus) {
    if (!ui && !mount()) return false;
    var hero = findHero(name);
    if (!hero) {
      // Catálogo ainda carregando: tenta de novo quando o índice chegar.
      if (!heroes().length && window.HERO_CATALOG_READY &&
          typeof window.HERO_CATALOG_READY.then === 'function') {
        window.HERO_CATALOG_READY.then(function () { select(name, focus); });
      }
      return false;
    }

    ui.hidden.value = hero.name;
    ui.input.value = hero.name;
    if (ui.clear) ui.clear.hidden = false;
    showAvatar(hero);
    updateHint(hero);
    markSelected(hero.name);
    closeList();
    if (focus) ui.input.focus();
    try {
      document.dispatchEvent(new CustomEvent('society:meta-hero', { detail: { name: hero.name } }));
    } catch (error) { /* navegador antigo: ignora */ }
    return true;
  }

  function clearSelection(focus) {
    if (!ui) return;
    ui.hidden.value = '';
    ui.input.value = '';
    if (ui.clear) ui.clear.hidden = true;
    showAvatar(null);
    updateHint(null);
    markSelected('');
    closeList();
    if (focus && ui.input) ui.input.focus();
  }

  function restoreInput() {
    if (!ui) return;
    ui.input.value = ui.hidden.value || '';
    updateHint(findHero(ui.hidden.value));
  }

  // ───────────── abrir/fechar e teclado ─────────────
  function positionList() {
    if (!ui) return;
    ui.list.classList.remove('is-above');
    var rect = ui.root.getBoundingClientRect();
    var below = window.innerHeight - rect.bottom;
    // perto do fim da tela: abre para cima para não ficar cortado
    if (below < 260 && rect.top > below) ui.list.classList.add('is-above');
  }

  function openList() {
    if (!ui) return;
    if (!ui.list.childElementCount) renderOptions(ui.input.value);
    open = true;
    ui.list.hidden = false;
    ui.input.setAttribute('aria-expanded', 'true');
    positionList();
  }

  function closeList() {
    if (!ui) return;
    open = false;
    ui.list.hidden = true;
    ui.input.setAttribute('aria-expanded', 'false');
    ui.input.removeAttribute('aria-activedescendant');
    active = -1;
    ui.list.querySelectorAll('.is-active').forEach(function (node) {
      node.classList.remove('is-active');
    });
  }

  function setActive(index) {
    if (!ui || !options.length) return;
    active = Math.max(0, Math.min(options.length - 1, index));
    var node = ui.list.querySelector('#metaHeroOption' + active);
    if (!node) return;
    ui.list.querySelectorAll('.is-active').forEach(function (other) {
      other.classList.remove('is-active');
    });
    node.classList.add('is-active');
    ui.input.setAttribute('aria-activedescendant', node.id);
    try { node.scrollIntoView({ block: 'nearest' }); } catch (error) { /* ignora */ }
  }

  function onKeyDown(event) {
    if (!ui) return;
    var key = event.key;

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { openList(); return; }
      setActive(active < 0
        ? (key === 'ArrowDown' ? 0 : options.length - 1)
        : active + (key === 'ArrowDown' ? 1 : -1));
      return;
    }

    if (key === 'Home' || key === 'End') {
      if (!open) return;
      event.preventDefault();
      setActive(key === 'Home' ? 0 : options.length - 1);
      return;
    }

    if (key === 'Enter') {
      if (!open) { openList(); return; }
      var pick = options[active] || (options.length === 1 ? options[0] : null) || findHero(ui.input.value);
      if (pick) {
        event.preventDefault();
        select(pick.name, true);
      }
      return;
    }

    if (key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      closeList();
      restoreInput();
      return;
    }

    if (key === 'Tab') closeList();
  }

  // ───────────── montagem ─────────────
  function mount() {
    if (ui) return true;

    var root = $('metaHeroPicker');
    var input = $('metaHeroSearch');
    var hidden = $('metaHero');
    var list = $('metaHeroList');
    if (!root || !input || !hidden || !list) return false;

    var avatar = $('metaHeroAvatar');
    ui = {
      root: root,
      input: input,
      hidden: hidden,
      list: list,
      clear: $('metaHeroClear'),
      avatar: avatar,
      hint: $('metaHeroHint'),
      form: $('metaForm'),
      defaultAvatar: avatar ? avatar.innerHTML : ''
    };

    input.addEventListener('focus', openList);
    input.addEventListener('click', openList);
    input.addEventListener('input', function () {
      if (hidden.value && norm(hidden.value) !== norm(input.value)) {
        hidden.value = '';
        if (ui.clear) ui.clear.hidden = true;
        showAvatar(null);
        updateHint(null);
      }
      scheduleRender(input.value);
      openList();
    });
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('blur', function () {
      setTimeout(function () {
        if (!ui || open || ui.hidden.value) return;
        var hero = findHero(ui.input.value);
        if (hero) select(hero.name, false);
      }, 120);
    });

    // clique fora fecha a grade
    document.addEventListener('pointerdown', function (event) {
      if (ui && !ui.root.contains(event.target)) closeList();
    }, true);

    if (ui.clear) {
      ui.clear.addEventListener('click', function (event) {
        event.preventDefault();
        clearSelection(true);
      });
    }

    if (ui.form) {
      ui.form.addEventListener('reset', function () {
        setTimeout(function () { clearSelection(false); }, 0);
      });
    }

    window.addEventListener('resize', function () {
      if (open) positionList();
    });

    if (!heroes().length) {
      if (window.HERO_CATALOG_READY && typeof window.HERO_CATALOG_READY.then === 'function') {
        window.HERO_CATALOG_READY.then(function () { if (ui) renderOptions(ui.input.value); });
      }
      window.addEventListener('hero-catalog-ready', function () {
        if (ui) renderOptions(ui.input.value);
      }, { once: true });
    }

    updatePreview();
    return true;
  }

  function boot() {
    if (mount()) {
      if (mountTimer) { clearInterval(mountTimer); mountTimer = null; }
      return;
    }
    if (mountTimer) return;
    var tries = 0;
    mountTimer = setInterval(function () {
      if (mount() || ++tries > 40) {
        clearInterval(mountTimer);
        mountTimer = null;
      }
    }, 250);
  }

  window.addEventListener('society-app-ready', boot);
  window.addEventListener('society:tab', function (event) {
    if (event && event.detail === 'meta') boot();
    else if (ui) {
      closeList();
      restoreInput();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.MetaPicker = {
    select: function (name) { return select(name, false); },
    clear: function () { clearSelection(false); },
    current: function () { return ui ? ui.hidden.value : ''; },
    refresh: function () { if (ui) renderOptions(ui.input.value); }
  };
  // Compatibilidade: app.js (Society.startMeta) usa este nome.
  window.MetaHeroPicker = window.MetaPicker;
})();
