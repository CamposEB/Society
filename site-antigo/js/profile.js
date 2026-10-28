/* Reusable profile presentation and editor interactions.
   v24 — correção de acesso a molduras/temas + catálogos v26/v27
   • options dos <select> são garantidas pelo JS (HTML e catálogo nunca dessincronizam)
   • mensagem de acesso negado indica o cargo exigido + diagnóstico no console
   • prévia do editor acompanha o tema escolhido
*/
(() => {
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  const MAX_AVATAR_DATA_LENGTH = 120000;
  const MAX_BANNER_DATA_LENGTH = 350000;
  const MAX_STREAM_URL_LENGTH = 200;

  const ELOS_DIR = "/static/assets/";
  const HERO_IMAGE_DIR = "/static/img/icons/herois/";
  const defaultAccent = () =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();

  const RANK_FILE_SUFFIXES = [
    "-png-ml.png", "-png-ml.webp", "-png-ml.jpg",
    ".png-ml.png", ".png-ml.webp", ".png-ml.jpg",
    ".png", ".webp", ".jpg", ".jpeg", ".svg",
  ];
  const RANK_OPTIONS = [
    { value:"Guerreiro", label:"Guerreiro", bases:["logo-icon-rank-warrior"] },
    { value:"Elite", label:"Elite", bases:["logo-icon-rank-elite"] },
    { value:"Mestre", label:"Mestre", bases:["logo-icon-rank-master"] },
    { value:"Grande Mestre", label:"Grande Mestre", bases:["logo-icon-rank-grandmaster","logo-icon-rankgrandmaster"] },
    { value:"Épico", label:"Épico", bases:["logo-icon-rank-epic"] },
    { value:"Lenda", label:"Lenda", bases:["logo-icon-rank-legend"] },
    { value:"Mítico", label:"Mítico", bases:["logo-icon-rank-mythic"] },
    { value:"Honra Mítica", label:"Honra Mítica", bases:["logo-icon-rank-mythical-honor"] },
    { value:"Glória Mítica", label:"Glória Mítica", bases:["logo-icon-rank-mythical-glory"] },
    { value:"Imortal", label:"Imortal", bases:["logo-icon-rank-immortal"] },
  ];
  const RANK_ALIASES = [
    { bases:["logo-icon-rank-mythical-glory"], aliases:["glória mítica","gloria mitica","mítico glorioso","mitico glorioso","mythical glory","glorioso"] },
    { bases:["logo-icon-rank-mythical-honor"], aliases:["honra mítica","honra mitica","mítico honrado","mitico honrado","mythical honor","honrado"] },
    { bases:["logo-icon-rank-immortal"], aliases:["imortal","immortal"] },
    { bases:["logo-icon-rank-grandmaster","logo-icon-rankgrandmaster"], aliases:["grandemestre","grande mestre","grão-mestre","grao-mestre","grão mestre","grao mestre","grandmaster","grand master"] },
    { bases:["logo-icon-rank-mythic"], aliases:["mítico","mitico","mythic"] },
    { bases:["logo-icon-rank-legend"], aliases:["lenda","legend"] },
    { bases:["logo-icon-rank-master"], aliases:["mestre","master"] },
    { bases:["logo-icon-rank-epic"], aliases:["épico","epico","epic"] },
    { bases:["logo-icon-rank-elite"], aliases:["elite"] },
    { bases:["logo-icon-rank-warrior"], aliases:["guerreiro","warrior"] },
  ];
  const AVATAR_SHAPES = new Set(["round","squircle","square"]);

  /* ═══ CATÁLOGOS ═══ */
  const ROLE_LABELS = { dev:"Dev", admin:"Admin", mod:"Moderador", vip:"VIP", streamer:"Streamer", beta:"Beta" };
  const ROLE_ORDER = ["vip","beta","streamer","mod","admin","dev"];

  const FRAME_CATALOG = [
    { value:"default", label:"Clássica",   tier:"free" },
    { value:"elite",   label:"Elite",      tier:"free" },
    { value:"shadow",  label:"Sombra",     tier:"free" },
    { value:"obsidian",label:"Obsidiana",  tier:"free" },
    { value:"ice",     label:"Gelo",       tier:"free" },
    { value:"frost",   label:"Geada",      tier:"free" },
    { value:"neon",    label:"Neon",       tier:"free" },
    { value:"holo",    label:"Holo",       tier:"free" },
    { value:"gold",    label:"Ouro",       tier:"vip" },
    { value:"platinum",label:"Platina",    tier:"vip" },
    { value:"royal",   label:"Real",       tier:"vip" },
    { value:"celestial",label:"Celestial", tier:"vip" },
    { value:"dragon",  label:"Dragão",     tier:"vip" },
    { value:"rainbow", label:"Arco-íris",  tier:"vip" },
    { value:"sun",     label:"Sol",        tier:"vip" },
    { value:"sakura",  label:"Sakura",     tier:"vip" },
    { value:"emerald", label:"Esmeralda",  tier:"vip" },
    { value:"toxic",   label:"Tóxica",     tier:"vip" },
    { value:"blood",   label:"Sangue",     tier:"vip" },
    { value:"crimson", label:"Carmesim",   tier:"vip" },
    { value:"fire",    label:"Fogo",       tier:"vip" },
    { value:"lightning", label:"Raio",     tier:"streamer" },
    { value:"live-pulse",label:"Live",     tier:"streamer" },
    { value:"beta-circuit",   label:"Circuito",  tier:"beta" },
    { value:"beta-construct", label:"Construto", tier:"beta" },
    { value:"guardian",label:"Guardião",   tier:"mod" },
    { value:"crown",   label:"Coroa",      tier:"admin" },
    { value:"void",    label:"Vazio",      tier:"dev" },
    { value:"plasma",  label:"Plasma",     tier:"dev" },
    { value:"galaxy",  label:"Galáxia",    tier:"dev" },
  ];

  const THEME_CATALOG = [
    { value:"classic", label:"Clássico",   tier:"free" },
    { value:"arena",   label:"Arena",      tier:"free" },
    { value:"ocean",   label:"Oceano",     tier:"free" },
    { value:"aurora",  label:"Aurora",     tier:"free" },
    { value:"sunset",  label:"Pôr do sol", tier:"free" },
    { value:"forest",  label:"Floresta",   tier:"free" },
    { value:"sakura",  label:"Sakura",     tier:"free" },
    { value:"cyber",   label:"Cyber",      tier:"free" },
    { value:"mythic",  label:"Mítico",     tier:"free" },
    { value:"mono",    label:"Mono",       tier:"free" },
    { value:"galaxy",  label:"Galáxia",    tier:"vip" },
    { value:"volcanic",label:"Vulcânico",  tier:"vip" },
    { value:"arctic",  label:"Ártico",     tier:"vip" },
    { value:"desert",  label:"Deserto",    tier:"vip" },
    { value:"eclipse", label:"Eclipse",    tier:"vip" },
    { value:"royal",   label:"Real",       tier:"vip" },
    { value:"neon",    label:"Neon",       tier:"vip" },
    { value:"matrix",  label:"Matrix",     tier:"beta" },
    { value:"livestream", label:"Live",    tier:"streamer" },
    { value:"sentinel",label:"Sentinela",  tier:"mod" },
    { value:"throne",  label:"Trono",      tier:"admin" },
    { value:"toxic",   label:"Tóxico",     tier:"dev" },
    { value:"candy",   label:"Doce",       tier:"dev" },
  ];

  // ═══ EXPANSÃO v26 + v27 (molduras e temas) ═══
  // ─────── v26: NOVAS MOLDURAS ───────
  // free
  FRAME_CATALOG.push(
    { value:"lava", label:"Lava", tier:"free" },
    { value:"tsunami", label:"Tsunami", tier:"free" },
    { value:"rocha", label:"Rocha", tier:"free" },
    { value:"vendaval", label:"Vendaval", tier:"free" },
    { value:"aco-escovado", label:"Aço Escovado", tier:"free" },
    { value:"cobre", label:"Cobre", tier:"free" },
    { value:"folha", label:"Veias de Folha", tier:"free" },
    { value:"ambar", label:"Âmbar", tier:"free" },
    { value:"perigo", label:"Perigo", tier:"free" },
    { value:"vhs", label:"VHS", tier:"free" },
    { value:"arcade", label:"Arcade", tier:"free" },
    { value:"monolito", label:"Monolito", tier:"free" }
  );
  // vip
  FRAME_CATALOG.push(
    { value:"nebula", label:"Nebulosa", tier:"vip" },
    { value:"cometa", label:"Cometa", tier:"vip" },
    { value:"buraco-negro", label:"Buraco Negro", tier:"vip" },
    { value:"supernova", label:"Supernova", tier:"vip" },
    { value:"titanio", label:"Titânio", tier:"vip" },
    { value:"ouro-branco", label:"Ouro Branco", tier:"vip" },
    { value:"coral", label:"Coral", tier:"vip" },
    { value:"madeira", label:"Madeira", tier:"vip" },
    { value:"farao", label:"Faraó", tier:"vip" },
    { value:"sakura-veil", label:"Véu de Sakura", tier:"vip" },
    { value:"asteca", label:"Asteca", tier:"vip" },
    { value:"runas", label:"Runas Nórdicas", tier:"vip" },
    { value:"arabesco", label:"Arabesco", tier:"vip" },
    { value:"holograma", label:"Holograma", tier:"vip" },
    { value:"campeao", label:"Campeão", tier:"vip" }
  );
  // beta
  FRAME_CATALOG.push(
    { value:"cartucho", label:"Cartucho", tier:"beta" },
    { value:"disquete", label:"Disquete", tier:"beta" },
    { value:"fluxo-de-dados", label:"Fluxo de Dados", tier:"beta" },
    { value:"colecionador", label:"Colecionador", tier:"beta" }
  );
  // streamer
  FRAME_CATALOG.push(
    { value:"epico", label:"Épico", tier:"streamer" },
    { value:"chroma-key", label:"Chroma Key", tier:"streamer" },
    { value:"holofote", label:"Holofote", tier:"streamer" }
  );
  // mod
  FRAME_CATALOG.push(
    { value:"aegis", label:"Égide", tier:"mod" },
    { value:"veredito", label:"Veredito", tier:"mod" }
  );
  // admin
  FRAME_CATALOG.push(
    { value:"lendario", label:"Lendário", tier:"admin" },
    { value:"soberano", label:"Soberano", tier:"admin" }
  );
  // dev
  FRAME_CATALOG.push(
    { value:"portal", label:"Portal", tier:"dev" },
    { value:"glitch-rgb", label:"Glitch RGB", tier:"dev" }
  );

  // ─────── v26: NOVAS TEMAS ───────
  // free
  THEME_CATALOG.push(
    { value:"tempestade", label:"Tempestade", tier:"free" },
    { value:"tundra", label:"Tundra", tier:"free" },
    { value:"selva", label:"Selva", tier:"free" },
    { value:"savana", label:"Savana", tier:"free" },
    { value:"caverna", label:"Caverna", tier:"free" },
    { value:"marmore", label:"Mármore", tier:"free" },
    { value:"concreto", label:"Concreto", tier:"free" },
    { value:"fliperama", label:"Fliperama", tier:"free" },
    { value:"calmaria", label:"Calmaria", tier:"free" },
    { value:"rio", label:"Rio de Janeiro", tier:"free" }
  );
  // vip
  THEME_CATALOG.push(
    { value:"furia", label:"Fúria", tier:"vip" },
    { value:"euforia", label:"Euforia", tier:"vip" },
    { value:"medieval", label:"Medieval", tier:"vip" },
    { value:"art-deco", label:"Anos 20", tier:"vip" },
    { value:"toquio-noturno", label:"Tóquio Noturna", tier:"vip" },
    { value:"nova-york", label:"Nova York", tier:"vip" },
    { value:"veneza", label:"Veneza", tier:"vip" },
    { value:"cairo", label:"Cairo", tier:"vip" },
    { value:"feerico", label:"Feérico", tier:"vip" },
    { value:"angelical", label:"Angelical", tier:"vip" },
    { value:"abissal", label:"Abissal", tier:"vip" },
    { value:"veludo", label:"Veludo", tier:"vip" }
  );
  // beta
  THEME_CATALOG.push(
    { value:"onirico", label:"Onírico", tier:"beta" },
    { value:"saudade", label:"Saudade", tier:"beta" },
    { value:"rpg-antigo", label:"RPG Antigo", tier:"beta" }
  );
  // streamer
  THEME_CATALOG.push(
    { value:"battle-royale", label:"Battle Royale", tier:"streamer" },
    { value:"fliperama-neon", label:"Fliperama Neon", tier:"streamer" }
  );
  // mod
  THEME_CATALOG.push(
    { value:"fps-tatico", label:"FPS Tático", tier:"mod" }
  );
  // admin
  THEME_CATALOG.push(
    { value:"demoniaco", label:"Demoníaco", tier:"admin" }
  );
  // dev
  THEME_CATALOG.push(
    { value:"glitch", label:"Glitch", tier:"dev" }
  );

  // ─────── v27: MOLDURAS DE PARTÍCULAS ───────
  // free
  FRAME_CATALOG.push(
    { value:"nevasca", label:"Nevasca", tier:"free" },
    { value:"bolhas", label:"Bolhas", tier:"free" },
    { value:"vagalumes", label:"Vaga-lumes", tier:"free" }
  );
  // vip
  FRAME_CATALOG.push(
    { value:"brasas", label:"Brasas", tier:"vip" },
    { value:"outono", label:"Outono", tier:"vip" },
    { value:"chuva-estelar", label:"Chuva Estelar", tier:"vip" },
    { value:"rosas", label:"Pétalas de Rosa", tier:"vip" },
    { value:"confete", label:"Confete", tier:"vip" }
  );
  // beta
  FRAME_CATALOG.push(
    { value:"chuva-de-codigo", label:"Chuva de Código", tier:"beta" }
  );
  // streamer
  FRAME_CATALOG.push(
    { value:"chuva-de-moedas", label:"Chuva de Moedas", tier:"streamer" }
  );
  // admin
  FRAME_CATALOG.push(
    { value:"poeira-de-ouro", label:"Poeira de Ouro", tier:"admin" }
  );
  // dev
  FRAME_CATALOG.push(
    { value:"chuva-glitch", label:"Chuva Glitch", tier:"dev" }
  );

  const ROLE_IMAGE_DIR = "/static/assets/rotas/";
  const ROLE_CATALOG = [
    { value:"Qualquer",  label:"Qualquer",  icon:"" },
    { value:"Jungle",    label:"Selva",     icon:"selva.jpg" },
    { value:"Mid",       label:"Mid",       icon:"mid.jpg" },
    { value:"Gold lane", label:"Gold",      icon:"gold.jpg" },
    { value:"EXP lane",  label:"EXP",       icon:"exp.jpg" },
    { value:"Roam",      label:"Roam",      icon:"roam.jpg" },
  ];
  function roleImageUrl(item) {
    if (!item || !item.icon) return "";
    return ROLE_IMAGE_DIR + item.icon;
  }
  /* [v11] — atalho: dado o value da rota ("Mid", "Roam", …), devolve a URL da imagem. */
  function roleImageFor(value) {
    if (!value) return "";
    const item = ROLE_CATALOG.find(r => r.value === value);
    return item ? roleImageUrl(item) : "";
  }

  const TIER_ACCESS = {
    free:     null,
    vip:      ["vip","beta","streamer","mod","admin","dev"],
    beta:     ["beta","mod","admin","dev"],
    streamer: ["streamer","mod","admin","dev"],
    mod:      ["mod","admin","dev"],
    admin:    ["admin","dev"],
    dev:      ["dev"],
  };

  // ─────────────────────────────────────────────────────────
  // HELPERS BÁSICOS
  // ─────────────────────────────────────────────────────────
  function normalizeRank(v) {
    return String(v || "").toLocaleLowerCase("pt-BR").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").trim();
  }
  const MYTHIC_PLUS_KEYS = new Set(["mitico","honra mitica","gloria mitica","imortal"]);
  const isMythicPlusRank = r => MYTHIC_PLUS_KEYS.has(normalizeRank(r));
  const rankFromMythicStars = s => s >= 100 ? "Imortal" : s >= 50 ? "Glória Mítica" : s >= 25 ? "Honra Mítica" : "Mítico";
  function parseStarsValue(v) {
    const raw = String(v ?? "").trim();
    if (raw === "") return null;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.min(n, 9999);
  }
  const profileStars = d => (!d || !isMythicPlusRank(d.rank)) ? null : parseStarsValue(d.stars);
  function rankBasesFor(rank) {
    const n = normalizeRank(rank);
    if (!n) return [];
    const exact = RANK_OPTIONS.find(o => normalizeRank(o.value) === n);
    if (exact) return [...exact.bases];
    for (const e of RANK_ALIASES) for (const a of e.aliases) {
      const k = normalizeRank(a);
      if (k && n.includes(k)) return [...e.bases];
    }
    return [];
  }
  function rankImageCandidatesFromBases(bases) {
    if (!Array.isArray(bases) || !bases.length) return [];
    const urls = [];
    for (const b of bases) {
      const c = String(b).replace(/(-png-ml)?(\.[a-z0-9]+)?$/i, "");
      for (const s of RANK_FILE_SUFFIXES) urls.push(ELOS_DIR + encodeURIComponent(c + s));
    }
    return urls;
  }
  const rankCandidatesForRank = r => rankImageCandidatesFromBases(rankBasesFor(r));
  function heroIconFile(name) {
    const cat = Array.isArray(window.HERO_CATALOG) ? window.HERO_CATALOG : [];
    if (!name || !cat.length) return "";
    const low = String(name).toLocaleLowerCase("pt-BR").trim();
    const h = cat.find(x => String(x.name || "").toLocaleLowerCase("pt-BR").trim() === low);
    return h && h.file ? h.file : "";
  }
  function heroImageUrl(name) {
    const f = heroIconFile(name);
    if (!f) return "";
    if (window.HeroCatalog && window.HeroCatalog.routeImg) return window.HeroCatalog.routeImg(f);
    if (/^(?:https?:)?\/\//i.test(f) || f.charAt(0) === "/") return f;
    return HERO_IMAGE_DIR + f;
  }

  // ─────────────────────────────────────────────────────────
  // ESTADO
  // ─────────────────────────────────────────────────────────
  let context = null;
  let draftAvatar = "";
  let draftBanner = "";
  let profile = {};
  let selfProfile = null;
  let currentMode = "self";
  let currentUserId = null;
  let pendingStreamUrl = null;

  const node = (t, txt, cls) => {
    const el = document.createElement(t);
    if (txt != null) el.textContent = txt;
    if (cls) el.className = cls;
    return el;
  };
  const safe = id => document.getElementById(id);
  const setText   = (id,v) => { const e=safe(id); if(e) e.textContent = v; };
  const setHidden = (id,h) => { const e=safe(id); if(e) e.hidden = Boolean(h); };
  const setChecked= (id,c) => { const e=safe(id); if(e) e.checked = Boolean(c); };
  const setVal    = (id,v) => { const e=safe(id); if(e) e.value = v; };

  function initials(name, username) {
    const s = (name || username || "?").trim();
    return s.slice(0,1).toLocaleUpperCase("pt-BR") || "?";
  }
  function createAvatar(data, className) {
    const w = node("span", null, className || "user-avatar");
    const n = data.display_name || data.display || data.username || data.nick || "Jogador";
    const img = data.avatar || "";
    w.setAttribute("role","img");
    w.setAttribute("aria-label","Foto de perfil de " + n);
    if (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(img) && img.length <= MAX_AVATAR_DATA_LENGTH) {
      const p = node("img"); p.src = img; p.alt=""; p.loading="lazy"; w.append(p);
    } else w.textContent = initials(n, data.username || data.nick);
    return w;
  }
  function setAvatar(container, data, className) {
    if (!container) return;
    const a = createAvatar(data, className || container.className);
    container.replaceChildren(...a.childNodes);
    container.setAttribute("role","img");
    container.setAttribute("aria-label", a.getAttribute("aria-label"));
    container.classList.toggle("has-photo", Boolean(data.avatar));
  }
  function applyBanner(container, image) {
    if (!container) return;
    const ok = image && image.length <= MAX_BANNER_DATA_LENGTH;
    container.style.backgroundImage = ok
      ? 'linear-gradient(180deg, rgba(var(--bg-rgb), .08), rgba(var(--bg-rgb), .72)), url("' + image + '")'
      : "";
    container.classList.toggle("has-banner", Boolean(ok));
  }
  function applyAccent(el, accentFromData) {
    if (!el) return;
    const a = String(accentFromData || "").trim();
    if (a) el.style.setProperty("--user-accent", a);
    else el.style.removeProperty("--user-accent");
  }
  function applyAvatarShape(shape) {
    const s = String(shape || "round").toLowerCase();
    const v = AVATAR_SHAPES.has(s) ? s : "round";
    document.documentElement.dataset.avatarShape = v;
    return v;
  }

  /* Molduras/formas do perfil também no avatar do topbar (home) e da sidebar. */
  function applySidebarAvatarChrome(data) {
    const avatar = safe("sidebarAvatar");
    if (!avatar) return;
    const frame = isFrameAllowed(data && data.frame) ? ((data && data.frame) || "default") : "default";
    avatar.dataset.frame = frame;
    avatar.classList.toggle("has-custom-frame", frame !== "default");
    if (data && data.accent) avatar.style.setProperty("--profile-accent", data.accent);
    else avatar.style.removeProperty("--profile-accent");

    const nav = safe("profileNavAvatar");
    if (nav) {
      nav.dataset.frame = frame;
      nav.classList.toggle("has-custom-frame", frame !== "default");
      if (data && data.accent) nav.style.setProperty("--profile-accent", data.accent);
      else nav.style.removeProperty("--profile-accent");
    }
  }
  function looksLikeSameName(a, b) {
    const clean = s => String(s||"").toLocaleLowerCase("pt-BR").normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/^@+/,"").replace(/[^a-z0-9]/g,"");
    const ca = clean(a), cb = clean(b);
    return !!ca && !!cb && ca === cb;
  }

  // ─────────────────────────────────────────────────────────
  // SELOS
  // ─────────────────────────────────────────────────────────
  const BADGE_DEFS = {
    staff: { color:"#f2b84b",
      label:{dev:"DEV verificado", admin:"Administrador verificado", mod:"Moderador verificado"},
      defaultLabel:"Equipe verificada",
      svg:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M21.71 20.29l-6.88-6.88a6.5 6.5 0 0 0-7.9-7.9l3.19 3.19-2.83 2.83-3.19-3.19a6.5 6.5 0 0 0 7.9 7.9l6.88 6.88a1 1 0 0 0 1.41 0l1.42-1.42a1 1 0 0 0 0-1.41z"/><circle cx="6.5" cy="17.5" r="1.5"/></svg>' },
    vip: { color:"#4c8dff", label:{vip:"VIP verificado"}, defaultLabel:"Conta verificada",
      svg:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 1.5l2.85 2.28 3.57-.33 1.07 3.43 3.18 1.62-1.13 3.4 1.13 3.4-3.18 1.62-1.07 3.43-3.57-.33L12 22.5l-2.85-2.28-3.57.33-1.07-3.43-3.18-1.62 1.13-3.4-1.13-3.4 3.18-1.62 1.07-3.43 3.57.33L12 1.5zm-1.4 14.3l6.1-6.1-1.5-1.5-4.6 4.6-2.1-2.1-1.5 1.5 3.6 3.6z"/></svg>' },
    streamer: { color:"#ff0000", label:{streamer:"Streamer"}, defaultLabel:"Streamer",
      svg:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-5.8 31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z"/></svg>' },
    beta: { color:"#ff9d2e", label:{beta:"Beta Tester"}, defaultLabel:"Beta Tester", emoji:"🚧" },
  };
  const ROLE_TO_BADGE = { dev:"staff", admin:"staff", mod:"staff", vip:"vip", streamer:"streamer", beta:"beta" };

  function rolesFromProfile(data) {
    if (!data) return [];
    const out = new Set();
    const push = (raw) => {
      if (!raw) return;
      let k = String(raw).toLocaleLowerCase("pt-BR").trim();
      if (!k) return;
      if (k === "moderador" || k === "moderator" || k === "moderação" || k === "moderacao") k = "mod";
      else if (k === "administrador" || k === "administrator") k = "admin";
      else if (k === "desenvolvedor" || k === "developer") k = "dev";
      else if (k === "beta tester" || k === "betatester" || k === "tester") k = "beta";
      if (ROLE_TO_BADGE[k]) out.add(k);
      else if (k === "membro" || k === "member" || k === "user" || k === "usuário" || k === "usuario") out.add("membro");
    };
    push(data.role);
    [data.community_roles, data.communityRoles, data.roles, data.cargos].forEach(l => {
      if (Array.isArray(l)) l.forEach(push);
    });
    if (data.is_dev || data.isDev || data.dev) out.add("dev");
    if (data.is_admin || data.isAdmin || data.admin) out.add("admin");
    if (data.is_mod || data.isMod || data.mod) out.add("mod");
    if (data.is_vip || data.isVip || data.vip) out.add("vip");
    if (data.is_streamer || data.isStreamer || data.streamer) out.add("streamer");
    if (data.is_beta || data.isBeta || data.beta) out.add("beta");
    return Array.from(out);
  }
  const ROLE_PRIORITY = ["dev","admin","mod","streamer","vip","beta"];
  function roleFromProfile(data) {
    const roles = rolesFromProfile(data);
    for (const p of ROLE_PRIORITY) if (roles.includes(p)) return p;
    return roles[0] || "";
  }
  const badgeKeyForRole   = r => ROLE_TO_BADGE[String(r||"").toLowerCase()] || null;
  const badgeDefForRole   = r => { const k = badgeKeyForRole(r); return k ? BADGE_DEFS[k] : null; };
  const badgeColorForRole = r => { const d = badgeDefForRole(r); return d ? d.color : "#4c8dff"; };
  function badgeLabelForRole(r) {
    const d = badgeDefForRole(r);
    if (!d) return "Conta verificada";
    const k = String(r||"").toLowerCase();
    return d.label[k] || d.defaultLabel;
  }
  const badgeSvgForRole   = r => { const d = badgeDefForRole(r); return d ? (d.svg || "") : ""; };
  const badgeEmojiForRole = r => { const d = badgeDefForRole(r); return d && d.emoji ? d.emoji : ""; };
  const hasAnyBadge       = d => Boolean(badgeDefForRole(roleFromProfile(d)));
  const hasVerifiedRole   = d => hasAnyBadge(d);
  const verifiedRoleKey   = d => roleFromProfile(d) || "user";
  const verifiedRoleLabel = k => badgeLabelForRole(k);

  function renderVerifiedBadge(data) {
    const badge = safe("profileVerifiedBadge");
    if (!badge) return;
    const role = roleFromProfile(data);
    const def = badgeDefForRole(role);
    if (!def) { badge.hidden = true; badge.removeAttribute("data-badge"); badge.removeAttribute("data-role"); return; }
    badge.hidden = false;
    badge.dataset.badge = ROLE_TO_BADGE[role] || "";
    badge.dataset.role = role;
    if (def.emoji) {
      badge.innerHTML = ""; badge.textContent = def.emoji;
      badge.style.color = ""; badge.style.fontSize = "22px"; badge.style.lineHeight = "1";
      badge.style.filter = `drop-shadow(0 0 6px ${def.color}aa)`;
    } else {
      badge.innerHTML = def.svg;
      badge.style.fontSize = ""; badge.style.lineHeight = "";
      badge.style.color = def.color;
      badge.style.filter = `drop-shadow(0 0 6px ${def.color}88)`;
    }
    const label = badgeLabelForRole(role);
    badge.setAttribute("aria-label", label); badge.setAttribute("title", label);
    badge.style.animation = "none"; void badge.offsetWidth; badge.style.animation = "";
  }

  let _inlineBadgeStylesInjected = false;
  function ensureInlineBadgeStyles() {
    if (_inlineBadgeStylesInjected) return;
    if (document.getElementById("profile-inline-verified-css")) { _inlineBadgeStylesInjected = true; return; }
    const s = document.createElement("style");
    s.id = "profile-inline-verified-css";
    s.textContent = `
      #sidebarDisplayName.has-verified-badge-support{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;min-width:0;max-width:100%}
      #sidebarDisplayName > .sidebar-display-name-text{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .profile-verified-badge-inline{display:inline-grid;place-items:center;width:18px;height:18px;flex:0 0 auto;color:#4c8dff;filter:drop-shadow(0 0 5px rgba(76,141,255,.55));animation:profile-verified-pop 320ms cubic-bezier(.34,1.56,.64,1);pointer-events:auto;vertical-align:middle}
      .profile-verified-badge-inline svg{display:block;width:100%;height:100%}
      .profile-verified-badge-inline[hidden]{display:none!important}
      .profile-verified-badge-inline[data-badge="staff"]{color:#f2b84b;filter:drop-shadow(0 0 6px rgba(242,184,75,.55))}
      .profile-verified-badge-inline[data-badge="vip"]{color:#4c8dff;filter:drop-shadow(0 0 6px rgba(76,141,255,.55))}
      .profile-verified-badge-inline[data-badge="streamer"]{color:#ff0000;filter:drop-shadow(0 0 6px rgba(255,0,0,.55))}
      .profile-verified-badge-inline[data-badge="beta"]{font-size:18px;line-height:1;filter:drop-shadow(0 0 6px rgba(255,157,46,.65))}
      @keyframes profile-verified-pop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(s);
    _inlineBadgeStylesInjected = true;
  }
  function renderSidebarVerifiedBadge(data) {
    ensureInlineBadgeStyles();
    const nameEl = safe("sidebarDisplayName");
    if (!nameEl) return false;
    const name = (data && (data.display_name || data.display || data.username || data.nick))
      || (nameEl.textContent || "").trim() || "Jogador";
    let textSpan = nameEl.querySelector(":scope > .sidebar-display-name-text");
    if (!textSpan) {
      textSpan = document.createElement("span");
      textSpan.className = "sidebar-display-name-text";
      nameEl.replaceChildren(textSpan);
    }
    textSpan.textContent = name;
    if (window.RoleColors) window.RoleColors.apply(textSpan, data);
    nameEl.querySelectorAll(":scope > .profile-verified-badge-inline").forEach(b => b.remove());
    const role = roleFromProfile(data);
    const def = badgeDefForRole(role);
    if (!def) { nameEl.classList.remove("has-verified-badge-support"); return true; }
    const b = document.createElement("span");
    b.className = "profile-verified-badge-inline";
    b.setAttribute("role","img");
    b.dataset.badge = ROLE_TO_BADGE[role] || "";
    b.dataset.role = role;
    if (def.emoji) {
      b.textContent = def.emoji;
      b.style.color=""; b.style.fontSize="18px"; b.style.lineHeight="1";
      b.style.filter=`drop-shadow(0 0 5px ${def.color}aa)`;
    } else {
      b.innerHTML = def.svg;
      b.style.color = def.color;
      b.style.filter = `drop-shadow(0 0 5px ${def.color}88)`;
    }
    const label = badgeLabelForRole(role);
    b.setAttribute("aria-label", label); b.setAttribute("title", label);
    nameEl.classList.add("has-verified-badge-support");
    nameEl.append(b);
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    return true;
  }
  function renderSidebarUsername(data, username, displayName) {
    const el = safe("sidebarUsername"); if (!el) return;
    const nick = (data?.username || username || data?.nick || "").trim();
    const name = (displayName || data?.display_name || "").trim();
    if (!nick) { el.hidden = true; el.textContent = ""; return; }
    if (name && looksLikeSameName(name, nick)) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false; el.textContent = "@" + nick;
  }
  function watchSidebarBadge() {
    if (watchSidebarBadge.__installed) return;
    watchSidebarBadge.__installed = true;
    const tryApply = () => { if (selfProfile) renderSidebarVerifiedBadge(selfProfile); };
    [0,120,400,1200,2500].forEach(ms => setTimeout(tryApply, ms));
    const obs = new MutationObserver(() => {
      if (!selfProfile) return;
      const nameEl = safe("sidebarDisplayName"); if (!nameEl) return;
      const has = nameEl.querySelector(":scope > .profile-verified-badge-inline");
      const need = hasAnyBadge(selfProfile);
      if (need !== Boolean(has)) renderSidebarVerifiedBadge(selfProfile);
    });
    obs.observe(document.body, { childList:true, subtree:true });
  }

  // ─────────────────────────────────────────────────────────
  // ROLE GATING
  // ─────────────────────────────────────────────────────────
  /* [v24] fallback para window.__selfProfile: evita "sem cargo" falso quando
     o editor abre antes do primeiro renderProfile() */
  function userRoles() { return rolesFromProfile(selfProfile || window.__selfProfile || profile || {}); }
  function userRoleKey() { return roleFromProfile(selfProfile || window.__selfProfile || profile || {}); }
  function requirementsForItem(item) {
    if (!item || !item.tier || item.tier === "free") return null;
    const list = TIER_ACCESS[item.tier];
    return Array.isArray(list) && list.length ? list : null;
  }
  function userCanUse(required) {
    if (!required || !required.length) return true;
    const mine = userRoles();
    if (mine.includes("dev")) return true;
    return required.some(r => mine.includes(r));
  }
  function labelForRequirements(required) {
    if (!required || !required.length) return "";
    for (const r of ROLE_ORDER) if (required.includes(r)) return ROLE_LABELS[r] || r;
    return ROLE_LABELS[required[0]] || required[0];
  }
  function applyRoleGating() {
    const mine = userRoles();
    const isDev = mine.includes("dev");
    document.querySelectorAll(".pf-swatch[data-requires]").forEach(btn => {
      const list = (btn.dataset.requires || "").split(/\s+/).filter(Boolean);
      const ok = isDev || list.length === 0 || list.some(r => mine.includes(r));
      btn.dataset.requirementsMet = String(ok);
      btn.disabled = !ok;
      btn.setAttribute("aria-disabled", String(!ok));
    });
  }
  function isFrameAllowed(value) {
    const item = FRAME_CATALOG.find(i => i.value === value);
    return !item ? true : userCanUse(requirementsForItem(item));
  }
  function isThemeAllowed(value) {
    const item = THEME_CATALOG.find(i => i.value === value);
    return !item ? true : userCanUse(requirementsForItem(item));
  }
  /* [v24] mensagem de acesso negado com o cargo exigido */
  function accessMessage(kind, item) {
    const need = labelForRequirements(requirementsForItem(item));
    return "Você não tem acesso a " + (kind === "frame" ? "esta moldura" : "este tema") +
      (need ? " (exige o cargo " + need + " ou superior)." : ".");
  }

  // ─────────────────────────────────────────────────────────
  // SWATCH PICKERS (frames / temas)
  // ─────────────────────────────────────────────────────────
  const TIER_LABELS = {
    free:"Grátis para todos", vip:"VIP & superiores", beta:"Beta Testers",
    streamer:"Streamers", mod:"Moderação", admin:"Admin", dev:"Dev",
  };
  const TIER_ORDER = ["free","vip","beta","streamer","mod","admin","dev"];

  /* [v24] garante que cada item do catálogo exista como <option> no <select> escondido.
     Sem isso, select.value = "x" falhava em silêncio quando o HTML não tinha a option. */
  function ensureSelectOptions(selectId, catalog) {
    const sel = safe(selectId); if (!sel) return;
    const have = new Set(Array.from(sel.options).map(o => o.value));
    catalog.forEach(it => {
      if (have.has(it.value)) return;
      const o = document.createElement("option");
      o.value = it.value; o.textContent = it.value;
      sel.append(o); have.add(it.value);
    });
  }

  function buildSwatch(item, kind) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pf-swatch";
    btn.dataset.value = item.value;
    btn.dataset.kind = kind;
    btn.setAttribute("role","radio");
    btn.setAttribute("aria-checked","false");
    const required = requirementsForItem(item);
    if (required) {
      btn.dataset.requires = required.join(" ");
      btn.dataset.lockLabel = labelForRequirements(required);
    }
    const art = document.createElement("span");
    art.className = "pf-swatch-art " + (kind === "frame" ? "pf-swatch-frame" : "pf-swatch-theme");
    art.setAttribute("aria-hidden","true");
    if (kind === "frame") art.dataset.frame = item.value;
    else art.dataset.theme = item.value;
    const name = document.createElement("span");
    name.className = "pf-swatch-name";
    name.textContent = item.label;
    btn.append(art, name);
    return btn;
  }
  function buildPicker(catalog, kind, containerId, selectId) {
    const container = safe(containerId);
    if (!container) return;
    container.replaceChildren();
    const groups = {};
    catalog.forEach(item => {
      const t = item.tier || "free";
      (groups[t] = groups[t] || []).push(item);
    });
    TIER_ORDER.forEach(tier => {
      const items = groups[tier];
      if (!items || !items.length) return;
      const heading = document.createElement("h4");
      heading.className = "pf-tier-label";
      heading.dataset.tier = tier;
      heading.textContent = TIER_LABELS[tier] || tier;
      container.append(heading);
      const grid = document.createElement("div");
      grid.className = "pf-picker-grid";
      items.forEach(item => grid.append(buildSwatch(item, kind)));
      container.append(grid);
    });
    container.addEventListener("click", ev => {
      const btn = ev.target.closest(".pf-swatch");
      if (!btn || btn.disabled) return;
      const select = safe(selectId);
      if (!select) return;
      select.value = btn.dataset.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncSwatchSelection(selectId);
    });
  }
  function syncSwatchSelection(selectId) {
    const select = safe(selectId); if (!select) return;
    const current = select.value;
    const containerId = selectId === "profileFrameInput" ? "pfFramePicker" : "pfThemePicker";
    const container = safe(containerId); if (!container) return;
    container.querySelectorAll(".pf-swatch").forEach(btn => {
      btn.setAttribute("aria-checked", String(btn.dataset.value === current));
    });
  }
  /* [v24] a prévia do editor acompanha o tema escolhido */
  function syncPreviewTheme() {
    const card = safe("profilePreviewCard");
    const theme = safe("profileThemeInput")?.value;
    if (card && theme) card.dataset.theme = theme;
  }

  // ─────────────────────────────────────────────────────────
  // PICKER DE RANK
  // ─────────────────────────────────────────────────────────
  function buildRankSwatch(opt) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pf-swatch";
    btn.dataset.value = opt.value;
    btn.setAttribute("role","radio");
    btn.setAttribute("aria-checked","false");
    const art = document.createElement("span");
    art.className = "pf-swatch-art pf-swatch-rank";
    const candidates = (opt.bases && opt.bases.length)
      ? rankImageCandidatesFromBases(opt.bases)
      : [];
    if (candidates.length) {
      const img = document.createElement("img");
      img.alt = ""; img.loading = "lazy";
      loadImageWithFallback(img, candidates);
      art.append(img);
    } else {
      art.classList.add("is-empty");
      art.textContent = "—";
    }
    const name = document.createElement("span");
    name.className = "pf-swatch-name";
    name.textContent = opt.label;
    btn.append(art, name);
    return btn;
  }
  function buildRankPicker() {
    const container = safe("pfRankPicker");
    if (!container) return;
    container.replaceChildren();
    container.append(buildRankSwatch({ value:"", label:"Sem rank", bases:[] }));
    RANK_OPTIONS.forEach(opt => container.append(buildRankSwatch(opt)));
    container.addEventListener("click", ev => {
      const btn = ev.target.closest(".pf-swatch");
      if (!btn || btn.disabled) return;
      const select = safe("pRank");
      if (!select) return;
      select.value = btn.dataset.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  function syncRankSelection() {
    const select = safe("pRank");
    const container = safe("pfRankPicker");
    if (!select || !container) return;
    const current = select.value;
    container.querySelectorAll(".pf-swatch").forEach(btn => {
      btn.setAttribute("aria-checked", String(btn.dataset.value === current));
    });
  }

  // ─────────────────────────────────────────────────────────
  // PICKER DE HERÓI (com busca)
  // ─────────────────────────────────────────────────────────
  function buildHeroSwatch(hero) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pf-swatch";
    btn.dataset.value = hero.name || "";
    btn.dataset.heroName = String(hero.name || "").toLocaleLowerCase("pt-BR");
    btn.setAttribute("role","radio");
    btn.setAttribute("aria-checked","false");
    const art = document.createElement("span");
    art.className = "pf-swatch-art pf-swatch-hero";
    const url = hero.name ? heroImageUrl(hero.name) : "";
    if (url) {
      const img = document.createElement("img");
      img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      img.src = url;
      img.onerror = () => {
        img.hidden = true;
        art.classList.add("is-empty");
        art.textContent = String(hero.name || "?").slice(0, 2).toUpperCase();
      };
      art.append(img);
    } else {
      art.classList.add("is-empty");
      art.textContent = hero.name ? String(hero.name).slice(0, 2).toUpperCase() : "—";
    }
    const name = document.createElement("span");
    name.className = "pf-swatch-name";
    name.textContent = hero.label || hero.name || "Nenhum";
    btn.append(art, name);
    return btn;
  }
  function buildHeroPicker() {
    const container = safe("pfHeroPicker");
    if (!container) return;
    container.replaceChildren();
    const catalog = Array.isArray(window.HERO_CATALOG) ? window.HERO_CATALOG : [];
    if (!catalog.length) {
      const ph = document.createElement("div");
      ph.className = "pf-hero-empty";
      ph.textContent = "Carregando catálogo de heróis…";
      container.append(ph);
      const counter = safe("pfHeroCount"); if (counter) counter.textContent = "";
      return;
    }
    const sorted = [...catalog].filter(h => h && h.name)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));
    container.append(buildHeroSwatch({ name:"", label:"Nenhum" }));
    sorted.forEach(h => container.append(buildHeroSwatch(h)));
    const counter = safe("pfHeroCount");
    if (counter) counter.textContent = sorted.length + " heróis";
    container.addEventListener("click", ev => {
      const btn = ev.target.closest(".pf-swatch");
      if (!btn || btn.disabled) return;
      const select = safe("pHero");
      if (!select) return;
      select.value = btn.dataset.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  function syncHeroSelection() {
    const select = safe("pHero");
    const container = safe("pfHeroPicker");
    if (!select || !container) return;
    const current = select.value;
    container.querySelectorAll(".pf-swatch").forEach(btn => {
      btn.setAttribute("aria-checked", String(btn.dataset.value === current));
    });
  }
  function filterHeroes(query) {
    const container = safe("pfHeroPicker");
    if (!container) return;
    const q = String(query || "").toLocaleLowerCase("pt-BR").trim();
    let visible = 0;
    container.querySelectorAll(".pf-swatch").forEach(btn => {
      const isNone = btn.dataset.value === "";
      const name = btn.dataset.heroName || "";
      const show = !q || isNone || name.includes(q);
      btn.hidden = !show;
      if (show && !isNone) visible++;
    });
    const counter = safe("pfHeroCount");
    if (counter) {
      if (q) counter.textContent = visible + (visible === 1 ? " resultado" : " resultados");
      else {
        const total = container.querySelectorAll(".pf-swatch:not([data-value=''])").length;
        counter.textContent = total + " heróis";
      }
    }
    let empty = container.querySelector(".pf-hero-empty");
    if (visible === 0 && q) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "pf-hero-empty";
        empty.textContent = "Nenhum herói encontrado.";
        container.append(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  // ─────────────────────────────────────────────────────────
  // PICKER DE ROTA
  // ─────────────────────────────────────────────────────────
  function buildRoleSwatch(item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pf-swatch";
    btn.dataset.value = item.value;
    btn.setAttribute("role","radio");
    btn.setAttribute("aria-checked","false");
    const art = document.createElement("span");
    art.className = "pf-swatch-art pf-swatch-role";
    const url = roleImageUrl(item);
    if (url) {
      const img = document.createElement("img");
      img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      img.src = url;
      img.onerror = () => {
        img.hidden = true;
        art.classList.add("is-empty");
        const fb = document.createElement("span");
        fb.className = "pf-swatch-role-label";
        fb.textContent = item.label;
        art.append(fb);
      };
      art.append(img);
      const overlay = document.createElement("span");
      overlay.className = "pf-swatch-role-label";
      overlay.textContent = item.label;
      art.append(overlay);
    } else {
      art.classList.add("is-empty");
    }
    const name = document.createElement("span");
    name.className = "pf-swatch-name";
    name.textContent = item.label;
    btn.append(art, name);
    return btn;
  }
  function buildRolePicker() {
    const container = safe("pfRolePicker");
    if (!container) return;
    container.replaceChildren();
    ROLE_CATALOG.forEach(item => container.append(buildRoleSwatch(item)));
    container.addEventListener("click", ev => {
      const btn = ev.target.closest(".pf-swatch");
      if (!btn || btn.disabled) return;
      const select = safe("pRole");
      if (!select) return;
      select.value = btn.dataset.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncRoleSelection();
    });
  }
  function syncRoleSelection() {
    const select = safe("pRole");
    const container = safe("pfRolePicker");
    if (!select || !container) return;
    const current = select.value || "Qualquer";
    container.querySelectorAll(".pf-swatch").forEach(btn => {
      btn.setAttribute("aria-checked", String(btn.dataset.value === current));
    });
  }

  // ─────────────────────────────────────────────────────────
  // STREAMER
  // ─────────────────────────────────────────────────────────
  const STREAM_PLATFORMS = [
    { name:"Twitch",  hosts:["twitch.tv","www.twitch.tv","m.twitch.tv"] },
    { name:"YouTube", hosts:["youtube.com","www.youtube.com","m.youtube.com","youtu.be"] },
    { name:"Kick",    hosts:["kick.com","www.kick.com"] },
  ];
  function parseStreamUrl(value) {
    let raw = String(value == null ? "" : value).trim();
    if (!raw || raw.length > MAX_STREAM_URL_LENGTH) return null;
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    let u;
    try { u = new URL(raw); } catch { return null; }
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    const host = u.hostname.toLowerCase();
    const p = STREAM_PLATFORMS.find(x => x.hosts.includes(host));
    if (!p) return null;
    if (u.pathname.replace(/\//g,"") === "") return null;
    u.protocol = "https:"; u.hash = "";
    return { url: u.toString(), platform: p.name };
  }
  function liveUrlFor(info) {
    if (!info) return "";
    if (info.platform !== "YouTube") return info.url;
    try {
      const u = new URL(info.url);
      if (/\/live\/?$/.test(u.pathname)) return u.toString();
      if (/^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/?$/.test(u.pathname)) {
        u.pathname = u.pathname.replace(/\/$/, "") + "/live";
        return u.toString();
      }
    } catch {}
    return info.url;
  }
  function isStreamerProfile(data) {
    if (!data) return false;
    return rolesFromProfile(data).includes("streamer");
  }
  function streamInfo(data) {
    if (!data || data.details_hidden || !isStreamerProfile(data)) return null;
    const ch = parseStreamUrl(data.stream_url);
    const live = data.stream_live ? parseStreamUrl(data.stream_live_url) : null;
    if (!ch && !live) return null;
    const isLive = Boolean(data.stream_live);
    const main = (isLive && live) ? live : (ch || live);
    return { href: main.url, platform: main.platform, live: isLive };
  }
  function createStreamLink(info, className) {
    const a = document.createElement("a");
    a.className = className || "profile-stream-btn";
    a.href = info.href; a.target = "_blank"; a.rel = "noopener noreferrer nofollow";
    a.classList.toggle("is-live", info.live);
    a.append(node("span", info.live ? "🔴" : "📺", "profile-stream-dot"));
    a.append(node("span", info.live ? "Assistir stream" : "Ver canal", "profile-stream-text"));
    a.append(node("small", info.platform, "profile-stream-platform"));
    a.title = info.live ? "Ao vivo agora na " + info.platform : "Abrir canal na " + info.platform;
    return a;
  }
  function renderStreamButton(data) {
    const slot = safe("profileStreamBtn"); if (!slot) return;
    const info = streamInfo(data);
    if (!info) { slot.hidden = true; slot.removeAttribute("href"); slot.replaceChildren(); return; }
    const fresh = createStreamLink(info, "profile-stream-btn");
    slot.hidden = false; slot.className = fresh.className; slot.href = fresh.href;
    slot.target = fresh.target; slot.rel = fresh.rel; slot.title = fresh.title;
    slot.replaceChildren(...fresh.childNodes);
  }
  function renderGoLive() {
    const btn = safe("profileGoLiveBtn"); if (!btn) return;
    const d = selfProfile;
    const ch = d ? parseStreamUrl(d.stream_url) : null;
    const show = currentMode === "self" && Boolean(d) && isStreamerProfile(d) && Boolean(ch);
    btn.hidden = !show; if (!show) return;
    const live = Boolean(d.stream_live);
    btn.classList.toggle("is-live", live);
    btn.setAttribute("aria-pressed", String(live));
    btn.textContent = live ? "⏹ Encerrar live" : "🔴 Entrei ao vivo";
    btn.disabled = false;
  }
  function handleGoLive() {
    const d = selfProfile;
    const ch = d ? parseStreamUrl(d.stream_url) : null;
    if (!ch || !isStreamerProfile(d)) return;
    const next = !d.stream_live;
    const ok = context?.send?.({ t:"stream_live_set", live:next, url: next ? liveUrlFor(ch) : "" });
    if (!ok) { context?.toast?.("A conexão caiu. Reconecte-se e tente de novo."); return; }
    const btn = safe("profileGoLiveBtn"); if (btn) btn.disabled = true;
    setTimeout(renderGoLive, 3000);
    context?.toast?.(next ? "Live anunciada na comunidade! 🔴" : "Live encerrada.");
  }
  function refreshStreamHint() {
    const input = safe("pStreamUrl"), hint = safe("pStreamHint");
    if (!input || !hint) return;
    const raw = input.value.trim();
    hint.classList.remove("is-error","is-ok");
    if (!raw) { hint.textContent = "Link do seu canal na Twitch, YouTube ou Kick. Aparece como botão no seu perfil."; return; }
    const info = parseStreamUrl(raw);
    if (info) { hint.textContent = "✓ Canal da " + info.platform + " reconhecido."; hint.classList.add("is-ok"); }
    else { hint.textContent = "Link não reconhecido. Use o endereço do canal (twitch.tv/…, youtube.com/@…, kick.com/…)."; hint.classList.add("is-error"); }
  }

  // ─────────────────────────────────────────────────────────
  // FORMATADORES / IMAGENS
  // ─────────────────────────────────────────────────────────
  function formatJoined(value) {
    if (!value) return "Data de entrada não registrada";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Data de entrada não registrada";
    return "Na comunidade desde " + new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"long",year:"numeric"}).format(d);
  }
  function formatTime(value) {
    const d = new Date(Number(value) * 1000);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(d);
  }
  function loadImageWithFallback(img, candidates, i = 0) {
    if (!img) return;
    if (!Array.isArray(candidates) || !candidates.length || i >= candidates.length) {
      img.removeAttribute("src"); img.onerror = null; img.hidden = true; return;
    }
    img.hidden = false;
    img.onerror = () => loadImageWithFallback(img, candidates, i + 1);
    img.src = candidates[i];
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  function buildGameTag(label, value, icon) {
    const item = node("span", null, "profile-game-tag");
    if (icon) item.append(icon);
    const copy = node("span", null, "profile-game-tag-copy");
    copy.append(node("small", label), node("b", value));
    item.append(copy);
    return item;
  }
  function renderDetails() {
    const box = safe("profileGameDetails"); if (!box) return;
    box.replaceChildren();
    if (profile.rank) {
      const c = rankCandidatesForRank(profile.rank);
      let icon = null;
      if (c.length) {
        const wrap = node("span", null, "profile-game-tag-icon profile-game-tag-icon--role");
        const img = node("img"); img.alt=""; img.loading="lazy";
        loadImageWithFallback(img, c); wrap.append(img); icon = wrap;
      }
      const stars = profileStars(profile);
      const v = stars == null ? profile.rank : profile.rank + " · " + stars + " ★";
      box.append(buildGameTag("Rank", v, icon));
    }

    /* [v11] — agora com ícone da rota, igual ao rank e ao herói. */
    if (profile.game_role) {
      const roleImg = roleImageFor(profile.game_role);
      let icon = null;
      if (roleImg) {
        const wrap = node("span", null, "profile-game-tag-icon");
        const img = node("img");
        img.alt=""; img.loading="lazy"; img.decoding="async";
        img.src = roleImg;
        img.onerror = () => { img.hidden = true; };
        wrap.append(img); icon = wrap;
      }
      box.append(buildGameTag("Função principal", profile.game_role, icon));
    }

    if (profile.hero) {
      const url = heroImageUrl(profile.hero);
      let icon = null;
      if (url) {
        const wrap = node("span", null, "profile-game-tag-icon");
        const img = node("img"); img.alt=""; img.loading="lazy";
        img.src = url; img.onerror = () => { img.hidden = true; };
        wrap.append(img); icon = wrap;
      }
      box.append(buildGameTag("Herói principal", profile.hero, icon));
    }
    if (profile.gid) box.append(buildGameTag("ID no jogo", profile.gid, null));
    if (!box.childElementCount)
      box.append(node("p", "Adicione seus dados de jogo ao editar o perfil.", "profile-empty"));
  }
  function renderStats() {
    const section = safe("profileStatsSection"), container = safe("profileStats");
    if (!section || !container) return;
    const stats = profile.stats || {};
    section.hidden = profile.show_stats === false;
    container.replaceChildren();
    if (section.hidden) return;
    [
      ["🪙", "Moedas", Number.isFinite(Number(stats.coins)) ? Number(stats.coins).toLocaleString("pt-BR") : "—"],
      ["🧠", "Quizzes respondidos", Number.isFinite(Number(stats.quizzes)) ? Number(stats.quizzes).toLocaleString("pt-BR") : "—"],
    ].forEach(([i, l, v]) => {
      const c = node("article", null, "profile-stat-card");
      c.append(node("span", i, "profile-stat-icon"), node("span", l, "profile-stat-label"), node("b", v));
      container.append(c);
    });
    container.append(node("p", "Partidas e Win Rate ainda não são registrados pelo site.", "profile-data-note"));
  }
  function renderAchievements() {
    const section = safe("profileAchievementsSection"), container = safe("profileAchievements");
    if (!section || !container) return;
    const achievements = profile.achievements || [];
    section.hidden = profile.show_stats === false;
    container.replaceChildren();
    if (section.hidden) return;
    if (!achievements.length) {
      container.append(node("p", "Responda ao quiz diário para desbloquear sua primeira conquista.", "profile-empty"));
      return;
    }
    achievements.forEach(b => {
      const item = node("article", null, "profile-badge");
      item.append(node("span", b.icon, "profile-badge-icon"), node("b", b.name));
      container.append(item);
    });
  }
  function renderActivity() {
    const section = safe("profileActivitySection"), container = safe("profileActivity");
    if (!section || !container) return;
    const activity = profile.activity || [];
    section.hidden = profile.show_activity === false;
    container.replaceChildren();
    if (section.hidden) return;
    if (!activity.length) { container.append(node("p","Você ainda não possui atividades recentes.","profile-empty")); return; }
    activity.forEach(e => {
      const item = node("article", null, "profile-activity-item");
      item.append(node("span", e.kind === "quiz" ? "🧠" : e.kind === "room" ? "🎮" : "✨", "profile-activity-icon"));
      const c = node("div");
      c.append(node("b", e.detail), node("time", formatTime(e.ts)));
      item.append(c);
      container.append(item);
    });
  }
  function resolveOnlineFlag(data) {
    if (!data || typeof data !== "object") return false;
    if (typeof data.online === "boolean") return data.online;
    if (typeof data.is_online === "boolean") return data.is_online;
    if (typeof data.isOnline === "boolean") return data.isOnline;
    if (data.presence && typeof data.presence.online === "boolean") return data.presence.online;
    if (typeof data.status === "string") return data.status.toLowerCase() === "online";
    return false;
  }
  function renderStatus(data, forced) {
    const status = safe("profileStatus"); if (!status) return;
    const isOnline = typeof forced === "boolean" ? forced : resolveOnlineFlag(data);
    status.replaceChildren(node("i"), document.createTextNode(isOnline ? " Online" : " Offline"));
    status.classList.toggle("is-online", isOnline);
    status.classList.toggle("is-offline", !isOnline);
    status.setAttribute("data-online", isOnline ? "true" : "false");
    status.setAttribute("aria-label", isOnline ? "Online agora" : "Offline");
  }
  function applyRankBadge(data) {
    const badge = safe("profileRankBadge"), image = safe("profileRankImage"), label = safe("profileRankLabel");
    if (!badge) return;
    const rank = (data.rank || "").trim();
    const candidates = rankCandidatesForRank(rank);
    if (!rank || !candidates.length) {
      badge.hidden = true;
      if (image) { image.removeAttribute("src"); image.onerror = null; }
      const s = safe("profileRankStars"); if (s) s.hidden = true;
      return;
    }
    badge.hidden = false;
    if (label) label.textContent = rank;
    if (image) loadImageWithFallback(image, candidates);
    const wrap = safe("profileRankStars"), cnt = safe("profileRankStarsCount");
    const stars = profileStars(data);
    if (wrap) {
      if (stars == null) { wrap.hidden = true; wrap.removeAttribute("aria-label"); }
      else {
        wrap.hidden = false;
        wrap.setAttribute("aria-label", stars === 1 ? "1 estrela" : stars + " estrelas");
        if (cnt) cnt.textContent = String(stars);
      }
    }
  }
  function applyPageHeading(data, mode) {
    if (mode === "other") {
      const name = (data && (data.display_name || data.username)) || "Jogador";
      setText("profilePageTitle", "Perfil de " + name);
      setText("profilePageSubtitle", "Conheça a jornada de " + name + " na Society.");
      setText("profileEyebrow", "PLAYER CARD");
    } else {
      setText("profilePageTitle", "Meu perfil");
      setText("profilePageSubtitle", "Seu espaço na comunidade. Mostre como você joga e personalize sua identidade.");
      setText("profileEyebrow", "SOCIETY · PLAYER CARD");
    }
  }
  function applyFriendshipStatus(data) {
    const btn = safe("profileFriendBtn"); if (!btn) return;
    if (currentMode !== "other") { btn.hidden = true; return; }
    btn.hidden = false;
    const status = data.friendship_status || "none";
    const nick = currentUserId || data.nick || data.username || "";
    const label = btn.querySelector("span"), svg = btn.querySelector("svg");
    btn.className = "profile-friend-btn"; btn.disabled = false; btn.dataset.action = "";
    const ICONS = {
      add:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
      accept:'<polyline points="20 6 9 17 4 12"/>',
      friends:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
      pending:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      remove:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>',
    };
    if (status === "friends") {
      btn.classList.add("is-friends"); if (label) label.textContent = "Amigos ✓";
      btn.dataset.action = "friend_remove"; btn.title = "Remover amizade";
      if (svg) svg.innerHTML = ICONS.remove;
    } else if (status === "pending_out") {
      btn.classList.add("is-pending"); if (label) label.textContent = "Pedido enviado";
      btn.disabled = true; btn.dataset.action = ""; if (svg) svg.innerHTML = ICONS.pending;
    } else if (status === "pending_in") {
      btn.classList.add("is-accept"); if (label) label.textContent = "Aceitar pedido";
      btn.dataset.action = "friend_accept"; btn.title = "Aceitar pedido de amizade";
      if (svg) svg.innerHTML = ICONS.accept;
    } else {
      if (label) label.textContent = "Adicionar amigo";
      btn.dataset.action = "friend_request";
      if (svg) svg.innerHTML = ICONS.add;
    }
    btn.dataset.nick = String(nick);
  }
  function handleFriendClick() {
    const btn = safe("profileFriendBtn"); if (!btn) return;
    const action = btn.dataset.action, nick = btn.dataset.nick;
    if (!action || !nick) return;
    if (action === "friend_remove" && !confirm("Remover @" + nick + " da sua lista de amigos?")) return;
    const ok = context?.send?.({ t: action, nick });
    if (!ok) context?.toast?.("A conexão caiu. Reconecte-se antes de continuar.");
  }

  function applyProfileCard(data, username, options = {}) {
    const displayName = data.display_name || username || "Jogador";
    setText("profileDisplayName", displayName);
    if (window.RoleColors) window.RoleColors.apply(safe("profileDisplayName"), data);
    renderVerifiedBadge(data);
    renderStreamButton(data);
    setText("profileUsername", "@" + (data.username || username || "jogador"));

    if (data.details_hidden) {
      setText("profileBio", "🔒 Este perfil é " +
        (data.visibility === "friends" ? "visível apenas para amigos" : "privado") +
        ". Envie um pedido de amizade para ver mais detalhes.");
    } else {
      setText("profileBio", data.bio || "Adicione uma bio para que a comunidade conheça você.");
    }
    setText("profileJoined", formatJoined(data.joined_at));
    renderStatus(data, options.forceOnline);
    applyRankBadge(data);
    setText("profileTitle", data.title || "");
    setHidden("profileTitle", !data.title);

    const roles = safe("profileCommunityRoles");
    if (roles) {
      roles.replaceChildren();
      (Array.isArray(data.community_roles) ? data.community_roles : []).forEach(r => {
        const b = node("span", r, "profile-community-role");
        b.dataset.role = r.toLowerCase();
        roles.append(b);
      });
      roles.hidden = roles.childElementCount === 0;
    }

    const safeFrame = isFrameAllowed(data.frame) ? (data.frame || "default") : "default";
    const safeTheme = isThemeAllowed(data.theme) ? (data.theme || "classic") : "classic";

    const card = safe("profileCard");
    if (card) {
      applyAccent(card, data.accent);
      card.dataset.frame = safeFrame;
      card.classList.toggle("is-streaming", Boolean(streamInfo(data)?.live));
    }
    const page = safe("profileRoot") || document.querySelector(".profile-page");
    if (page) {
      page.dataset.theme = safeTheme;
      applyAccent(page, data.accent);
    }
    applyAvatarShape(data.avatar_shape || "round");

    setAvatar(safe("profileAvatar"), data, "profile-avatar");
    applyBanner(safe("profileBanner"), data.banner || "");
    renderDetails(); renderStats(); renderAchievements(); renderActivity();
    applyFriendshipStatus(data);

    try {
      const evNick = currentMode === "other"
        ? currentUserId
        : (context?.getUsername?.() || data.username || username || "");
      document.dispatchEvent(new CustomEvent("profile:rendered", {
        detail: { mode: currentMode, nick: evNick ? String(evNick) : "", data },
      }));
    } catch (e) { console.error("[profile] profile:rendered", e); }
  }

  function applySelfChrome(data, username) {
    const displayName = data.display_name || username || "Jogador";
    const handle = "@" + (data.username || username || "jogador");
    setAvatar(safe("sidebarAvatar"), data, "sidebar-avatar");
    applySidebarAvatarChrome(data);
    const nav = safe("profileNavAvatar");
    if (nav) {
      const a = createAvatar(data, "nav-profile-avatar");
      nav.replaceChildren(a.childNodes[0] || document.createTextNode(initials(displayName, data.username)));
    }
    renderSidebarVerifiedBadge({ ...data, display_name: displayName });
    renderSidebarUsername(data, username, displayName);
    setText("settingsDisplayName", displayName);
    setText("settingsUsername", handle);
    setChecked("cfgProfilePrivate", Boolean(data.is_private));
    setChecked("cfgShowStats", data.show_stats !== false);
    setChecked("cfgShowActivity", data.show_activity !== false);
    const n = data.notifications || {};
    setChecked("notifyMessages", n.messages !== false);
    setChecked("notifyInvites", n.invites !== false);
    setChecked("notifyEvents", n.events !== false);
    setChecked("notifyActivity", n.activity !== false);
    syncDraftPreviews();
  }

  function setChromeVisibility() {
    const editBtn = safe("profileEditButton"), actions = safe("profileActions"), backBtn = safe("profileBack");
    if (currentMode === "other") {
      if (editBtn) editBtn.hidden = true;
      if (actions) actions.hidden = false;
      if (backBtn) backBtn.hidden = false;
    } else {
      if (editBtn) editBtn.hidden = false;
      if (actions) actions.hidden = true;
      if (backBtn) backBtn.hidden = true;
    }
    renderGoLive();
    const page = safe("profileRoot") || document.querySelector(".profile-page");
    if (page) page.dataset.profileMode = currentMode;
  }

  function renderProfile(nextProfile, username) {
    selfProfile = nextProfile || {};
    if (currentMode !== "self") return;
    profile = selfProfile;
    applyPageHeading(profile, "self");
    applyProfileCard(profile, username, { forceOnline: true });
    applySelfChrome(profile, username);
    setChromeVisibility();
    applyRoleGating();
  }
  function renderOtherProfile(nextProfile, username, userId) {
    currentMode = "other"; currentUserId = userId != null ? userId : null;
    profile = nextProfile || {};
    applyPageHeading(profile, "other");
    applyProfileCard(profile, username);
    setChromeVisibility();
    const ed = safe("profileEditor"); if (ed && ed.open) ed.close();
  }
  function returnToSelf() {
    if (currentMode === "self") return;
    currentMode = "self"; currentUserId = null;
    profile = selfProfile || {};
    const username = context?.getUsername?.();
    applyPageHeading(profile, "self");
    applyProfileCard(profile, username, { forceOnline: true });
    applySelfChrome(profile, username);
    setChromeVisibility();
    applyRoleGating();
  }
  const getMode = () => currentMode;
  const getCurrentUserId = () => currentUserId;

  function handleBack() {
    if (typeof context?.goBack === "function") { context.goBack(); return; }
    returnToSelf();
    document.dispatchEvent(new CustomEvent("profile:back"));
  }
  function handleMessage() {
    if (currentMode !== "other" || currentUserId == null) return;
    if (typeof context?.openDM === "function") { context.openDM(currentUserId); return; }
    document.dispatchEvent(new CustomEvent("profile:message", { detail:{ userId: currentUserId }}));
  }
  function handleReport() {
    if (currentMode !== "other" || currentUserId == null) return;
    if (typeof context?.reportUser === "function") { context.reportUser(currentUserId); return; }
    document.dispatchEvent(new CustomEvent("profile:report", { detail:{ userId: currentUserId }}));
  }

  // ─────────────────────────────────────────────────────────
  // EDITOR
  // ─────────────────────────────────────────────────────────
  function populateRankOptions(currentValue) {
    const select = safe("pRank"); if (!select) return;
    const desired = currentValue != null ? currentValue : select.value || "";
    while (select.options.length > 1) select.remove(1);
    RANK_OPTIONS.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.value; opt.textContent = o.label;
      select.append(opt);
    });
    if (desired) {
      if (!Array.from(select.options).some(o => o.value === desired)) {
        const opt = document.createElement("option");
        opt.value = desired; opt.textContent = desired + " (personalizado)";
        select.append(opt);
      }
      select.value = desired;
    } else select.value = "";
  }
  function populateHeroOptions(currentValue) {
    const select = safe("pHero"); if (!select) return;
    const desired = currentValue != null ? currentValue : select.value || "";
    while (select.options.length > 1) select.remove(1);
    const cat = Array.isArray(window.HERO_CATALOG) ? window.HERO_CATALOG : [];
    [...cat].sort((a,b) => String(a.name||"").localeCompare(String(b.name||""),"pt-BR")).forEach(h => {
      if (!h || !h.name) return;
      const opt = document.createElement("option"); opt.value = h.name; opt.textContent = h.name;
      select.append(opt);
    });
    if (desired) {
      if (!Array.from(select.options).some(o => o.value === desired)) {
        const opt = document.createElement("option");
        opt.value = desired; opt.textContent = desired + " (personalizado)";
        select.append(opt);
      }
      select.value = desired;
    } else select.value = "";
  }
  function syncStarsField() {
    const s = safe("pRank"), i = safe("pStars"), f = safe("pStarsField");
    const enabled = isMythicPlusRank(s?.value || "");
    if (i) { i.disabled = !enabled; if (!enabled) i.value = ""; }
    if (f) f.classList.toggle("is-disabled", !enabled);
  }
  function applyStarsToRank() {
    const input = safe("pStars"), select = safe("pRank");
    if (!input || !select || input.disabled) return;
    const stars = parseStarsValue(input.value);
    if (stars == null) return;
    const next = rankFromMythicStars(stars);
    if (select.value !== next) { populateRankOptions(next); refreshRankPreview(); syncRankSelection(); }
  }
  function refreshRankPreview() {
    const s = safe("pRank"), img = safe("pRankPreviewImage"), wrap = safe("pRankPreview");
    if (!s || !img) return;
    const v = (s.value || "").trim();
    const c = rankCandidatesForRank(v);
    if (!v || !c.length) { img.removeAttribute("src"); img.onerror = null; img.hidden = true; if (wrap) wrap.classList.add("is-empty"); return; }
    if (wrap) wrap.classList.remove("is-empty");
    loadImageWithFallback(img, c);
  }
  function refreshHeroPreview() {
    const s = safe("pHero"), img = safe("pHeroPreviewImage"), wrap = safe("pHeroPreview");
    if (!s || !img) return;
    const v = (s.value || "").trim();
    const url = heroImageUrl(v);
    if (!v || !url) { img.removeAttribute("src"); img.onerror = null; img.hidden = true; if (wrap) wrap.classList.add("is-empty"); return; }
    if (wrap) wrap.classList.remove("is-empty");
    img.hidden = false; img.onerror = () => { img.hidden = true; }; img.src = url;
  }
  function syncDraftPreviews() {
    const n = safe("profileDisplayNameInput")?.value || profile.display_name || "Jogador";
    const u = profile.username || "";
    setAvatar(safe("profilePreviewAvatar"),
      { display_name:n, username:u, avatar:draftAvatar },
      "profile-avatar profile-preview-avatar");
    const previewName = safe("profilePreviewName");
    if (previewName) {
      previewName.textContent = n;
      if (window.RoleColors) {
        window.RoleColors.apply(previewName, {
          ...profile,
          display_name: n,
          name_color: safe("pNameColor")?.value || profile.name_color
        });
      }
    }
    applyBanner(safe("profilePreviewBanner"), draftBanner);
  }

  function openEditor() {
    if (currentMode !== "self") return;
    const form = safe("profileForm"); if (!form) return;
    form.reset();
    setText("profileFormMessage", "");
    safe("profileFormMessage")?.classList.remove("is-error");

    populateRankOptions(profile.rank || "");
    populateHeroOptions(profile.hero || "");
    syncStarsField();
    const st = profileStars(profile);
    setVal("pStars", st == null ? "" : String(st));
    setVal("profileDisplayNameInput", profile.display_name || "");
    setVal("profileUsernameInput", "@" + (profile.username || ""));
    setVal("pRole", profile.game_role || "Qualquer");
    setVal("pGid", profile.gid || "");
    setVal("pBio", profile.bio || "");
    setVal("profileTitleInput", profile.title || "");
    setVal("profileAccentInput", profile.accent || defaultAccent());

    const savedFrame = isFrameAllowed(profile.frame) ? (profile.frame || "default") : "default";
    const savedTheme = isThemeAllowed(profile.theme) ? (profile.theme || "classic") : "classic";
    setVal("profileFrameInput", savedFrame);
    setVal("profileThemeInput", savedTheme);
    setVal("pAvatarShape", profile.avatar_shape || "round");

    const colorKey = window.RoleColors ? window.RoleColors.keyFor(profile) : "";
    const nameColor = safe("pNameColor");
    if (nameColor) {
      nameColor.disabled = !colorKey;
      setVal("pNameColor", profile.name_color || (colorKey ? "role" : "default"));
    }

    applyRoleGating();
    syncSwatchSelection("profileFrameInput");
    syncSwatchSelection("profileThemeInput");
    syncPreviewTheme();

    syncRankSelection();
    syncHeroSelection();
    syncRoleSelection();
    const heroSearch = safe("pfHeroSearch");
    if (heroSearch) { heroSearch.value = ""; filterHeroes(""); }

    const streamField = safe("pStreamField");
    const canStream = isStreamerProfile(profile);
    if (streamField) streamField.hidden = !canStream;
    setVal("pStreamUrl", canStream ? (profile.stream_url || "") : "");
    refreshStreamHint();

    const vis = profile.visibility || (profile.is_private ? "private" : "public");
    setVal("profileVisibilityInput", vis);
    setChecked("profileShowStatsInput", profile.show_stats !== false);
    setChecked("profileShowActivityInput", profile.show_activity !== false);

    setVal("profileAvatarFile", "");
    setVal("profileBannerFile", "");
    draftAvatar = profile.avatar || "";
    draftBanner = profile.banner || "";
    syncDraftPreviews();
    refreshRankPreview();
    refreshHeroPreview();
    const dialog = safe("profileEditor");
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
  }

  function imageData(file, w, h, maxLen) {
    return new Promise((res, rej) => {
      if (!file || !file.type.startsWith("image/")) return rej(new Error("Selecione um arquivo de imagem."));
      if (file.size > MAX_IMAGE_BYTES) return rej(new Error("A imagem deve ter no máximo 8 MB."));
      const u = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(u);
        const s = Math.min(1, w / img.naturalWidth, h / img.naturalHeight);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * s));
        c.height = Math.max(1, Math.round(img.naturalHeight * s));
        const ctx = c.getContext("2d");
        if (!ctx) return rej(new Error("Não foi possível processar esta imagem."));
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => {
          if (!b) return rej(new Error("Não foi possível otimizar esta imagem."));
          const r = new FileReader();
          r.onload = () => {
            const s = String(r.result || "");
            if (s.length > maxLen) rej(new Error("A imagem otimizada ainda ficou grande demais. Escolha outra imagem."));
            else res(s);
          };
          r.onerror = () => rej(new Error("Não foi possível ler esta imagem."));
          r.readAsDataURL(b);
        }, "image/jpeg", 0.78);
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("O arquivo selecionado não pôde ser aberto como imagem.")); };
      img.src = u;
    });
  }
  function showImageError(msg) {
    const m = safe("profileFormMessage"); if (!m) return;
    m.textContent = msg; m.classList.add("is-error");
  }

  function saveProfile(event) {
    event.preventDefault();
    if (currentMode !== "self") return;
    const dn = safe("profileDisplayNameInput")?.value.trim();
    if (!dn) { showImageError("Informe um nome de exibição."); safe("profileDisplayNameInput")?.focus(); return; }

    let streamUrl = "";
    if (isStreamerProfile(profile)) {
      const raw = safe("pStreamUrl")?.value.trim() || "";
      if (raw) {
        const info = parseStreamUrl(raw);
        if (!info) { showImageError("Link do canal inválido. Use Twitch, YouTube ou Kick."); safe("pStreamUrl")?.focus(); return; }
        streamUrl = info.url;
      }
    }

    const frame = safe("profileFrameInput")?.value || "default";
    const theme = safe("profileThemeInput")?.value || "classic";
    /* [v24] mensagem com o cargo exigido + diagnóstico no console */
    if (!isFrameAllowed(frame)) {
      const item = FRAME_CATALOG.find(i => i.value === frame);
      console.warn("[ProfileUI] moldura negada pelo cliente", { frame, tier: item?.tier, seusCargos: userRoles() });
      showImageError(accessMessage("frame", item)); return;
    }
    if (!isThemeAllowed(theme)) {
      const item = THEME_CATALOG.find(i => i.value === theme);
      console.warn("[ProfileUI] tema negado pelo cliente", { theme, tier: item?.tier, seusCargos: userRoles() });
      showImageError(accessMessage("theme", item)); return;
    }

    const msg = safe("profileFormMessage");
    if (msg) { msg.textContent = "Salvando perfil…"; msg.classList.remove("is-error"); }

    let rank = safe("pRank")?.value || "";
    const stars = parseStarsValue(safe("pStars")?.value);
    if (stars != null && (isMythicPlusRank(rank) || rank === "")) rank = rankFromMythicStars(stars);
    const payloadStars = isMythicPlusRank(rank) ? stars : null;

    const vis = safe("profileVisibilityInput")?.value || "public";
    const isPrivate = vis === "private";

    pendingStreamUrl = isStreamerProfile(profile) ? streamUrl : null;

    const rawShape = (safe("pAvatarShape")?.value || profile.avatar_shape || "round");
    const shape = AVATAR_SHAPES.has(String(rawShape).toLowerCase()) ? String(rawShape).toLowerCase() : "round";

    const ok = context?.send?.({
      t:"profile_set",
      display_name: dn, rank, stars: payloadStars,
      role: safe("pRole")?.value || "",
      hero: safe("pHero")?.value || "",
      gid: safe("pGid")?.value || "",
      bio: safe("pBio")?.value || "",
      title: safe("profileTitleInput")?.value || "",
      accent: safe("profileAccentInput")?.value || "",
      frame, theme, avatar_shape: shape,
      name_color: safe("pNameColor")?.value || "default",
      avatar: draftAvatar, banner: draftBanner,
      visibility: vis, is_private: isPrivate,
      show_stats: Boolean(safe("profileShowStatsInput")?.checked),
      show_activity: Boolean(safe("profileShowActivityInput")?.checked),
      stream_url: streamUrl,
    });
    if (!ok) showImageError("A conexão caiu. Reconecte-se antes de salvar o perfil.");
  }

  function getNotifications() {
    return {
      messages: Boolean(safe("notifyMessages")?.checked),
      invites: Boolean(safe("notifyInvites")?.checked),
      events: Boolean(safe("notifyEvents")?.checked),
      activity: Boolean(safe("notifyActivity")?.checked),
    };
  }
  function savePrivacy() {
    const m = safe("privacySettingsMessage"); if (!m) return;
    m.textContent = "Salvando…"; m.classList.remove("is-error");
    const ok = context?.send?.({
      t:"settings_set", notifications: getNotifications(),
      is_private: Boolean(safe("cfgProfilePrivate")?.checked),
      show_stats: Boolean(safe("cfgShowStats")?.checked),
      show_activity: Boolean(safe("cfgShowActivity")?.checked),
    });
    if (!ok) { m.textContent = "A conexão caiu. Reconecte-se antes de salvar as preferências."; m.classList.add("is-error"); }
  }
  function saveNotifications() {
    const m = safe("notificationSettingsMessage"); if (!m) return;
    m.textContent = "Salvando…"; m.classList.remove("is-error");
    const ok = context?.send?.({
      t:"settings_set", notifications: getNotifications(),
      is_private: Boolean(safe("cfgProfilePrivate")?.checked),
      show_stats: Boolean(safe("cfgShowStats")?.checked),
      show_activity: Boolean(safe("cfgShowActivity")?.checked),
    });
    if (!ok) { m.textContent = "A conexão caiu. Reconecte-se antes de salvar as preferências."; m.classList.add("is-error"); }
  }
  function submitPasswordChange(event) {
    event.preventDefault();
    const cur = safe("passwordCurrent")?.value || "";
    const nw  = safe("passwordNew")?.value || "";
    const cf  = safe("passwordConfirm")?.value || "";
    const m   = safe("passwordChangeMessage"); if (!m) return;
    m.classList.remove("is-error");
    if (nw.length < 10 || nw.length > 128) { m.textContent = "A nova senha deve ter entre 10 e 128 caracteres."; m.classList.add("is-error"); return; }
    if (nw !== cf) { m.textContent = "A confirmação não corresponde à nova senha."; m.classList.add("is-error"); safe("passwordConfirm")?.focus(); return; }
    m.textContent = "Alterando senha…";
    const ok = context?.send?.({ t:"password_change", current: cur, new: nw });
    if (!ok) { m.textContent = "A conexão caiu. Reconecte-se antes de alterar sua senha."; m.classList.add("is-error"); }
  }

  // ─────────────────────────────────────────────────────────
  // MOUNT
  // ─────────────────────────────────────────────────────────
  function mount(options) {
    context = options || {};

    /* [v24] o <select> sempre tem todas as options do catálogo */
    ensureSelectOptions("profileFrameInput", FRAME_CATALOG);
    ensureSelectOptions("profileThemeInput", THEME_CATALOG);

    buildPicker(FRAME_CATALOG, "frame", "pfFramePicker", "profileFrameInput");
    buildPicker(THEME_CATALOG, "theme", "pfThemePicker", "profileThemeInput");
    buildRankPicker();
    buildHeroPicker();
    buildRolePicker();

    safe("profileEditButton")?.addEventListener("click", openEditor);
    safe("settingsEditProfile")?.addEventListener("click", () => { context?.openProfile?.(); openEditor(); });
    safe("profileBack")?.addEventListener("click", handleBack);
    safe("profileMessageBtn")?.addEventListener("click", handleMessage);
    safe("profileReportBtn")?.addEventListener("click", handleReport);
    safe("profileFriendBtn")?.addEventListener("click", handleFriendClick);
    safe("profileGoLiveBtn")?.addEventListener("click", handleGoLive);
    safe("pStreamUrl")?.addEventListener("input", refreshStreamHint);

    safe("profileEditorClose")?.addEventListener("click", () => safe("profileEditor")?.close());
    safe("profileCancelButton")?.addEventListener("click", () => safe("profileEditor")?.close());

    const form = safe("profileForm");
    if (form) form.addEventListener("submit", saveProfile);
    safe("profileDisplayNameInput")?.addEventListener("input", syncDraftPreviews);

    ["profileAccentInput","profileFrameInput"].forEach(id => {
      safe(id)?.addEventListener("input", () => {
        const ed = safe("profileEditor");
        const a = safe("profileAccentInput")?.value;
        if (ed && a) ed.style.setProperty("--profile-accent", a);
      });
    });
    safe("profileFrameInput")?.addEventListener("change", () => syncSwatchSelection("profileFrameInput"));
    safe("profileThemeInput")?.addEventListener("change", () => { syncSwatchSelection("profileThemeInput"); syncPreviewTheme(); });

    safe("pAvatarShape")?.addEventListener("change", () => applyAvatarShape(safe("pAvatarShape").value));
    safe("pNameColor")?.addEventListener("change", syncDraftPreviews);

    safe("pRank")?.addEventListener("change", () => { syncStarsField(); refreshRankPreview(); syncRankSelection(); });
    safe("pStars")?.addEventListener("input", applyStarsToRank);
    safe("pHero")?.addEventListener("change", () => { refreshHeroPreview(); syncHeroSelection(); });
    safe("pRole")?.addEventListener("change", () => syncRoleSelection());

    const heroSearch = safe("pfHeroSearch");
    if (heroSearch) {
      let timer = 0;
      heroSearch.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => filterHeroes(heroSearch.value), 120);
      });
    }

    safe("profileAvatarFile")?.addEventListener("change", async ev => {
      try {
        draftAvatar = await imageData(ev.target.files[0], 360, 360, MAX_AVATAR_DATA_LENGTH);
        const m = safe("profileFormMessage"); if (m) m.textContent = "";
        syncDraftPreviews();
      } catch (err) { showImageError(err.message); ev.target.value = ""; }
    });
    safe("profileBannerFile")?.addEventListener("change", async ev => {
      try {
        draftBanner = await imageData(ev.target.files[0], 1280, 460, MAX_BANNER_DATA_LENGTH);
        const m = safe("profileFormMessage"); if (m) m.textContent = "";
        syncDraftPreviews();
      } catch (err) { showImageError(err.message); ev.target.value = ""; }
    });
    safe("profileRemoveAvatar")?.addEventListener("click", () => {
      draftAvatar = ""; const i = safe("profileAvatarFile"); if (i) i.value = ""; syncDraftPreviews();
    });
    safe("profileRemoveBanner")?.addEventListener("click", () => {
      draftBanner = ""; const i = safe("profileBannerFile"); if (i) i.value = ""; syncDraftPreviews();
    });

    safe("savePrivacySettings")?.addEventListener("click", savePrivacy);
    safe("saveNotificationSettings")?.addEventListener("click", saveNotifications);
    safe("passwordChangeForm")?.addEventListener("submit", submitPasswordChange);

    document.querySelectorAll("[data-toggle-password]").forEach(btn => {
      btn.addEventListener("click", () => {
        const inp = safe(btn.dataset.togglePassword); if (!inp) return;
        const show = inp.type === "password";
        inp.type = show ? "text" : "password";
        btn.textContent = show ? "Ocultar" : "Mostrar";
        const label = btn.closest("label")?.firstChild?.textContent?.trim() || "";
        btn.setAttribute("aria-label", (show ? "Ocultar " : "Mostrar ") + label);
      });
    });

    window.addEventListener("hero-catalog-ready", () => {
      populateHeroOptions();
      buildHeroPicker();
      syncHeroSelection();
      const search = safe("pfHeroSearch");
      if (search) filterHeroes(search.value);
      const ed = safe("profileEditor");
      if (ed && ed.open) refreshHeroPreview();
    });

    watchSidebarBadge();
    setChromeVisibility();
    applyRoleGating();

    syncRankSelection();
    syncHeroSelection();
    syncRoleSelection();
  }

  // ─────────────────────────────────────────────────────────
  // RESUMO DE PERFIL
  // ─────────────────────────────────────────────────────────
  let _summaryStylesInjected = false;
  function ensureSummaryStyles() {
    if (_summaryStylesInjected) return;
    if (document.getElementById("profile-summary-css")) { _summaryStylesInjected = true; return; }
    const s = document.createElement("style");
    s.id = "profile-summary-css";
    s.textContent = `
      .profile-summary{display:flex;flex-direction:column;gap:12px;min-width:0}
      .profile-summary-head{display:flex;align-items:center;gap:14px;min-width:0}
      .profile-summary-avatar{width:64px;height:64px;border-radius:var(--pf-avatar-radius,50%);overflow:hidden;display:grid;place-items:center;flex:0 0 auto;background:linear-gradient(145deg,#262b34,#171a20);color:var(--profile-accent,var(--accent,#d4b45a));font-weight:700;font-size:1.4rem;text-transform:uppercase;box-shadow:0 0 0 2px var(--profile-accent,var(--accent,#d4b45a))}
      .profile-summary-avatar img{width:100%;height:100%;object-fit:cover;display:block}
      .profile-summary-id{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto}
      .profile-summary-name{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
      .profile-summary-name b{font-size:1.15rem;overflow-wrap:anywhere}
      .profile-summary-nick{color:var(--muted,#9298a3);font-size:.82rem}
      .profile-summary-title{align-self:flex-start;margin-top:4px;padding:2px 8px;border-radius:999px;font-size:.72rem;font-weight:600;color:var(--profile-accent,var(--accent,#d4b45a));background:rgba(255,255,255,.06)}
      .profile-summary-status{display:inline-flex;align-items:center;gap:5px;font-size:.75rem;color:var(--muted,#9298a3)}
      .profile-summary-status i{width:8px;height:8px;border-radius:50%;background:#6b7280;display:inline-block}
      .profile-summary-status.is-online i{background:#3ddc84;box-shadow:0 0 6px rgba(61,220,132,.7)}
      .profile-summary-bio{margin:0;color:var(--muted,#9298a3);font-size:.9rem;line-height:1.5;overflow-wrap:anywhere;white-space:pre-wrap}
      .profile-summary-note{margin:0;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.04);color:var(--muted,#9298a3);font-size:.9rem}
      .profile-summary-tags{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
      .profile-summary-tag{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);min-width:0}
      .profile-summary-tag-icon{width:30px;height:30px;flex:0 0 auto;display:grid;place-items:center;border-radius:8px;overflow:hidden}
      .profile-summary-tag-icon img{width:100%;height:100%;object-fit:contain;display:block}
      .profile-summary-tag-copy{display:flex;flex-direction:column;min-width:0}
      .profile-summary-tag-copy small{color:var(--muted,#9298a3);font-size:.66rem;text-transform:uppercase;letter-spacing:.06em}
      .profile-summary-tag-copy b{font-size:.92rem;overflow-wrap:anywhere}
      .profile-summary-roles{display:flex;flex-wrap:wrap;gap:6px}
      .profile-summary-role{padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700;letter-spacing:.04em;background:rgba(255,255,255,.07)}
      .profile-summary-role[data-role="dev"],.profile-summary-role[data-role="admin"],.profile-summary-role[data-role="mod"],.profile-summary-role[data-role="moderador"]{color:#f2b84b}
      .profile-summary-role[data-role="vip"]{color:#4c8dff}
      .profile-summary-role[data-role="streamer"]{color:#b46bff}
      .profile-summary-role[data-role="beta"]{color:#ff9d2e}
      .profile-summary-role[data-role="membro"]{color:#9298a3}
      .profile-summary-joined{color:var(--muted,#9298a3);font-size:.78rem}
      .profile-summary .profile-stream-btn{align-self:flex-start}
    `;
    document.head.appendChild(s);
    _summaryStylesInjected = true;
  }
  function summaryRankIcon(rank) {
    const c = rankCandidatesForRank(rank); if (!c.length) return null;
    const w = node("span", null, "profile-summary-tag-icon");
    const img = node("img"); img.alt=""; img.loading="lazy";
    loadImageWithFallback(img, c); w.append(img);
    return w;
  }
  function summaryHeroIcon(name) {
    const url = heroImageUrl(name); if (!url) return null;
    const w = node("span", null, "profile-summary-tag-icon");
    const img = node("img"); img.alt=""; img.loading="lazy";
    img.src = url; img.onerror = () => { img.hidden = true; };
    w.append(img);
    return w;
  }
  /* [v11] — ícone da rota no resumo (DM, LFG, etc.). */
  function summaryRoleIcon(value) {
    const url = roleImageFor(value); if (!url) return null;
    const w = node("span", null, "profile-summary-tag-icon");
    const img = node("img"); img.alt=""; img.loading="lazy"; img.decoding="async";
    img.src = url; img.onerror = () => { img.hidden = true; };
    w.append(img);
    return w;
  }
  function summaryTag(label, value, icon) {
    const item = node("span", null, "profile-summary-tag");
    if (icon) item.append(icon);
    const c = node("span", null, "profile-summary-tag-copy");
    c.append(node("small", label), node("b", value));
    item.append(c);
    return item;
  }
  function createProfileSummary(data, options) {
    ensureSummaryStyles(); ensureInlineBadgeStyles();
    const d = data && typeof data === "object" ? data : {};
    const opts = options || {};
    const nick = d.username || d.nick || opts.nick || "";
    const dn = d.display_name || d.display || nick || "Jogador";
    const root = node("div", null, "profile-summary");

    const head = node("div", null, "profile-summary-head");
    head.append(createAvatar({ ...d, display_name: dn, username: nick }, "profile-summary-avatar"));
    const identity = node("div", null, "profile-summary-id");
    const nameRow = node("div", null, "profile-summary-name");
    nameRow.append(node("b", dn));
    const role = roleFromProfile(d);
    const def = badgeDefForRole(role);
    if (def) {
      const b = node("span", null, "profile-verified-badge-inline");
      b.setAttribute("role","img"); b.dataset.badge = ROLE_TO_BADGE[role] || ""; b.dataset.role = role;
      if (def.emoji) {
        b.textContent = def.emoji; b.style.color = ""; b.style.fontSize = "18px";
        b.style.lineHeight = "1"; b.style.filter = `drop-shadow(0 0 5px ${def.color}aa)`;
      } else {
        b.innerHTML = def.svg; b.style.color = def.color;
        b.style.filter = `drop-shadow(0 0 5px ${def.color}88)`;
      }
      const l = badgeLabelForRole(role);
      b.setAttribute("aria-label", l); b.setAttribute("title", l);
      nameRow.append(b);
    }
    identity.append(nameRow, node("small", "@" + (nick || "jogador"), "profile-summary-nick"));
    if (!d.details_hidden && d.title) identity.append(node("span", d.title, "profile-summary-title"));
    const online = typeof d.online === "boolean" ? d.online
      : typeof opts.online === "boolean" ? opts.online : null;
    if (online !== null) {
      const s = node("span", null, "profile-summary-status" + (online ? " is-online" : ""));
      s.append(node("i"), document.createTextNode(online ? "Online agora" : "Offline"));
      identity.append(s);
    }
    head.append(identity); root.append(head);
    if (d.details_hidden) {
      root.append(node("p", "🔒 Este perfil é " + (d.visibility === "friends" ? "visível apenas para amigos." : "privado."), "profile-summary-note"));
      return root;
    }
    if (d.is_private && !opts.isSelf) {
      root.append(node("p", "Este jogador mantém o perfil privado.", "profile-summary-note"));
      return root;
    }
    if (d.bio) root.append(node("p", d.bio, "profile-summary-bio"));
    const sd = streamInfo(d);
    if (sd) root.append(createStreamLink(sd, "profile-stream-btn"));
    const tags = node("div", null, "profile-summary-tags");
    if (d.rank) {
      const stars = profileStars(d);
      tags.append(summaryTag("Rank", stars == null ? d.rank : d.rank + " · " + stars + " ★", summaryRankIcon(d.rank)));
    }
    /* [v11] — agora com ícone da rota também no resumo. */
    if (d.game_role) tags.append(summaryTag("Função principal", d.game_role, summaryRoleIcon(d.game_role)));
    if (d.hero) tags.append(summaryTag("Herói principal", d.hero, summaryHeroIcon(d.hero)));
    if (d.gid) tags.append(summaryTag("ID no jogo", d.gid, null));
    if (tags.childElementCount) root.append(tags);
    else root.append(node("p", "Este jogador ainda não preencheu os dados de jogo.", "profile-summary-note"));
    const roles = Array.isArray(d.community_roles) ? d.community_roles : [];
    if (roles.length) {
      const box = node("div", null, "profile-summary-roles");
      roles.forEach(rn => {
        const chip = node("span", String(rn), "profile-summary-role");
        chip.dataset.role = String(rn).toLowerCase();
        box.append(chip);
      });
      root.append(box);
    }
    if (d.joined_at) root.append(node("small", formatJoined(d.joined_at), "profile-summary-joined"));
    return root;
  }

  function setProfile(nextProfile, username) {
    const expected = pendingStreamUrl;
    pendingStreamUrl = null;
    renderProfile(nextProfile, username);
    if (expected && nextProfile && !nextProfile.stream_url) {
      console.warn("[ProfileUI] O servidor não devolveu stream_url após o profile_set.", { enviado: expected });
      context?.toast?.("O servidor não salvou o canal. É preciso atualizar o backend (campo stream_url).");
    }
    const d = safe("profileEditor");
    if (d && d.open) { d.close(); context?.toast?.("Perfil atualizado com sucesso."); }
  }
  function settingsSaved(nextProfile) {
    renderProfile(nextProfile, context?.getUsername?.());
    const p = safe("privacySettingsMessage");
    if (p) { p.textContent = "Preferências salvas."; p.classList.remove("is-error"); }
    const n = safe("notificationSettingsMessage");
    if (n) { n.textContent = "Preferências salvas."; n.classList.remove("is-error"); }
  }
  function showError(targetId, message) {
    const t = safe(targetId); if (!t) return;
    t.textContent = message; t.classList.add("is-error");
  }

  function debugRole() {
    const data = selfProfile || window.__selfProfile || profile || {};
    const roles = rolesFromProfile(data);
    const best = roleFromProfile(data);
    console.group("[ProfileUI] Diagnóstico de cargo");
    console.log("data.role              →", data.role);
    console.log("data.community_roles   →", data.community_roles);
    console.log("rolesFromProfile(data) →", roles);
    console.log("roleFromProfile(data)  →", best);
    console.log("É dev?                 →", roles.includes("dev"));
    console.groupEnd();
    return { roles, best };
  }

  // ─────────────────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────────────────
  window.ProfileUI = {
    createAvatar, mount, renderProfile, setProfile, settingsSaved, showError,
    renderOtherProfile, returnToSelf, getMode, getCurrentUserId,
    roleFromProfile, rolesFromProfile, hasAnyBadge,
    badgeKeyForRole, badgeColorForRole, badgeLabelForRole, badgeSvgForRole, badgeEmojiForRole,
    renderVerifiedBadge, renderSidebarVerifiedBadge,
    renderSidebarUsername, looksLikeSameName,
    hasVerifiedRole, verifiedRoleKey, verifiedRoleLabel,
    applyFriendshipStatus, handleFriendClick,
    rankBasesFor, rankImageCandidatesFromBases, rankCandidatesForRank, heroImageUrl, RANK_OPTIONS,
    createProfileSummary, profileStars, formatJoined,
    parseStreamUrl, liveUrlFor, isStreamerProfile, streamInfo, createStreamLink,
    applyAvatarShape, applyAccent, AVATAR_SHAPES,
    FRAME_CATALOG, THEME_CATALOG, TIER_ACCESS,
    userRoles, userRoleKey, requirementsForItem, userCanUse,
    isFrameAllowed, isThemeAllowed, applyRoleGating, syncSwatchSelection,
    buildRankPicker, buildHeroPicker, syncRankSelection, syncHeroSelection, filterHeroes,
    // [v11]
    ROLE_CATALOG, roleImageUrl, roleImageFor, buildRolePicker, syncRoleSelection, summaryRoleIcon,
    // [v24]
    accessMessage, ensureSelectOptions,
    debugRole,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (window.__selfProfile) {
        renderSidebarVerifiedBadge(window.__selfProfile);
        renderSidebarUsername(window.__selfProfile, window.__selfProfile.username, window.__selfProfile.display_name);
        applyAvatarShape(window.__selfProfile.avatar_shape || "round");
        applySidebarAvatarChrome(window.__selfProfile);
      }
    });
  } else if (window.__selfProfile) {
    renderSidebarVerifiedBadge(window.__selfProfile);
    renderSidebarUsername(window.__selfProfile, window.__selfProfile.username, window.__selfProfile.display_name);
    applyAvatarShape(window.__selfProfile.avatar_shape || "round");
    applySidebarAvatarChrome(window.__selfProfile);
  }

  document.addEventListener("profile:self-updated", ev => {
    const d = ev?.detail?.profile;
    if (d) {
      renderSidebarVerifiedBadge(d);
      renderSidebarUsername(d, d.username, d.display_name);
      applyAvatarShape(d.avatar_shape || "round");
      applySidebarAvatarChrome(d);
    }
  });
  window.addEventListener("profile:self-updated", ev => {
    const d = ev?.detail?.profile;
    if (d) {
      renderSidebarVerifiedBadge(d);
      renderSidebarUsername(d, d.username, d.display_name);
      applyAvatarShape(d.avatar_shape || "round");
      applySidebarAvatarChrome(d);
    }
  });
})();