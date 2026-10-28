/* admin-panel.js — Central da comunidade (todos os cargos).
   Usa window.appSend / window.Society e o evento "society:admin" (ver patch do app.js).
   As permissões reais são SEMPRE validadas no servidor; aqui só decidimos o que mostrar. */
(() => {
  const $ = (id) => document.getElementById(id);
  const el = (t, x, c) => { const e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; };
  const send = (o) => (typeof window.appSend === "function" ? window.appSend(o) : false);
  const ORDER = ["user", "beta", "streamer", "vip", "admin", "mod", "dev"];
  const ROLE = { user: ["Jogador", "is-user"], beta: ["Beta", "is-beta"], streamer: ["Streamer", "is-streamer"], vip: ["VIP", "is-vip"], admin: ["ADM", "is-admin"], mod: ["MOD", "is-mod"], dev: ["DEV", "is-dev"] };
  const TITLE = { user: "Jogador", beta: "Beta Tester", streamer: "Streamer", vip: "VIP", admin: "Administrador", mod: "Moderador", dev: "Desenvolvedor" };
  const CAT = { harassment: "Assédio ou intimidação", hate: "Discurso de ódio", spam: "Spam ou golpe", cheating: "Trapaça ou antidesportivo", inappropriate: "Conteúdo impróprio", other: "Outro problema" };
  const STATUS = { open: "PENDENTE", reviewed: "EM ANÁLISE", resolved: "RESOLVIDA", dismissed: "DESCARTADA" };
  const FEATURES = [
    ["Denunciar jogadores", "user"], ["Relatório de bug pronto para enviar à equipe", "beta"],
    ["Atalho para configurar seu canal de stream", "streamer"], ["Atalho de destaque do perfil", "vip"],
    ["Analisar denúncias, filtrar, exportar e agir em lote", "admin"],
    ["Silenciar e remover silenciamentos", "mod"], ["Gerenciar cargos e ver contas", "dev"],
  ];
  const S = { role: "user", reports: [], mutes: [], accounts: [], filter: "open", cat: "", sort: "new", q: "", sel: new Set(), selMutes: new Set(), roleFilter: "all", accQ: "", accSort: "role", log: [], timer: 0, profileCache: new Map(), previewNick: "", profileSeq: 0, profileQ: "" };
  const rank = (r) => ORDER.indexOf(r);
  const has = (min) => rank(S.role) >= rank(min);
  const fmt = (ts) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(ts * 1000));

  function msg(text, err) {
    const m = $("admMessage"); if (!m) return;
    m.textContent = text || ""; m.classList.toggle("is-error", Boolean(err));
  }
  function log(text, err) {
    S.log.unshift({ ts: Date.now() / 1000, text, err: Boolean(err) });
    S.log.length = Math.min(S.log.length, 60);
    renderLog();
  }
  function act(payload, label) { const ok = send(payload); log(ok ? label : "Falha de conexão: " + label, !ok); return ok; }
  const profile = (nick) => previewProfile(nick);
  function userLink(nick) {
    const b = el("button", "@" + nick, "moderation-user-link"); b.type = "button";
    b.setAttribute("aria-label", "Ver perfil de @" + nick);
    b.addEventListener("click", (e) => { e.stopPropagation(); profile(nick); });
    return b;
  }
  function btn(label, fn, cls) { const b = el("button", label, cls || "moderation-secondary"); b.type = "button"; b.addEventListener("click", fn); return b; }
  function copy(text, ok) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => msg(ok || "Copiado."), () => msg("Não foi possível copiar neste navegador.", true));
  }
  function csv(rows, name) {
    const body = rows.map((r) => r.map((c) => '"' + String(c ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
    a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ── Prévia de perfis (ADM/MOD/DEV) ── */
  function profileInitials(p) {
    const text = String((p && (p.display_name || p.name || p.username || p.nick)) || "?").trim();
    return text.slice(0, 1).toLocaleUpperCase("pt-BR") || "?";
  }
  function profileAvatar(p, cls) {
    if (window.ProfileUI && typeof window.ProfileUI.createAvatar === "function") {
      const avatar = window.ProfileUI.createAvatar(p || {}, cls);
      if (p && p.frame) avatar.dataset.frame = p.frame;
      if (p && p.accent) avatar.style.setProperty("--profile-accent", p.accent);
      return avatar;
    }
    return el("span", profileInitials(p), cls);
  }
  function joinedLabel(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
  }
  function renderProfilePreview(p, nick, loading) {
    const body = $("admProfileDialogBody");
    if (!body) return;
    body.textContent = "";

    const card = el("article", null, "adm-profile-card");
    if (!p) {
      card.append(el("p", "Carregando a prévia de @" + nick + "…", "adm-profile-loading"));
      body.append(card);
      return;
    }

    const banner = el("div", null, "adm-profile-banner");
    if (p.banner) banner.style.backgroundImage =
      'linear-gradient(180deg, rgba(7,8,10,.18), rgba(7,8,10,.85)), url("' + p.banner + '")';
    const close = btn("✕", () => { const d = $("admProfileDialog"); if (d) d.close(); }, "adm-profile-close");
    close.setAttribute("aria-label", "Fechar prévia");
    banner.append(close);
    const roleKey = window.RoleColors ? window.RoleColors.keyFor(p) : "";
    if (roleKey && window.RoleColors) banner.append(el("span", window.RoleColors.label(p), "role-badge " + (ROLE[roleKey] || ROLE.user)[1]));
    card.append(banner);

    const head = el("div", null, "adm-profile-head");
    head.append(profileAvatar(p, "adm-profile-avatar"));
    const identity = el("div", null, "adm-profile-identity");
    const name = el("h3", p.display_name || p.username || nick, "adm-profile-name");
    name.id = "admProfileDialogTitle";
    if (window.RoleColors) window.RoleColors.apply(name, p);
    identity.append(name, el("p", "@" + (p.username || nick), "adm-profile-handle"));
    const roles = el("div", null, "adm-profile-roles");
    (Array.isArray(p.community_roles) ? p.community_roles : []).forEach((role) => {
      const chip = el("span", role, "profile-community-role");
      chip.dataset.role = String(role).toLowerCase();
      roles.append(chip);
    });
    if (roles.childElementCount) identity.append(roles);
    head.append(identity);
    card.append(head);

    const meta = el("div", null, "adm-profile-meta");
    [["Elo", p.rank], ["Herói", p.hero], ["Função", p.game_role], ["Entrou", joinedLabel(p.joined_at)]].forEach(([label, value]) => {
      if (!value) return;
      const item = el("span", null, "adm-profile-meta-item");
      item.append(el("small", label), el("b", value));
      meta.append(item);
    });
    if (meta.childElementCount) card.append(meta);

    if (p.details_hidden) card.append(el("p", "Perfil privado — os detalhes ficam ocultos para quem não é amigo.", "adm-profile-locked"));
    else if (p.bio) card.append(el("p", p.bio, "adm-profile-bio"));

    const actions = el("div", null, "adm-profile-actions");
    actions.append(btn("Abrir perfil completo", () => {
      const dialog = $("admProfileDialog");
      if (dialog) dialog.close();
      try { window.Society?.openProfile(nick); } catch (e) {}
    }, "moderation-secondary"));
    actions.append(btn("Copiar @" + nick, () => copy("@" + nick, "Nick copiado."), "moderation-secondary"));
    actions.append(btn("Fechar", () => { const d = $("admProfileDialog"); if (d) d.close(); }, "moderation-secondary"));
    card.append(actions);
    body.append(card);
  }
  function previewProfile(nick) {
    if (!nick) return;
    const key = String(nick).toLowerCase();
    const dialog = $("admProfileDialog");
    if (!dialog) { try { window.Society?.openProfile(key); } catch (e) {} return; }
    S.previewNick = key;
    const cached = S.profileCache.get(key);
    renderProfilePreview(cached || null, key, !cached);
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!cached) send({ t: "profile_view", nick: key });
  }
  function renderProfileShortcuts() {
    const box = $("admProfileShortcuts");
    if (!box) return;
    const nicks = [];
    S.reports.forEach((report) => {
      [report.target, report.reporter].forEach((nick) => {
        if (nick && !nicks.includes(nick)) nicks.push(nick);
      });
    });
    S.mutes.forEach((mute) => { if (mute.nick && !nicks.includes(mute.nick)) nicks.push(mute.nick); });
    box.textContent = "";
    if (!nicks.length) { box.hidden = true; return; }
    box.hidden = false;
    box.append(el("span", "Nas denúncias:", "adm-profile-shortcut-label"));
    nicks.slice(0, 10).forEach((nick) => {
      const b = btn("@" + nick, () => previewProfile(nick), "adm-profile-shortcut");
      box.append(b);
    });
  }
  function renderProfileResults(list) {
    const box = $("admProfileResults");
    if (!box) return;
    box.textContent = "";
    const empty = $("admProfileEmpty");
    if (!list.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;    list.forEach((user) => {
      const card = el("button", null, "adm-profile-result");
      card.type = "button";
      card.setAttribute("aria-label", "Ver prévia do perfil de @" + user.nick);
      const copyBox = el("span", null, "adm-profile-result-copy");
      const name = el("b", user.name || user.nick);
      if (window.RoleColors) window.RoleColors.apply(name, user);
      copyBox.append(name, el("small", "@" + user.nick, "adm-profile-result-nick"));
      const key = window.RoleColors ? window.RoleColors.keyFor(user) : "";
      if (key) copyBox.append(el("span", window.RoleColors.label(user), "adm-profile-result-role role-" + key));
      card.append(profileAvatar(user, "adm-profile-result-avatar"), copyBox);
      card.addEventListener("click", () => previewProfile(user.nick));
      box.append(card);
    });
  }
  function setProfileEmptyState(title, hint) {
    const box = $("admProfileEmpty");
    if (!box) return;
    const titleEl = box.querySelector("b");
    const hintEl = box.querySelector("small");
    if (titleEl && title) titleEl.textContent = title;
    if (hintEl && hint) hintEl.textContent = hint;
  }
  async function searchProfiles(query) {
    const empty = $("admProfileEmpty");
    const q = String(query || "").trim();
    if (q.length < 2) {
      renderProfileResults([]);
      if (empty) { empty.hidden = false; setProfileEmptyState("Busque um jogador", "Digite pelo menos 2 letras para ver os cards de perfil."); }
      return;
    }
    const seq = ++S.profileSeq;
    try {
      const viewer = window.Society?.self?.() || "";
      const response = await fetch("/api/users/search?q=" + encodeURIComponent(q) +
        "&viewer=" + encodeURIComponent(viewer), { headers: { Accept: "application/json" } });
      const list = await response.json();
      if (seq !== S.profileSeq) return;
      const users = Array.isArray(list) ? list : [];
      renderProfileResults(users);
      if (!users.length && empty) setProfileEmptyState("Nenhum perfil encontrado", "Tente buscar por outro nick ou nome.");
    } catch (error) {
      if (seq !== S.profileSeq) return;
      renderProfileResults([]);
      if (empty) { empty.hidden = false; setProfileEmptyState("Não foi possível buscar", "Verifique a conexão e tente novamente."); }
      msg("Não foi possível buscar perfis agora.", true);
    }
  }

  function renderAccess() {
    const info = ROLE[S.role];
    $("admAccessTitle").textContent = TITLE[S.role];
    const badge = $("admRoleBadge"); badge.textContent = info[0].toUpperCase(); badge.className = "role-badge " + info[1];
    const ladder = $("admLadder"); ladder.textContent = "";
    ORDER.forEach((r, i) => {
      const li = el("li", ROLE[r][0], ROLE[r][1] + (i < rank(S.role) ? " is-done" : "") + (r === S.role ? " is-current" : ""));
      if (r === S.role) li.setAttribute("aria-current", "true");
      ladder.append(li);
    });
    const perms = $("admPerms"); perms.textContent = "";
    FEATURES.forEach(([label, min]) => {
      const on = has(min);
      const li = el("li", null, on ? "" : "is-off");
      li.append(el("span", on ? "✓" : "—", "perm-icon"), el("span", label + (on ? "" : " · exige " + ROLE[min][0])));
      perms.append(li);
    });
    document.querySelectorAll("#admRoot [data-min]").forEach((s) => { s.hidden = !has(s.dataset.min); });
  }

  /* ── Ferramentas por cargo ── */
  function tool(title, desc, items, extra) {
    const c = el("article", null, "adm-tool"); c.append(el("h4", title));
    if (desc) c.append(el("p", desc));
    if (items) { const ul = el("ul"); items.forEach((t) => ul.append(el("li", t))); c.append(ul); }
    if (extra) extra(c);
    return c;
  }
  function renderTools() {
    const box = $("admTools"); box.textContent = "";
    box.append(tool("Regras da comunidade", "O que a equipe considera infração:", [
      "Respeite todos: sem assédio, ameaças ou discurso de ódio.", "Nada de spam, golpes ou divulgação não autorizada.",
      "Jogue limpo: trapaça e conluio levam a punições.", "Conteúdo impróprio ou que exponha dados pessoais é removido."]));
    box.append(tool("Como denunciar bem", "Denúncias claras são resolvidas mais rápido:", [
      "Abra o perfil do jogador e use “Denunciar”.", "Escolha a categoria certa e descreva o que aconteceu.",
      "Inclua o contexto (sala, horário, mensagens). Não denuncie por vingança."]));
    if (has("beta")) box.append(tool("Relatório de bug", "Gera um texto com dados do seu navegador para colar para a equipe.", null, (c) => {
      const ta = document.createElement("textarea"); ta.placeholder = "O que aconteceu? Passos para reproduzir…"; ta.maxLength = 1500;
      c.append(ta, btn("Copiar relatório", () => {
        const me = window.Society?.self?.() || "";
        copy(["BUG · Society MLBB", "Conta: @" + me + " (" + S.role + ")", "Página: " + location.href, "Tela: " + innerWidth + "x" + innerHeight,
          "Navegador: " + navigator.userAgent, "Data: " + new Date().toLocaleString("pt-BR"), "", ta.value.trim() || "(sem descrição)"].join("\n"), "Relatório copiado. Cole na conversa com a equipe.");
      }));
    }));
    if (S.role === "streamer" || S.role === "dev") box.append(tool("Seu canal de stream", "Cadastre o link da Twitch, YouTube ou Kick e use “Entrei ao vivo”.", ["Abra seu perfil e clique em Editar perfil.", "Vá na aba Stream e cole o link do canal."], (c) =>
      c.append(btn("Abrir meu perfil", () => window.Society?.tab("profile")))));
    if (["vip", "streamer", "admin", "mod", "dev"].includes(S.role)) box.append(tool("Destaque do perfil", "Capriche no seu card: banner, moldura, cor e tema.", null, (c) =>
      c.append(btn("Personalizar perfil", () => window.Society?.tab("profile")))));
    if (has("admin")) box.append(tool("Checklist de decisão", "Antes de agir numa denúncia:", [
      "Confira se há reincidência (selo laranja) e o histórico no perfil.", "Prefira “Marcar em análise” antes de punir.",
      "Descarte denúncias sem fundamento; encerre as resolvidas.", "Seu nome fica registrado como revisor."]));
    if (has("mod")) box.append(tool("Guia de silenciamento", "Escolha a duração proporcional à gravidade:", [
      "10 min: aviso rápido, primeira ocorrência leve.", "1 h: reincidência ou ofensa clara.", "24 h: casos graves. Escalone para DEV se necessário."]));
    if (has("dev")) box.append(tool("Boas práticas de cargos", null, [
      "Dê o menor cargo necessário.", "Você não altera o próprio cargo (proteção contra lockout).", "Exporte a lista de contas antes de mudanças grandes."]));
  }

  /* ── Painel ── */
  function stat(label, n, cls) { const d = el("div", null, "adm-stat " + (cls || "")); d.append(el("b", String(n)), el("span", label)); return d; }
  function counts() { const c = { open: 0, reviewed: 0, resolved: 0, dismissed: 0 }; S.reports.forEach((r) => { if (c[r.status] != null) c[r.status]++; }); return c; }
  function renderStats() {
    const c = counts(), box = $("admStats"); if (!box) return; box.textContent = "";
    box.append(stat("Pendentes", c.open, c.open ? "is-alert" : "is-ok"), stat("Em análise", c.reviewed, c.reviewed ? "is-warn" : ""),
      stat("Resolvidas", c.resolved, "is-ok"), stat("Descartadas", c.dismissed));
    if (has("mod")) box.append(stat("Silenciados agora", S.mutes.length, S.mutes.length ? "is-warn" : ""));
    if (has("dev") && S.accounts.length) box.append(stat("Contas", S.accounts.length), stat("Equipe", S.accounts.filter((a) => rank(a.role) >= rank("admin")).length));
  }

  /* ── Denúncias ── */
  const repeats = () => { const m = {}; S.reports.forEach((r) => { m[r.target] = (m[r.target] || 0) + 1; }); return m; };
  function visibleReports() {
    const q = S.q.trim().toLowerCase().replace(/^#/, ""), rep = repeats();
    let list = S.reports.filter((r) => {
      if (S.filter === "open" && r.status !== "open") return false;
      if (S.filter === "reviewed" && r.status !== "reviewed") return false;
      if (S.filter === "closed" && r.status !== "resolved" && r.status !== "dismissed") return false;
      if (S.cat && r.category !== S.cat) return false;
      if (q && !((r.target || "") + " " + (r.reporter || "") + " " + (r.details || "") + " " + (CAT[r.category] || "") + " " + r.id).toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) => S.sort === "old" ? a.created_at - b.created_at : S.sort === "repeat" ? (rep[b.target] - rep[a.target]) || (b.created_at - a.created_at) : b.created_at - a.created_at);
    return list;
  }
  function renderChips() {
    const c = counts(), box = $("admChips"); box.textContent = "";
    [["open", "Pendentes", c.open], ["reviewed", "Em análise", c.reviewed], ["closed", "Encerradas", c.resolved + c.dismissed], ["all", "Todas", S.reports.length]].forEach(([k, label, n]) => {
      const b = el("button", label, "moderation-chip"); b.type = "button"; b.setAttribute("aria-pressed", String(S.filter === k)); b.append(el("em", String(n)));
      b.addEventListener("click", () => { S.filter = k; S.sel.clear(); renderReports(); renderChips(); });
      box.append(b);
    });
  }
  function reportCard(r, rep) {
    const closed = r.status === "resolved" || r.status === "dismissed";
    const card = el("article", null, "moderation-report-card" + (has("admin") ? "" : " no-select"));
    if (has("admin")) {
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = S.sel.has(r.id); cb.disabled = closed;
      cb.setAttribute("aria-label", "Selecionar denúncia #" + r.id);
      cb.addEventListener("change", () => { cb.checked ? S.sel.add(r.id) : S.sel.delete(r.id); updateBulk(); });
      card.append(cb);
    }
    const body = el("div", null, "adm-report-body"), head = el("div", null, "moderation-report-heading"), id = el("div", null, "moderation-report-identity");
    id.append(el("span", "#" + r.id, "moderation-report-id"), userLink(r.target));
    if (rep[r.target] > 1) id.append(el("span", "↻ " + rep[r.target] + " denúncias", "adm-repeat"));
    id.append(el("small", "Denunciado por " + r.reporter + " · " + fmt(r.created_at)));
    head.append(id, el("span", STATUS[r.status] || String(r.status).toUpperCase(), "moderation-status moderation-status-" + r.status));
    body.append(head, el("b", CAT[r.category] || "Outro problema", "moderation-category"), el("p", r.details, "moderation-details"));
    if (r.reviewed_by) body.append(el("small", "Revisado por @" + r.reviewed_by + (r.reviewed_at ? " · " + fmt(r.reviewed_at) : ""), "moderation-reviewed-by"));
    const a = el("div", null, "moderation-actions");
    a.append(btn("👤 Prévia do denunciado", () => profile(r.target)));
    if (r.reporter && r.reporter !== r.target) a.append(btn("👤 Prévia do autor", () => profile(r.reporter)));
    if (r.status === "open") a.append(btn("Marcar em análise", () => act({ t: "moderation_action", id: r.id, action: "review" }, "Denúncia #" + r.id + " marcada em análise")));
    if (has("mod") && !closed) [["10 min", "mute_10m"], ["1 hora", "mute_1h"], ["24 h", "mute_24h"]].forEach(([l, k]) =>
      a.append(btn("Silenciar " + l, () => { if (confirm("Silenciar @" + r.target + " por " + l + "?")) act({ t: "moderation_action", id: r.id, action: k }, "@" + r.target + " silenciado por " + l + " (#" + r.id + ")"); }, k === "mute_24h" ? "moderation-warn" : "moderation-secondary")));
    if (!closed) { a.append(btn("Encerrar", () => act({ t: "moderation_action", id: r.id, action: "close" }, "Denúncia #" + r.id + " encerrada")), btn("Descartar", () => act({ t: "moderation_action", id: r.id, action: "dismiss" }, "Denúncia #" + r.id + " descartada"))); }
    a.append(btn("⧉ Copiar resumo", () => copy("#" + r.id + " · @" + r.target + " · " + (CAT[r.category] || "") + " · " + (STATUS[r.status] || "") + "\nPor " + r.reporter + " em " + fmt(r.created_at) + "\n" + r.details, "Resumo copiado.")));
    body.append(a); card.append(body);
    return card;
  }
  function renderReports() {
    const box = $("admReportList"); if (!box) return;
    const list = visibleReports(), rep = repeats(); box.textContent = "";
    list.forEach((r) => box.append(reportCard(r, rep)));
    $("admReportsEmpty").hidden = list.length > 0;
    $("admBulk").hidden = !has("admin") || !list.some((r) => r.status !== "resolved" && r.status !== "dismissed");
    updateBulk();
  }
  function updateBulk() {
    const ids = visibleReports().filter((r) => r.status !== "resolved" && r.status !== "dismissed").map((r) => r.id);
    S.sel.forEach((id) => { if (!ids.includes(id)) S.sel.delete(id); });
    $("admSelCount").textContent = S.sel.size + (S.sel.size === 1 ? " selecionada" : " selecionadas");
    $("admSelAll").checked = ids.length > 0 && ids.every((id) => S.sel.has(id));
    document.querySelectorAll("#admBulk [data-bulk]").forEach((b) => { b.disabled = !S.sel.size; });
  }
  function bulk(action) {
    const ids = [...S.sel]; if (!ids.length) return;
    const names = { review: "marcar em análise", close: "encerrar", dismiss: "descartar" };
    if (!confirm("Deseja " + names[action] + " " + ids.length + " denúncia(s)?")) return;
    ids.forEach((id) => send({ t: "moderation_action", id, action }));
    log("Em lote: " + names[action] + " " + ids.length + " denúncia(s)");
    S.sel.clear(); setTimeout(refresh, 600);
  }

  /* ── Silenciamentos ── */
  function remain(until) {
    const s = Math.max(0, Math.floor(until - Date.now() / 1000)); if (!s) return "expirado";
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + "h " : "") + String(m).padStart(h ? 2 : 1, "0") + "m " + String(x).padStart(2, "0") + "s";
  }
  function renderMutes() {
    const box = $("admMutes"); if (!box) return; box.textContent = "";
    const list = [...S.mutes].sort((a, b) => a.muted_until - b.muted_until);
    $("admMutesEmpty").hidden = list.length > 0;
    list.forEach((m) => {
      const item = el("div", null, "moderation-mute-item");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = S.selMutes.has(m.nick);
      cb.setAttribute("aria-label", "Selecionar @" + m.nick);
      cb.addEventListener("change", () => { cb.checked ? S.selMutes.add(m.nick) : S.selMutes.delete(m.nick); $("admUnmuteSel").disabled = !S.selMutes.size; });
      const info = el("div"); info.append(userLink(m.nick));
      const rem = el("small"); rem.append("Termina em ", Object.assign(el("span", remain(m.muted_until), "adm-remaining"), { }), " · " + fmt(m.muted_until) + (m.reason ? " · " + m.reason : ""));
      rem.firstElementChild.dataset.until = m.muted_until; info.append(rem);
      if (m.by_nick) info.append(el("small", "Aplicado por @" + m.by_nick));
      const a = el("div", null, "moderation-mute-actions");
      a.append(btn("👤 Prévia", () => profile(m.nick)), btn("Remover", () => { if (confirm("Remover silenciamento de @" + m.nick + "?")) act({ t: "moderation_unmute", target: m.nick }, "Silenciamento de @" + m.nick + " removido"); }));
      item.append(cb, info, a); box.append(item);
    });
    $("admUnmuteSel").disabled = !S.selMutes.size;
  }

  /* ── Contas (DEV) ── */
  function renderAccounts() {
    const box = $("admAccounts"); if (!box) return;
    const cc = { all: S.accounts.length }; ORDER.forEach((r) => { cc[r] = S.accounts.filter((a) => (a.role || "user") === r).length; });
    const chips = $("admRoleChips"); chips.textContent = "";
    ["all", ...ORDER.slice().reverse()].forEach((k) => {
      const b = el("button", k === "all" ? "Todos" : ROLE[k][0], "moderation-chip"); b.type = "button"; b.setAttribute("aria-pressed", String(S.roleFilter === k)); b.append(el("em", String(cc[k])));
      b.addEventListener("click", () => { S.roleFilter = k; renderAccounts(); }); chips.append(b);
    });
    const q = S.accQ.trim().toLowerCase();
    const list = S.accounts.filter((a) => (S.roleFilter === "all" || (a.role || "user") === S.roleFilter) && (!q || (a.nick || "").toLowerCase().includes(q)))
      .sort((a, b) => S.accSort === "nick" ? a.nick.localeCompare(b.nick) : rank(b.role) - rank(a.role) || a.nick.localeCompare(b.nick));
    box.textContent = ""; $("admAccEmpty").hidden = list.length > 0;
    const me = window.Society?.self?.();
    list.forEach((acc) => {
      const row = el("article", null, "moderation-role-item" + (acc.nick === me ? " is-self" : ""));
      const id = el("div"); id.append(userLink(acc.nick));
      const meta = el("div", null, "role-meta");
      meta.append(el("small", acc.source === "google" ? "Google vinculado" : "Conta antiga"), el("small", acc.google_linked ? "🔗 Google" : "🔒 Senha"), el("small", (ROLE[acc.role] || ROLE.user)[0]));
      if (acc.nick === me) meta.append(el("small", "Você")); id.append(meta);
      const a = el("div", null, "moderation-role-actions");
      a.append(btn("👤 Prévia", () => profile(acc.nick)));
      const sel = document.createElement("select"); sel.setAttribute("aria-label", "Cargo de @" + acc.nick);
      ORDER.forEach((r) => sel.append(new Option(ROLE[r][0], r))); sel.value = acc.role || "user"; sel.disabled = acc.nick === me;
      const save = btn("Salvar cargo", () => {
        const next = sel.value; if (!confirm("Alterar @" + acc.nick + " de " + ROLE[acc.role || "user"][0] + " para " + ROLE[next][0] + "?")) return;
        act({ t: "admin_role_set", nick: acc.nick, role: next }, "Cargo de @" + acc.nick + " → " + ROLE[next][0]); save.disabled = true;
      });
      const dis = () => { save.disabled = acc.nick === me || sel.value === (acc.role || "user"); }; dis(); sel.addEventListener("change", dis);
      a.append(sel, save); row.append(id, a); box.append(row);
    });
  }

  function renderLog() {
    const ul = $("admLog"); if (!ul) return; ul.textContent = "";
    $("admLogEmpty").hidden = S.log.length > 0;
    S.log.forEach((e) => { const li = el("li", null, e.err ? "is-error" : ""); li.append(el("time", new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" }).format(new Date(e.ts * 1000))), el("span", e.text)); ul.append(li); });
  }
  const renderAll = () => { renderAccess(); renderTools(); renderStats(); renderChips(); renderReports(); renderMutes(); renderAccounts(); renderLog(); };

  function refresh() {
    if (has("admin")) send({ t: "moderation_list" });
    if (has("dev")) send({ t: "admin_roles_list" });
  }

  /* ── Eventos ── */
  function onMessage(m) {
    if (m.t === "moderation_data") { S.reports = m.reports || []; S.mutes = m.mutes || []; renderStats(); renderChips(); renderReports(); renderMutes(); renderProfileShortcuts(); }
    else if (m.t === "admin_roles") { S.accounts = m.list || []; renderStats(); renderAccounts(); }
    else if (/_saved$/.test(m.t)) { msg(m.m, false); log(m.m || "Ação concluída"); setTimeout(refresh, 400); }
    else if (/_error$/.test(m.t)) { msg(m.m, true); log(m.m || "Erro", true); }
  }
  function onShow() {
    S.role = window.Society?.role?.() || "user";
    renderAll(); renderProfileShortcuts(); refresh();
  }
  function bind() {
    const root = $("admRoot"); if (!root || root.dataset.bound) return; root.dataset.bound = "1";
    $("admRefresh").onclick = $("admAccRefresh").onclick = () => { refresh(); msg("Atualizando…"); };
    $("admCat").append(new Option("Todas as categorias", "")); Object.entries(CAT).forEach(([k, v]) => $("admCat").append(new Option(v, k)));
    $("admCat").onchange = (e) => { S.cat = e.target.value; renderReports(); };
    $("admSort").onchange = (e) => { S.sort = e.target.value; renderReports(); };
    let t = 0; $("admSearch").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; renderReports(); }, 120); });
    $("admSelAll").onchange = (e) => { visibleReports().filter((r) => r.status !== "resolved" && r.status !== "dismissed").forEach((r) => e.target.checked ? S.sel.add(r.id) : S.sel.delete(r.id)); renderReports(); };
    root.querySelectorAll("[data-bulk]").forEach((b) => { b.onclick = () => bulk(b.dataset.bulk); });
    $("admUnmuteSel").onclick = () => { const n = [...S.selMutes]; if (!n.length || !confirm("Remover o silenciamento de " + n.length + " jogador(es)?")) return; n.forEach((nick) => send({ t: "moderation_unmute", target: nick })); log("Em lote: " + n.length + " silenciamento(s) removido(s)"); S.selMutes.clear(); setTimeout(refresh, 600); };
    $("admAccSearch").addEventListener("input", (e) => { S.accQ = e.target.value; renderAccounts(); });
    $("admAccSort").onchange = (e) => { S.accSort = e.target.value; renderAccounts(); };
    const profileSearch = $("admProfileSearch");
    if (profileSearch) {
      let timer = 0;
      profileSearch.addEventListener("input", (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => { S.profileQ = e.target.value; searchProfiles(S.profileQ); }, 250);
      });
    }
    const profileDialog = $("admProfileDialog");
    if (profileDialog) {
      profileDialog.addEventListener("click", (e) => { if (e.target === profileDialog) profileDialog.close(); });
      profileDialog.addEventListener("close", () => { S.previewNick = ""; });
    }
    $("admLogClear").onclick = () => { S.log = []; renderLog(); };
    $("admAuto").onchange = (e) => { clearInterval(S.timer); if (e.target.checked) S.timer = setInterval(() => { if ($("tab-admin")?.classList.contains("on")) refresh(); }, 30000); };
    $("admExportReports").onclick = () => csv([["id", "status", "categoria", "denunciado", "denunciante", "data", "detalhes", "revisado_por"], ...visibleReports().map((r) => [r.id, r.status, CAT[r.category] || r.category, r.target, r.reporter, new Date(r.created_at * 1000).toISOString(), r.details, r.reviewed_by || ""])], "denuncias.csv");
    $("admExportAcc").onclick = () => csv([["nick", "cargo", "origem", "google"], ...S.accounts.map((a) => [a.nick, a.role, a.source, a.google_linked ? "sim" : "nao"])], "contas.csv");
    setInterval(() => document.querySelectorAll(".adm-remaining").forEach((n) => { n.textContent = remain(Number(n.dataset.until)); }), 1000);
  }

  window.AdminPanel = { onMessage, onShow, bind };
  window.addEventListener("society:admin", (e) => { bind(); S.role = window.Society?.role?.() || S.role; onMessage(e.detail || {}); });
  window.addEventListener("society:tab", (e) => { if (e.detail === "admin") { bind(); onShow(); } });
  window.addEventListener("society:pview", (e) => {
    const m = e.detail || {};
    if (!m.nick || !m.p) return;
    const key = String(m.nick).toLowerCase();
    S.profileCache.set(key, m.p);
    while (S.profileCache.size > 16) S.profileCache.delete(S.profileCache.keys().next().value);
    if (S.previewNick === key) renderProfilePreview(m.p, key, false);
  });

  // Auto-inicialização: a view admin.html é injetada por innerHTML DEPOIS do carregamento,
  // então desenhamos assim que #admRoot aparecer (não dependemos de nenhum evento anterior).
  function boot() {
    const root = $("admRoot");
    if (!root || root.dataset.rendered) return;
    root.dataset.rendered = "1";
    bind();
    onShow();
  }
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("society-app-ready", () => { boot(); if ($("admRoot")) onShow(); });
  boot();
})();