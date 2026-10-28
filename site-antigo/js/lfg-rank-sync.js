/* ==========================================================================
   lfg-rank-sync.js
   Pré-preenche o campo "Seu rank" do formulário LFG com o rank que o
   usuário já configurou no perfil.

   Fontes, em ordem de prioridade:
     1) window.__selfProfile               (setado pelo app ao hidratar)
     2) window.ProfileUI.getSelfProfile()  (getter opcional — só se existir)
     3) cache local atualizado pelos eventos:
          - "profile:rendered"        (disparado por ProfileUI.renderProfile)
          - "profile:self-updated"    (disparado pelo app ao salvar perfil)

   Nomes canônicos de rank (idênticos a profile.js → RANK_OPTIONS):
     Guerreiro, Elite, Mestre, Grande Mestre,
     Épico, Lenda, Mítico, Honra Mítica, Glória Mítica, Imortal.

   CHANGELOG
     2026-10-13  Correção de bug: "glorioso" agora mapeia para
                 "Glória Mítica" (antes caía em "Honra Mítica", divergindo
                 do RANK_ALIASES de profile.js). Suporte a variantes
                 "grão-mestre"/"grao mestre"/"grão mestre".
   ========================================================================== */
(() => {
  "use strict";

  /* Ordem idêntica à de RANK_OPTIONS em profile.js. */
  const RANKS = [
    "Guerreiro", "Elite", "Mestre", "Grande Mestre",
    "Épico", "Lenda", "Mítico",
    "Honra Mítica", "Glória Mítica", "Imortal",
  ];

  /** Remove diacríticos para comparação acento-insensível. */
  const stripAccents = (s) =>
    String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  /**
   * Converte qualquer variação de nome de rank no nome canônico.
   * Aceita entradas como "mitico glorioso", "MÍTICO", "Glória Mítica",
   * "grandmaster", "grão-mestre", "Imortal 78" etc.
   *
   * @param  {unknown} raw  Valor solto vindo do perfil.
   * @return {string}       Um dos RANKS, ou "" se não casar.
   */
  function normalizeRank(raw) {
    if (raw == null) return "";
    const s = stripAccents(String(raw).trim().toLowerCase());
    if (!s) return "";

    /* 1) Casamento exato primeiro. */
    for (const r of RANKS) {
      if (stripAccents(r).toLowerCase() === s) return r;
    }

    /* 2) Aliases — a ORDEM importa (mais específico primeiro). */
    if (s.includes("imortal") || s.includes("immortal")) {
      return "Imortal";
    }
    // "gloria", "glory" e "glorioso" → Glória Mítica (espelha profile.js)
    if (s.includes("gloria")  || s.includes("glory") || s.includes("glorioso")) {
      return "Glória Mítica";
    }
    // "honra", "honor", "honrado" → Honra Mítica
    if (s.includes("honra") || s.includes("honor") || s.includes("honrado")) {
      return "Honra Mítica";
    }
    // Grande Mestre: cobre "grandemestre", "grande mestre",
    // "grandmaster", "grand master", "grão(-)mestre", "grao(-) mestre".
    if (s.startsWith("grande") || s.includes("grandmaster") ||
        s.includes("grand master") || s.includes("grao")) {
      return "Grande Mestre";
    }
    if (s.startsWith("mitico") || s.includes("mythic")) {
      return "Mítico";
    }
    if (s.startsWith("lenda")  || s.includes("legend")) {
      return "Lenda";
    }
    if (s.startsWith("epico")  || s.includes("epic")) {
      return "Épico";
    }
    if (s.startsWith("mestre") || s.includes("master")) {
      return "Mestre";
    }
    if (s.startsWith("elite")) {
      return "Elite";
    }
    if (s.startsWith("guerreiro") || s.includes("warrior")) {
      return "Guerreiro";
    }

    return "";
  }

  /**
   * Promove "Mítico" + N estrelas ao tier correspondente (regra do MLBB).
   * Mantém os demais ranks intactos — eles já vêm completos do perfil.
   *
   * @param  {string} rank
   * @param  {unknown} stars
   * @return {string}
   */
  function rankFromStars(rank, stars) {
    if (normalizeRank(rank) !== "Mítico") return rank;
    const n = Number.parseInt(stars, 10);
    if (!Number.isFinite(n) || n < 0) return rank;
    if (n >= 100) return "Imortal";
    if (n >= 50)  return "Glória Mítica";
    if (n >= 25)  return "Honra Mítica";
    return rank; // 0–24 → continua "Mítico"
  }

  /**
   * Extrai o rank canônico de um objeto de perfil.
   * @param  {object|null|undefined} data
   * @return {string}
   */
  function rankFromProfileObject(data) {
    if (!data || typeof data !== "object") return "";
    const base = normalizeRank(data.rank);
    if (!base) return "";
    return rankFromStars(base, data.stars);
  }

  /* -------------------------------------------------------------------------
     Cache atualizado por eventos (usado quando nenhuma das fontes "vivas"
     traz o rank a tempo, ou quando o perfil só é montado depois do LFG).
     ------------------------------------------------------------------------- */
  let cachedRank = "";

  function installProfileListeners() {
    const capture = (data) => {
      const rank = rankFromProfileObject(data);
      if (rank) cachedRank = rank;
    };

    // profile.js dispara "profile:rendered" no fim de applyProfileCard.
    document.addEventListener("profile:rendered", (ev) => {
      const detail = ev?.detail || {};
      if (detail.mode && detail.mode !== "self") return;
      capture(detail.data);
    });

    // "profile:self-updated" é disparado tanto no document quanto no window.
    const onSelfUpdated = (ev) => capture(ev?.detail?.profile);
    document.addEventListener("profile:self-updated", onSelfUpdated);
    window.addEventListener("profile:self-updated", onSelfUpdated);
  }

  /**
   * Lê o rank do perfil na ordem de prioridade.
   * @return {string}  Nome canônico de rank, ou "" se não houver.
   */
  function readProfileRank() {
    // 1) window.__selfProfile — referenciado pelo próprio profile.js.
    let rank = rankFromProfileObject(window.__selfProfile);
    if (rank) return rank;

    // 2) Getter opcional exposto por ProfileUI (ver patch sugerido).
    if (typeof window.ProfileUI?.getSelfProfile === "function") {
      rank = rankFromProfileObject(window.ProfileUI.getSelfProfile());
      if (rank) return rank;
    }

    // 3) Último rank capturado via eventos.
    return cachedRank || "";
  }

  /**
   * Escreve o rank do perfil no <select id="lfgRank">.
   * Dispara input + change para que o lfg.js atualize a prévia do anúncio.
   * @return {boolean}  true se escreveu (ou já estava igual), false se não havia rank.
   */
  function applyRankToField() {
    const select = document.getElementById("lfgRank");
    if (!select) return false;

    const rank = readProfileRank();
    if (!rank) return false;

    if (select.value === rank) return true;

    select.value = rank;
    select.dataset.autofilled = "1";
    // "input" cobre prévias em tempo real; "change" cobre handlers de confirmação.
    select.dispatchEvent(new Event("input",  { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  /* -------------------------------------------------------------------------
     Ciclo de vida: bind no <select> + no diálogo.
     ------------------------------------------------------------------------- */
  function bind() {
    const select = document.getElementById("lfgRank");
    if (!select) return;

    /* Diferenciar autofill de escolha do usuário.
       O evento disparado pelo nosso próprio applyRankToField não conta como
       "usuário mexeu" — assim não bloqueia uma próxima abertura. */
    const markTouched = () => {
      if (select.dataset.autofilled === "1") {
        delete select.dataset.autofilled;
        return;
      }
      select.dataset.sessionTouched = "1";
    };
    select.addEventListener("input",  markTouched);
    select.addEventListener("change", markTouched);

    /* Ao abrir o diálogo: pré-preenche (se o usuário ainda não escolheu).
       Ao fechar: limpa o estado para a próxima abertura. */
    const dialog = document.getElementById("lfgFormDialog");
    if (dialog) {
      dialog.addEventListener("toggle", () => {
        if (dialog.open) {
          if (!select.dataset.sessionTouched) applyRankToField();
        } else {
          delete select.dataset.sessionTouched;
          delete select.dataset.autofilled;
        }
      });
    }

    /* Fallback: alguns fluxos abrem o form sem disparar "toggle". */
    document.getElementById("lfgOpenForm")?.addEventListener("click", () => {
      if (!select.dataset.sessionTouched) setTimeout(applyRankToField, 0);
    });

    /* Primeira tentativa — cobre o caso do form já estar montado/aberto. */
    applyRankToField();
  }

  /* Os listeners de perfil entram primeiro: se o perfil hidratar antes do
     DOM estiver pronto, já capturamos o rank no cache. */
  installProfileListeners();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  /* Debug / uso manual pelo console:
       LFGRankSync.readProfileRank()                 // o que ele detectou
       LFGRankSync.applyRankToField()                // força o preenchimento agora
       LFGRankSync.normalizeRank("mitico glorioso")  // → "Glória Mítica" */
  window.LFGRankSync = {
    applyRankToField,
    readProfileRank,
    normalizeRank,
    rankFromStars,
    RANKS,
  };
})();