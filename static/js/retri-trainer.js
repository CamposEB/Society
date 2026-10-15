/* ============================================================================
   Society MLBB — Treino de Retribution (v4 · barra precisa)
   A barra de HP do objetivo cai com golpes aleatórios. Quando a PONTA da barra
   cruza a linha do seu dano de Retribution, aperte (botão, toque ou Espaço)
   antes que o jungler rival roube ou o objetivo morra.

   Uso: RetriTrainer.mount(elemento)  ·  RetriTrainer.stop()

   ⚠️ Os valores de HP e de dano abaixo são ESTIMATIVAS PARA TREINO, não dados
   oficiais da Moonton. Ajuste OBJECTIVES, retriDamage() e CONTESTS à vontade.

   v4
   • CORREÇÃO: a barra e a lógica agora usam exatamente a mesma régua.
     Fill, zona de secure e linha ficam dentro da mesma trilha (.rt-track) e
     o fill não tem mais transição de largura. Apertar com a ponta ainda antes
     da linha = "CEDO DEMAIS" (antes parecia antes, mas contava como acerto).
   • Zona de secure listrada, ponta brilhante e estado "aproximando".
   • Botão usa a imagem do Caçar (RETRI_ICON) com fallback para o SVG.
   • Proteção contra disparo duplo (Espaço + click em botão focado).
   ============================================================================ */
