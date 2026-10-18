/* ══════════════════════════════════════════════════════════════
   lobby.js — Salão Principal (andar + conversar)
   v4:
     - chat 1x (listener único, sem echo local)
     - animação de caminhada com rotação de braços e pernas
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const VERSION = "lobby-walktalk-4";
  if (window.__lobbyVersion === VERSION) return;
  window.__lobbyVersion = VERSION;

  // ─── Constantes ───────────────────────────────────────────
  const TILE = 32, MAP_W = 25, MAP_H = 16;
  const WORLD_W = MAP_W * TILE, WORLD_H = MAP_H * TILE;
  const SPEED = 175;
  const SEND_INTERVAL = 66;
  const RATE_LIMIT_MS = 500;
  const BALLOON_MS = 4000;
  const MAX_LOG_LINES = 50;
  const ZOOM = 1.6;

  const MAP = [
    "1111111111111111111111111",
    "1000000000000000000000001",
    "1000000000000000000000001",
    "1000000000000000000000001",
    "1000000000000000000000001",
    "1000000000000000000000001",
    "1000011000000000110000001",
    "1000011000000000110000001",
    "1000000000000000000000001",
    "1000000000000000000000001",
    "1000000001100000000000001",
    "1000000001100000000000001",
    "1000000000000000000000001",
    "1000000000000000000000001",
    "1000000000000000000000001",
    "1111111111111111111111111",
  ];
  const TILES = MAP.map(r => r.split("").map(c => c === "1" ? 1 : 0));

  const RUGS = [
    { x: 8 * TILE,  y: 9 * TILE, w: 9 * TILE, h: 5 * TILE, hue: "#3b2a63" },
    { x: 3 * TILE,  y: 3 * TILE, w: 4 * TILE, h: 3 * TILE, hue: "#1f3a52" },
    { x: 18 * TILE, y: 3 * TILE, w: 4 * TILE, h: 3 * TILE, hue: "#1f3a52" },
  ];
  const PLANTS = [
    { x: 5 * TILE,  y: 13 * TILE, s: 1.0 },
    { x: 19 * TILE, y: 13 * TILE, s: 1.1 },
    { x: 3 * TILE,  y: 8 * TILE,  s: 0.85 },
    { x: 21 * TILE, y: 8 * TILE,  s: 0.95 },
  ];
  const BARRELS = [
    { x: 6.4 * TILE,  y: 3.4 * TILE },
    { x: 18.6 * TILE, y: 3.4 * TILE },
    { x: 6.4 * TILE,  y: 12.6 * TILE },
    { x: 18.6 * TILE, y: 12.6 * TILE },
  ];
  const TORCHES = [
    { x: 2.4 * TILE,  y: 2.4 * TILE },
    { x: 22.6 * TILE, y: 2.4 * TILE },
    { x: 2.4 * TILE,  y: 13.6 * TILE },
    { x: 22.6 * TILE, y: 13.6 * TILE },
  ];
  const FOUNTAIN = { x: 12.5 * TILE, y: 3 * TILE, r: 36 };

  function solidTile(tx, ty) {
    return tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || TILES[ty][tx] === 1;
  }
  function collides(x, y, r) {
    r = r || 10;
    if (solidTile(Math.floor((x - r) / TILE), Math.floor((y - r * 0.4) / TILE))) return true;
    if (solidTile(Math.floor((x + r) / TILE), Math.floor((y - r * 0.4) / TILE))) return true;
    if (solidTile(Math.floor((x - r) / TILE), Math.floor((y + r * 0.4) / TILE))) return true;
    if (solidTile(Math.floor((x + r) / TILE), Math.floor((y + r * 0.4) / TILE))) return true;
    const dx = x - FOUNTAIN.x, dy = y - FOUNTAIN.y;
    if (dx * dx + dy * dy < (FOUNTAIN.r + r) * (FOUNTAIN.r + r)) return true;
    return false;
  }
  function moveWithCollision(x, y, dx, dy) {
    let nx = x + dx;
    if (collides(nx, y)) nx = x;
    let ny = y + dy;
    if (collides(nx, ny)) ny = y;
    if (nx < 10) nx = 10;
    if (ny < 10) ny = 10;
    if (nx > WORLD_W - 10) nx = WORLD_W - 10;
    if (ny > WORLD_H - 10) ny = WORLD_H - 10;
    return [nx, ny];
  }

  // ─── Paleta ───────────────────────────────────────────────
  const SKINS  = ["#f2c9a0", "#e3b088", "#c98c63", "#a06b47", "#f7d8b6"];
  const HAIRS  = ["#2b2b2b", "#5a381e", "#a76a2e", "#f2c14e", "#c9c9c9", "#8b1e3f", "#3b4a8a"];
  const SHIRTS = ["#4c8dff", "#3ecf8e", "#9b6bff", "#f2b84b", "#ff7eb6", "#5cc8ff", "#ff6b6b", "#a3e635"];
  const PANTS  = ["#2a3340", "#3a3f5c", "#5b3a29", "#1e2632", "#4a3b5c", "#2e4a3a"];
  const SHOES  = ["#111418", "#3a2418", "#2b2b3a", "#5b1a1a"];

  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function paletteFor(nick) {
    const h = hashStr(nick);
    return {
      skin:  SKINS[h & 3],
      hair:  HAIRS[(h >>> 2) % HAIRS.length],
      shirt: SHIRTS[(h >>> 5) % SHIRTS.length],
      pants: PANTS[(h >>> 9) % PANTS.length],
      shoe:  SHOES[(h >>> 13) % SHOES.length],
    };
  }

  // ─── Estado ───────────────────────────────────────────────
  const state = {
    mounted: false, visible: false,
    selfNick: null, isGuest: false,
    players: new Map(), buffer: [],
    lastSendAt: 0, lastChatAt: 0,
    keys: new Set(), clickTarget: null,
    camX: 0, camY: 0,
    canvasW: 800, canvasH: 512,
    rafId: 0, lastT: 0, t: 0,
  };

  function makePlayer(opts) {
    return {
      nick: opts.nick, name: opts.name || opts.nick,
      x: opts.x, y: opts.y, tx: opts.x, ty: opts.y,
      dir: "down", moving: false, frame: 0,
      say: "", sayUntil: 0,
      palette: paletteFor(opts.nick),
    };
  }

  function wsSend(obj) {
    if (typeof window.appSend === "function") {
      try { window.appSend(obj); return; } catch (e) {}
    }
    const ws = window.__societyWs;
    if (ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify(obj)); } catch (e) {}
    }
  }

  // ─── DOM ──────────────────────────────────────────────────
  let canvas, ctx, logEl, msgEl, sendBtn, centerBtn, roomBar, onlineBar, panel, pTitle, pcard, toastEl, hintEl;

  function injectCSS() {
    if (document.getElementById("lobby-walktalk-css")) return;
    const style = document.createElement("style");
    style.id = "lobby-walktalk-css";
    style.textContent = `
      #tab-lobby { width: 100% !important; max-width: none !important; box-sizing: border-box; }
      #tab-lobby > .play-page {
        width: 100% !important; max-width: 1240px !important;
        margin: 0 auto !important; padding: 0 !important; box-sizing: border-box;
      }
      #tab-lobby .habbo-room { width: 100% !important; }
      #tab-lobby #c {
        width: 100% !important; height: auto !important;
        aspect-ratio: 25 / 16 !important;
        display: block !important;
      }
    `;
    document.head.appendChild(style);
  }

  function mount() {
    if (state.mounted) return;
    const host = document.getElementById("tab-lobby");
    if (!host) return;

    injectCSS();
    host.innerHTML = `
      <main class="play-page">
        <header class="play-heading">
          <div>
            <p class="home-eyebrow">SOCIETY MLBB · LOBBY SOCIAL</p>
            <h2>Ande, converse e encontre sua comunidade.</h2>
            <p>Use WASD/setas ou clique no chão para se mover. Digite para conversar.</p>
          </div>
          <button type="button" data-shortcut="lfg" disabled title="Em breve">🤝 Encontrar duo</button>
        </header>

        <div id="wrap" class="habbo-room">
          <canvas id="c"></canvas>

          <div class="habbo-room-bar" id="roomBar">
            <span class="habbo-room-name" id="roomNameBar">Salão Principal</span>
            <span class="habbo-room-online" id="roomOnlineBar">0 online</span>
            <span class="habbo-guest-badge" id="guestBadge">VISITANTE</span>
            <div class="habbo-room-bar-actions">
              <button id="centerBtn" type="button" title="Centralizar">⊕</button>
            </div>
          </div>

          <div id="log" aria-live="polite"></div>

          <div id="hud" class="habbo-hud">
            <button data-p="rooms" type="button"><span class="habbo-hud-ico">🚪</span><span class="habbo-hud-lbl">Salas</span></button>
            <button data-p="shop"  type="button"><span class="habbo-hud-ico">🛍️</span><span class="habbo-hud-lbl">Loja</span></button>
            <button data-p="inv"   type="button"><span class="habbo-hud-ico">🎒</span><span class="habbo-hud-lbl">Inventário</span></button>
            <button data-p="look"  type="button"><span class="habbo-hud-ico">👕</span><span class="habbo-hud-lbl">Aparência</span></button>
            <button data-p="act"   type="button"><span class="habbo-hud-ico">😀</span><span class="habbo-hud-lbl">Ações</span></button>
          </div>

          <div id="panel" class="habbo-window">
            <div class="habbo-window-title">
              <span class="habbo-window-dot"></span>
              <b id="pTitle"></b>
              <button id="pClose" type="button" aria-label="Fechar">✕</button>
            </div>
            <div class="habbo-window-body">
              <div id="roomList"  class="pp"></div>
              <div id="shopItems" class="pp"></div>
              <div id="invItems"  class="pp"></div>
            </div>
          </div>

          <div id="pcard" class="habbo-card"></div>

          <div class="habbo-hint" id="hint">
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou
            <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd>
            para andar · clique no chão para ir até lá
          </div>
        </div>

        <div id="chatrow" class="habbo-chatrow">
          <input id="msg" maxlength="100" placeholder="Digite uma mensagem e aperte Enter" autocomplete="off">
          <button id="send" type="button">Enviar</button>
        </div>
      </main>
    `;

    state.mounted = true;
    initDOM();
    processBuffer();
    state.visible = true;
    resize();
    if (!state.rafId) {
      state.lastT = performance.now();
      state.rafId = requestAnimationFrame(loop);
    }
  }

  function initDOM() {
    canvas    = document.getElementById("c");
    ctx       = canvas.getContext("2d");
    logEl     = document.getElementById("log");
    msgEl     = document.getElementById("msg");
    sendBtn   = document.getElementById("send");
    centerBtn = document.getElementById("centerBtn");
    roomBar   = document.getElementById("roomBar");
    onlineBar = document.getElementById("roomOnlineBar");
    panel     = document.getElementById("panel");
    pTitle    = document.getElementById("pTitle");
    pcard     = document.getElementById("pcard");
    hintEl    = document.getElementById("hint");
    toastEl   = null;

    sendBtn.addEventListener("click", trySendChat);
    msgEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); trySendChat(); }
    });

    centerBtn.addEventListener("click", () => {
      const self = state.players.get(state.selfNick);
      if (self) follow(self.x, self.y);
    });

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", () => state.keys.clear());

    canvas.addEventListener("mousedown", onPointer);
    canvas.addEventListener("touchstart", onPointer, { passive: true });

    document.querySelectorAll("#hud button[data-p]").forEach((btn) => {
      btn.addEventListener("click", () => openPanel(btn.dataset.p));
    });
    document.getElementById("pClose").addEventListener("click", () => panel.classList.remove("open"));

    document.addEventListener("click", (e) => {
      if (!pcard.classList.contains("open")) return;
      if (pcard.contains(e.target)) return;
      if (e.target.closest("#c")) return;
      pcard.classList.remove("open");
    });

    window.addEventListener("resize", resize);
    setTimeout(() => hintEl && hintEl.classList.add("faded"), 8000);
    window.addEventListener("keydown", () => hintEl && hintEl.classList.add("faded"), { once: true });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => resize());
      ro.observe(canvas.parentElement);
    }
  }

  function resize() {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayW = Math.max(640, Math.round(rect.width));
    const displayH = Math.round(displayW * (MAP_H / MAP_W));
    canvas.width  = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
    ctx.setTransform(dpr * ZOOM, 0, 0, dpr * ZOOM, 0, 0);
    state.canvasW = displayW / ZOOM;
    state.canvasH = displayH / ZOOM;
  }

  // ─── Input ────────────────────────────────────────────────
  function onKeyDown(e) {
    if (!state.visible) return;
    const tgt = e.target;
    if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
    const k = normKey(e.key);
    if (k) { state.keys.add(k); e.preventDefault(); }
  }
  function onKeyUp(e) {
    const k = normKey(e.key);
    if (k) state.keys.delete(k);
  }
  function normKey(k) {
    switch (k) {
      case "ArrowUp": case "w": case "W": return "up";
      case "ArrowDown": case "s": case "S": return "down";
      case "ArrowLeft": case "a": case "A": return "left";
      case "ArrowRight": case "d": case "D": return "right";
      default: return null;
    }
  }

  function onPointer(e) {
    if (!state.visible) return;
    let cx, cy;
    if (e.touches) {
      if (e.touches.length !== 1) return;
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      if (e.button !== 0) return;
      cx = e.clientX; cy = e.clientY;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
    const px = (cx - rect.left) * scaleX / ZOOM + state.camX;
    const py = (cy - rect.top)  * scaleY / ZOOM + state.camY;

    for (const p of state.players.values()) {
      if (p.nick === state.selfNick) continue;
      if (Math.abs(p.x - px) < 22 && py > p.y - 58 && py < p.y + 8) {
        openProfileCard(p);
        return;
      }
    }
    state.clickTarget = { x: px, y: py };
  }

  // ─── Loop ─────────────────────────────────────────────────
  function loop(now) {
    const dt = Math.min(0.05, (now - state.lastT) / 1000);
    state.lastT = now;
    state.t += dt;

    if (!state.visible) { state.rafId = 0; return; }

    updateSelf(dt);
    for (const p of state.players.values()) updateRemote(p, dt);
    const self = state.players.get(state.selfNick);
    if (self) follow(self.x, self.y);

    render();
    state.rafId = requestAnimationFrame(loop);
  }

  function updateSelf(dt) {
    const self = state.players.get(state.selfNick);
    if (!self) return;

    let dx = 0, dy = 0;
    if (state.keys.has("up"))    dy -= 1;
    if (state.keys.has("down"))  dy += 1;
    if (state.keys.has("left"))  dx -= 1;
    if (state.keys.has("right")) dx += 1;

    if (dx === 0 && dy === 0 && state.clickTarget) {
      const tdx = state.clickTarget.x - self.x;
      const tdy = state.clickTarget.y - self.y;
      const dist = Math.hypot(tdx, tdy);
      if (dist < 6) state.clickTarget = null;
      else { dx = tdx / dist; dy = tdy / dist; }
    } else if (dx !== 0 || dy !== 0) {
      state.clickTarget = null;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
    }

    if (dx === 0 && dy === 0) { self.moving = false; return; }

    const [nx, ny] = moveWithCollision(self.x, self.y, dx * SPEED * dt, dy * SPEED * dt);
    if (nx !== self.x || ny !== self.y) {
      self.x = nx; self.y = ny;
      self.tx = nx; self.ty = ny;
      if (Math.abs(dx) > Math.abs(dy)) self.dir = dx > 0 ? "right" : "left";
      else                              self.dir = dy > 0 ? "down"  : "up";
      self.moving = true;
      self.frame += dt * 11;   // ← passada um pouco mais rápida
      sendMoveThrottled();
    } else {
      self.moving = false;
    }
  }

  function updateRemote(p, dt) {
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      const step = Math.min(dist, SPEED * dt);
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? "right" : "left";
      else                              p.dir = dy > 0 ? "down"  : "up";
      p.moving = true;
      p.frame += dt * 11;
    } else {
      p.x = p.tx; p.y = p.ty;
      p.moving = false;
    }
    if (p.say && performance.now() > p.sayUntil) p.say = "";
  }

  function sendMoveThrottled() {
    const now = performance.now();
    if (now - state.lastSendAt < SEND_INTERVAL) return;
    state.lastSendAt = now;
    const self = state.players.get(state.selfNick);
    if (self) wsSend({ t: "move", x: Math.round(self.x), y: Math.round(self.y) });
  }

  function follow(px, py) {
    let cx = px - state.canvasW / 2;
    let cy = py - state.canvasH / 2;
    if (WORLD_W <= state.canvasW) cx = (WORLD_W - state.canvasW) / 2;
    else cx = Math.max(0, Math.min(WORLD_W - state.canvasW, cx));
    if (WORLD_H <= state.canvasH) cy = (WORLD_H - state.canvasH) / 2;
    else cy = Math.max(0, Math.min(WORLD_H - state.canvasH, cy));
    state.camX = cx; state.camY = cy;
  }

  // ─── Render ───────────────────────────────────────────────
  function render() {
    const vw = state.canvasW, vh = state.canvasH;
    ctx.fillStyle = "#0d1014";
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(-state.camX, -state.camY);

    drawFloor();
    drawRugs();
    drawFountain(state.t);
    drawWalls();
    drawTorches(state.t);
    drawProps();

    const list = [...state.players.values()].sort((a, b) => a.y - b.y);
    for (const p of list) {
      drawCharacter(p);
      drawNameplate(p.x, p.y - 60, p.name, p.nick === state.selfNick);
      if (p.say) drawBalloon(p.x, p.y - 70, p.say);
    }

    ctx.restore();
  }

  function drawFloor() {
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (solidTile(tx, ty)) continue;
        const x = tx * TILE, y = ty * TILE;
        const even = ((tx + ty) & 1) === 0;
        ctx.fillStyle = even ? "#232c3b" : "#1d2532";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = "rgba(255,255,255,.025)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  function drawRugs() {
    for (const r of RUGS) {
      ctx.save();
      ctx.fillStyle = r.hue;
      ctx.globalAlpha = 0.9;
      roundRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = 2;
      roundRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 10);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.06)";
      ctx.lineWidth = 1;
      roundRect(r.x + 12, r.y + 12, r.w - 24, r.h - 24, 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawWalls() {
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (!solidTile(tx, ty)) continue;
        const x = tx * TILE, y = ty * TILE;
        ctx.fillStyle = "#2c3548";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "rgba(0,0,0,.18)";
        ctx.fillRect(x, y + TILE / 2 - 1, TILE, 2);
        ctx.fillRect(x + TILE / 2 - 1, y, 2, TILE / 2);
        ctx.fillRect(x + (TILE / 4) - 1, y + TILE / 2, 2, TILE / 2);
        ctx.fillRect(x + (3 * TILE / 4) - 1, y + TILE / 2, 2, TILE / 2);
        ctx.fillStyle = "#3d4a63";
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = "rgba(255,255,255,.08)";
        ctx.fillRect(x, y, TILE, 2);
        ctx.fillStyle = "rgba(0,0,0,.45)";
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
        ctx.strokeStyle = "rgba(0,0,0,.55)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  function drawFountain(t) {
    const { x, y, r } = FOUNTAIN;
    ctx.fillStyle = "#1a2633";
    ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4a5568";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(x - 8, y - 8, 4, x, y, r - 4);
    grad.addColorStop(0, "#8fd8ff");
    grad.addColorStop(1, "#2a6ea8");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r - 8, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.6);
    ctx.strokeStyle = "rgba(255,255,255,.4)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r - 16, 0, Math.PI * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r - 16, Math.PI, Math.PI * 1.7); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(200,240,255,.7)";
    const jet = 6 + Math.sin(t * 6) * 1.5;
    ctx.beginPath(); ctx.ellipse(x, y - 6, 3, jet, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawTorches(t) {
    for (const tc of TORCHES) {
      const { x, y } = tc;
      ctx.fillStyle = "#3a2418";
      ctx.fillRect(x - 2, y - 4, 4, 14);
      const flick = 0.6 + Math.sin(t * 8 + x * 0.1) * 0.15;
      const grad = ctx.createRadialGradient(x, y - 8, 1, x, y - 8, 12);
      grad.addColorStop(0, "rgba(255,220,120," + flick + ")");
      grad.addColorStop(0.4, "rgba(255,140,40," + (flick * 0.7) + ")");
      grad.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y - 8, 12, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawProps() {
    for (const b of BARRELS) drawBarrel(b.x, b.y);
    for (const p of PLANTS) drawPlant(p.x, p.y, p.s);
  }

  function drawBarrel(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(0, 2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7a4a22";
    roundRect(-10, -22, 20, 22, 4); ctx.fill();
    ctx.strokeStyle = "#3a2418";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(10, -16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -6);  ctx.lineTo(10, -6);  ctx.stroke();
    ctx.fillStyle = "#a86a35";
    ctx.beginPath(); ctx.ellipse(0, -22, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.stroke();
    ctx.restore();
  }

  function drawPlant(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(0, 2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b4326";
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(10, -10); ctx.lineTo(8, 0); ctx.lineTo(-8, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#4a2f1a";
    ctx.fillRect(-10, -12, 20, 3);
    ctx.fillStyle = "#2e7d32";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const rx = Math.cos(a) * 6;
      const ry = Math.sin(a) * 5 - 16;
      ctx.beginPath(); ctx.ellipse(rx, ry, 5, 8, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#43a047";
    ctx.beginPath(); ctx.ellipse(0, -20, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ═══════════════════════════════════════════════════════════
  // PERSONAGEM
  // ═══════════════════════════════════════════════════════════
  const BODY = { hipY: -14, shoulderY: -30, neckY: -34, headCy: -43, headR: 9 };

  function drawCharacter(p) {
    const pal = p.palette;
    const isSelf = p.nick === state.selfNick;
    const walking = p.moving;
    const phase = walking ? p.frame : 0;
    const swing = walking ? Math.sin(phase) : 0;             // -1..1
    const swingAbs = walking ? Math.abs(Math.sin(phase)) : 0;
    const bob = walking ? swingAbs * 2.2 : 0;                // sobe/desce
    const tilt = walking ? Math.sin(phase * 2) * 0.025 : 0;  // leve inclinação

    ctx.save();
    ctx.translate(p.x, p.y - bob);
    ctx.rotate(tilt);

    // sombra no chão (não sobe com o bob)
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath();
    ctx.ellipse(0, 2 + bob, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isSelf) {
      ctx.strokeStyle = "rgba(255,255,255,.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(0, 2 + bob, 15, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (p.dir === "up")         drawBack(pal, swing);
    else if (p.dir === "left")  drawSide(pal, swing, -1);
    else if (p.dir === "right") drawSide(pal, swing, 1);
    else                        drawFront(pal, swing);

    ctx.restore();
  }

  // Braço que gira na altura do ombro
  function drawArm(pal, shoulderX, shoulderY, w, h, angle) {
    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(angle);
    ctx.fillStyle = pal.shirt;
    roundRect(-w / 2, 0, w, h * 0.55, 2.5);
    ctx.fill();
    ctx.fillStyle = pal.skin;
    roundRect(-w / 2, h * 0.55, w, h * 0.45, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, h, w / 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, h, w / 2 + 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Perna que gira na altura do quadril
  function drawLeg(pal, hipX, hipY, angle) {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(angle);
    ctx.fillStyle = pal.pants;
    roundRect(-3, 0, 6, 13, 2);
    ctx.fill();
    ctx.fillStyle = pal.shoe;
    roundRect(-3.5, 10, 7, 4, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(-3, 10, 6, 1);
    ctx.restore();
  }

  function drawTorso(pal, isBack) {
    ctx.fillStyle = pal.shirt;
    roundRect(-9, -32, 18, 18, 4);
    ctx.fill();
    if (isBack) {
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -14); ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(0,0,0,.12)";
      roundRect(-9, -32, 18, 4, 4); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.1)";
      ctx.beginPath();
      ctx.moveTo(-4, -32); ctx.lineTo(0, -28); ctx.lineTo(4, -32);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(-9, -17, 18, 3);
    if (!isBack) { ctx.fillStyle = "#c9a227"; ctx.fillRect(-1.5, -17, 3, 3); }
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 1;
    roundRect(-9, -32, 18, 18, 4);
    ctx.stroke();
  }

  function drawFront(pal, swing) {
    const legA = swing * 0.5;        // ±0.5 rad ≈ ±28°
    const armA = swing * 0.55;

    // pernas (uma gira pra frente, a outra pra trás)
    drawLeg(pal, -4, BODY.hipY, -legA);
    drawLeg(pal,  4, BODY.hipY,  legA);

    // braço esquerdo atrás, tronco, braço direito na frente
    drawArm(pal, -12, BODY.shoulderY, 5.5, 14,  armA);
    drawTorso(pal, false);
    drawArm(pal,  12, BODY.shoulderY, 5.5, 14, -armA);

    drawHead(pal, "front");
  }

  function drawBack(pal, swing) {
    const legA = swing * 0.5;
    const armA = swing * 0.55;

    drawLeg(pal, -4, BODY.hipY,  legA);
    drawLeg(pal,  4, BODY.hipY, -legA);

    drawArm(pal, -12, BODY.shoulderY, 5.5, 14, -armA);
    drawTorso(pal, true);
    drawArm(pal,  12, BODY.shoulderY, 5.5, 14,  armA);

    drawHead(pal, "back");
  }

  function drawSide(pal, swing, sign) {
    // sign = -1 (esquerda) | 1 (direita)
    const legA = swing * 0.55 * sign;
    const armA = swing * 0.6 * sign;

    // perna de trás
    drawLeg(pal, -1.5, BODY.hipY, -legA);
    // perna da frente (levemente deslocada)
    drawLeg(pal,  2.5, BODY.hipY,  legA);

    // braço de trás (fica quase atrás do tronco)
    drawArm(pal, sign * -3, BODY.shoulderY, 5, 13, -armA);

    // tronco de perfil
    ctx.fillStyle = pal.shirt;
    roundRect(-7, -32, 14, 18, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.08)";
    roundRect(sign * 2 - 1, -32, 5, 18, 4); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(-7, -17, 14, 3);
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 1;
    roundRect(-7, -32, 14, 18, 4); ctx.stroke();

    // braço da frente
    drawArm(pal, sign * 8, BODY.shoulderY, 5, 13, armA);

    drawHead(pal, sign < 0 ? "left" : "right");
  }

  function drawHead(pal, facing) {
    const cy = BODY.headCy, r = BODY.headR;
    ctx.fillStyle = pal.skin;
    ctx.fillRect(-3, BODY.neckY - 1, 6, 4);
    ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = pal.hair;
    if (facing === "front") {
      ctx.beginPath();
      ctx.arc(0, cy - 1, r, Math.PI * 1.08, Math.PI * 1.92);
      ctx.lineTo(r - 1, cy - 1); ctx.lineTo(-r + 1, cy - 1);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r + 1, cy - 1);
      ctx.lineTo(-r + 3, cy + 2);
      ctx.lineTo(-2, cy - 2);
      ctx.lineTo(0, cy + 1);
      ctx.lineTo(2, cy - 2);
      ctx.lineTo(r - 3, cy + 2);
      ctx.lineTo(r - 1, cy - 1);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(-3, cy + 1, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 3, cy + 1, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath(); ctx.arc(-3.4, cy + 0.6, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 2.6, cy + 0.6, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,120,120,.35)";
      ctx.beginPath(); ctx.arc(-5, cy + 4, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 5, cy + 4, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7a3b3b";
      ctx.beginPath(); ctx.arc(0, cy + 4.5, 1.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else if (facing === "back") {
      ctx.beginPath();
      ctx.arc(0, cy, r, Math.PI, Math.PI * 2);
      ctx.lineTo(r, cy + 2); ctx.lineTo(-r, cy + 2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.arc(0, cy, r - 1, 0, Math.PI);
      ctx.lineTo(r - 2, cy); ctx.lineTo(-r + 2, cy);
      ctx.closePath(); ctx.fill();
    } else {
      const s = facing === "left" ? -1 : 1;
      ctx.beginPath();
      ctx.arc(0, cy - 1, r, Math.PI, Math.PI * 2);
      ctx.lineTo(s * r, cy + 1); ctx.lineTo(-s * r, cy + 1);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * r, cy - 1);
      ctx.lineTo(-s * (r - 2), cy + 3);
      ctx.lineTo(-s * 3, cy - 2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(s * (r - 2), cy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(s * 4, cy + 1, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath(); ctx.arc(s * 4.3, cy + 0.6, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7a3b3b";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s * 6, cy + 4.5); ctx.lineTo(s * 8, cy + 4.5); ctx.stroke();
    }
  }

  function drawNameplate(x, y, name, isSelf) {
    ctx.save();
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(name).width + 14;
    const h = 16;
    ctx.fillStyle = "rgba(10, 12, 16, .82)";
    roundRect(x - w / 2, y - h / 2, w, h, 6); ctx.fill();
    ctx.strokeStyle = isSelf ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.4)";
    ctx.lineWidth = 1;
    roundRect(x - w / 2, y - h / 2, w, h, 6); ctx.stroke();
    ctx.fillStyle = isSelf ? "#ffffff" : "#dfe5ee";
    ctx.fillText(name, x, y + 1);
    ctx.restore();
  }

  function drawBalloon(x, y, text) {
    if (!text) return;
    const pad = 8, maxW = 190;
    ctx.save();
    ctx.font = "12px system-ui, sans-serif";
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > 4) { lines.length = 4; lines[3] += "…"; }
    const lineH = 14;
    let w = 0;
    for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
    w = Math.min(maxW + pad * 2, w + pad * 2);
    const h = lines.length * lineH + pad * 2;
    const bx = x - w / 2;
    const by = y - h - 12;
    ctx.fillStyle = "rgba(255,255,255,.98)";
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 1;
    roundRect(bx, by, w, h, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, by + h); ctx.lineTo(x + 5, by + h); ctx.lineTo(x, by + h + 8);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,.98)"; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + i * lineH + 1));
    ctx.restore();
  }

  // ─── Chat ─────────────────────────────────────────────────
  function trySendChat() {
    const text = msgEl.value.trim();
    if (!text) return;
    const now = performance.now();
    if (now - state.lastChatAt < RATE_LIMIT_MS) {
      showToast("Calma aí — aguarde meio segundo.", "warn");
      return;
    }
    state.lastChatAt = now;
    msgEl.value = "";

    // mostra o balão imediatamente para dar feedback (o log chega pelo eco do servidor)
    const self = state.players.get(state.selfNick);
    if (self) { self.say = text; self.sayUntil = performance.now() + BALLOON_MS; }

    // ⚠️ NÃO chamamos appendLog aqui — o servidor faz broadcast de volta pra todos,
    //    inclusive para o remetente. Assim cada mensagem aparece UMA vez no log.
    wsSend({ t: "chat", m: text });
  }

  function appendLog(nick, text, role, nameColor) {
    if (!logEl) return;
    const row = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = String(nick).slice(0, 30);
    if (window.RoleColors && (role || nameColor)) {
      window.RoleColors.apply(b, { role: role, name_color: nameColor });
    }
    row.appendChild(b);
    row.appendChild(document.createTextNode(": " + String(text).slice(0, 200)));
    logEl.appendChild(row);
    while (logEl.children.length > MAX_LOG_LINES) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function showToast(msg, kind) {
    if (!canvas) return;
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "habbo-toast";
      canvas.parentElement.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.className = "habbo-toast show" + (kind === "warn" ? " warn" : "");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  const PLACEHOLDERS = {
    rooms: { title: "Salas", body: "Você está no <strong>Salão Principal</strong>. Múltiplas salas chegam em breve." },
    shop:  { title: "Loja", body: "A loja de itens ainda está sendo preparada. Volte em breve!" },
    inv:   { title: "Inventário", body: "Seu inventário ficará aqui." },
    look:  { title: "Aparência", body: "Customização de avatar em breve. Cada nick ganha cores únicas automaticamente." },
    act:   { title: "Ações", body: "Emotes e ações chegam em breve." },
  };
  function openPanel(key) {
    const info = PLACEHOLDERS[key] || { title: "Em breve", body: "Recurso em desenvolvimento." };
    pTitle.textContent = info.title;
    const body = panel.querySelector(".habbo-window-body");
    body.querySelectorAll(".pp").forEach((el) => { el.style.display = "none"; el.innerHTML = ""; });
    let holder = body.querySelector(".habbo-placeholder");
    if (!holder) {
      holder = document.createElement("div");
      holder.className = "habbo-placeholder";
      body.appendChild(holder);
    }
    holder.innerHTML = "<strong>" + info.title + "</strong>" + info.body;
    holder.style.display = "block";
    panel.classList.add("open");
  }

  function openProfileCard(p) {
    pcard.innerHTML = "";
    const b = document.createElement("b");
    b.textContent = p.name;
    pcard.appendChild(b);
    const info = document.createElement("div");
    info.style.color = "var(--text-muted)";
    info.style.fontSize = ".75rem";
    info.textContent = "@" + p.nick;
    pcard.appendChild(info);
    const row = document.createElement("div");
    row.className = "crow";
    const whisper = document.createElement("button");
    whisper.type = "button";
    whisper.textContent = "💬 Sussurrar";
    whisper.addEventListener("click", () => {
      msgEl.value = "@" + p.nick + " ";
      msgEl.focus();
      pcard.classList.remove("open");
    });
    row.appendChild(whisper);
    pcard.appendChild(row);
    pcard.classList.add("open");
  }

  // ─── WS (listener único) ──────────────────────────────────
  function processBuffer() {
    const events = state.buffer.slice();
    state.buffer.length = 0;
    for (const ev of events) handleWs(ev, true);
  }

  // ⚠️ Guardamos o handler em window para garantir que apenas UM exista,
  // mesmo se versões antigas do lobby.js já tiverem registrado o seu.
  if (window.__societyWSHandler) {
    try { window.removeEventListener("society:ws", window.__societyWSHandler); } catch (e) {}
  }
  window.__societyWSHandler = function (ev) {
    const data = ev.detail;
    if (!data || !data.t) return;
    if (!state.mounted) {
      state.buffer.push(data);
      if (state.buffer.length > 200) state.buffer.shift();
      if (data.t === "init") {
        state.selfNick = data.self || null;
        state.isGuest = !!data.is_guest;
      }
      return;
    }
    handleWs(data, false);
  };
  window.addEventListener("society:ws", window.__societyWSHandler);

  function handleWs(m, replaying) {
    switch (m.t) {
      case "init": {
        state.selfNick = m.self || null;
        state.isGuest = !!m.is_guest;
        state.players.clear();
        if (state.selfNick) {
          state.players.set(state.selfNick, makePlayer({
            nick: state.selfNick,
            name: (m.profile && m.profile.display_name) || state.selfNick,
            x: 400, y: 260,
          }));
        }
        if (Array.isArray(m.players)) {
          for (const pl of m.players) {
            if (pl.nick === state.selfNick) {
              const s = state.players.get(state.selfNick);
              if (s) { s.x = pl.x; s.y = pl.y; s.tx = pl.x; s.ty = pl.y; }
              continue;
            }
            state.players.set(pl.nick, makePlayer({
              nick: pl.nick, name: pl.name, x: pl.x, y: pl.y,
            }));
          }
        }
        if (roomBar) roomBar.classList.toggle("is-guest", state.isGuest);
        updateOnline();
        if (!replaying) {
          logEl.innerHTML = "";
          appendLog("Sistema", "Bem-vindo ao Salão Principal! Ande com WASD/setas ou clique no chão.");
          if (state.isGuest) appendLog("Sistema", "Você está como VISITANTE — crie uma conta para liberar tudo.");
        }
        break;
      }
      case "join": {
        if (!m.p || m.p.nick === state.selfNick) break;
        if (!state.players.has(m.p.nick)) {
          state.players.set(m.p.nick, makePlayer({
            nick: m.p.nick, name: m.p.name, x: m.p.x, y: m.p.y,
          }));
          updateOnline();
        }
        break;
      }
      case "leave": { if (state.players.delete(m.nick)) updateOnline(); break; }
      case "move": {
        const p = state.players.get(m.nick);
        if (p) { p.tx = m.x; p.ty = m.y; }
        break;
      }
      case "chat": {
        const nick = m.nick, text = m.m, who = m.name || nick;
        appendLog(who, text, m.role, m.name_color);
        if (nick === state.selfNick) {
          const self = state.players.get(state.selfNick);
          if (self) { self.say = text; self.sayUntil = performance.now() + BALLOON_MS; }
        } else {
          const p = state.players.get(nick);
          if (p) { p.say = text; p.sayUntil = performance.now() + BALLOON_MS; }
        }
        break;
      }
      case "guest_restricted":
        showToast(m.m || "Crie uma conta para usar este recurso.", "warn");
        break;
      case "error":
        showToast(m.m || "Erro no servidor.", "warn");
        break;
    }
  }

  function updateOnline() {
    if (!onlineBar) return;
    onlineBar.textContent = state.players.size + " online";
  }

  // ─── Visibilidade ─────────────────────────────────────────
  function watchVisibility() {
    const tab = document.getElementById("tab-lobby");
    if (!tab) return;
    function check() {
      const isOn = tab.classList.contains("on");
      if (isOn && !state.mounted) mount();
      else if (isOn && state.mounted) {
        state.visible = true;
        resize();
        if (!state.rafId) {
          state.lastT = performance.now();
          state.rafId = requestAnimationFrame(loop);
        }
      } else if (!isOn && state.mounted) {
        state.visible = false;
      }
    }
    const mo = new MutationObserver(check);
    mo.observe(tab, { attributes: true, attributeFilter: ["class"] });
    check();
  }

  function boot() {
    if (!document.getElementById("tab-lobby")) {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
      return;
    }
    watchVisibility();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();