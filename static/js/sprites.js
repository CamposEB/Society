// ══════════════════════════════════════════════════════════════
// sprites.js — desenha avatares procedurais (sem assets externos)
// Cada avatar é uma "blob" com cabeça, corpo, pernas e chapéu opcional.
// ══════════════════════════════════════════════════════════════

const AVATAR_W = 28;
const AVATAR_H = 44;

// Paleta determinística por nick (hash simples)
const PALETTE = [
  { body: "#4c8dff", hair: "#1e3a8a" },
  { body: "#3ecf8e", hair: "#166534" },
  { body: "#9b6bff", hair: "#4c1d95" },
  { body: "#f2b84b", hair: "#7c2d12" },
  { body: "#ff7eb6", hair: "#831843" },
  { body: "#5cc8ff", hair: "#0c4a6e" },
  { body: "#ff6b6b", hair: "#7f1d1d" },
  { body: "#a3e635", hair: "#365314" },
];

export function colorFor(nick) {
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (h * 31 + nick.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function drawAvatar(ctx, x, y, opts = {}) {
  const { nick = "?", dir = "down", frame = 0, isSelf = false, hat = "" } = opts;
  const { body, hair } = colorFor(nick);

  const bob = Math.sin(frame * 2) * 1.2;         // balanço ao andar
  const swing = Math.sin(frame * 2) * 4;         // balanço das pernas

  ctx.save();
  ctx.translate(x, y);

  // sombra
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // pernas
  ctx.fillStyle = "#1e2632";
  ctx.fillRect(-7, -10, 5, 11 + swing);
  ctx.fillRect(2, -10, 5, 11 - swing);

  // corpo
  ctx.fillStyle = body;
  roundRect(ctx, -10, -26 + bob, 20, 18, 5);
  ctx.fill();

  // contorno do corpo (leve)
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, -10, -26 + bob, 20, 18, 5);
  ctx.stroke();

  // cabeça
  ctx.fillStyle = "#f5d0a9";
  ctx.beginPath();
  ctx.arc(0, -32 + bob, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.stroke();

  // cabelo
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -34 + bob, 9, Math.PI, Math.PI * 2);
  ctx.fill();

  // olhos (dependendo da direção)
  ctx.fillStyle = "#111";
  if (dir === "down") {
    ctx.beginPath(); ctx.arc(-3, -31 + bob, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 3, -31 + bob, 1.4, 0, Math.PI * 2); ctx.fill();
  } else if (dir === "left") {
    ctx.beginPath(); ctx.arc(-4, -31 + bob, 1.4, 0, Math.PI * 2); ctx.fill();
  } else if (dir === "right") {
    ctx.beginPath(); ctx.arc( 4, -31 + bob, 1.4, 0, Math.PI * 2); ctx.fill();
  }

  // chapéu (emoji)
  if (hat) {
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hat, 0, -46 + bob);
  }

  // anel do jogador local
  if (isSelf) {
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(0, 2, 14, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

export function drawNameplate(ctx, x, y, name, isSelf = false) {
  ctx.save();
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const w = ctx.measureText(name).width + 12;
  const h = 16;

  ctx.fillStyle = "rgba(10, 12, 16, .78)";
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();

  if (isSelf) {
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 1;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
    ctx.stroke();
  }

  ctx.fillStyle = isSelf ? "#ffffff" : "#dfe5ee";
  ctx.fillText(name, x, y + 1);
  ctx.restore();
}

export function drawBalloon(ctx, x, y, text) {
  if (!text) return;
  const padding = 8;
  const maxWidth = 180;
  ctx.save();
  ctx.font = "12px system-ui, sans-serif";

  // quebra de linha simples por palavra
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > 4) { lines.length = 4; lines[3] += "…"; }

  const lineH = 14;
  const w = Math.min(
    maxWidth + padding * 2,
    Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2
  );
  const h = lines.length * lineH + padding * 2;

  const bx = x - w / 2;
  const by = y - h - 12;

  // balão
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // rabinho
  ctx.beginPath();
  ctx.moveTo(x - 5, by + h);
  ctx.lineTo(x + 5, by + h);
  ctx.lineTo(x, by + h + 7);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.fill();

  // texto
  ctx.fillStyle = "#111";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, bx + padding, by + padding + i * lineH + 1));

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}