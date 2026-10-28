/* ============================================================================
   Society — "Streamers online agora" (destaque da home)

   Uso:
     1) Na home, coloque:  <div id="streamersLive"></div>
     2) Carregue DEPOIS do profile.js:
          StreamersUI.mount({
            toast: msg => ...,                 // opcional: aviso "X entrou ao vivo"
            openProfile: nick => ...,          // opcional: abrir o perfil do streamer
          });
     3) Quando o servidor mandar a lista, chame:
          StreamersUI.setList(list)
        (ou dispare document.dispatchEvent(new CustomEvent("streamers:update",
          { detail: { list } })) )

   Cada item da lista:
     { nick, display_name, avatar, stream_url, stream_live_url, platform? }

   A lista deve conter SÓ quem está ao vivo. Os links são revalidados aqui
   (https + Twitch/YouTube/Kick), mas o servidor também precisa validar.
   ============================================================================ */
(() => {
  "use strict";

  const MAX_CARDS = 12;

  const PLATFORMS = [
    { name: "Twitch",  hosts: ["twitch.tv", "www.twitch.tv", "m.twitch.tv"] },
    { name: "YouTube", hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"] },
    { name: "Kick",    hosts: ["kick.com", "www.kick.com"] },
  ];

  let host = null;
  let ctx = {};
  let list = [];
  let firstLoad = true;
  let known = new Set();
  let stylesDone = false;

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function safeUrl(value) {
    // reaproveita a validação do profile.js quando disponível
    if (window.ProfileUI && typeof window.ProfileUI.parseStreamUrl === "function") {
      return window.ProfileUI.parseStreamUrl(value);
    }
    try {
      const u = new URL(String(value || "").trim());
      if (u.protocol !== "https:" || u.username || u.password) return null;
      const p = PLATFORMS.find(x => x.hosts.includes(u.hostname.toLowerCase()));
      if (!p || u.pathname.replace(/\//g, "") === "") return null;
      return { url: u.toString(), platform: p.name };
    } catch (e) { return null; }
  }

  function normalize(item) {
    if (!item || typeof item !== "object") return null;
    const nick = String(item.nick || item.username || "").trim();
    if (!nick) return null;
    const link = safeUrl(item.stream_live_url) || safeUrl(item.stream_url);
    if (!link) return null;
    return {
      nick,
      name: String(item.display_name || item.display || nick),
      avatar: item.avatar || "",
      href: link.url,
      platform: link.platform,
    };
  }

  function ensureStyles() {
    if (stylesDone || document.getElementById("streamers-live-css")) { stylesDone = true; return; }
    const style = document.createElement("style");
    style.id = "streamers-live-css";
    style.textContent = `
      .sl-section { margin: 0 0 20px; padding: 16px; border-radius: 16px;
        border: 1px solid rgba(255,59,59,.35);
        background: linear-gradient(180deg, rgba(255,59,59,.10), rgba(255,59,59,.02)); }
      .sl-section[hidden] { display: none !important; }
      .sl-head { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; }
      .sl-head h3 { margin: 0; font-size: 1.05rem; }
      .sl-dot { width: 10px; height: 10px; border-radius: 50%; background: #ff3b3b;
        box-shadow: 0 0 0 0 rgba(255,59,59,.6); animation: sl-pulse 1.6s ease-out infinite; }
      @keyframes sl-pulse {
        0% { box-shadow: 0 0 0 0 rgba(255,59,59,.6); }
        70% { box-shadow: 0 0 0 10px rgba(255,59,59,0); }
        100% { box-shadow: 0 0 0 0 rgba(255,59,59,0); } }
      .sl-count { margin-left: auto; color: var(--muted, #9298a3); font-size: .8rem; }
      .sl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
      .sl-card { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 10px 12px;
        border-radius: 12px; background: rgba(255,255,255,.04);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.07); }
      .sl-avatar { position: relative; width: 44px; height: 44px; flex: 0 0 auto; border-radius: 50%;
        display: grid; place-items: center; overflow: visible; font-weight: 700;
        background: linear-gradient(145deg,#262b34,#171a20); color: var(--accent, #d4b45a);
        box-shadow: 0 0 0 2px #ff3b3b; }
      .sl-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
      .sl-live-tag { position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
        padding: 1px 6px; border-radius: 6px; background: #ff3b3b; color: #fff;
        font-size: .56rem; font-weight: 800; letter-spacing: .06em; }
      .sl-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
      .sl-name { padding: 0; border: 0; background: none; color: inherit; font: inherit;
        font-weight: 700; text-align: left; cursor: pointer;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sl-name:hover { text-decoration: underline; }
      .sl-meta { color: var(--muted, #9298a3); font-size: .72rem; }
      .sl-watch { flex: 0 0 auto; padding: 7px 12px; border-radius: 10px;
        background: #ff3b3b; color: #fff; font-weight: 700; font-size: .8rem; text-decoration: none; }
      .sl-watch:hover { background: #ff5a5a; }
      .sl-watch:focus-visible, .sl-name:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      .sl-more { margin: 10px 0 0; color: var(--muted, #9298a3); font-size: .8rem; }
      @media (prefers-reduced-motion: reduce) { .sl-dot { animation: none; } }
    `;
    document.head.appendChild(style);
    stylesDone = true;
  }

  function avatarNode(item) {
    const wrap = el("span", "sl-avatar");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", "Foto de " + item.name);
    const hasPhoto = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.avatar) && item.avatar.length <= 120000;
    if (hasPhoto) {
      const img = el("img");
      img.src = item.avatar; img.alt = ""; img.loading = "lazy";
      wrap.append(img);
    } else {
      wrap.textContent = item.name.trim().slice(0, 1).toLocaleUpperCase("pt-BR") || "?";
    }
    wrap.append(el("span", "sl-live-tag", "AO VIVO"));
    return wrap;
  }

  function openProfile(nick) {
    if (typeof ctx.openProfile === "function") { ctx.openProfile(nick); return; }
    document.dispatchEvent(new CustomEvent("streamer:open-profile", { detail: { nick } }));
  }

  function render() {
    if (!host) return;
    ensureStyles();
    host.replaceChildren();
    if (!list.length) { host.hidden = true; return; }
    host.hidden = false;

    const section = el("section", "sl-section");
    section.setAttribute("aria-label", "Streamers online agora");

    const head = el("div", "sl-head");
    head.append(el("span", "sl-dot"), el("h3", null, "Streamers online agora"),
      el("span", "sl-count", list.length === 1 ? "1 ao vivo" : list.length + " ao vivo"));
    section.append(head);

    const grid = el("div", "sl-grid");
    list.slice(0, MAX_CARDS).forEach(item => {
      const card = el("article", "sl-card");
      card.append(avatarNode(item));

      const info = el("div", "sl-info");
      const nameBtn = el("button", "sl-name", item.name);
      nameBtn.type = "button";
      nameBtn.title = "Ver perfil de " + item.name;
      nameBtn.addEventListener("click", () => openProfile(item.nick));
      info.append(nameBtn, el("span", "sl-meta", "@" + item.nick + " · " + item.platform));

      const watch = el("a", "sl-watch", "Assistir");
      watch.href = item.href;
      watch.target = "_blank";
      watch.rel = "noopener noreferrer nofollow";
      watch.setAttribute("aria-label", "Assistir a live de " + item.name + " na " + item.platform);

      card.append(info, watch);
      grid.append(card);
    });
    section.append(grid);
    if (list.length > MAX_CARDS) {
      section.append(el("p", "sl-more", "+" + (list.length - MAX_CARDS) + " streamers ao vivo"));
    }
    host.append(section);
  }

  function setList(raw) {
    const next = (Array.isArray(raw) ? raw : []).map(normalize).filter(Boolean);
    const nextKeys = new Set(next.map(i => i.nick.toLowerCase()));

    // avisa quem entrou ao vivo depois da primeira carga
    if (!firstLoad && typeof ctx.toast === "function") {
      next.forEach(i => {
        if (!known.has(i.nick.toLowerCase())) ctx.toast("🔴 " + i.name + " entrou ao vivo!");
      });
    }
    known = nextKeys;
    firstLoad = false;
    list = next;
    render();
  }

  function mount(options) {
    ctx = options || {};
    host = ctx.container || document.getElementById("streamersLive");
    if (!host) { console.warn("[StreamersUI] container #streamersLive não encontrado."); return; }
    if (!mount.__bound) {
      document.addEventListener("streamers:update", e => setList(e.detail && e.detail.list));
      mount.__bound = true;
    }
    render();
  }

  window.StreamersUI = { mount, setList, getList: () => list.slice() };
})();