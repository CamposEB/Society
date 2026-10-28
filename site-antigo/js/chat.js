// ══════════════════════════════════════════════════════════════
// chat.js — log, sanitização, rate-limit e balões
// ══════════════════════════════════════════════════════════════

const MAX_LINES = 50;
const RATE_MS = 500;
const BALLOON_MS = 4000;

export class Chat {
  constructor({ logEl, inputEl, sendBtn, onSend, onLocalSend, toast }) {
    this.logEl = logEl;
    this.inputEl = inputEl;
    this.sendBtn = sendBtn;
    this.onSend = onSend;         // (text) => void — envia pro servidor
    this.onLocalSend = onLocalSend; // (text) => void — mostra balão local
    this.toast = toast;           // (msg, kind) => void
    this.lastSentAt = 0;

    this.sendBtn.addEventListener("click", () => this._trySend());
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); this._trySend(); }
    });
  }

  _trySend() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    const now = performance.now();
    if (now - this.lastSentAt < RATE_MS) {
      this.toast && this.toast("Calma aí — aguarde meio segundo.", "warn");
      return;
    }
    this.lastSentAt = now;
    this.inputEl.value = "";

    // balão local imediato (o servidor vai reenviar pra todos, mas não pra nós)
    this.onLocalSend && this.onLocalSend(text);
    this.append("Você", text);
    this.onSend && this.onSend(text);
  }

  // Adiciona uma linha no log (sanitizada via textContent).
  append(nick, text) {
    const row = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = String(nick).slice(0, 30);
    row.appendChild(b);
    row.appendChild(document.createTextNode(": " + String(text).slice(0, 200)));
    this.logEl.appendChild(row);

    // limita a 50 linhas
    while (this.logEl.children.length > MAX_LINES) {
      this.logEl.removeChild(this.logEl.firstChild);
    }
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  clear() { this.logEl.innerHTML = ""; }
}

export const BALLOON_DURATION = BALLOON_MS;