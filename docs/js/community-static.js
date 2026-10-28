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
  const ITEM_IMAGE_DIR = "img/icons/itens/";

const BUILD_ITEM_CATALOG = [
  {name:"Botas de Guerreiro",  category:"botas", file:"warrior_boots"},
  {name:"Botas Resistentes",   category:"botas", file:"tough_boots"},
  {name:"Botas Rápidas",       category:"botas", file:"swift_boots"},
  {name:"Botas Arcanas",       category:"botas", file:"arcane_boots"},
  {name:"Botas Mágicas",       category:"botas", file:"magic_boots"},
  {name:"Botas Demoníacas",    category:"botas", file:"demon_boots"},
  {name:"Botas Ligeiras",      category:"botas", file:"rapid_boots"},
  {name:"Lâmina do Desespero",           category:"fisico", file:"blade_of_despair",       aliases:["Lâmina da Desespero"]},
  {name:"Fúria do Berserker",            category:"fisico", file:"berserkers_fury"},
  {name:"Garras de Haas",                category:"fisico", file:"haass_claws"},
  {name:"Vento da Natureza",             category:"fisico", file:"wind_of_nature"},
  {name:"Espada do Caçador de Demônios", category:"fisico", file:"demon_hunter_sword"},
  {name:"Bastão Dourado",                category:"fisico", file:"golden_staff"},
  {name:"Foice da Corrosão",             category:"fisico", file:"corrosion_scythe"},
  {name:"Falador do Vento",              category:"fisico", file:"windtalker",             aliases:["Garras da Tempestade"]},
  {name:"Rugido Maléfico",               category:"fisico", file:"malefic_roar",           aliases:["Rugido do Maléfico"]},
  {name:"Lâmina dos Sete Mares",         category:"fisico", file:"blade_of_the_heptaseas", aliases:["Lâmina das Heptaseas"]},
  {name:"Batalha Infinita",              category:"fisico", file:"endless_battle"},
  {name:"Machado de Guerra",             category:"fisico", file:"war_axe"},
  {name:"Alabarda Marinha",              category:"fisico", file:"sea_halberd",            aliases:["Foice da Natureza"]},
  {name:"Lança do Dragão",               category:"fisico", file:"great_dragon_spear",     aliases:["Flecha do Grande Dragão"]},
  {name:"Martelo da Fúria",              category:"fisico", file:"fury_hammer"},
  {name:"Meteoro de Ouro Rosa",          category:"fisico", file:"rose_gold_meteor"},
  {name:"Golpe do Caçador",              category:"fisico", file:"hunter_strike",          aliases:["Ataque do Caçador"]},
  {name:"Perfurador Celeste",            category:"fisico", file:"sky_piercer"},
  {name:"Arma Maléfica",                 category:"fisico", file:"malefic_gun"},
  {name:"Meteoro Renegado",              category:"fisico", file:"rogue_meteor"},
  {name:"Marreta Vampírica",             category:"fisico", file:"vampire_mallet"},
  {name:"Machadinha do Ogro",            category:"fisico", file:"ogre_tomahawk"},
  {name:"Espada da Legião",              category:"fisico", file:"legion_sword"},
  {name:"Lança Comum",                   category:"fisico", file:"regular_spear"},
  {name:"Arco de Caça de Ferro",         category:"fisico", file:"iron_hunting_bow"},
  {name:"Dardo",                         category:"fisico", file:"javelin"},
  {name:"Faca",                          category:"fisico", file:"knife"},
  {name:"Adaga",                         category:"fisico", file:"dagger"},
  {name:"Besta Rápida",                  category:"fisico", file:"swift_crossbow"},
  {name:"Talismã Encantado",          category:"magico", file:"enchanted_talisman"},
  {name:"Cristal Sagrado",            category:"magico", file:"holy_crystal"},
  {name:"Glaive Divina",              category:"magico", file:"divine_glaive"},
  {name:"Varinha do Gênio",           category:"magico", file:"genius_wand"},
  {name:"Varinha da Rainha do Gelo",  category:"magico", file:"ice_queen_wand"},
  {name:"Varinha Brilhante",          category:"magico", file:"glowing_wand"},
  {name:"Asas de Sangue",             category:"magico", file:"blood_wings"},
  {name:"Coroa do Inverno",           category:"magico", file:"winter_crown"},
  {name:"Relógio do Destino",         category:"magico", file:"clock_of_destiny"},
  {name:"Energia Concentrada",        category:"magico", file:"concentrated_energy"},
  {name:"Pena do Paraíso",            category:"magico", file:"feather_of_heaven"},
  {name:"Frasco do Oásis",            category:"magico", file:"flask_of_the_oasis"},
  {name:"Lanterna dos Desejos",       category:"magico", file:"wishing_lantern"},
  {name:"Gema Elegante",              category:"magico", file:"elegant_gem"},
  {name:"Lâmina Azure",               category:"magico", file:"azure_blade",            aliases:["Espada Azure"]},
  {name:"Cajado do Trovão",           category:"magico", file:"lightning_truncheon"},
  {name:"Foice Estelar",              category:"magico", file:"starlium_scythe"},
  {name:"Tempo Fugaz",                category:"magico", file:"fleeting_time"},
  {name:"Flor da Esperança",          category:"magico", file:"flower_of_hope"},
  {name:"Lanterna da Esperança",      category:"magico", file:"lantern_of_hope"},
  {name:"Lâmina Mágica",              category:"magico", file:"magic_blade"},
  {name:"Livro dos Sábios",           category:"magico", file:"book_of_sages"},
  {name:"Códice Misterioso",          category:"magico", file:"mystery_codex"},
  {name:"Tomo do Mal",                category:"magico", file:"tome_of_evil"},
  {name:"Varinha Mágica",             category:"magico", file:"magic_wand"},
  {name:"Colar Mágico",               category:"magico", file:"magic_necklace"},
  {name:"Cristal de Poder",           category:"magico", file:"power_crystal"},
  {name:"Cristal de Vitalidade",      category:"magico", file:"vitality_crystal"},
  {name:"Poção Mágica",               category:"magico", file:"magic_potion"},
  {name:"Poção de Poder",             category:"magico", file:"power_potion"},
  {name:"Poção de Pedra",             category:"magico", file:"rock_potion"},
  {name:"Cinto do Trovão",          category:"defesa", file:"thunder_belt"},
  {name:"Armadura de Lâminas",      category:"defesa", file:"blade_armor"},
  {name:"Imortalidade",             category:"defesa", file:"immortality"},
  {name:"Peitoral Antigo",          category:"defesa", file:"antique_cuirass",        aliases:["Armadura Antiga"]},
  {name:"Armadura Radiante",        category:"defesa", file:"radiant_armor"},
  {name:"Escudo de Atena",          category:"defesa", file:"athenas_shield"},
  {name:"Dominância do Gelo",       category:"defesa", file:"dominance_ice"},
  {name:"Oráculo",                  category:"defesa", file:"oracle"},
  {name:"Capacete Guardião",        category:"defesa", file:"guardian_helmet"},
  {name:"Peitoral da Força Bruta",  category:"defesa", file:"brute_force_breastplate"},
  {name:"Capacete Amaldiçoado",     category:"defesa", file:"cursed_helmet"},
  {name:"Asas da Rainha",           category:"defesa", file:"queens_wings"},
  {name:"Cinto de Ares",            category:"defesa", file:"ares_belt"},
  {name:"Escudo de Gelo Negro",     category:"defesa", file:"black_ice_shield"},
  {name:"Armadura Couraçada",       category:"defesa", file:"dreadnaught_armor"},
  {name:"Véu Exótico",              category:"defesa", file:"exotic_veil"},
  {name:"Túnica do Silêncio",       category:"defesa", file:"silence_robe"},
  {name:"Perneiras de Aço",         category:"defesa", file:"steel_legplates"},
  {name:"Peitoral de Couro",        category:"defesa", file:"leather_jerkin"},
  {name:"Essência Derretida",       category:"defesa", file:"molten_essence"},
  {name:"Contêiner Místico",        category:"defesa", file:"mystic_container"},
  {name:"Ombreira de Punição",      category:"defesa", file:"chastise_pauldron"},
  {name:"Luvas de Especialista",    category:"defesa", file:"expert_gloves"},
  {name:"Colar de Cura",            category:"defesa", file:"healing_necklace"},
  {name:"Manto de Resistência Mágica", category:"defesa", file:"magic_resist_cloak"},
  {name:"Retribuição de Gelo",      category:"selva", file:"ice_retribution"},
  {name:"Retribuição de Fogo",      category:"selva", file:"flame_retribution"},
  {name:"Retribuição Sangrenta",    category:"selva", file:"bloody_retribution"},
  {name:"Bênção do Encorajamento",  category:"roaming", file:"encourage"},
  {name:"Bênção da Ocultação",      category:"roaming", file:"conceal"},
  {name:"Bênção do Golpe Certeiro", category:"roaming", file:"dire_hit"},
  {name:"Bênção do Favor",          category:"roaming", file:"favor"}
];

