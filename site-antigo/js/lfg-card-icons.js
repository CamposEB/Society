/* ==========================================================================
   lfg-card-icons.js
   Injeta a imagem do rank e do herói principal nos cards do LFG
   (aba "Procurar duo"), reaproveitando as MESMAS imagens que o perfil usa.

   Por que existe: o lfg.js hoje renderiza só o texto ("Glória Mítica",
   "Khufra") dentro do card. Este script:
     1) Observa #lfgList e #lfgRecommended
     2) Em cada card, localiza o elemento do rank e o do herói
     3) Insere <img class="lfg-player-rank-icon"> / <img class="lfg-player-hero-icon">
        antes do texto, usando ProfileUI.rankCandidatesForRank /
        ProfileUI.heroImageUrl.

   Não precisa alterar o lfg.js. É idempotente (não duplica ícones) e
   aguarda o ProfileUI / HERO_CATALOG carregarem.
   ========================================================================== */
(() => {
  "use strict";

  /* Ranks canônicos, na ordem do profile.js. "Mais específico" primeiro
     para "Glória Mítica" não ser capturado como "Mítico". */
  const RANK_KEYS = [
    "Imortal", "Glória Mítica", "Honra Mítica", "Grande Mestre",
    "Mítico", "Lenda", "Épico", "Mestre", "Elite", "Guerreiro",
  ];

  const stripAccents = (s) =>
    String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  function detectRank(raw) {
    const s = stripAccents(String(raw || "").toLowerCase());
    if (!s) return "";
    for (const r of RANK_KEYS) {
      if (s.includes(stripAccents(r).toLowerCase())) return r;
    }
    return "";
  }

  function detectHero(raw) {
    const catalog = Array.isArray(window.HERO_CATALOG) ? window.HERO_CATALOG : [];
    if (!catalog.length || !raw) return "";
    const s = stripAccents(String(raw).toLowerCase());
    // Pega o nome mais longo que casa (evita match parcial de "Kimmy" vs "Kim").
    let best = "";
    for (const h of catalog) {
      const name = String(h.name || "").trim();
      if (!name) continue;
      if (name.length > best.length && s.includes(stripAccents(name.toLowerCase()))) {
        best = name;
      }
    }
    return best;
  }

  function makeIcon(url, className) {
    const img = document.createElement("img");
    img.className = className;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = url;
    return img;
  }

  /* Encontra onde inserir dentro do contêiner: se tiver <b>/<strong> como
     filho direto, insere lá (fica antes só do valor, não do rótulo). */
  function valueTarget(el) {
    return el.querySelector(":scope > b, :scope > strong, :scope > .lfg-value") || el;
  }

  function injectRank(el, rank) {
    if (!el || el.querySelector(".lfg-player-rank-icon")) return;
    const urls = window.ProfileUI?.rankCandidatesForRank?.(rank) || [];
    if (!urls.length) return;
    const target = valueTarget(el);
    const img = makeIcon(urls[0], "lfg-player-rank-icon");
    let i = 0;
    img.onerror = () => {
      i++;
      if (i < urls.length) img.src = urls[i];
      else img.remove();
    };
    target.prepend(img);
  }

  function injectHero(el, hero) {
    if (!el || el.querySelector(".lfg-player-hero-icon")) return;
    const url = window.ProfileUI?.heroImageUrl?.(hero);
    if (!url) return;
    const target = valueTarget(el);
    const img = makeIcon(url, "lfg-player-hero-icon");
    img.onerror = () => img.remove();
    target.prepend(img);
  }

  function findRankEl(card) {
    // 1) classe específica (se o lfg.js já usa)
    let el = card.querySelector(".lfg-player-rank");
    if (el) return el;
    // 2) varre elementos que contenham "rank" no texto
    for (const node of card.querySelectorAll("span, div, p, li, small")) {
      const text = node.textContent || "";
      if (!/rank/i.test(text)) continue;
      if (detectRank(text)) return node;
    }
    return null;
  }

  function findHeroEl(card) {
    let el = card.querySelector(".lfg-player-hero");
    if (el) return el;
    for (const node of card.querySelectorAll("span, div, p, li, small")) {
      const text = node.textContent || "";
      if (!/her[oó]i/i.test(text)) continue;
      if (detectHero(text)) return node;
    }
    return null;
  }

  function decorateCard(card) {
    if (!card) return;

    // Preferência 1: dados em data-attributes (mais confiável).
    const rankFromData = detectRank(card.dataset?.rank) || card.dataset?.rank || "";
    const heroFromData = card.dataset?.hero || "";

    const rankEl = findRankEl(card);
    const heroEl = findHeroEl(card);

    if (rankEl) {
      const rank = detectRank(rankEl.textContent) || rankFromData;
      if (rank) injectRank(rankEl, rank);
    }
    if (heroEl) {
      const hero = detectHero(heroEl.textContent) || heroFromData;
      if (hero) injectHero(heroEl, hero);
    }
  }

  function processAll(root) {
    if (!root) return;
    root.querySelectorAll(".lfg-player-card, .lfg-recommended-card").forEach(decorateCard);
  }

  function install() {
    ["lfgList", "lfgRecommended"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      processAll(el);
      const obs = new MutationObserver((list) => {
        for (const m of list) {
          m.addedNodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            if (n.matches?.(".lfg-player-card, .lfg-recommended-card")) {
              decorateCard(n);
            } else if (n.querySelectorAll) {
              processAll(n);
            }
          });
        }
      });
      obs.observe(el, { childList: true, subtree: true });
    });
  }

  function ready() {
    return Boolean(
      window.ProfileUI?.rankCandidatesForRank &&
      window.ProfileUI?.heroImageUrl
    );
  }

  function boot() {
    if (ready()) { install(); return; }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (ready() || tries > 80) {
        clearInterval(t);
        if (ready()) install();
      }
    }, 250);
  }

  /* HERO_CATALOG chega tarde em alguns fluxos — reprocessa quando avisar. */
  window.addEventListener("hero-catalog-ready", () => {
    processAll(document.getElementById("lfgList"));
    processAll(document.getElementById("lfgRecommended"));
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  /* Debug:
       LFGCardIcons.processAll(document.getElementById("lfgList"))
       LFGCardIcons.decorateCard(<um .lfg-player-card>) */
  window.LFGCardIcons = { decorateCard, processAll };
})();