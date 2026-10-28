/* quiz.js — Quiz Estático Society MLBB */
(function () {
  "use strict";

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const STORAGE_KEY = "society_quiz_state_v1";

  const QUESTIONS = [
    { q: "Qual herói é conhecido como 'Rei da Selva' e tem uma habilidade que o torna invulnerável por um curto período?", o: ["Lancelot", "Hayabusa", "Gusion", "Ling"], c: 1, e: "Hayabusa usa sua ultimate para se tornar invulnerável e atacar múltiplos inimigos." },
    { q: "Qual desses itens concede redução de cura aos inimigos?", o: ["Lâmina do Desespero", "Rugido do Maléfico", "Foice da Corrosão", "Alabarda Marinha"], c: 3, e: "A Alabarda Marinha (Sea Halberd) é o item físico que aplica o efeito de redução de cura." },
    { q: "Qual é a rota padrão do herói Khufra?", o: ["EXP", "Mid", "Roam (Suporte)", "Gold"], c: 2, e: "Khufra é um Tank com muito controle de grupo, ideal para a rota de Roam." },
    { q: "Quanto tempo leva para a primeira Tartaruga aparecer no mapa?", o: ["1:00", "2:00", "3:00", "4:00"], c: 1, e: "A primeira Tartaruga surge aos 2 minutos de jogo." },
    { q: "Qual feitiço de batalha é obrigatório para quem joga na selva (jungle)?", o: ["Flash", "Purificar", "Caçar (Retribuição)", "Teleporte"], c: 2, e: "O Caçar (Retribuição) é essencial para causar dano aos monstros e garantir objetivos." },
    { q: "Qual herói tem a habilidade de puxar os inimigos com um gancho?", o: ["Franco", "Franco", "Franco", "Tigreal"], c: 0, e: "Franco é o atirador com o gancho icônico que puxa o alvo para perto do time." },
    { q: "O que significa 'CC' no jogo?", o: ["Cura Constante", "Controle de Grupo", "Crítico Certo", "Custo de Combate"], c: 1, e: "CC significa Crowd Control (Controle de Grupo), como stuns, slows e silences." },
    { q: "Qual desses é um Emblema de Classe?", o: ["Emblema do Caçador", "Emblema do Mago", "Emblema do Lord", "Emblema do Ouro"], c: 1, e: "Existem emblemas específicos para classes como Mago, Assassino, Tank, etc." },
    { q: "Quem derrota o Lord concede um buff significativo ao time. Onde ele geralmente aparece?", o: ["No meio do mapa", "Na selva superior", "Na selva inferior", "Na base inimiga"], c: 0, e: "O Lord aparece no poço central (pit) do mapa." },
    { q: "Qual item é essencial para atiradores aumentarem o dano crítico?", o: ["Fúria do Berserker", "Botas Mágicas", "Imortalidade", "Véu Exótico"], c: 0, e: "Fúria do Berserker aumenta o dano crítico e a taxa de crítico." }
  ];

  const $ = id => document.getElementById(id);
  let currentTab = "daily";
  let practice = { right: 0, total: 0, q: null };
  let timerInterval = null;

  let state = {
    lastPlayedDate: null,
    streak: 0,
    bestStreak: 0,
    totalHits: 0,
    totalPracticed: 0
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) state = { ...state, ...saved };
    } catch (e) {}
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getDailyIndex() {
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = new Date() - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % QUESTIONS.length;
  }

  function init() {
    if (!$("quizPage")) return;
    loadState();

    document.querySelectorAll("[data-quiz-tab]").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.quizTab));
    });

    const btnNext = $("quizPracticeNext");
    if (btnNext) btnNext.addEventListener("click", renderPracticeQuestion);
    
    updateStreakUI();
    renderDaily();
    renderStatsUI();
    switchTab("daily");

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
  }

  function switchTab(name) {
    currentTab = name;
    ["daily", "practice", "ranking"].forEach(k => {
      const btn = document.querySelector(`[data-quiz-tab="${k}"]`);
      const panel = $("quizPanel" + k.charAt(0).toUpperCase() + k.slice(1));
      if (btn) { btn.classList.toggle("is-active", k === name); btn.setAttribute("aria-selected", k === name); }
      if (panel) panel.hidden = k !== name;
    });
    if (name === "practice" && !practice.q) renderPracticeQuestion();
    if (name === "ranking") renderStatsUI();
  }

  function updateStreakUI() {
    $("quizStreakNum").textContent = state.streak;
    $("quizStreakLabel").textContent = state.streak === 1 ? "dia seguido" : "dias seguidos";
    $("quizStreak").classList.toggle("is-on", state.streak > 0);
    
    const hint = $("quizStreakHint");
    if (state.lastPlayedDate === getTodayStr()) {
      hint.textContent = "Você já jogou hoje. Volte amanhã!";
    } else if (state.streak > 0) {
      hint.textContent = "Responda hoje para manter a sequência.";
    } else {
      hint.textContent = "Comece uma sequência hoje!";
    }
  }

  function updateCountdown() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const el = $("quizCountdown");
    if (el) el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function renderDaily() {
    const qIndex = getDailyIndex();
    const qData = QUESTIONS[qIndex];
    const playedToday = state.lastPlayedDate === getTodayStr();

    $("qText").textContent = qData.q;
    const opts = $("qOpts");
    opts.replaceChildren();

    qData.o.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt";
      btn.type = "button";
      btn.innerHTML = `<span class="quiz-opt-key">${LETTERS[i]}</span><span>${text}</span>`;
      btn.disabled = playedToday;
      if (playedToday) {
        if (i === qData.c) btn.classList.add("is-correct");
        else btn.classList.add("is-dim");
      } else {
        btn.addEventListener("click", () => answerDaily(i, qData));
      }
      opts.appendChild(btn);
    });

    const msg = $("qMsg");
    const explain = $("quizExplain");
    
    if (playedToday) {
      msg.textContent = "Você já respondeu a pergunta de hoje.";
      msg.className = "quiz-msg is-ok";
      explain.hidden = false;
      explain.textContent = qData.e;
      $("quizNext").hidden = false;
    } else {
      msg.textContent = "Escolha uma alternativa.";
      msg.className = "quiz-msg";
      explain.hidden = true;
      $("quizNext").hidden = true;
    }
  }

  function answerDaily(pickedIndex, qData) {
    const isCorrect = pickedIndex === qData.c;
    const today = getTodayStr();
    
    state.lastPlayedDate = today;
    if (isCorrect) {
      state.streak++;
      state.totalHits++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      $("qMsg").textContent = "🎉 Você acertou!";
      $("qMsg").className = "quiz-msg is-ok";
    } else {
      state.streak = 0;
      $("qMsg").textContent = "❌ Você errou. A resposta certa está em verde.";
      $("qMsg").className = "quiz-msg is-bad";
    }
    
    saveState();
    updateStreakUI();
    renderStatsUI();

    const opts = $("qOpts").children;
    for (let i = 0; i < opts.length; i++) {
      opts[i].disabled = true;
      if (i === qData.c) opts[i].classList.add("is-correct");
      else if (i === pickedIndex) opts[i].classList.add("is-wrong");
      else opts[i].classList.add("is-dim");
    }

    $("quizExplain").hidden = false;
    $("quizExplain").textContent = qData.e;
    $("quizNext").hidden = false;
  }

  function renderPracticeQuestion() {
    let qData;
    do {
      qData = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    } while (practice.q && qData.q === practice.q.q && QUESTIONS.length > 1);

    practice.q = qData;
    const opts = $("quizPracticeOpts");
    opts.replaceChildren();

    $("quizPracticeText").textContent = qData.q;
    $("quizPracticeMsg").textContent = "";
    $("quizPracticeExplain").hidden = true;

    qData.o.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt";
      btn.type = "button";
      btn.innerHTML = `<span class="quiz-opt-key">${LETTERS[i]}</span><span>${text}</span>`;
      btn.addEventListener("click", () => answerPractice(i, qData, btn));
      opts.appendChild(btn);
    });
  }

  function answerPractice(pickedIndex, qData, btnEl) {
    const isCorrect = pickedIndex === qData.c;
    const opts = $("quizPracticeOpts").children;
    
    for (let i = 0; i < opts.length; i++) {
      opts[i].disabled = true;
      if (i === qData.c) opts[i].classList.add("is-correct");
      else if (i === pickedIndex) opts[i].classList.add("is-wrong");
      else opts[i].classList.add("is-dim");
    }

    if (isCorrect) {
      practice.right++;
      $("quizPracticeMsg").textContent = "🎉 Correto!";
      $("quizPracticeMsg").className = "quiz-msg is-ok";
    } else {
      $("quizPracticeMsg").textContent = "❌ Errado.";
      $("quizPracticeMsg").className = "quiz-msg is-bad";
    }

    practice.total++;
    state.totalPracticed++;
    saveState();
    renderStatsUI();

    $("quizPracticeScore").textContent = `${practice.right} de ${practice.total}`;
    $("quizPracticeExplain").hidden = false;
    $("quizPracticeExplain").textContent = qData.e;
  }

  function renderStatsUI() {
    $("quizStatAnswered").textContent = state.totalHits;
    $("quizStatHits").textContent = state.totalHits;
    $("quizStatAccuracy").textContent = state.totalHits > 0 ? "100%" : "—";
    $("quizStatBest").textContent = state.bestStreak;

    const statStreak = $("statStreak");
    if (statStreak) statStreak.textContent = state.streak;
    const statBest = $("statBest");
    if (statBest) statBest.textContent = state.bestStreak;
    const statHits = $("statHits");
    if (statHits) statHits.textContent = state.totalHits;
    const statPracticed = $("statPracticed");
    if (statPracticed) statPracticed.textContent = state.totalPracticed;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();