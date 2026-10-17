// ══════════════════════════════════════════════════════════════
// main.js — bootstrap: junta engine + net + chat + sprites
// ══════════════════════════════════════════════════════════════

import {
  TILE, MAP_W, MAP_H, WORLD_W, WORLD_H,
  isSolidTile, moveWithCollision, Input, Camera,
} from "./engine.js";
import { Net } from "./net.js";
import { Chat, BALLOON_DURATION } from "./chat.js";
import { drawAvatar, drawNameplate, drawBalloon } from "./sprites.js";

// ── DOM ──────────────────────────────────────────────────────
const canvas    = document.getElementById("c");
const ctx       = canvas.getContext("2d");
const logEl     = document.getElementById("log");
const msgEl     = document.getElementById("msg");
const sendBtn   = document.getElementById("send");
const centerBtn = document.getElementById("centerBtn");
const onlineBar = document.getElementById("roomOnlineBar");
const roomBar   = document.getElementById("roomBar");
const hint      = document.getElementById("hint");
const panel     = document.getElementById("panel");
const pTitle    = document.getElementById("pTitle");
const pClose    = document.getElementById("pClose");
const pcard     = document.getElementById("pcard");

// ── Estado do jogo ───────────────────────────────────────────
const camera = new Camera();
const players = new Map();       // nick → Player
let   selfNick = null;
let   selfPlayer = null;

class Player {
  constructor({ nick, name, x, y }) {
    this.nick = nick;
    this.name = name || nick;
    this.x = x; this.y = y;
    this.tx = x; this.ty = y;
    this.dir = "down";
    this.moving = false;
    this.frame = 0;
    this.say = "";
    this.sayUntil = 0;
    this.hat = "";
  }

  update(dt) {
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.5) {
      const SPEED = 190;
      const step = Math.min(dist, SPEED * dt);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      // direção baseada no movimento
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? "right" : "left";
      else                              this.dir = dy > 0 ? "down"  : "up";
      this.moving = true;
      this.frame += dt * 8;
    } else {
      this.x = this.tx; this.y = this.ty;
      this.moving = false;
    }

    if (this.say && performance.now() > this.sayUntil) {
      this.say = "";
    }
  }
}

// ── Rede ─────────────────────────────────────────────────────
const proto = location.protocol === "https:" ? "wss:" : "ws:";
const net = new Net(`${proto}//${location.host}/ws`);

net.addEventListener("message", (ev) => handleMessage(ev.detail));
net.addEventListener("open", () => {
  // quando reconecta, limpa jogadores remotos (o servidor vai reenviar o snapshot)
  players.clear();
  selfPlayer = null;
});

function handleMessage(m) {
  switch (m.t) {
    case "init":
      onInit(m);
      break;

    case "join":
      // chegou outro jogador
      if (m.p && m.p.nick !== selfNick) {
        players.set(m.p.nick, new Player({
          nick: m.p.nick,
          name: m.p.name,
          x: m.p.x,
          y: m.p.y,
        }));
        updateOnlineCount();
      }
      break;

    case "leave":
      players.delete(m.nick);
      updateOnlineCount();
      break;

    case "move": {
      const p = players.get(m.nick);
      if (p) { p.tx = m.x; p.ty = m.y; }
      break;
    }

    case "chat": {
      const nick = m.nick;
      const text = m.m;
      chat.append(m.name || nick, text);
      if (nick === selfNick && selfPlayer) {
        selfPlayer.say = text;
        selfPlayer.sayUntil = performance.now() + BALLOON_DURATION;
      } else {
        const p = players.get(nick);
        if (p) { p.say = text; p.sayUntil = performance.now() + BALLOON_DURATION; }
      }
      break;
    }

    case "guest_restricted":
      toast(m.m || "Crie uma conta para usar este recurso.", "warn");
      break;

    case "error":
      toast(m.m || "Erro no servidor.", "warn");
      break;

    case "session_invalid":
      // como entramos como visitante, não deve acontecer; se acontecer, ignora
      break;
  }
}