function communityDate(timestamp){
  return new Intl.DateTimeFormat("pt-BR", {dateStyle:"short", timeStyle:"short"})
    .format(new Date(timestamp * 1000));
}

function communityRelativeDate(timestamp){
  const date = new Date(Number(timestamp) * 1000);
  if (Number.isNaN(date.getTime())) return "Data não disponível";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units = [
    ["year", 31536000], ["month", 2592000], ["week", 604800],
    ["day", 86400], ["hour", 3600], ["minute", 60]
  ];
  for (const [unit, length] of units) {
    if (Math.abs(seconds) >= length) {
      return new Intl.RelativeTimeFormat("pt-BR", {numeric:"auto"})
        .format(Math.round(seconds / length), unit);
    }
  }
  return new Intl.RelativeTimeFormat("pt-BR", {numeric:"auto"}).format(seconds, "second");
}

function communityLaneName(lane){
  return ({EXP:"EXP", Jungle:"Selva · Jungle", Mid:"Meio · Mid",
    Gold:"Ouro · Gold", Roam:"Roam · Suporte"})[lane] || lane;
}

function communityRating(entry){ return Number(entry.helpful || 0); }

function homeCommunityRow(title, details, metric, destination, hero){
  const button = el("button", null, "home-preview-row" + (hero ? " has-hero-icon" : ""));
  button.type = "button";
  if (hero) button.append(getIcon("herois", hero));
  const copy = el("span", null, "home-preview-copy");
  copy.append(el("b", title), el("small", details));
  const summary = el("span", null, "home-preview-summary");
  summary.append(el("small", metric), el("span", "→", "home-preview-arrow"));
  button.append(copy, summary);
  button.setAttribute("aria-label", title + ". " + details + ". Abrir " +
    (destination === "builds" ? "builds" : "meta por rota"));
  button.addEventListener("click", () => {
    if (hero && window.SocietyHero) window.SocietyHero.open(hero);
    else tab(destination);
  });
  return button;
}

