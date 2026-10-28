// ══════════════════════════════════════════════════════════════
// engine.js — loop, input, câmera e colisão
// ══════════════════════════════════════════════════════════════

export const TILE = 32;
export const MAP_W = 25;
export const MAP_H = 16;
export const WORLD_W = MAP_W * TILE;   // 800
export const WORLD_H = MAP_H * TILE;   // 512

// 1 = parede, 0 = chão
const MAP_STR = [
  "1111111111111111111111111",
  "1000000000000000000000001",
  "1000000000000000000000001",
  "1000000011000000000000001",
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

const TILES = MAP_STR.map(row => row.split("").map(c => c === "1" ? 1 : 0));

export function isSolidTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return TILES[ty][tx] === 1;
}

// Colisão contra as tiles sólidas (usando círculo de raio R)
export function collides(x, y, r = 12) {
  const pts = [
    [x - r, y - r * 0.4], [x + r, y - r * 0.4],
    [x - r, y + r * 0.4], [x + r, y + r * 0.4],
  ];
  for (const [px, py] of pts) {
    if (isSolidTile(Math.floor(px / TILE), Math.floor(py / TILE))) return true;
  }
  return false;
}

// Move com colisão "slide" (tenta X e Y separadamente)
export function moveWithCollision(x, y, dx, dy, r = 12) {
  let nx = x + dx;
  if (collides(nx, y, r)) nx = x;
  let ny = y + dy;
  if (collides(nx, ny, r)) ny = y;
  nx = Math.max(8, Math.min(WORLD_W - 8, nx));
  ny = Math.max(8, Math.min(WORLD_H - 8, ny));
  return [nx, ny];
}

// ─────────────────────────────────────────────────────────────
// Input (teclado + clique)
// ─────────────────────────────────────────────────────────────
export class Input {
  constructor(canvas, getCamera) {
    this.canvas = canvas;
    this.getCamera = getCamera;
    this.keys = new Set();
    this.clickTarget = null;   // {x, y} em coordenadas de mundo

    window.addEventListener("keydown", (e) => {
      if (isTextField(e.target)) return;
      const k = normalizeKey(e.key);
      if (k) { this.keys.add(k); e.preventDefault(); }
    });

    window.addEventListener("keyup", (e) => {
      const k = normalizeKey(e.key);
      if (k) this.keys.delete(k);
    });

    window.addEventListener("blur", () => this.keys.clear());

    const onPointer = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
      const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
      const px = (clientX - rect.left) * scaleX;
      const py = (clientY - rect.top) * scaleY;
      const cam = this.getCamera();
      this.clickTarget = { x: px + cam.x, y: py + cam.y };
    };

    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      onPointer(e.clientX, e.clientY);
    });
    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      onPointer(t.clientX, t.clientY);
    }, { passive: true });
  }

  // Retorna vetor unitário (ou null) e limpa o clickTarget quando alcançado.
  consume(self) {
    let dx = 0, dy = 0;
    if (this.keys.has("up"))    dy -= 1;
    if (this.keys.has("down"))  dy += 1;
    if (this.keys.has("left"))  dx -= 1;
    if (this.keys.has("right")) dx += 1;

    if (dx === 0 && dy === 0 && this.clickTarget) {
      const tdx = this.clickTarget.x - self.x;
      const tdy = this.clickTarget.y - self.y;
      const dist = Math.hypot(tdx, tdy);
      if (dist < 6) {
        this.clickTarget = null;
      } else {
        dx = tdx / dist;
        dy = tdy / dist;
      }
    } else if (dx !== 0 || dy !== 0) {
      this.clickTarget = null;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
    }

    if (dx === 0 && dy === 0) return null;
    return { dx, dy };
  }
}

function normalizeKey(k) {
  switch (k) {
    case "ArrowUp": case "w": case "W": return "up";
    case "ArrowDown": case "s": case "S": return "down";
    case "ArrowLeft": case "a": case "A": return "left";
    case "ArrowRight": case "d": case "D": return "right";
    default: return null;
  }
}

function isTextField(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

// ─────────────────────────────────────────────────────────────
// Câmera
// ─────────────────────────────────────────────────────────────
export class Camera {
  constructor() { this.x = 0; this.y = 0; this.w = 800; this.h = 512; }

  follow(px, py) {
    let cx = px - this.w / 2;
    let cy = py - this.h / 2;
    if (WORLD_W <= this.w) cx = (WORLD_W - this.w) / 2;
    else cx = Math.max(0, Math.min(WORLD_W - this.w, cx));
    if (WORLD_H <= this.h) cy = (WORLD_H - this.h) / 2;
    else cy = Math.max(0, Math.min(WORLD_H - this.h, cy));
    this.x = cx;
    this.y = cy;
  }

  centerOn(px, py) { this.follow(px, py); }
}