function onInit(m) {
  selfNick = m.self;
  selfPlayer = new Player({
    nick: m.self,
    name: (m.profile && m.profile.display_name) || m.self,
    x: 400, y: 260,
  });
  players.clear();
  players.set(selfNick, selfPlayer);

  if (Array.isArray(m.players)) {
    for (const p of m.players) {
      if (p.nick === selfNick) {
        selfPlayer.x = p.x; selfPlayer.y = p.y;
        selfPlayer.tx = p.x; selfPlayer.ty = p.y;
        continue;
      }
      players.set(p.nick, new Player({ nick: p.nick, name: p.name, x: p.x, y: p.y }));
    }
  }

  // badge VISITANTE
  if (roomBar) roomBar.classList.toggle("is-guest", !!m.is_guest);

  updateOnlineCount();
  chat.clear();
  chat.append("Sistema", "Bem-vindo ao Salão Principal! Use WASD/setas ou clique no chão.");
  if (m.is_guest) {
    chat.append("Sistema", "Você está como VISITANTE — crie uma conta para liberar tudo.");
  }
}

// ── Chat ─────────────────────────────────────────────────────
const chat = new Chat({
  logEl, inputEl: msgEl, sendBtn,
  onSend: (text) => net.send({ t: "chat", m: text }),
  onLocalSend: (text) => {
    if (selfPlayer) {
      selfPlayer.say = text;
      selfPlayer.sayUntil = performance.now() + BALLOON_DURATION;
    }
  },
  toast: (msg, kind) => toast(msg, kind),
});

// ── Input ────────────────────────────────────────────────────
const input = new Input(canvas, () => camera);

// ── Resize ───────────────────────────────────────────────────
function resize() {
  const wrap = canvas.parentElement;
  const rect = wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const displayW = Math.max(320, Math.round(rect.width));
  const displayH = Math.round(displayW * (MAP_H / MAP_W));
  canvas.width  = Math.round(displayW * dpr);
  canvas.height = Math.round(displayH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  camera.w = displayW;
  camera.h = displayH;
}
window.addEventListener("resize", resize);
resize();

// ── Loop principal ───────────────────────────────────────────
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  // atualiza jogadores
  for (const p of players.values()) p.update(dt);

  // move o jogador local com input
  if (selfPlayer) {
    const dir = input.consume(selfPlayer);
    if (dir) {
      const SPEED = 190;
      const [nx, ny] = moveWithCollision(
        selfPlayer.x, selfPlayer.y,
        dir.dx * SPEED * dt, dir.dy * SPEED * dt,
        11
      );
      if (nx !== selfPlayer.x || ny !== selfPlayer.y) {
        selfPlayer.x = nx;
        selfPlayer.y = ny;
        selfPlayer.tx = nx;
        selfPlayer.ty = ny;
        if (Math.abs(dir.dx) > Math.abs(dir.dy)) selfPlayer.dir = dir.dx > 0 ? "right" : "left";
        else                                       selfPlayer.dir = dir.dy > 0 ? "down"  : "up";
        selfPlayer.moving = true;
        selfPlayer.frame += dt * 8;

        // envia posição pro servidor (com throttle simples)
        sendPositionThrottled();
      } else {
        selfPlayer.moving = false;
      }
    } else {
      selfPlayer.moving = false;
    }

    camera.follow(selfPlayer.x, selfPlayer.y);
  }

  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

let lastSend = 0;
function sendPositionThrottled() {
  const now = performance.now();
  if (now - lastSend < 60) return;
  lastSend = now;
  if (selfPlayer) {
    net.send({
      t: "move",
      x: Math.round(selfPlayer.x),
      y: Math.round(selfPlayer.y),
    });
  }
}

// ── Render ───────────────────────────────────────────────────
function render() {
  const vw = camera.w, vh = camera.h;

  // fundo
  ctx.fillStyle = "#0d1014";
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  // piso (grid sutil em todo o mundo)
  drawFloor();

  // paredes
  drawWalls();

  // jogadores ordenados por Y (para profundidade)
  const sorted = [...players.values()].sort((a, b) => a.y - b.y);
  for (const p of sorted) {
    const isSelf = p.nick === selfNick;
    drawAvatar(ctx, p.x, p.y, {
      nick: p.nick, dir: p.dir, frame: p.frame, isSelf, hat: p.hat,
    });
    drawNameplate(ctx, p.x, p.y - 52, p.name, isSelf);
    if (p.say) drawBalloon(ctx, p.x, p.y - 62, p.say);
  }

  ctx.restore();
}

function drawFloor() {
  const tileA = "#1a2230";
  const tileB = "#161d29";
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (isSolidTile(tx, ty)) continue;
      ctx.fillStyle = ((tx + ty) & 1) ? tileA : tileB;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
}

function drawWalls() {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (!isSolidTile(tx, ty)) continue;
      const x = tx * TILE, y = ty * TILE;

      // bloco
      ctx.fillStyle = "#2a3340";
      ctx.fillRect(x, y, TILE, TILE);

      // topo com leve highlight
      ctx.fillStyle = "#39465a";
      ctx.fillRect(x, y, TILE, 4);

      // sombra inferior
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(x, y + TILE - 3, TILE, 3);

      // contorno
      ctx.strokeStyle = "rgba(0,0,0,.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

// ── UI: barra superior, HUD, painel, card ───────────────────
function updateOnlineCount() {
  const n = players.size;
  onlineBar.textContent = n + (n === 1 ? " online" : " online");
}

centerBtn.addEventListener("click", () => {
  if (selfPlayer) camera.centerOn(selfPlayer.x, selfPlayer.y);
});

// HUD → painel
const PLACEHOLDERS = {
  rooms: { title: "Salas", body: "Você está no <strong>Salão Principal</strong>. Múltiplas salas chegam em breve." },
  shop:  { title: "Loja", body: "A loja de itens ainda está sendo preparada. Volte em breve!" },
  inv:   { title: "Inventário", body: "Seu inventário ficará aqui. Por enquanto, aproveite o lobby!" },
  look:  { title: "Aparência", body: "Customização de avatar em breve. Por enquanto, cada nick ganha uma cor única." },
  act:   { title: "Ações", body: "Emotes e ações chegam em breve." },
};

document.querySelectorAll("#hud button[data-p]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.p;
    const info = PLACEHOLDERS[key] || { title: "Em breve", body: "Recurso em desenvolvimento." };
    openPanel(info.title, `<div class="habbo-placeholder"><strong>${info.title}</strong>${info.body}</div>`);
  });
});