const HOME_TIER_ORDER = ["S+", "S", "A+", "A", "B+", "B", "C", "D"];

function homeTierRank(tier){
  const index = HOME_TIER_ORDER.indexOf(String(tier).toUpperCase());
  return index === -1 ? HOME_TIER_ORDER.length : index;
}

const META_LANE_ORDER = ["EXP", "Jungle", "Mid", "Gold", "Roam"];

const META_TIER_ORDER = ["S", "A", "B", "C"];

const CATALOG_LANE_KEYS = {
  EXP: ["exp lane"],
  Jungle: ["jungling", "jungle"],
  Mid: ["mid lane"],
  Gold: ["gold lane"],
  Roam: ["roaming", "roam"]
};

function catalogHeroByName(name){
  const list = window.HERO_CATALOG || [];
  const target = String(name || "").trim().toLocaleLowerCase("pt-BR");
  if (!target) return null;
  return list.find(hero => String(hero.name).toLocaleLowerCase("pt-BR") === target) || null;
}

function catalogImage(url){
  if (!url) return "";
  return (window.HeroCatalog && typeof window.HeroCatalog.routeImg === "function")
    ? window.HeroCatalog.routeImg(url) : url;
}

function heroArtUrl(hero){
  return hero ? catalogImage(hero.wallpaper || hero.head || hero.file || "") : "";
}

function heroPortraitUrl(hero){
  return hero ? catalogImage(hero.file || hero.head || hero.wallpaper || "") : "";
}

function heroRolesText(hero){
  if (!hero || !Array.isArray(hero.roles) || !hero.roles.length) return "";
  const label = window.HeroCatalog && window.HeroCatalog.roleLabel;
  return hero.roles.map(role => (label ? label(role) : role)).join(" / ");
}

function heroInitials(name){
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map(part => part.charAt(0).toLocaleUpperCase("pt-BR")).join("");
}

function heroImageEl(url, name, cls, eager){
  const img = el("img", null, cls);
  img.alt = "";
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.src = url;
  img.addEventListener("error", () => {
    const fallback = el("span", heroInitials(name), "hero-photo-fallback");
    if (img.parentNode) img.parentNode.replaceChild(fallback, img);
  }, {once:true});
  return img;
}

function heroTierRank(tier){
  const index = META_TIER_ORDER.indexOf(String(tier || "").toUpperCase());
  return index === -1 ? META_TIER_ORDER.length : index;
}

function laneFromCatalog(value){
  const lane = String(value || "").toLocaleLowerCase("pt-BR");
  if (lane.includes("exp")) return "EXP";
  if (lane.includes("jung")) return "Jungle";
  if (lane.includes("mid")) return "Mid";
  if (lane.includes("gold")) return "Gold";
  if (lane.includes("roam")) return "Roam";
  return "";
}

function catalogLaneHeroes(lane, limit){
  const keys = CATALOG_LANE_KEYS[lane] || [];
  const list = (window.HERO_CATALOG || []).filter(hero =>
    (hero.lanes || []).some(laneName =>
      keys.includes(String(laneName).toLocaleLowerCase("pt-BR"))));
  list.sort((a, b) => heroTierRank(a.tier) - heroTierRank(b.tier) || (b.win || 0) - (a.win || 0));
  return limit ? list.slice(0, limit) : list;
}

function catalogTopHeroes(limit){
  const list = (window.HERO_CATALOG || []).slice().sort((a, b) =>
    heroTierRank(a.tier) - heroTierRank(b.tier) || (b.win || 0) - (a.win || 0));
  return limit ? list.slice(0, limit) : list;
}

function tierBadge(tier, cls){
  if (!tier) return null;
  const badge = el("span", String(tier), cls || "meta-tier-badge");
  badge.dataset.tier = String(tier).charAt(0).toUpperCase();
  return badge;
}

function metaEntriesByRating(lane){
  return COMMUNITY_META
    .filter(entry => !lane || entry.lane === lane)
    .sort((a, b) => communityRating(b) - communityRating(a) ||
      Number(b.created_at) - Number(a.created_at));
}

function laneHighlight(lane, used){
  const entries = metaEntriesByRating(lane);
  const referenceHeroes = catalogLaneHeroes(lane, 8);
  const taken = used || new Set();
  let hero = null, primaryName = "";

  if (entries.length) {
    primaryName = entries[0].hero;
    hero = catalogHeroByName(primaryName) || referenceHeroes[0] || null;
  } else {
    hero = referenceHeroes.find(item =>
      !taken.has(String(item.name).toLocaleLowerCase("pt-BR"))) || referenceHeroes[0] || null;
    if (hero) taken.add(String(hero.name).toLocaleLowerCase("pt-BR"));
    primaryName = hero ? hero.name : "";
  }

  return {
    entries,
    referenceHeroes,
    hero,
    primaryName,
    tier: entries.length ? entries[0].tier : (hero && hero.tier)
  };
}

