// ══════════════════════════════════════════════════════════════
// net.js — WebSocket + roteamento de mensagens
// ══════════════════════════════════════════════════════════════

export class Net extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this.ws = null;
    this.queue = [];
    this.reconnectDelay = 1000;
    this.closed = false;
    this.self = null;
    this._connect();
  }

  _connect() {
    if (this.closed) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this._scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      this.reconnectDelay = 1000;
      this.dispatchEvent(new CustomEvent("open"));
      // envia o guest_login assim que abrir
      this.send({ t: "guest_login" });
      // flush da fila
      for (const msg of this.queue) this.send(msg);
      this.queue.length = 0;
    });

    this.ws.addEventListener("message", (ev) => {
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }
      if (data && data.t === "init") this.self = data.self;
      this.dispatchEvent(new CustomEvent("message", { detail: data }));
    });

    this.ws.addEventListener("close", () => {
      this.dispatchEvent(new CustomEvent("close"));
      this._scheduleReconnect();
    });

    this.ws.addEventListener("error", () => {
      try { this.ws.close(); } catch {}
    });
  }

  _scheduleReconnect() {
    if (this.closed) return;
    setTimeout(() => this._connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.6, 8000);
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(obj)); } catch {}
    } else {
      // guarda até reconectar (limite pequeno)
      if (this.queue.length < 50) this.queue.push(obj);
    }
  }

  close() {
    this.closed = true;
    try { this.ws && this.ws.close(); } catch {}
  }
}