/* quiz.js — Quiz do dia, treino e ranking da Society MLBB.
   Usa só o que o app.js já expõe: window.appSend, window.Society e o evento "society:tab". */
(function () {
  "use strict";

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const MEDALS = ["🥇", "🥈", "🥉"];

  let S = null;               // estado do quiz do dia (vem do servidor)
  let stateAt = 0;            // quando o estado chegou (para o contador)
  let guest = false;
  let stale = false;          // true enquanto o estado veio só do cache local
  let answering = false;
  let fresh = false;          // acabou de responder: anima o resultado
  let lastResult = null;
  let currentTab = "daily";
  let ranking = null;
  let answerTimer = null;
  let lastRefresh = 0;
  let mounted = false;
  const practice = { q: null, result: null, pending: false, right: 0, total: 0 };

  const $ = id => document.getElementById(id);
  const send = obj => typeof window.appSend === "function" && window.appSend(obj) === true;
  const toast = msg => { if (window.Society && window.Society.toast) window.Society.toast(msg); };

  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }

  function plural(n, one, many) { return n === 1 ? one : many; }

  function remaining() {
    return Math.max(0, Math.round((S.next_in || 0) - (Date.now() - stateAt) / 1000));
  }

  function clock(total) {
    const pad = n => String(n).padStart(2, "0");
    return pad(Math.floor(total / 3600)) + ":" + pad(Math.floor(total % 3600 / 60)) + ":" + pad(total % 60);
  }

  /* ───────── montagem ───────── */
  function mount() {
    if (mounted || !$("quizPage")) return;
    mounted = true;
    document.querySelectorAll("[data-quiz-tab]").forEach(button =>
      button.addEventListener("click", () => switchTab(button.dataset.quizTab)));
    $("quizPracticeNext").addEventListener("click", requestPractice);
    $("quizRankRefresh").addEventListener("click", requestRanking);
    $("quizSignup").addEventListener("click", () => {
      const banner = $("guestSignup");
      if (banner) banner.click();
    });
    setInterval(tick, 1000);
    renderAll();
  }

  /* ───────── estado do quiz do dia ───────── */
  function setState(state, options) {
    mount();
    if (!state) return;
    S = state;
    stateAt = Date.now();
    guest = Boolean(state.locked);
    stale = Boolean(options && options.cached);
    answering = false;
    renderAll();
  }

  function onShow() {
    mount();
    lastRefresh = Date.now();
    send({ t: "quiz_get" });                  // evita mostrar a pergunta de ontem guardada no cache
    if (currentTab === "ranking") requestRanking();
    if (currentTab === "practice" && !practice.q) requestPractice();
  }

  function tick() {
    const tab = $("tab-quiz");
    if (!S || !tab || !tab.classList.contains("on")) return;
    const left = remaining();
    if (S.done && $("quizCountdown")) $("quizCountdown").textContent = clock(left);
    if (left <= 0 && Date.now() - lastRefresh > 5000) {   // virou o dia: busca a pergunta nova
      lastRefresh = Date.now();
      send({ t: "quiz_get" });
    }
  }

  function answerDaily(index) {
    if (!S || S.done || guest || stale || answering) return;
    answering = true;
    renderDaily(index);
    if (!send({ t: "quiz_answer", i: index })) {
      answering = false;
      toast("Sem conexão com o servidor. Recarregue a página.");
      renderDaily();
      return;
    }
    clearTimeout(answerTimer);
    answerTimer = setTimeout(() => {
      if (!answering) return;
      answering = false;
      toast("Não foi possível confirmar sua resposta. Tente de novo.");
      renderDaily();
    }, 6000);
  }

  /* ───────── mensagens do servidor ───────── */
  function onMessage(m) {
    if (m.t === "quiz_state") {
      setState(m);
    } else if (m.t === "quiz_result") {
      clearTimeout(answerTimer);
      lastResult = { ok: Boolean(m.ok), reward: m.reward || 0, bonus: m.bonus || 0 };
      fresh = true;
      setState(m.state || S);
    } else if (m.t === "quiz_ranking") {
      ranking = m;
      renderRanking();
    } else if (m.t === "quiz_practice") {
      practice.q = { id: m.id, q: m.q, o: m.o };
      practice.result = null;
      practice.pending = false;
      renderPractice();
    } else if (m.t === "quiz_practice_result") {
      if (!practice.q || practice.q.id !== m.id) return;
      practice.pending = false;
      practice.result = { picked: m.picked, correct: m.correct, ok: Boolean(m.ok), explain: m.explain || "" };
      practice.total += 1;
      if (m.ok) practice.right += 1;
      fresh = true;
      renderPractice();
    }
  }

  /* ───────── abas ───────── */
  function switchTab(name) {
    currentTab = name;
    ["daily", "practice", "ranking"].forEach(key => {
      const active = key === name;
      const button = document.querySelector('[data-quiz-tab="' + key + '"]');
      if (button) {
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
      }
      const panel = $("quizPanel" + key.charAt(0).toUpperCase() + key.slice(1));
      if (panel) panel.hidden = !active;
    });
    if (name === "practice" && !practice.q) requestPractice();
    if (name === "ranking") requestRanking();
  }

  function requestPractice() {
    if (!send({ t: "quiz_practice", exclude: practice.q ? practice.q.id : null })) {
      toast("Sem conexão com o servidor. Recarregue a página.");
    }
  }

  function requestRanking() {
    $("quizRankMe").textContent = "Carregando ranking...";
    if (!send({ t: "quiz_ranking" })) $("quizRankMe").textContent = "Sem conexão com o servidor.";
  }

  /* ───────── desenho ───────── */
  function renderAll() {
    if (!mounted) return;
    renderStreak();
    renderDaily();
    renderStats();
    renderPractice();
    if (ranking) renderRanking();
  }

  function renderStreak() {
    const n = S ? (S.streak || 0) : 0;
    $("quizStreakNum").textContent = String(n);
    $("quizStreakLabel").textContent = plural(n, "dia seguido", "dias seguidos");
    $("quizStreak").classList.toggle("is-on", n > 0);
    let hint = "";
    if (S && !guest) {
      if (!S.done && n > 0) {
        hint = "Responda hoje para manter a sequência.";
      } else if (S.next_bonus) {
        const left = S.next_bonus.days - n;
        hint = "Faltam " + left + plural(left, " dia", " dias") + " para ganhar +" + S.next_bonus.coins + " moedas extras.";
      }
    }
    $("quizStreakHint").textContent = hint;
  }

  function renderStats() {
    $("quizStats").hidden = guest || !S;
    if (!S) return;
    $("quizStatAnswered").textContent = String(S.answered || 0);
    $("quizStatHits").textContent = String(S.hits || 0);
    $("quizStatAccuracy").textContent = S.accuracy == null ? "—" : S.accuracy + "%";
    $("quizStatBest").textContent = String(S.best_streak || 0);
  }

  function renderDaily(pendingIndex) {
    const options = $("qOpts"), message = $("qMsg");
    if (!S) {
      $("qText").textContent = "Carregando quiz...";
      options.textContent = "";
      return;
    }
    $("qText").textContent = S.q;
    $("quizReward").textContent = "+" + (S.coins || 10) + " moedas";
    options.textContent = "";

    S.o.forEach((label, index) => {
      const button = el("button", null, "quiz-opt");
      button.type = "button";
      button.append(el("span", LETTERS[index] || String(index + 1), "quiz-opt-key"), el("span", label));
      button.disabled = Boolean(S.done || guest || stale || answering);
      if (answering && index === pendingIndex) button.classList.add("is-pending");
      if (S.done) {
        if (index === S.correct_index) button.classList.add("is-correct");
        else if (index === S.picked) button.classList.add("is-wrong");
        else button.classList.add("is-dim");
        if (index === S.picked) button.classList.add("is-picked");
        if (fresh) button.classList.add("is-fresh");
      }
      button.addEventListener("click", () => answerDaily(index));
      options.append(button);
    });

    message.className = "quiz-msg";
    if (guest) {
      message.textContent = "Faça login para responder o quiz do dia.";
    } else if (stale) {
      message.textContent = "Atualizando...";
    } else if (S.done && S.was_correct === true) {
      const gained = lastResult && lastResult.ok && lastResult.reward
        ? "Acertou! +" + lastResult.reward + " moedas" + (lastResult.bonus ? " (" + lastResult.bonus + " de bônus de sequência)" : "") + "."
        : "Você acertou o quiz de hoje.";
      message.textContent = gained;
      message.classList.add("is-ok");
    } else if (S.done && S.was_correct === false) {
      message.textContent = "Errou. A resposta certa está em verde.";
      message.classList.add("is-bad");
    } else if (S.done) {
      message.textContent = "Você já respondeu hoje.";
    } else {
      message.textContent = "Acertou = +" + (S.coins || 10) + " moedas. Uma tentativa por dia.";
    }

    const explain = $("quizExplain");
    explain.hidden = !(S.done && S.explain);
    explain.textContent = S.explain || "";
    $("quizNext").hidden = !S.done || guest;
    if (S.done) $("quizCountdown").textContent = clock(remaining());
    $("quizGuestCta").hidden = !guest;
    fresh = false;
  }

  function renderPractice() {
    const q = practice.q, result = practice.result;
    const options = $("quizPracticeOpts"), message = $("quizPracticeMsg"), explain = $("quizPracticeExplain");
    $("quizPracticeScore").textContent = practice.right + " de " + practice.total;
    options.textContent = "";
    message.className = "quiz-msg";
    message.textContent = "";
    explain.hidden = true;

    if (!q) {
      $("quizPracticeText").textContent = "Toque em “Nova pergunta” para treinar.";
      $("quizPracticeNext").textContent = "Nova pergunta";
      return;
    }
    $("quizPracticeText").textContent = q.q;
    q.o.forEach((label, index) => {
      const button = el("button", null, "quiz-opt");
      button.type = "button";
      button.append(el("span", LETTERS[index] || String(index + 1), "quiz-opt-key"), el("span", label));
      button.disabled = Boolean(result || practice.pending);
      if (result) {
        if (index === result.correct) button.classList.add("is-correct");
        else if (index === result.picked) button.classList.add("is-wrong");
        else button.classList.add("is-dim");
        if (index === result.picked) button.classList.add("is-picked");
        if (fresh) button.classList.add("is-fresh");
      }
      button.addEventListener("click", () => {
        if (practice.result || practice.pending) return;
        practice.pending = true;
        renderPractice();
        if (!send({ t: "quiz_practice_answer", id: q.id, i: index })) {
          practice.pending = false;
          toast("Sem conexão com o servidor. Recarregue a página.");
          renderPractice();
        }
      });
      options.append(button);
    });
    if (result) {
      message.textContent = result.ok ? "Acertou!" : "Errou. A resposta certa está em verde.";
      message.classList.add(result.ok ? "is-ok" : "is-bad");
      explain.hidden = !result.explain;
      explain.textContent = result.explain;
      $("quizPracticeNext").textContent = "Próxima pergunta";
    } else {
      $("quizPracticeNext").textContent = "Pular pergunta";
    }
    fresh = false;
  }

  function renderRanking() {
    const list = $("quizRankList"), mine = $("quizRankMe");
    list.textContent = "";
    if (!ranking) return;
    if (!ranking.list.length) {
      list.append(el("li", "Ninguém respondeu ainda. Seja a primeira pessoa do ranking.", "quiz-rank-empty"));
    }
    ranking.list.forEach(entry => {
      const item = el("li", null, "quiz-rank-item" + (entry.me ? " is-me" : ""));
      item.append(el("span", entry.pos <= 3 ? MEDALS[entry.pos - 1] : String(entry.pos), "quiz-rank-pos"));
      let name;
      if (entry.nick) {
        name = el("button", entry.name, "quiz-rank-name");
        name.type = "button";
        name.addEventListener("click", () => {
          if (window.Society && window.Society.openProfile) window.Society.openProfile(entry.nick);
        });
      } else {
        name = el("span", entry.name, "quiz-rank-name is-private");
      }
      item.append(
        name,
        el("span", entry.hits + plural(entry.hits, " acerto", " acertos"), "quiz-rank-hits"),
        el("span", entry.accuracy + "%", "quiz-rank-acc")
      );
      list.append(item);
    });
    if (ranking.me) {
      mine.textContent = "Você está em " + ranking.me.pos + "º lugar entre " + ranking.players +
        plural(ranking.players, " jogador", " jogadores") + ", com " + ranking.me.hits + plural(ranking.me.hits, " acerto.", " acertos.");
    } else {
      mine.textContent = guest
        ? "Crie uma conta para entrar no ranking."
        : "Responda o quiz do dia para aparecer no ranking.";
    }
  }

  window.addEventListener("society-app-ready", mount);
  window.addEventListener("society:tab", event => { if (event.detail === "quiz") onShow(); });
  window.SocietyQuiz = { setState: setState, onMessage: onMessage, onShow: onShow };
})();