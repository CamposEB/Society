/* ============================================================================
   Society MLBB — Treino de Caçar (v5 · precisão de 1 ms)
   A barra de HP mostra a janela final do objetivo e cai de forma contínua e
   determinística: o HP em qualquer instante é calculado por uma única fórmula,
   usada tanto no desenho quanto no momento do clique. Assim o erro é medido em
   milissegundos de verdade, não pelo frame da animação.

   Uso: RetriTrainer.mount(elemento)  ·  RetriTrainer.stop()
   (O nome interno "Retri" é mantido por compatibilidade com tools.js.)

   ⚠️ Os valores de HP e dano são ESTIMATIVAS PARA TREINO, não dados oficiais.
   ============================================================================ */
(() => {
  "use strict";

  const STORE_KEY = "society.retri.v2";
  const BASE_DPS = 1800;

  /* Caminho absoluto: funciona tanto na raiz do site quanto em /static/. */
  const RETRI_ICON = "/static/assets/ca%C3%A7ar.png";

  /* Quanto antes da linha o estado "aproximando" acende (× dano do Caçar). */
  const NEAR_FACTOR = 1.35;

  /* Janela de aproximação: a barra começa cheia e o alvo chega em ~2–4 s. */
  const LEAD_MIN = 1600;
  const LEAD_MAX = 4200;

  /* ---------- DADOS EDITÁVEIS ---------- */
  const OBJECTIVES = [
    { id: "turtle2",  name: "Turtle",        time: "2:00",  hp: 10367 },
    { id: "turtle4",  name: "Turtle",        time: "4:00",  hp: 12501 },
    { id: "turtle6",  name: "Turtle",        time: "6:00",  hp: 14636 },
    { id: "lord8",    name: "Lord",          time: "8:00",  hp: 31743 },
    { id: "lord12",   name: "Lord",          time: "12:00", hp: 42953 },
    { id: "lordevo",  name: "Lord evoluído", time: "16:00", hp: 56405 }
  ];

  const CONTESTS = [
    { id: "clean", name: "Pit limpo",     mult: 1,   steal: null },
    { id: "fifty", name: "Contest 50/50", mult: 1.6, steal: [220, 420] },
    { id: "burst", name: "Pit burst",     mult: 2.2, steal: [170, 330] },
    { id: "pro",   name: "Contest pro",   mult: 3.2, steal: [140, 260] }
  ];

  /* Precisão = quantos ms depois do ponto ideal o Caçar saiu (0 = perfeito). */
  const GRADES = [
    { id: "perfect", max: 1,        label: "PERFEITO", sub: "Diferença de 1 ms. Secure cirúrgico!", pts: 150 },
    { id: "great",   max: 8,        label: "ÓTIMO",    sub: "Poucos milissegundos de diferença.",   pts: 100 },
    { id: "good",    max: 30,       label: "BOM",      sub: "Secure com folga curta.",              pts: 60 },
    { id: "slow",    max: 150,      label: "NO LIMITE",sub: "Garantiu, mas já estava tarde.",       pts: 25 },
    { id: "late",    max: Infinity, label: "TARDE",    sub: "Garantiu no último instante.",         pts: 10 }
  ];

  const retriDamage = level => Math.round(1000 + (level - 1) * (2000 / 14));

  /* ---------- helpers ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const fmt = n => Math.round(n).toLocaleString("pt-BR");
  const fmtMs = n => Number(n).toFixed(1).replace(".", ",") + " ms";
  const h = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const svgFromHTML = markup => {
    const t = document.createElement("template");
    t.innerHTML = markup.trim();
    return t.content.firstChild;
  };

  /* ---------- estado ---------- */
  let root = null;
  let raf = 0;
  let lastCastAt = 0;
  const refs = {};
  const cfg = { level: 15, obj: "lord8", contest: "fifty" };
  const stats = { score: 0, streak: 0, attempts: 0, secures: 0, precisions: [], history: [] };
  const best = loadBest();
  const round = {
    phase: "idle",
    hp: 0, startHp: 0, max: 0, dmg: 0, dps: 1, mult: 1,
    startAt: 0, targetAt: 0, deathAt: 0,
    enemyAt: null, enemyDelay: 0
  };

  const objective = () => OBJECTIVES.find(o => o.id === cfg.obj) || OBJECTIVES[0];
  const contest   = () => CONTESTS.find(c => c.id === cfg.contest) || CONTESTS[0];

  function loadBest() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      const precision = Number(raw.precision != null ? raw.precision : raw.react);
      return {
        score: Number(raw.score) || 0,
        streak: Number(raw.streak) || 0,
        precision: Number.isFinite(precision) ? precision : null
      };
    } catch (e) { return { score: 0, streak: 0, precision: null }; }
  }
  function saveBest() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(best)); } catch (e) {}
  }

  /* ---------- matemática da barra ---------- */
  /* HP exato em qualquer instante (ms). É a MESMA função usada no cast. */
  function hpAt(t) {
    return clamp(round.startHp - round.dps * ((t - round.startAt) / 1000), 0, round.startHp);
  }
  /* > 0 = ainda faltam ms para o alvo; < 0 = passou do alvo. */
  function errorMsAt(t) {
    return (hpAt(t) - round.dmg) / round.dps * 1000;
  }


  /* ---------- SVGs ---------- */
  const SVG_OBJECTIVE = `
    <svg class="rt-objective" viewBox="0 0 120 140" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rtObjFill" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stop-color="currentColor" stop-opacity="0.35"/>
          <stop offset="1" stop-color="currentColor" stop-opacity="0.05"/>
        </linearGradient>
        <radialGradient id="rtObjGlow" cx="0.5" cy="0.55" r="0.65">
          <stop offset="0" stop-color="currentColor" stop-opacity="0.45"/>
          <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="76" rx="58" ry="62" fill="url(#rtObjGlow)" opacity="0.6"/>
      <polygon points="60,12 102,52 102,104 60,128 18,104 18,52"
               fill="url(#rtObjFill)" stroke="currentColor"
               stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="60,28 88,56 88,96 60,116 32,96 32,56"
               fill="rgba(0,0,0,0.45)" stroke="currentColor"
               stroke-width="1.2" stroke-linejoin="round" opacity="0.8"/>
      <line x1="60" y1="28" x2="60" y2="116" stroke="currentColor" stroke-width="1" opacity="0.4"/>
      <line x1="32" y1="56" x2="88" y2="56" stroke="currentColor" stroke-width="1" opacity="0.4"/>
      <line x1="32" y1="96" x2="88" y2="96" stroke="currentColor" stroke-width="1" opacity="0.4"/>
      <circle cx="60" cy="76" r="9" fill="currentColor" opacity="0.85"/>
      <circle cx="60" cy="76" r="16" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.55"/>
      <circle cx="60" cy="76" r="24" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.25"/>
    </svg>`;

  const SVG_RETRI = `
    <svg class="rt-cast-icon" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rtClawGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stop-color="#eaffe5"/>
          <stop offset="0.55" stop-color="#7fffd0"/>
          <stop offset="1" stop-color="#22d3ee"/>
        </linearGradient>
      </defs>
      <polygon points="50,6 88,28 88,72 50,94 12,72 12,28"
               fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linejoin="round" opacity="0.45"/>
      <g stroke="url(#rtClawGrad)" stroke-width="5"
         stroke-linecap="round" fill="none">
        <path d="M36 76 Q34 54 38 32"/>
        <path d="M50 78 Q48 54 52 28"/>
        <path d="M64 76 Q62 54 66 32"/>
      </g>
      <circle cx="50" cy="50" r="2.4" fill="currentColor" opacity="0.9"/>
    </svg>`;

  /* ---------- interface ---------- */
  function scoreBox(label) {
    const box = h("div", "rt-scorebox");
    const value = h("b", null, "0");
    box.append(h("small", null, label), value);
    return { box, value };
  }
  function panel(title) {
    const p = h("section", "rt-panel");
    p.append(h("h4", "rt-panel-title", title));
    return p;
  }

  function build() {
    root.textContent = "";
    root.className = "rt";

    /* ═════════ ARENA ═════════ */
    const arena = h("section", "rt-arena");
    arena.setAttribute("aria-label", "Arena do treino de Caçar");

    /* HUD */
    const hud = h("div", "rt-hud");
    const left = h("div", "rt-hud-left");
    refs.time = h("span", "rt-time");
    const title = h("div", "rt-title");
    refs.objName = h("b");
    refs.contestLabel = h("small");
    title.append(refs.objName, refs.contestLabel);
    left.append(refs.time, title);

    const scores = h("div", "rt-scores");
    const s1 = scoreBox("Score"), s2 = scoreBox("Streak");
    refs.score = s1.value; refs.streak = s2.value;
    scores.append(s1.box, s2.box);
    hud.append(left, scores);

    /* HP BAR — fill, zona e linha dentro da MESMA trilha */
    const barWrap = h("div", "rt-barwrap");
    const marks = h("div", "rt-marks");
    refs.lineLabel = h("span", "rt-line-label");
    refs.hpLabel = h("span", "rt-hp-label");
    marks.append(refs.lineLabel, refs.hpLabel);
    const bar = h("div", "rt-bar");
    refs.track = h("div", "rt-track");
    refs.fill = h("div", "rt-bar-fill");
    refs.zone = h("div", "rt-zone");
    refs.line = h("div", "rt-bar-line");
    refs.track.append(refs.fill, refs.zone, refs.line);
    bar.append(refs.track);
    refs.live = h("p", "rt-live");
    refs.live.setAttribute("aria-live", "off");
    refs.liveValue = h("b", null, "—");
    refs.live.append(h("span", null, "Precisão"), refs.liveValue);
    barWrap.append(marks, bar, refs.live);

    /* STAGE */
    const stage = h("div", "rt-stage");
    refs.floats = h("div", "rt-floats");
    refs.floats.setAttribute("aria-hidden", "true");

    const icon = svgFromHTML(SVG_OBJECTIVE);

    const unit = (cls, label) => {
      const u = h("div", "rt-unit " + cls);
      u.append(h("span", "rt-unit-dot"), h("small", null, label));
      return u;
    };
    refs.rival = unit("rt-unit-rival", "Jungler rival");
    const allyA = unit("rt-unit-ally rt-ally-a", "Aliado");
    const allyB = unit("rt-unit-ally rt-ally-b", "Aliado");

    refs.hint = h("p", "rt-hint", "Aperte quando a ponta da barra entrar na zona dourada — o erro é medido em ms.");

    /* Overlay */
    refs.overlay = h("div", "rt-overlay");
    refs.overlay.setAttribute("role", "status");
    refs.overlay.setAttribute("aria-live", "polite");
    refs.ovTitle = h("h3", "rt-ov-title");
    refs.ovSub = h("p", "rt-ov-sub");
    refs.ovDetail = h("p", "rt-ov-detail");
    refs.ovPts = h("span", "rt-ov-pts");
    refs.ovStart = h("button", "rt-start", "Começar");
    refs.ovStart.type = "button";
    refs.ovHint = h("p", "rt-ov-hint");
    refs.overlay.append(refs.ovTitle, refs.ovSub, refs.ovDetail, refs.ovPts, refs.ovStart, refs.ovHint);

    /* Reset */
    refs.reset = h("button", "rt-reset", "↺ Zerar sessão");
    refs.reset.type = "button";

    /* Botão CAÇAR (slot de spell) */
    refs.cast = h("button", "rt-cast");
    refs.cast.type = "button";
    refs.cast.setAttribute("aria-label", "Lançar Caçar (atalho: Espaço)");
    refs.cast.innerHTML = `
      <span class="rt-cast-pulse" aria-hidden="true"></span>
      ${SVG_RETRI}
      <span class="rt-cast-label">CAÇAR</span>
      <span class="rt-cast-dmg">3.000</span>
    `;
    refs.castDmg = refs.cast.querySelector(".rt-cast-dmg");

    /* imagem do Caçar: só substitui o SVG se carregar de verdade */
    const img = new Image();
    img.className = "rt-cast-img";
    img.alt = "";
    img.draggable = false;
    img.setAttribute("aria-hidden", "true");
    img.addEventListener("load", () => {
      refs.cast.classList.add("has-img");
      refs.cast.querySelector(".rt-cast-pulse").after(img);
    });
    img.addEventListener("error", () => {
      console.warn("[RetriTrainer] imagem não encontrada:", RETRI_ICON, "— usando ícone SVG.");
    });
    img.src = RETRI_ICON;

    const castWrap = h("div", "rt-cast-wrap");
    castWrap.append(refs.cast);

    stage.append(refs.floats, icon, refs.rival, allyA, allyB, refs.hint, refs.overlay);
    arena.append(hud, barWrap, stage, refs.reset, castWrap);

    /* ═════════ PAINEL LATERAL ═════════ */
    const side = h("div", "rt-side");

    const pMine = panel("Seu Caçar");
    refs.dmgBig = h("div", "rt-dmg-big", "3.000");
    pMine.append(refs.dmgBig, h("p", "rt-dmg-sub", "dano do Caçar (estimativa de treino)"));
    const lvlRow = h("label", "rt-level");
    const lvlText = h("span", null, "Level do herói");
    refs.levelVal = h("b", null, "15");
    refs.level = h("input");
    refs.level.type = "range";
    refs.level.min = "1"; refs.level.max = "15"; refs.level.step = "1"; refs.level.value = "15";
    lvlRow.append(lvlText, refs.levelVal, refs.level);
    pMine.append(lvlRow);

    const pObj = panel("Objetivo");
    const objGrid = h("div", "rt-opts rt-opts-3");
    refs.objBtns = OBJECTIVES.map(o => {
      const b = h("button", "rt-opt");
      b.type = "button";
      b.dataset.id = o.id;
      b.append(h("b", null, o.name), h("small", null, o.time + " · " + fmt(o.hp) + " HP"));
      b.addEventListener("click", () => { cfg.obj = o.id; configChanged(); });
      objGrid.append(b);
      return b;
    });
    pObj.append(objGrid);

    const pCon = panel("Contest");
    const conGrid = h("div", "rt-opts rt-opts-2");
    refs.conBtns = CONTESTS.map(c => {
      const b = h("button", "rt-opt");
      b.type = "button";
      b.dataset.id = c.id;
      b.append(
        h("b", null, c.name),
        h("small", null, "×" + String(c.mult).replace(".", ",") + (c.steal ? " · com rival" : " · sem rival"))
      );
      b.addEventListener("click", () => { cfg.contest = c.id; configChanged(); });
      conGrid.append(b);
      return b;
    });
    pCon.append(conGrid);

    const pPerf = panel("Desempenho");
    const grid = h("div", "rt-perf");
    const cell = (label) => {
      const c = h("div", "rt-perf-cell");
      const v = h("b", null, "—");
      c.append(h("small", null, label), v);
      grid.append(c);
      return v;
    };
    refs.pBest = cell("Melhor seq.");
    refs.pRate = cell("Taxa secure");
    refs.pSecures = cell("Secures");
    refs.pAvg = cell("Erro médio");
    refs.pFast = cell("Melhor erro");
    refs.pScore = cell("Recorde");
    refs.chips = h("div", "rt-chips");
    refs.chips.setAttribute("aria-label", "Últimas tentativas");
    pPerf.append(grid, refs.chips);

    const note = h("p", "rt-note",
      "A barra mostra a janela final do objetivo: o HP cai de forma contínua e " +
      "o app calcula o instante exato em que ele cruza o seu dano de Caçar. " +
      "Aperte o mais perto possível desse ponto; o resultado mostra a diferença em ms. " +
      "Valores de HP e dano são estimativas de treino.");

    side.append(pMine, pObj, pCon, pPerf, note);
    root.append(arena, side);
  }

  /* ---------- eventos ---------- */
  let globalBound = false;
  function bind() {
    refs.cast.addEventListener("pointerdown", e => { e.preventDefault(); cast(e.timeStamp); });
    refs.cast.addEventListener("click", e => { if (e.detail === 0) cast(e.timeStamp); });
    refs.ovStart.addEventListener("click", () => { if (round.phase !== "running") startRound(); });
    refs.reset.addEventListener("click", resetSession);
    refs.level.addEventListener("input", () => { cfg.level = Number(refs.level.value); configChanged(); });
    if (!globalBound) {
      document.addEventListener("keydown", e => {
        if (e.code !== "Space" || !root || !root.isConnected || root.offsetParent === null) return;
        const el = document.activeElement;
        if (el && (el.tagName === "TEXTAREA" || el.tagName === "SELECT" ||
            (el.tagName === "INPUT" && el.type !== "range"))) return;
        e.preventDefault();
        if (!e.repeat) cast(e.timeStamp);
      });
      document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
      window.addEventListener("society:tab", e => { if (e.detail !== "tools") stop(); });
      globalBound = true;
    }
  }

  /* ---------- fluxo ---------- */
  function setPhase(p) { round.phase = p; root.dataset.phase = p; }

  function configChanged() { stop(); refresh(); }

  function startRound() {
    const dmg = retriDamage(cfg.level), ct = contest();
    const dps = BASE_DPS * ct.mult;
    const lead = rand(LEAD_MIN, LEAD_MAX);
    const startHp = Math.max(dmg + 1, Math.round(dmg + dps * lead / 1000));
    const now = performance.now();

    round.startAt = now;
    round.startHp = startHp;
    round.max = startHp;
    round.hp = startHp;
    round.dmg = dmg;
    round.dps = dps;
    round.mult = ct.mult;
    round.targetAt = now + ((startHp - dmg) / dps) * 1000;
    round.deathAt = now + (startHp / dps) * 1000;
    round.enemyDelay = 0;
    round.enemyAt = null;
    if (ct.steal) {
      round.enemyDelay = rand(ct.steal[0], ct.steal[1]);
      round.enemyAt = round.targetAt + round.enemyDelay;
    }

    lastCastAt = 0;
    refs.floats.textContent = "";
    refs.rival.classList.remove("is-steal");
    refs.liveValue.textContent = "—";
    refs.live.dataset.state = "";
    setPhase("running");
    refresh();
    render();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function frame(t) {
    if (round.phase !== "running") { raf = 0; return; }
    round.hp = hpAt(t);
    if (round.hp <= 0) { render(); end("late"); return; }
    if (round.enemyAt !== null && t >= round.enemyAt) { render(); end("stolen"); return; }
    render();
    raf = requestAnimationFrame(frame);
  }

  function cast(at) {
    /* Usa o timestamp do evento (mais próximo do toque real que o próximo frame). */
    let now = Number(at);
    if (!Number.isFinite(now) || now <= 0 || now > 1e12) now = performance.now();

    /* evita disparo duplo (Espaço no keydown + click do botão focado) */
    if (now - lastCastAt < 120) return;
    lastCastAt = now;

    if (round.phase === "idle" || round.phase === "result") { startRound(); return; }
    if (round.phase !== "running") return;

    round.hp = hpAt(now);
    if (round.hp <= 0) { end("late"); return; }
    if (round.enemyAt !== null && now >= round.enemyAt) { end("stolen"); return; }

    const earlyMs = errorMsAt(now); // > 0 = ainda faltava HP para o alvo
    if (earlyMs > 0) { end("early", earlyMs); return; }
    end("secure", -earlyMs);
  }

  function end(kind, value) {
    cancelAnimationFrame(raf); raf = 0;
    stats.attempts++;
    let title = "", sub = "", detail = "", pts = 0, chip = { id: "fail", label: "✕" };

    if (kind === "secure") {
      /* arredonda para 0,001 ms: evita 1,0000000002 cair fora do PERFEITO */
      const precision = Math.max(0, Math.round((Number(value) || 0) * 1000) / 1000);
      const g = GRADES.find(x => precision <= x.max) || GRADES[GRADES.length - 1];
      stats.secures++; stats.streak++;
      stats.precisions.push(precision);
      pts = Math.round(g.pts * contest().mult) + Math.min(stats.streak, 10) * 10;
      stats.score += pts;
      title = g.label; sub = g.sub;
      detail = precision < 0.05
        ? "Você acertou o ponto ideal (0 ms)."
        : "Você lançou " + fmtMs(precision) + " depois do ponto ideal.";
      chip = { id: g.id, label: fmtMs(precision) };
      if (best.precision == null || precision < best.precision) best.precision = precision;
      if (stats.streak > best.streak) best.streak = stats.streak;
      if (stats.score > best.score) best.score = stats.score;
      saveBest();
      refs.liveValue.textContent = fmtMs(precision) + " depois";
      refs.live.dataset.state = "secure";
    } else {
      stats.streak = 0;
      if (kind === "early") {
        const early = Math.max(0, Number(value) || 0);
        title = "CEDO DEMAIS";
        sub = "O Caçar saiu antes do ponto ideal.";
        detail = "Faltaram " + fmtMs(early) + " para o alvo. Aperte um pouco mais tarde.";
        refs.liveValue.textContent = fmtMs(early) + " antes";
        refs.live.dataset.state = "early";
      } else if (kind === "stolen") {
        title = "ROUBADO";
        sub = "O jungler rival garantiu o objetivo.";
        detail = "Ele lançou " + fmtMs(round.enemyDelay) + " depois do ponto ideal. Antecipe o ritmo dos golpes.";
        refs.liveValue.textContent = "roubado";
        refs.live.dataset.state = "fail";
      } else {
        title = "TARDE DEMAIS";
        sub = "O objetivo morreu antes do seu Caçar.";
        detail = "O HP chegou a zero. Aperte assim que a ponta da barra cruzar a linha.";
        refs.liveValue.textContent = "tarde";
        refs.live.dataset.state = "fail";
      }
    }

    stats.history.push(chip);
    if (stats.history.length > 6) stats.history.shift();
    if (kind === "stolen") refs.rival.classList.add("is-steal");

    refs.ovTitle.textContent = title;
    refs.ovTitle.dataset.kind = kind === "secure" ? chip.id : "fail";
    refs.ovSub.textContent = sub;
    refs.ovDetail.textContent = detail;
    refs.ovPts.textContent = pts ? "+" + fmt(pts) + " pts" : "";
    refs.ovPts.hidden = !pts;
    refs.ovStart.textContent = "Próximo pit";
    refs.ovHint.textContent = "Toque no botão ou pressione Espaço para o próximo.";
    setPhase("result");
    refresh();
  }

  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    if (!root) return;
    if (round.phase === "running") initOverlay();
    if (round.phase !== "result") setPhase("idle");
    refresh();
  }

  function resetSession() {
    stop();
    stats.score = 0; stats.streak = 0; stats.attempts = 0; stats.secures = 0;
    stats.precisions = []; stats.history = [];
    setPhase("idle");
    initOverlay();
    refresh();
  }

  function initOverlay() {
    refs.ovTitle.textContent = "Treino de Caçar";
    refs.ovTitle.dataset.kind = "";
    refs.ovSub.textContent = "Escolha o objetivo e o contest e comece.";
    refs.ovDetail.textContent = "A barra mostra a janela final do objetivo. Aperte quando o HP cruzar a linha do seu Caçar; o app mede a diferença em milissegundos.";
    refs.ovPts.hidden = true;
    refs.ovStart.textContent = "Começar";
    refs.ovHint.textContent = "Atalho: Espaço · funciona também por toque.";
    if (refs.liveValue) {
      refs.liveValue.textContent = "—";
      refs.live.dataset.state = "";
    }
  }

  /* ---------- desenho ---------- */
  function hpColorFor(pct) {
    if (pct > 0.6)  return "var(--rt-hp-high, #4ade80)";
    if (pct > 0.3)  return "var(--rt-hp-mid, #fbbf24)";
    return "var(--rt-hp-low, #ef4444)";
  }

  function render() {
    const running = round.phase === "running";
    const max = round.startHp || round.max || 1;
    const pct = clamp(round.hp / max, 0, 1);
    const open = running && round.hp <= round.dmg;
    const near = running && !open && round.hp <= round.dmg * NEAR_FACTOR;

    /* sub-pixel: 4 casas decimais na largura para a barra não “pular” ms */
    refs.fill.style.width = (pct * 100).toFixed(4) + "%";
    refs.fill.style.setProperty("--rt-hp-color", hpColorFor(pct));
    refs.hpLabel.textContent = fmt(round.hp) + " / " + fmt(max);
    root.classList.toggle("is-open", open);
    root.classList.toggle("is-near", near);

    if (running && round.dps > 0) {
      const ms = (round.hp - round.dmg) / round.dps * 1000;
      refs.liveValue.textContent = ms > 0 ? "faltam " + fmtMs(ms) : "aberta há " + fmtMs(-ms);
      refs.live.dataset.state = ms > 0 ? "early" : "late";
    }
  }

  function refresh() {
    const obj = objective(), ct = contest(), dmg = retriDamage(cfg.level);
    refs.objName.textContent = obj.name;
    refs.time.textContent = obj.time;
    refs.contestLabel.textContent = ct.name + " · ×" + String(ct.mult).replace(".", ",");
    refs.dmgBig.textContent = fmt(dmg);
    refs.castDmg.textContent = fmt(dmg);
    refs.levelVal.textContent = String(cfg.level);
    refs.lineLabel.textContent = "◆ CAÇAR " + fmt(dmg);

    /* linha e zona na mesma régua do fill (porcentagem da trilha) */
    const idleHp = dmg + BASE_DPS * ct.mult * 2.5;
    const displayHp = (round.phase === "running" || round.phase === "result") && round.startHp
      ? round.startHp : idleHp;
    const frac = clamp(dmg / displayHp, 0, 1);
    refs.line.style.left = (frac * 100) + "%";
    refs.zone.style.width = (frac * 100) + "%";
    /* o rótulo vive fora da trilha: compensa a margem de 4px da barra */
    refs.lineLabel.style.left = "calc(4px + (100% - 8px) * " + frac + ")";
    refs.hpLabel.title = "Janela final: o objetivo completo tem " + fmt(obj.hp) +
      " HP; a barra mostra os últimos " + fmt(displayHp) + " HP.";

    if (round.phase === "idle") {
      refs.fill.style.width = "100%";
      refs.fill.style.setProperty("--rt-hp-color", "var(--rt-hp-high, #4ade80)");
      refs.hpLabel.textContent = fmt(displayHp) + " / " + fmt(displayHp);
      refs.liveValue.textContent = "—";
      refs.live.dataset.state = "";
      root.classList.remove("is-open", "is-near");
    } else if (round.phase === "result") {
      const pct = round.startHp ? clamp(round.hp / round.startHp, 0, 1) : 0;
      refs.fill.style.width = (pct * 100).toFixed(4) + "%";
      refs.fill.style.setProperty("--rt-hp-color", hpColorFor(pct));
      refs.hpLabel.textContent = fmt(round.hp) + " / " + fmt(round.startHp);
      root.classList.toggle("is-open", round.hp <= round.dmg);
      root.classList.remove("is-near");
    }

    refs.rival.hidden = !ct.steal;
    refs.objBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === cfg.obj)));
    refs.conBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === cfg.contest)));

    refs.score.textContent = fmt(stats.score);
    refs.streak.textContent = fmt(stats.streak);
    refs.pBest.textContent = fmt(best.streak);
    refs.pRate.textContent = stats.attempts ? Math.round(stats.secures / stats.attempts * 100) + "%" : "—";
    refs.pSecures.textContent = stats.secures + "/" + stats.attempts;
    refs.pAvg.textContent = stats.precisions.length
      ? fmtMs(stats.precisions.reduce((a, b) => a + b, 0) / stats.precisions.length)
      : "—";
    refs.pFast.textContent = best.precision != null ? fmtMs(best.precision) : "—";
    refs.pScore.textContent = fmt(best.score);

    refs.chips.textContent = "";
    stats.history.forEach(c => refs.chips.append(h("span", "rt-chip rt-chip-" + c.id, c.label)));
  }

  /* ---------- API pública ---------- */
  let mountedRoot = null;

  function mount(el) {
    if (!el) return;
    if (mountedRoot === el && el.classList.contains("rt")) return;
    mountedRoot = el;
    root = el;
    build();
    bind();
    setPhase("idle");
    initOverlay();
    refresh();
  }

  window.RetriTrainer = {
    mount,
    stop,
    _state: () => ({
      phase: round.phase,
      open: round.phase === "running" && round.hp <= round.dmg,
      hp: round.hp, dmg: round.dmg, dps: round.dps,
      startAt: round.startAt, targetAt: round.targetAt, deathAt: round.deathAt,
      errorMs: round.phase === "running" ? errorMsAt(performance.now()) : null
    }),
    _castAt: (t) => cast(t)
  };

  /* ---------- auto-montagem defensiva ---------- */
  let autoMounted = false;
  let observer = null;

  function tryAutoMount() {
    if (autoMounted) return;
    const el = document.getElementById("retriRoot");
    if (!el) return;
    if (el.classList.contains("rt")) {
      autoMounted = true;
      if (observer) { observer.disconnect(); observer = null; }
      return;
    }
    el.textContent = "";
    mount(el);
    autoMounted = true;
    if (observer) { observer.disconnect(); observer = null; }
  }

  function setupAutoMount() {
    tryAutoMount();
    if (autoMounted) return;
    if (typeof MutationObserver !== "undefined" && document.body) {
      observer = new MutationObserver(tryAutoMount);
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        if (observer) { observer.disconnect(); observer = null; }
      }, 60000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupAutoMount, { once: true });
  } else {
    setupAutoMount();
  }
})();