function openPanel(title, html) {
  pTitle.textContent = title;
  // limpa e injeta placeholder no body do painel
  const body = panel.querySelector(".habbo-window-body");
  body.querySelectorAll(".pp").forEach((el) => { el.style.display = "none"; el.innerHTML = ""; });
  let holder = body.querySelector(".habbo-placeholder");
  if (!holder) {
    holder = document.createElement("div");
    holder.className = "habbo-placeholder";
    body.appendChild(holder);
  }
  holder.innerHTML = html;
  holder.style.display = "block";
  panel.classList.add("open");
}

pClose.addEventListener("click", () => panel.classList.remove("open"));

// Fecha card de perfil ao clicar fora
document.addEventListener("click", (e) => {
  if (!pcard.classList.contains("open")) return;
  if (pcard.contains(e.target)) return;
  if (e.target.closest("#c")) return;
  pcard.classList.remove("open");
});

// Clique no canvas em cima de outro jogador abre o pcard
canvas.addEventListener("click", (e) => {
  if (!selfPlayer) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
  const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
  const wx = (e.clientX - rect.left) * scaleX + camera.x;
  const wy = (e.clientY - rect.top)  * scaleY + camera.y;

  for (const p of players.values()) {
    if (p.nick === selfNick) continue;
    if (Math.abs(p.x - wx) < 18 && wy > p.y - 50 && wy < p.y + 6) {
      openProfileCard(p);
      return;
    }
  }
});

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

// ── Toast ────────────────────────────────────────────────────
let toastEl = null;
let toastTimer = null;
function toast(msg, kind = "") {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "habbo-toast";
    canvas.parentElement.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.className = "habbo-toast show" + (kind === "warn" ? " warn" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

// ── Hint fade após alguns segundos ───────────────────────────
setTimeout(() => hint && hint.classList.add("faded"), 8000);
window.addEventListener("keydown", () => hint && hint.classList.add("faded"), { once: true });