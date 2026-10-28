/* Society MLBB — Calculadora de Win Rate (versão estática, sem backend) */
(function () {
  // ---------- Lógica pura ----------
  function gamesNeededForTarget(games, wins, targetPct, futurePct) {
    const t = targetPct / 100;
    const f = futurePct / 100;
    const current = wins / games;
    if (Math.abs(current * 100 - targetPct) < 0.005) return { kind: "met" };

    if (t > current) {
      if (targetPct >= 100 && f >= 1) return { kind: "impossible-100" };
      if (f <= t) return { kind: "impossible-up" };
      const raw = (t * games - wins) / (f - t);
      return { kind: f >= 0.9999 ? "streak-win" : "future-up", n: Math.max(1, Math.ceil(raw - 1e-9)) };
    }
    if (targetPct <= 0 && f <= 0) return { kind: "impossible-0" };
    if (f >= t) return { kind: "impossible-down" };
    const raw = (wins - t * games) / (t - f);
    return { kind: f <= 1e-12 ? "streak-loss" : "future-down", n: Math.max(1, Math.ceil(raw - 1e-9)) };
  }

  function lossesUntilBelow(games, wins, floorPct) {
    const t = floorPct / 100;
    if (!(t > 0) || t >= 1) return { kind: "invalid" };
    if (wins / games < t) return { kind: "already" };
    return { kind: "ok", n: Math.max(1, Math.floor(wins / t - games) + 1) };
  }

  if (typeof module !== "undefined") module.exports = { gamesNeededForTarget, lossesUntilBelow };
  if (typeof document === "undefined") return;

  // ---------- Interface ----------
  const $ = (id) => document.getElementById(id);
  const num = (id) => {
    const v = $(id).value.trim().replace(",", ".");
    return v === "" ? NaN : Number(v);
  };
  const pct = (v) => Number(v.toFixed(2)).toLocaleString("pt-BR") + "%";
  const int = (v) => Number(v).toLocaleString("pt-BR");
  const partidas = (n) => int(n) + (n === 1 ? " partida" : " partidas");

  function setResult(el, msg, status) {
    el.textContent = msg;
    el.classList.toggle("success", status === "success");
    el.classList.toggle("warning", status === "warning");
  }

  function update() {
    const games = num("wrN");
    const current = num("wrW");
    const target = num("wrT");
    const futureRaw = num("wrFuture");
    const floorRaw = num("wrFloor");
    const future = Number.isFinite(futureRaw) ? futureRaw : 100;
    const floor = Number.isFinite(floorRaw) ? floorRaw : 50;
    const out = $("wrOut");
    const margin = $("wrMarginOut");

    const gamesOk = Number.isInteger(games) && games > 0;
    const currentOk = Number.isFinite(current) && current >= 0 && current <= 100;
    const targetOk = Number.isFinite(target) && target >= 0 && target <= 100;
    const futureOk = future >= 0 && future <= 100;
    const floorOk = floor >= 0 && floor < 100;

    $("barNow").style.width = currentOk ? Math.min(100, current) + "%" : "0%";
    $("barGoal").style.left = targetOk ? Math.min(100, target) + "%" : "0%";
    $("wrNowLabel").textContent = currentOk ? pct(current) : "—";
    $("wrGoalLabel").textContent = targetOk ? pct(target) : "—";

    if (!gamesOk || !currentOk) {
      $("wrWins").textContent = $("wrLosses").textContent = $("wrHero").textContent = "—";
      $("wrRecord").textContent = "Preencha partidas e win rate atual para calcular vitórias e derrotas.";
      margin.textContent = "Informe seu histórico para ver quantas derrotas cabem antes de cair dessa linha.";
      return setResult(out, "Preencha partidas, win rate atual e a meta.", "");
    }

    const wins = Math.round((games * current) / 100);
    const losses = games - wins;
    $("wrWins").textContent = int(wins);
    $("wrLosses").textContent = int(losses);
    $("wrHero").textContent = pct((wins / games) * 100);

    const rec = $("wrRecord");
    rec.replaceChildren("Você venceu ");
    const b1 = document.createElement("b"); b1.textContent = partidas(wins);
    const b2 = document.createElement("b"); b2.className = "loss"; b2.textContent = partidas(losses);
    rec.append(b1, " e perdeu ", b2, ". Calculamos isso a partir do win rate informado.");

    if (floorOk) {
      const d = lossesUntilBelow(games, wins, floor);
      margin.textContent = d.kind === "already"
        ? "Seu win rate já está abaixo de " + pct(floor) + "."
        : int(d.n) + (d.n === 1 ? " derrota seguida deixaria" : " derrotas seguidas deixariam") +
          " você abaixo de " + pct(floor) + ".";
    } else {
      margin.textContent = "Informe um valor entre 0% e 100% para a linha de margem.";
    }

    if (!targetOk) return setResult(out, "Informe o win rate que você quer alcançar.", "");
    if (!futureOk) return setResult(out, "O win rate daqui em diante precisa estar entre 0% e 100%.", "warning");

    const r = gamesNeededForTarget(games, wins, target, future);
    const alvo = pct(target);
    const dep = pct(future);
    switch (r.kind) {
      case "met": return setResult(out, "Seu win rate já está na meta de " + alvo + ".", "success");
      case "impossible-100": return setResult(out, "Não é possível atingir 100% se você já tem derrotas.", "warning");
      case "impossible-0": return setResult(out, "Não é possível chegar a 0% se você já tem vitórias.", "warning");
      case "impossible-up": return setResult(out, "Com " + dep + " daqui em diante não é possível subir até " + alvo + ".", "warning");
      case "impossible-down": return setResult(out, "Com " + dep + " daqui em diante o win rate não cai até " + alvo + ".", "warning");
      case "streak-win": return setResult(out, "Vença mais " + int(r.n) + (r.n === 1 ? " partida seguida" : " partidas seguidas") + " para chegar a " + alvo + ".", "success");
      case "future-up": return setResult(out, "Com " + dep + " daqui em diante, você precisa de cerca de " + partidas(r.n) + " para chegar a " + alvo + ".", "success");
      case "streak-loss": return setResult(out, "Se perder " + int(r.n) + (r.n === 1 ? " partida seguida" : " partidas seguidas") + ", seu win rate cai para cerca de " + alvo + ".", "warning");
      default: return setResult(out, "Com " + dep + " daqui em diante, cerca de " + partidas(r.n) + " levariam o win rate a " + alvo + ".", "warning");
    }
  }

  ["wrN", "wrW", "wrT", "wrFuture", "wrFloor"].forEach((id) => $(id).addEventListener("input", update));
  $("wrReset").addEventListener("click", () => {
    ["wrN", "wrW", "wrT"].forEach((id) => ($(id).value = ""));
    $("wrFuture").value = "100";
    $("wrFloor").value = "50";
    update();
    $("wrN").focus();
  });
  update();
})();