(() => {
  "use strict";

  const STORE_KEY = "society.retri.v1";
  const BASE_DPS = 1800;

  /* Caminho da imagem do Caçar, relativo à PÁGINA que carrega este script.
     (Dica: renomeie para "cacar.png" e troque aqui, evita problemas com "ç".) */
  const RETRI_ICON = "static/assets/ca%C3%A7ar.png";

  /* Quanto antes da linha o estado "aproximando" acende (× dano do retri). */
  const NEAR_FACTOR = 1.35;

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

  const GRADES = [
    { id: "perfect", max: 60,       label: "PERFEITO", sub: "Secure garantido!",      pts: 100 },
    { id: "great",   max: 130,      label: "ÓTIMO",    sub: "Secure garantido!",      pts: 70 },
    { id: "good",    max: 250,      label: "BOM",      sub: "Secure garantido.",      pts: 40 },
    { id: "slow",    max: Infinity, label: "LENTO",    sub: "Garantiu, mas na raça.", pts: 15 }
  ];

  const retriDamage = level => Math.round(1000 + (level - 1) * (2000 / 14));

  /* ---------- helpers ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const fmt = n => Math.round(n).toLocaleString("pt-BR");
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
  const stats = { score: 0, streak: 0, attempts: 0, secures: 0, reacts: [], history: [] };
  const best = loadBest();
  const round = { phase: "idle", hp: 0, max: 0, dmg: 0, mult: 1, nextTick: 0, openAt: null, enemyAt: null, enemyDelay: 0 };

  const objective = () => OBJECTIVES.find(o => o.id === cfg.obj) || OBJECTIVES[0];
  const contest   = () => CONTESTS.find(c => c.id === cfg.contest) || CONTESTS[0];

  function loadBest() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return {
        score: Number(raw.score) || 0,
        streak: Number(raw.streak) || 0,
        react: Number(raw.react) || 0
      };
    } catch (e) { return { score: 0, streak: 0, react: 0 }; }
  }
  function saveBest() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(best)); } catch (e) {}
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
    arena.setAttribute("aria-label", "Arena do treino de Retribution");

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
    barWrap.append(marks, bar);

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

    refs.hint = h("p", "rt-hint", "Aperte quando a ponta da barra entrar na zona dourada.");

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

    /* Botão RETRI / Caçar (slot de spell) */
    refs.cast = h("button", "rt-cast");
    refs.cast.type = "button";
    refs.cast.setAttribute("aria-label", "Lançar Retribution (atalho: Espaço)");
    refs.cast.innerHTML = `
      <span class="rt-cast-pulse" aria-hidden="true"></span>
      ${SVG_RETRI}
      <span class="rt-cast-label">RETRI</span>
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

    const pMine = panel("Seu Retribution");
    refs.dmgBig = h("div", "rt-dmg-big", "3.000");
    pMine.append(refs.dmgBig, h("p", "rt-dmg-sub", "dano verdadeiro (estimativa de treino)"));
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
    refs.pAvg = cell("Reação média");
    refs.pFast = cell("Melhor reação");
    refs.pScore = cell("Recorde");
    refs.chips = h("div", "rt-chips");
    refs.chips.setAttribute("aria-label", "Últimas tentativas");
    pPerf.append(grid, refs.chips);

    const note = h("p", "rt-note",
      "Valores de HP e dano são estimativas para treino, não dados oficiais. " +
      "Só vale quando a ponta branca da barra entra na zona listrada (fica verde). " +
      "Dica: reagir só quando a zona abre perde para um jungler rápido — " +
      "aprenda o ritmo dos golpes e antecipe.");

    side.append(pMine, pObj, pCon, pPerf, note);
    root.append(arena, side);
  }

  /* ---------- eventos ---------- */
  let globalBound = false;
  function bind() {
    refs.cast.addEventListener("pointerdown", e => { e.preventDefault(); cast(); });
    refs.cast.addEventListener("click", e => { if (e.detail === 0) cast(); });
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
        if (!e.repeat) cast();
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
    const dmg = retriDamage(cfg.level), obj = objective(), ct = contest();
    round.dmg = dmg;
    round.max = obj.hp;
    round.hp = Math.min(obj.hp, dmg + rand(1200, 4500));
    round.mult = ct.mult;
    round.openAt = null;
    round.enemyAt = null;
    round.enemyDelay = 0;
    round.nextTick = performance.now() + 700;
    refs.floats.textContent = "";
    refs.rival.classList.remove("is-steal");
    setPhase("running");
    render();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function frame(t) {
    if (round.phase !== "running") { raf = 0; return; }
    const ct = contest();
    let guard = 0;
    while (t >= round.nextTick && guard++ < 50) {
      const gap = rand(110, 190);
      const dmgTick = BASE_DPS * round.mult * (gap / 1000) * rand(0.6, 1.4);
      round.hp = Math.max(0, round.hp - dmgTick);
      floatNumber(dmgTick);
      round.nextTick += gap;
      if (round.openAt === null && round.hp <= round.dmg) {
        round.openAt = t;
        if (ct.steal) {
          round.enemyDelay = rand(ct.steal[0], ct.steal[1]);
          round.enemyAt = t + round.enemyDelay;
        }
      }
      if (round.hp <= 0) { render(); end("late"); return; }
    }
    if (round.enemyAt !== null && t >= round.enemyAt) { render(); end("stolen"); return; }
    render();
    raf = requestAnimationFrame(frame);
  }

  function cast() {
    /* evita disparo duplo (Espaço no keydown + click do botão focado) */
    const now = performance.now();
    if (now - lastCastAt < 150) return;
    lastCastAt = now;

    if (round.phase === "idle" || round.phase === "result") { startRound(); return; }
    if (round.phase !== "running") return;
    /* Só vale se a barra DESENHADA já está dentro da zona: render() roda a cada
       frame logo após o cálculo, então round.hp é exatamente o que está na tela. */
    if (round.openAt === null || round.hp > round.dmg) { end("early"); return; }
    if (round.enemyAt !== null && now >= round.enemyAt) { end("stolen"); return; }
    end("secure", now - round.openAt);
  }

  function end(kind, react) {
    cancelAnimationFrame(raf); raf = 0;
    stats.attempts++;
    let title = "", sub = "", detail = "", pts = 0, chip = { id: "fail", label: "✕" };

    if (kind === "secure") {
      const g = GRADES.find(x => react <= x.max);
      stats.secures++; stats.streak++;
      stats.reacts.push(react);
      pts = Math.round(g.pts * contest().mult) + Math.min(stats.streak, 10) * 10;
      stats.score += pts;
      title = g.label; sub = g.sub;
      detail = "Você reagiu " + fmt(react) + " ms depois da linha abrir.";
      chip = { id: g.id, label: fmt(react) };
      if (stats.streak > best.streak) best.streak = stats.streak;
      if (!best.react || react < best.react) best.react = react;
      if (stats.score > best.score) best.score = stats.score;
      saveBest();
    } else {
      stats.streak = 0;
      if (kind === "early") {
        title = "CEDO DEMAIS";
        sub = "A ponta da barra ainda não tinha entrado na zona.";
        detail = "Faltavam " + fmt(Math.max(0, round.hp - round.dmg)) + " de HP para a linha de secure.";
      } else if (kind === "stolen") {
        title = "ROUBADO";
        sub = "O jungler rival garantiu o objetivo.";
        detail = "Ele lançou o Retribution " + fmt(round.enemyDelay) + " ms depois da linha abrir. Antecipe o ritmo dos golpes.";
      } else {
        title = "TARDE DEMAIS";
        sub = "O objetivo morreu antes do seu Retribution.";
        detail = "Ninguém garantiu o secure. Aperte assim que a ponta da barra cruzar a linha.";
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
  }

  function resetSession() {
    stop();
    stats.score = 0; stats.streak = 0; stats.attempts = 0; stats.secures = 0;
    stats.reacts = []; stats.history = [];
    setPhase("idle");
    initOverlay();
    refresh();
  }

  function initOverlay() {
    refs.ovTitle.textContent = "Treino de Retribution";
    refs.ovTitle.dataset.kind = "";
    refs.ovSub.textContent = "Escolha o objetivo e o contest e comece.";
    refs.ovDetail.textContent = "A barra de HP do objetivo cai com golpes aleatórios. Lance o Retribution quando a ponta da barra entrar na zona dourada.";
    refs.ovPts.hidden = true;
    refs.ovStart.textContent = "Começar";
    refs.ovHint.textContent = "Atalho: Espaço · funciona também por toque.";
  }

  /* ---------- desenho ---------- */
  function floatNumber(value) {
    if (refs.floats.childElementCount > 8) refs.floats.firstChild.remove();
    const n = h("span", "rt-float", "-" + fmt(value));
    n.style.left = rand(28, 72).toFixed(1) + "%";
    n.addEventListener("animationend", () => n.remove());
    refs.floats.append(n);
  }

  function hpColorFor(pct) {
    if (pct > 0.6)  return "var(--rt-hp-high, #4ade80)";
    if (pct > 0.3)  return "var(--rt-hp-mid, #fbbf24)";
    return "var(--rt-hp-low, #ef4444)";
  }

  let lastHpSeen = Infinity;
  let hitTimer = 0;

  function render() {
    const pct = round.max > 0 ? round.hp / round.max : 1;
    const running = round.phase === "running";
    const open = running && round.hp <= round.dmg;
    const near = running && !open && round.hp <= round.dmg * NEAR_FACTOR;

    refs.fill.style.width = Math.max(0, Math.min(100, pct * 100)) + "%";
    refs.fill.style.setProperty("--rt-hp-color", hpColorFor(pct));
    refs.hpLabel.textContent = fmt(round.hp) + " / " + fmt(round.max);
    root.classList.toggle("is-open", open);
    root.classList.toggle("is-near", near);

    if (running && round.hp < lastHpSeen) {
      refs.fill.classList.remove("is-hit");
      void refs.fill.offsetWidth;
      refs.fill.classList.add("is-hit");
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => refs.fill.classList.remove("is-hit"), 180);
    }
    lastHpSeen = round.hp;
  }

  function refresh() {
    const obj = objective(), ct = contest(), dmg = retriDamage(cfg.level);
    refs.objName.textContent = obj.name;
    refs.time.textContent = obj.time;
    refs.contestLabel.textContent = ct.name + " · ×" + String(ct.mult).replace(".", ",");
    refs.dmgBig.textContent = fmt(dmg);
    refs.castDmg.textContent = fmt(dmg);
    refs.levelVal.textContent = String(cfg.level);
    refs.lineLabel.textContent = "◆ RETRI " + fmt(dmg);

    /* linha e zona na mesma régua do fill (porcentagem da trilha) */
    const frac = Math.min(1, dmg / obj.hp);
    refs.line.style.left = (frac * 100) + "%";
    refs.zone.style.width = (frac * 100) + "%";
    /* o rótulo vive fora da trilha: compensa a margem de 4px da barra */
    refs.lineLabel.style.left = "calc(4px + (100% - 8px) * " + frac + ")";

    if (round.phase !== "running") {
      refs.fill.style.width = "100%";
      refs.fill.style.setProperty("--rt-hp-color", "var(--rt-hp-high, #4ade80)");
      refs.hpLabel.textContent = fmt(obj.hp) + " / " + fmt(obj.hp);
      root.classList.remove("is-open", "is-near");
      lastHpSeen = Infinity;
    }

    refs.rival.hidden = !ct.steal;
    refs.objBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === cfg.obj)));
    refs.conBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === cfg.contest)));

    refs.score.textContent = fmt(stats.score);
    refs.streak.textContent = fmt(stats.streak);
    refs.pBest.textContent = fmt(best.streak);
    refs.pRate.textContent = stats.attempts ? Math.round(stats.secures / stats.attempts * 100) + "%" : "—";
    refs.pSecures.textContent = stats.secures + "/" + stats.attempts;
    refs.pAvg.textContent = stats.reacts.length
      ? fmt(stats.reacts.reduce((a, b) => a + b, 0) / stats.reacts.length) + " ms"
      : "—";
    refs.pFast.textContent = best.react ? fmt(best.react) + " ms" : "—";
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
    _state: () => ({ phase: round.phase, open: round.openAt !== null, hp: round.hp, dmg: round.dmg })
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