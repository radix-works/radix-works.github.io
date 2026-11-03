// オンライン対戦の通信（PeerJS：ブラウザ同士を直接つなぐ。サーバー不要）
const PEER_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
const PREFIX = 'utsushi-battle-v1-';

function loadPeerLib() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PEER_URL; s.onload = res; s.onerror = () => rej(new Error('通信ライブラリを読み込めませんでした'));
    document.head.appendChild(s);
  });
}

export class Link {
  constructor() { this.handlers = {}; this.peer = null; this.conn = null; }
  on(type, fn) { this.handlers[type] = fn; }
  emit(type, data) { this.handlers[type] && this.handlers[type](data); }

  async host() {
    await loadPeerLib();
    for (let tries = 0; tries < 4; tries++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      try {
        await this._open(PREFIX + code);
        this.peer.on('connection', (c) => {
          if (this.conn) { c.on('open', () => { c.send({ t: 'busy' }); setTimeout(() => c.close(), 300); }); return; }
          this._bind(c);
        });
        return code;
      } catch (e) {
        if (e && e.type === 'unavailable-id') continue;
        throw e;
      }
    }
    throw new Error('部屋を作れませんでした');
  }

  async join(code) {
    await loadPeerLib();
    await this._open(undefined);
    const c = this.peer.connect(PREFIX + code, { reliable: true });
    this._bind(c);
    await new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('部屋が見つかりませんでした')), 12000);
      c.on('open', () => { clearTimeout(to); res(); });
      this.peer.on('error', (e) => { clearTimeout(to); rej(new Error(e.type === 'peer-unavailable' ? '部屋が見つかりませんでした' : '接続できませんでした')); });
    });
  }

  _open(id) {
    return new Promise((res, rej) => {
      const p = id ? new window.Peer(id) : new window.Peer();
      const fail = (e) => { p.destroy(); rej(e); };
      p.once('open', () => { p.off('error', fail); this.peer = p; p.on('error', (e) => this.emit('error', e)); p.on('disconnected', () => { try { p.reconnect(); } catch {} }); res(); });
      p.once('error', fail);
    });
  }

  _bind(c) {
    this.conn = c;
    c.on('open', () => this.emit('open'));
    c.on('data', (d) => this.emit('data', d));
    c.on('close', () => { this.emit('close'); });
    c.on('error', () => this.emit('close'));
  }

  send(obj) { if (this.conn && this.conn.open) this.conn.send(obj); }
  close() { try { this.conn && this.conn.close(); } catch {} try { this.peer && this.peer.destroy(); } catch {} this.conn = null; this.peer = null; }
}