function metaLaneCard(lane, used){
  const { entries, referenceHeroes, hero, primaryName, tier } = laneHighlight(lane, used);
  const card = el("button", null, "meta-lane-card" + (entries.length ? "" : " is-reference"));
  card.type = "button";
  card.setAttribute("aria-label", "Ver meta da rota " + communityLaneName(lane));

  const art = el("span", null, "meta-lane-art");
  const url = heroArtUrl(hero);
  if (url) art.append(heroImageEl(url, primaryName, "meta-lane-img", true));
  else {
    art.classList.add("is-empty");
    art.append(el("span", heroInitials(primaryName), "hero-photo-fallback"));
  }
  card.append(art);

  const content = el("span", null, "meta-lane-content");
  content.append(el("span", communityLaneName(lane), "meta-lane-label"));
  content.append(el("b", primaryName || "Sem indicação", "meta-lane-name"));

  const info = el("span", null, "meta-lane-info");
  const badge = tierBadge(tier, "meta-tier-badge is-small");
  if (badge) info.append(badge);
  info.append(el("small", entries.length
    ? "▲ " + communityRating(entries[0]) + " relevantes · " + entries[0].patch
    : "Referência do catálogo"));
  content.append(info);

  const picks = entries.length
    ? entries.slice(0, 4).map(entry => entry.hero)
    : referenceHeroes.map(item => item.name);
  const thumbs = el("span", null, "meta-lane-thumbs");
  picks.filter(name => name && name !== primaryName).slice(0, 3).forEach(name => {
    const thumb = el("span", null, "meta-lane-thumb");
    thumb.title = name;
    const thumbUrl = heroPortraitUrl(catalogHeroByName(name));
    if (thumbUrl) thumb.append(heroImageEl(thumbUrl, name, ""));
    else thumb.append(el("span", heroInitials(name), "hero-photo-fallback"));
    thumbs.append(thumb);
  });
  if (thumbs.childElementCount) content.append(thumbs);
  card.append(content);

  card.addEventListener("click", () => {
    COMMUNITY_META_LANE = lane;
    tab("meta");
    const target = $("metaList");
    if (target) target.scrollIntoView({behavior:"smooth", block:"start"});
  });
  return card;
}

function renderMetaLaneShowcase(){
  const wrap = $("metaLaneShowcase");
  if (!wrap) return;
  wrap.replaceChildren();
  if (!(window.HERO_CATALOG || []).length && !COMMUNITY_META.length) {
    wrap.append(el("p", "Carregando heróis do catálogo...", "community-game-message"));
    return;
  }
  const used = new Set();
  META_LANE_ORDER.forEach(lane => wrap.append(metaLaneCard(lane, used)));
}

function metaSuggestionCard(hero, lane){
  const card = el("article", null, "meta-suggest-card");
  const art = el("span", null, "meta-suggest-art");
  const url = heroArtUrl(hero);
  if (url) art.append(heroImageEl(url, hero.name, "meta-suggest-img"));
  else art.append(el("span", heroInitials(hero.name), "hero-photo-fallback"));
  const badge = tierBadge(hero.tier, "meta-tier-badge is-small");
  if (badge) art.append(badge);
  card.append(art);

  const body = el("div", null, "meta-suggest-body");
  body.append(el("b", hero.name, "meta-suggest-name"));
  const details = [heroRolesText(hero),
    hero.win != null ? Number(hero.win).toFixed(1) + "% win" : ""].filter(Boolean).join(" · ");
  body.append(el("small", details || "Herói do catálogo", "meta-suggest-meta"));

  const pick = el("button", "Indicar", "meta-suggest-pick");
  pick.type = "button";
  pick.setAttribute("aria-label", "Indicar " + hero.name + " para o meta");
  pick.addEventListener("click", () => indicateHero(hero.name, lane));
  body.append(pick);
  card.append(body);
  return card;
}

function indicateHero(name, lane){
  if (window.MetaPicker && typeof window.MetaPicker.select === "function") {
    window.MetaPicker.select(name);
  }
  if (lane && $("metaLane")) $("metaLane").value = lane;
  showCommunityMessage("meta", name + " selecionado. Complete rota, nível e patch para publicar.", false);
  const form = $("metaForm");
  if (form) {
    form.scrollIntoView({behavior:"smooth", block:"center"});
    setTimeout(() => {
      const patch = $("metaPatch");
      if (patch) patch.focus({preventScroll:true});
    }, 320);
  }
}

