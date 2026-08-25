export class MarketStreamDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Set();
    this.stockSocket = null;
    this.cryptoSocket = null;
    this.stockAuthenticated = false;
    this.cryptoAuthenticated = false;
    this.symbols = new Set(['AAPL','NVDA','TSLA','AMZN','AMD','PLTR','CRWD']);
    this.crypto = new Set(['BTC/USD','ETH/USD']);
    this.lastUpstreamAttempt = 0;
    this.reconnectTimer = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/connect') return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket upgrade required', { status: 426 });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    const record = { socket: server, stocks: new Set(), crypto: new Set() };
    this.clients.add(record);
    server.addEventListener('message', event => this.onClientMessage(record, event.data));
    const remove = () => {
      this.clients.delete(record);
      if (this.clients.size === 0) this.closeUpstreams();
    };
    server.addEventListener('close', remove);
    server.addEventListener('error', remove);
    server.send(JSON.stringify({ type: 'ready', transport: 'durable-object', timestamp: Date.now() }));
    this.ensureUpstreams();
    return new Response(null, { status: 101, webSocket: client });
  }

  onClientMessage(record, raw) {
    try {
      const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (msg?.action !== 'subscribe') return;
      const stocks = Array.isArray(msg.stocks) ? msg.stocks : [];
      const crypto = Array.isArray(msg.crypto) ? msg.crypto : [];
      for (const value of stocks) {
        if (record.stocks.size >= 50) break;
        const symbol = String(value).trim().toUpperCase();
        if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) { record.stocks.add(symbol); }
      }
      for (const value of crypto) {
        if (record.crypto.size >= 25) break;
        const symbol = String(value).trim().toUpperCase();
        if (/^[A-Z0-9]+\/USD$/.test(symbol)) { record.crypto.add(symbol); }
      }
      const allStocks = [...this.clients].flatMap(client => [...client.stocks]);
      const allCrypto = [...this.clients].flatMap(client => [...client.crypto]);
      this.symbols = new Set([...this.symbols, ...allStocks].slice(0, 200));
      this.crypto = new Set([...this.crypto, ...allCrypto].slice(0, 100));
      record.socket.send(JSON.stringify({ type: 'subscribed', stocks: [...record.stocks], crypto: [...record.crypto] }));
      this.pushSubscriptions();
      this.ensureUpstreams();
    } catch {}
  }

  ensureUpstreams() {
    if (!this.env.ALPACA_API_KEY || !this.env.ALPACA_API_SECRET || this.clients.size === 0) return;
    if (this.stockSocket && this.cryptoSocket) return;
    const now = Date.now();
    if (now - this.lastUpstreamAttempt < 1000) return;
    this.lastUpstreamAttempt = now;
    if (!this.stockSocket) this.connectStocks();
    if (!this.cryptoSocket) this.connectCrypto();
  }

  pushSubscriptions() {
    try {
      if (this.stockSocket?.readyState === 1 && this.stockAuthenticated) this.stockSocket.send(JSON.stringify({ action:'subscribe', trades:[...this.symbols], quotes:[...this.symbols], bars:[...this.symbols] }));
    } catch {}
    try {
      if (this.cryptoSocket?.readyState === 1 && this.cryptoAuthenticated) this.cryptoSocket.send(JSON.stringify({ action:'subscribe', trades:[...this.crypto], quotes:[...this.crypto], bars:[...this.crypto] }));
    } catch {}
  }

  connectStocks() {
    try {
      const ws = new WebSocket('wss://stream.data.alpaca.markets/v2/iex');
      this.stockSocket = ws;
      this.stockAuthenticated = false;
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ action:'auth', key:this.env.ALPACA_API_KEY, secret:this.env.ALPACA_API_SECRET }));
      });
      ws.addEventListener('message', event => {
        this.handleUpstream('stocks', event.data);
      });
      ws.addEventListener('close', () => { if (this.stockSocket === ws) { this.stockSocket = null; this.stockAuthenticated = false; } this.broadcast({ type:'stream', market:'stocks', state:'reconnecting' }); this.scheduleReconnect(); });
      ws.addEventListener('error', () => this.broadcast({ type:'stream', market:'stocks', state:'error' }));
    } catch { this.stockSocket = null; this.stockAuthenticated = false; this.scheduleReconnect(); }
  }

  connectCrypto() {
    try {
      const ws = new WebSocket('wss://stream.data.alpaca.markets/v1beta3/crypto/us');
      this.cryptoSocket = ws;
      this.cryptoAuthenticated = false;
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ action:'auth', key:this.env.ALPACA_API_KEY, secret:this.env.ALPACA_API_SECRET }));
      });
      ws.addEventListener('message', event => {
        this.handleUpstream('crypto', event.data);
      });
      ws.addEventListener('close', () => { if (this.cryptoSocket === ws) { this.cryptoSocket = null; this.cryptoAuthenticated = false; } this.broadcast({ type:'stream', market:'crypto', state:'reconnecting' }); this.scheduleReconnect(); });
      ws.addEventListener('error', () => this.broadcast({ type:'stream', market:'crypto', state:'error' }));
    } catch { this.cryptoSocket = null; this.cryptoAuthenticated = false; this.scheduleReconnect(); }
  }

  handleUpstream(market, raw) {
    try {
      const messages = JSON.parse(raw);
      for (const message of Array.isArray(messages) ? messages : [messages]) {
        if (message?.T === 'success' && message?.msg === 'authenticated') {
          if (market === 'stocks') this.stockAuthenticated = true;
          else this.cryptoAuthenticated = true;
          this.pushSubscriptions();
          this.broadcast({ type:'stream', market, state:'authenticated' });
          continue;
        }
        if (message?.T === 'error') {
          this.broadcast({ type:'stream', market, state:'error', code:message.code, message:message.msg });
          continue;
        }
        this.broadcast({ type:'market', market, data:message, receivedAt:Date.now() });
      }
    } catch {}
  }

  broadcast(message) {
    const encoded = JSON.stringify(message);
    for (const record of [...this.clients]) {
      try { record.socket.send(encoded); } catch { this.clients.delete(record); }
    }
  }

  closeUpstreams() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    for (const socket of [this.stockSocket, this.cryptoSocket]) {
      try { if (socket && socket.readyState <= 1) socket.close(1000, 'No connected clients'); } catch {}
    }
    this.stockSocket = null;
    this.cryptoSocket = null;
    this.stockAuthenticated = false;
    this.cryptoAuthenticated = false;
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.clients.size === 0) return;
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.ensureUpstreams(); }, 1500);
  }
}
