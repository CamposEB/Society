/* Society MLBB (versão estática): meta, builds e home com as funções do app.js antigo.
   Este arquivo é a "casca" escrita à mão; o montar_site.py troca o marcador abaixo pelas
   funções extraídas do app.js e grava o resultado em docs/js/community-static.js. */
(function () {
  'use strict';

  // ---- o que o app.js pegava do servidor/estado, agora fixo ----
  const $ = id => document.getElementById(id);
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  let COMMUNITY_META = [], COMMUNITY_BUILDS = [], COMMUNITY_BUILDS_TRENDING = [], COMMUNITY_BUILDS_RECENT = [];
  let COMMUNITY_META_LANE = "all", COMMUNITY_SETUP_DONE = true;
  let BUILD_REQUEST_ID = 0, BUILD_LOAD_TIMER = null, BUILD_FILTER_TIMER = null;
  let BUILD_LIST_STATE = "ready", BUILD_DETAIL_ID = null, BUILD_LAST_KEY = "", BUILD_PENDING_KEY = "";
  let selectedBuildItems = [], selectedItemCategory = "all", HERO_REQUEST_SEQ = 0;
  let IS_GUEST = true, IS_ADMIN = false, IS_MODERATOR = false, IS_DEV = false, IS_VIP = false,
      IS_STREAMER = false, IS_BETA = false, SELF = null, ws = null, SHOP = {},
      ME = { coins: 0, owned: [], equip: {} };
  const aviso = msg => { if (window.SocietyToast) window.SocietyToast(msg); };
  const send = () => false;
  const guestPrompt = () => aviso('Avaliações estão desativadas nesta versão do site.');
  const showCommunityMessage = () => {};
  const showLfgToast = aviso;
  const tab = nome => { const p = (window.SOCIETY_PAGES || {})[nome]; if (p) location.href = p; else aviso('Esta seção chega em breve.'); };
  const openHeroPage = nome => { if (window.SocietyHero) window.SocietyHero.open(nome); };

  // ================= funções extraídas do app.js antigo =================
  /*__EXTRAIDO__*/
  // ======================================================================

  // ---- inicialização estática ----
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const lerJson = nome => fetch('data/' + nome, { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : [])).catch(() => []);
  const esconder = seletor => document.querySelectorAll(seletor).forEach(n => { n.hidden = true; n.style.display = 'none'; });

  function prepararBuild(b) {
    let itens = b.items;
    if (typeof itens === 'string') {
      try { itens = JSON.parse(itens); }
      catch (e) { itens = itens.split(',').map(s => s.trim()).filter(Boolean); }
    }
    const recente = Date.now() / 1000 - Number(b.created_at) <= 30 * 86400;
    return Object.assign({}, b, {
      items: Array.isArray(itens) ? itens : [],
      own: false, my_vote: 0,
      helpful_30d: recente ? Number(b.helpful || 0) : 0,
    });
  }

  const nota = b => Number(b.helpful || 0) - Number(b.not_helpful || 0);

  function ordenarListas(lista) {
    COMMUNITY_BUILDS_TRENDING = lista.slice().sort((a, b) => nota(b) - nota(a) || b.created_at - a.created_at);
    COMMUNITY_BUILDS_RECENT = lista.slice().sort((a, b) => b.created_at - a.created_at);
  }

  function filtrarBuilds(atualizarUrl) {
    const f = getBuildFilters();
    if (atualizarUrl) updateBuildUrl(f);
    const dias = { '7d': 7, '30d': 30, all: Infinity }[f.period] || 30;
    const agora = Date.now() / 1000;
    ordenarListas(COMMUNITY_BUILDS.filter(b =>
      (!f.hero || norm(b.hero).includes(norm(f.hero))) &&
      (!f.lane || b.lane === f.lane) &&
      agora - Number(b.created_at) <= dias * 86400));
    BUILD_LIST_STATE = 'ready';
    renderCommunityBuilds();
  }

  function tentar(nome, fn) {
    try { fn(); } catch (e) { console.error('[community-static] ' + nome + ':', e); }
  }

  function iniciar(metas, builds) {
    COMMUNITY_META = metas.map(m => Object.assign({ own: false, my_vote: 0 }, m));
    COMMUNITY_BUILDS = builds.map(prepararBuild);

    if ($('metaList')) {
      const painel = $('metaForm') && $('metaForm').closest('.community-game-panel');
      if (painel) { painel.hidden = true; painel.style.display = 'none'; }
      document.querySelectorAll('[data-meta-lane]').forEach(btn => btn.addEventListener('click', () => {
        COMMUNITY_META_LANE = btn.dataset.metaLane;
        tentar('meta', renderCommunityMeta);
      }));
      const pf = $('metaPatchFilter');
      if (pf) pf.addEventListener('change', () => tentar('meta', renderCommunityMeta));
      tentar('meta', renderCommunityMeta);
    }

    if ($('buildPopularList')) {
      esconder('#buildFormToggle, #buildFormPanel');
      tentar('url', loadBuildFiltersFromUrl);
      const form = $('buildFilters');
      if (form) form.addEventListener('submit', e => e.preventDefault());
      let t;
      $('buildHeroFilter').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => tentar('builds', () => filtrarBuilds(true)), 220); });
      ['buildLaneFilter', 'buildPeriodFilter', 'buildSortFilter'].forEach(id =>
        $(id).addEventListener('change', () => tentar('builds', () => filtrarBuilds(true))));
      tentar('builds', () => filtrarBuilds(false));
    }

    if ($('homeMetaLanes') || $('homeTierPreview') || $('homeBuildTrending')) {
      ordenarListas(COMMUNITY_BUILDS);
      tentar('home', renderHomeCommunityPreviews);
    }
  }

  Promise.all([window.HERO_CATALOG_READY || Promise.resolve(), lerJson('meta.json'), lerJson('builds.json')])
    .then(r => iniciar(r[1] || [], r[2] || []));
})();