function renderMetaSuggestions(){
  const box = $("metaSuggestions"), grid = $("metaSuggestGrid");
  if (!box || !grid) return;

  const lane = COMMUNITY_META_LANE;
  let heroes;
  if (lane === "all") {
    const seen = new Set();
    heroes = META_LANE_ORDER
      .flatMap(item => catalogLaneHeroes(item, 2))
      .filter(hero => {
        const key = String(hero.name).toLocaleLowerCase("pt-BR");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } else {
    heroes = catalogLaneHeroes(lane, 10);
  }
  heroes = heroes.slice(0, 12);

  grid.replaceChildren();
  const count = $("metaSuggestCount");
  if (!heroes.length) {
    box.hidden = true;
    if (count) count.textContent = "";
    return;
  }
  box.hidden = false;
  if (count) {
    count.textContent = heroes.length + (heroes.length === 1 ? " herói" : " heróis") +
      (lane === "all" ? " · todas as rotas" : " · " + communityLaneName(lane));
  }
  heroes.forEach(hero => grid.append(metaSuggestionCard(hero, lane === "all" ? "" : lane)));
}

function metaHeroStats(hero){
  const row = el("div", null, "meta-route-stats");
  [["WIN", hero.win, "win"], ["PICK", hero.pick, "pick"], ["BAN", hero.ban, "ban"]].forEach(([label, value, kind]) => {
    if (value == null) return;
    const cell = el("span", null, "meta-route-stat");
    cell.dataset.kind = kind;
    cell.append(el("small", label), el("b", Number(value).toFixed(1) + "%"));
    row.append(cell);
  });
  return row;
}

function metaHeroCard(entry){
  const hero = catalogHeroByName(entry.hero);
  const card = el("article", null, "community-meta-card meta-route-card");

  const art = el("button", null, "meta-route-art");
  art.type = "button";
  art.setAttribute("aria-label", "Abrir a página de " + entry.hero);
  const url = heroArtUrl(hero);
  if (url) art.append(heroImageEl(url, entry.hero, "meta-route-img"));
  else {
    art.classList.add("is-empty");
    art.append(el("span", heroInitials(entry.hero), "hero-photo-fallback"));
  }
  const badge = tierBadge(entry.tier, "meta-route-tier");
  if (badge) art.append(badge);
  art.append(el("span", communityLaneName(entry.lane), "meta-route-lane"));
  art.append(el("span", entry.hero, "meta-route-name"));
  art.addEventListener("click", () => openHeroPage(entry.hero));
  card.append(art);

  const body = el("div", null, "meta-route-body");
  const tags = el("div", null, "meta-route-tags");
  tags.append(el("span", "Patch " + entry.patch, "community-game-tag"));
  const roles = heroRolesText(hero);
  if (roles) tags.append(el("span", roles, "community-game-tag is-muted"));
  body.append(tags);

  if (entry.notes) body.append(el("p", entry.notes, "meta-route-notes"));
  if (hero) body.append(metaHeroStats(hero));

  const byline = el("p", null, "community-meta-subline");
  byline.textContent = "por " + entry.author + " · " + communityDate(entry.created_at);
  body.append(byline);

  const votes = createCommunityVoteActions("meta", entry);
  votes.classList.add("meta-route-votes");
  body.append(votes);

  card.append(body);
  return card;
}

function renderCommunityMeta(){
  const list = $("metaList");
  if (!list) return;
  document.querySelectorAll("[data-meta-lane]").forEach(option => {
    option.setAttribute("aria-pressed", String(option.dataset.metaLane === COMMUNITY_META_LANE));
  });
  refreshMetaPatchFilter();
  renderMetaLaneShowcase();
  renderMetaSuggestions();

  list.replaceChildren();
  const patch = $("metaPatchFilter") ? $("metaPatchFilter").value : "";
  const entries = COMMUNITY_META
    .filter(entry => (COMMUNITY_META_LANE === "all" || entry.lane === COMMUNITY_META_LANE) &&
      (!patch || entry.patch === patch))
    .sort((a, b) => communityRating(b) - communityRating(a) ||
      Number(b.created_at) - Number(a.created_at));

  const empty = $("metaEmpty");
  if (empty) empty.hidden = entries.length > 0;
  list.classList.toggle("is-empty", entries.length === 0);
  entries.forEach(entry => list.append(metaHeroCard(entry)));
}

function homeHeroCard(item){
  const hero = catalogHeroByName(item.name);
  const card = el("button", null, "home-tier-card" + (item.reference ? " is-reference" : ""));
  card.type = "button";
  card.setAttribute("aria-label", "Abrir a página de " + item.name);

  const art = el("span", null, "home-tier-art");
  const url = heroArtUrl(hero);
  if (url) art.append(heroImageEl(url, item.name, "home-tier-img"));
  else {
    art.classList.add("is-empty");
    art.append(el("span", heroInitials(item.name), "hero-photo-fallback"));
  }
  const badge = tierBadge(item.tier, "home-tier-badge");
  if (badge) art.append(badge);
  if (item.reference) art.append(el("span", "CATÁLOGO", "home-tier-ref"));

  const copy = el("span", null, "home-tier-copy");
  copy.append(el("b", item.name, "home-tier-name"));
  copy.append(el("small",
    [item.lane ? communityLaneName(item.lane) : "", item.metric].filter(Boolean).join(" · "),
    "home-tier-meta"));
  card.append(art, copy);
  card.addEventListener("click", () => openHeroPage(item.name));
  return card;
}

function homeLaneCard(lane, used){
  const { entries, referenceHeroes, hero, primaryName, tier } = laneHighlight(lane, used);

  const card = el("button", null, "home-lane-card" + (entries.length ? "" : " is-reference"));
  card.type = "button";
  card.setAttribute("aria-label", "Abrir meta da rota " + communityLaneName(lane));

  const art = el("span", null, "home-lane-art");
  const url = heroArtUrl(hero);
  if (url) art.append(heroImageEl(url, primaryName, "home-lane-img", true));
  else {
    art.classList.add("is-empty");
    art.append(el("span", heroInitials(primaryName), "hero-photo-fallback"));
  }
  const badge = tierBadge(tier, "home-lane-tier");
  if (badge) art.append(badge);

  const content = el("span", null, "home-lane-content");
  content.append(el("span", communityLaneName(lane), "home-lane-label"));
  content.append(el("b", primaryName || "Sem indicação", "home-lane-name"));
  content.append(el("small", entries.length
    ? "▲ " + communityRating(entries[0]) + " relevantes · " + entries[0].patch
    : "Referência do catálogo", "home-lane-meta"));

  const picks = entries.length
    ? entries.slice(0, 4).map(entry => entry.hero)
    : referenceHeroes.map(item => item.name);
  const thumbs = el("span", null, "home-lane-thumbs");
  picks.filter(name => name && name !== primaryName).slice(0, 3).forEach(name => {
    const thumb = el("span", null, "home-lane-thumb");
    thumb.title = name;
    const thumbUrl = heroPortraitUrl(catalogHeroByName(name));
    if (thumbUrl) thumb.append(heroImageEl(thumbUrl, name, ""));
    else thumb.append(el("span", heroInitials(name), "hero-photo-fallback"));
    thumbs.append(thumb);
  });
  if (thumbs.childElementCount) content.append(thumbs);

  card.append(art, content);
  card.addEventListener("click", () => {
    COMMUNITY_META_LANE = lane;
    tab("meta");
    const target = $("metaList");
    if (target) target.scrollIntoView({behavior:"smooth", block:"start"});
  });
  return card;
}

function renderHomeMetaLanes(){
  const wrap = $("homeMetaLanes");
  if (!wrap) return;
  wrap.replaceChildren();
  if (!COMMUNITY_META.length && !(window.HERO_CATALOG || []).length) {
    wrap.append(el("p", "Carregando meta da comunidade...", "home-preview-empty"));
    return;
  }
  const used = new Set();
  META_LANE_ORDER.forEach(lane => wrap.append(homeLaneCard(lane, used)));
}

function renderHomeLiveMeta(){
  const track = $("homeTickerTrack"), grid = $("homeTierPreview");
  if (!track && !grid) return;
  const byRating = (a, b) => communityRating(b) - communityRating(a) ||
    Number(b.created_at) - Number(a.created_at);
  const rated = [...COMMUNITY_META].sort(byRating);
  const byTier = [...COMMUNITY_META].sort((a, b) =>
    homeTierRank(a.tier) - homeTierRank(b.tier) || byRating(a, b));
  const referenceMode = rated.length === 0;

  if (track) {
    track.replaceChildren();
    const hot = referenceMode
      ? catalogTopHeroes(12).map(hero => ({hero:hero.name, tier:hero.tier, reference:true}))
      : rated.slice(0, 12);
    if (!hot.length) {
      track.classList.add("is-static");
      track.append(el("span", "Carregando heróis...", "home-ticker-item"));
    } else {
      track.classList.remove("is-static");
      [false, true].forEach(isCopy => hot.forEach(item => {
        const node = el("span", null, "home-ticker-item");
        if (isCopy) node.setAttribute("aria-hidden", "true");
        node.append(
          getIcon("herois", item.hero),
          el("b", item.hero),
          el("span", "Tier " + item.tier)
        );
        if (item.reference) node.append(el("span", "catálogo", "home-ticker-tag"));
        else node.append(el("span", "▲ " + communityRating(item), "home-ticker-up"));
        track.append(node);
      }));
    }
  }

  if (grid) {
    grid.replaceChildren();
    const cards = referenceMode
      ? catalogTopHeroes(8).map(hero => ({
          name: hero.name,
          tier: hero.tier,
          lane: laneFromCatalog((hero.lanes || [])[0]),
          metric: hero.win != null ? Number(hero.win).toFixed(1) + "% win" : "referência",
          reference: true
        }))
      : byTier.slice(0, 8).map(entry => ({
          name: entry.hero,
          tier: entry.tier,
          lane: entry.lane,
          metric: communityRating(entry) + " 👍 · " + entry.patch,
          reference: false
        }));
    if (!cards.length) grid.append(el("p", "Ainda não há heróis para mostrar.", "home-preview-empty"));
    cards.forEach(item => grid.append(homeHeroCard(item)));
    grid.classList.toggle("is-reference", cards.length > 0 && cards.every(item => item.reference));
  }
}

function renderHomeCommunityPreviews(){
  renderHomeLiveMeta();
  renderHomeMetaLanes();
  const trending = $("homeBuildTrending"), recent = $("homeBuildRecent");
  if (!trending || !recent) return;
  const topBuilds = COMMUNITY_BUILDS_TRENDING.slice(0, 3);
  const recentBuilds = COMMUNITY_BUILDS_RECENT.slice(0, 3);

  trending.replaceChildren();
  recent.replaceChildren();
  if (!topBuilds.length) trending.append(el("p", "Ainda não há builds para destacar.", "home-preview-empty"));
  topBuilds.forEach(entry => trending.append(homeCommunityRow(
    entry.hero,
    communityLaneName(entry.lane) + " · " + entry.patch + " · por " + entry.author,
    entry.helpful_30d + " úteis nos últimos 30 dias",
    "builds",
    entry.hero
  )));
  if (!recentBuilds.length) recent.append(el("p", "Ainda não há builds publicadas.", "home-preview-empty"));
  recentBuilds.forEach(entry => recent.append(homeCommunityRow(
    entry.hero,
    communityLaneName(entry.lane) + " · " + entry.patch + " · por " + entry.author,
    communityDate(entry.created_at),
    "builds",
    entry.hero
  )));
}

function getBuildFilters(){
  return {
    hero:$("buildHeroFilter").value.trim(),
    lane:$("buildLaneFilter").value,
    period:$("buildPeriodFilter").value,
    sort:$("buildSortFilter").value
  };
}

function loadBuildFiltersFromUrl(){
  const params = new URLSearchParams(location.search);
  $("buildHeroFilter").value = params.get("hero") || "";
  $("buildLaneFilter").value = ["EXP","Jungle","Mid","Gold","Roam"].includes(params.get("lane"))
    ? params.get("lane") : "";
  $("buildPeriodFilter").value = ["7d","30d","all"].includes(params.get("period"))
    ? params.get("period") : "30d";
  $("buildSortFilter").value = ["popular","recent"].includes(params.get("sort"))
    ? params.get("sort") : "popular";
}

function updateBuildUrl(filters){
  const url = new URL(location.href);
  ["hero","lane","period","sort"].forEach(key => url.searchParams.delete(key));
  if (filters.hero) url.searchParams.set("hero", filters.hero);
  if (filters.lane) url.searchParams.set("lane", filters.lane);
  url.searchParams.set("period", filters.period);
  url.searchParams.set("sort", filters.sort);
  history.pushState(null, "", url);
}

function refreshMetaPatchFilter(){
  const select = $("metaPatchFilter");
  if (!select) return;
  const selected = select.value;
  const patches = [...new Set(COMMUNITY_META.map(entry => entry.patch))]
    .filter(Boolean).sort().reverse();
  select.textContent = "";
  select.append(new Option("Todos", ""));
  patches.forEach(patch => select.append(new Option(patch, patch)));
  select.value = patches.includes(selected) ? selected : "";
}

function createCommunityVoteActions(scope, entry){
  const actions = el("div", null, scope === "builds"
    ? "community-vote-actions community-build-row-actions"
    : "community-vote-actions");
  const kind = scope === "meta" ? "community_meta_vote" : "community_build_vote";
  const choices = scope === "meta"
    ? [[1, "👍 Relevante", entry.helpful], [-1, "👎 Não concordo", entry.not_helpful]]
    : [[1, "▲ " + entry.helpful, entry.helpful], [-1, "▼ " + entry.not_helpful, entry.not_helpful]];
  choices.forEach(([value, label]) => {
    const button = el("button", label);
    button.type = "button";
    button.disabled = entry.own;
    button.setAttribute("aria-pressed", String(entry.my_vote === value));
    if (scope === "builds") {
      button.setAttribute("aria-label", value === 1
        ? "Marcar build como útil" : "Marcar build como não funcionou");
      button.title = entry.own ? "Você não pode avaliar sua própria publicação."
        : value === 1 ? "Útil na partida" : "Não funcionou";
    } else if (entry.own) {
      button.title = "Você não pode avaliar sua própria publicação.";
    }
    button.addEventListener("click", () => {
      if (IS_GUEST) return guestPrompt("Crie uma conta para avaliar publicações.");
      send({t:kind, id:entry.id, value});
    });
    actions.append(button);
  });
  return actions;
}

function iconSlug(name){
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getIcon(tipo, nome){
  const folders = {herois:"herois", itens:"itens", emblemas:"emblemas", feiticos:"feiticos"};
  const folder = folders[tipo];
  if (!folder) throw new Error("Tipo de ícone inválido: " + tipo);
  const name = String(nome || "").trim();
  const wrapper = el("span", null, "build-icon build-icon-" + tipo);
  wrapper.setAttribute("role", "img");
  wrapper.setAttribute("aria-label", name || "Ícone não informado");
  wrapper.title = name || "Ícone não informado";

  const size = tipo === "herois" ? 40 : tipo === "itens" ? 30 : 22;
  const image = el("img");
  const nameLower = name.toLocaleLowerCase("pt-BR");
  const nameSlug = iconSlug(name);
  let imageUrl = null;

  if (tipo === "herois") {
    const list = window.HERO_CATALOG || [];
    const knownHero = list.find(hero => hero.name.toLocaleLowerCase("pt-BR") === nameLower);
    if (knownHero && knownHero.file) {
      imageUrl = (window.HeroCatalog && window.HeroCatalog.imageUrl)
        ? window.HeroCatalog.imageUrl(knownHero)
        : knownHero.file;
    }
  } else if (tipo === "itens") {
    const knownItem = BUILD_ITEM_CATALOG.find(item => {
      if (item.name.toLocaleLowerCase("pt-BR") === nameLower) return true;
      if (Array.isArray(item.aliases) &&
          item.aliases.some(a => a.toLocaleLowerCase("pt-BR") === nameLower)) return true;
      if (iconSlug(item.name) === nameSlug) return true;
      if (Array.isArray(item.aliases) && item.aliases.some(a => iconSlug(a) === nameSlug)) return true;
      return false;
    });
    if (knownItem && knownItem.file) imageUrl = ITEM_IMAGE_DIR + knownItem.file + ".png";
  }

  if (!imageUrl) {
    wrapper.classList.add("is-placeholder");
    wrapper.append(el("span", name ? name.slice(0, 2).toLocaleUpperCase("pt-BR") : "—",
      "build-icon-placeholder"));
    return wrapper;
  }

  image.src = imageUrl;
  image.alt = "";
  image.width = size;
  image.height = size;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    wrapper.classList.add("is-placeholder");
    wrapper.replaceChildren(el("span", name.slice(0, 2).toLocaleUpperCase("pt-BR"),
      "build-icon-placeholder"));
  }, {once:true});
  wrapper.append(image);
  return wrapper;
}

function createBuildVoteSummary(entry, period){
  const helpful = period === "7d" ? Number(entry.helpful_7d || 0)
    : period === "30d" ? Number(entry.helpful_30d || 0) : Number(entry.helpful || 0);
  const score = el("span", helpful ? "▲ " + helpful : "0", "build-row-score");
  score.classList.toggle("has-votes", helpful > 0);
  score.setAttribute("aria-label", helpful + " avaliações positivas");
  return score;
}

function createBuildRow(entry, period){
  const row = el("article", null, "build-row");
  const open = el("button", null, "build-row-open");
  open.type = "button";
  open.setAttribute("aria-label", "Ver detalhes da build de " + entry.hero + ", rota " +
    communityLaneName(entry.lane) + ", publicada " + communityRelativeDate(entry.created_at));

  const hero = el("span", null, "build-row-hero");
  hero.append(getIcon("herois", entry.hero));
  const identity = el("span", null, "build-row-identity");
  identity.append(el("b", entry.hero), el("small", communityLaneName(entry.lane)));
  hero.append(identity);

  const itemIcons = el("span", null, "build-row-items");
  itemIcons.setAttribute("aria-label", "Itens na ordem de compra");
  const items = Array.isArray(entry.items) ? entry.items.slice(0, 6) : [];
  for (let index = 0; index < 6; index++) {
    const itemName = items[index] || "";
    const icon = getIcon("itens", itemName);
    icon.title = itemName ? (index + 1) + ". " + itemName : "Item " + (index + 1) + " não informado";
    icon.setAttribute("aria-label", itemName
      ? "Item " + (index + 1) + ": " + itemName : "Item " + (index + 1) + " não informado");
    itemIcons.append(icon);
  }

  const auxiliaryIcons = el("span", null, "build-row-auxiliary");
  auxiliaryIcons.append(getIcon("emblemas", entry.emblem), getIcon("feiticos", entry.spell));
  const author = el("span", null, "build-row-author");
  author.append(el("b", entry.author), el("small", communityRelativeDate(entry.created_at)));
  open.append(hero, itemIcons, auxiliaryIcons, author);
  open.addEventListener("click", () => {
    if (window.SocietyHero) window.SocietyHero.open(entry.hero, entry.id);
    else openBuildDetail(entry);
  });
  const voteArea = el("span", null, "build-row-voting");
  voteArea.append(createBuildVoteSummary(entry, period), createCommunityVoteActions("builds", entry));
  row.append(open, voteArea);
  return row;
}

function openBuildDetail(entry){
  BUILD_DETAIL_ID = entry.id;
  const content = $("buildDetailContent");
  content.replaceChildren();
  const header = el("header", null, "build-detail-heading");
  const identity = el("div", null, "build-detail-identity");
  identity.append(getIcon("herois", entry.hero));
  const title = el("div");
  title.append(el("p", "DETALHES DA BUILD", "community-game-eyebrow"));
  const detailTitle = el("h2", entry.hero, "build-detail-title");
  detailTitle.id = "buildDetailTitle";
  title.append(detailTitle, el("p", communityLaneName(entry.lane) + " · " + entry.patch,
    "build-detail-subline"));
  identity.append(title);
  const close = el("button", "Fechar", "build-detail-close");
  close.type = "button";
  close.addEventListener("click", () => $("buildDetailDialog").close());
  header.append(identity, close);

  const metadata = el("p", "Por " + entry.author + " · " + communityDate(entry.created_at) +
    " (" + communityRelativeDate(entry.created_at) + ")", "build-detail-author");
  const itemsSection = el("section", null, "build-detail-section");
  itemsSection.append(el("h3", "Itens em ordem"));
  const itemList = el("div", null, "build-detail-items");
  (Array.isArray(entry.items) ? entry.items : []).forEach((item, index) => {
    const cell = el("div", null, "build-detail-item");
    cell.append(getIcon("itens", item), el("span", (index + 1) + ". " + item));
    itemList.append(cell);
  });
  itemsSection.append(itemList);
  const equipment = el("div", null, "build-detail-equipment");
  [["emblemas", "Emblema e talentos", entry.emblem], ["feiticos", "Feitiço de batalha", entry.spell]]
    .forEach(([type, label, value]) => {
      const field = el("div", null, "build-detail-equipment-item");
      field.append(getIcon(type, value), el("span", null));
      field.lastElementChild.append(el("small", label), el("b", value));
      equipment.append(field);
    });
  const notes = el("section", null, "build-detail-notes");
  notes.append(el("h3", "Quando usar / observações"), el("p", entry.notes || "Sem observações."));
  const votes = el("section", null, "build-detail-votes");
  votes.append(createBuildVoteSummary(entry, $("buildPeriodFilter").value),
    el("span", entry.helpful + " úteis · " + entry.not_helpful + " não funcionaram", "build-detail-vote-counts"),
    createCommunityVoteActions("builds", entry));
  content.append(header, metadata, itemsSection, equipment, notes, votes);
  if (!$("buildDetailDialog").open) $("buildDetailDialog").showModal();
}

function renderBuildRows(list, entries, period, empty){
  list.replaceChildren();
  list.setAttribute("aria-busy", "false");
  empty.hidden = entries.length > 0;
  entries.forEach(entry => list.append(createBuildRow(entry, period)));
}

function renderCommunityBuilds(){
  if (BUILD_LIST_STATE === "loading") return;
  const popularList = $("buildPopularList"), recentList = $("buildRecentList");
  const popularSection = $("buildPopularSection"), recentSection = $("buildRecentSection");
  const filters = getBuildFilters();
  const periodLabel = filters.period === "all" ? "sempre"
    : filters.period === "7d" ? "últimos 7 dias" : "últimos 30 dias";
  $("buildPopularTitle").textContent = "Mais curtidas, " + periodLabel;
  const lists = $("buildLists");
  if (filters.sort === "popular") lists.append(popularSection, recentSection);
  else lists.append(recentSection, popularSection);
  if (BUILD_LIST_STATE === "error") {
    popularList.replaceChildren();
    recentList.replaceChildren();
    popularList.setAttribute("aria-busy", "false");
    recentList.setAttribute("aria-busy", "false");
    $("buildPopularEmpty").hidden = true;
    $("buildRecentEmpty").hidden = true;
    return;
  }
  renderBuildRows(popularList, COMMUNITY_BUILDS_TRENDING, filters.period, $("buildPopularEmpty"));
  renderBuildRows(recentList, COMMUNITY_BUILDS_RECENT, filters.period, $("buildRecentEmpty"));
}
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