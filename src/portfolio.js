const INITIAL_CASH = 100000;
const MAX_ORDERS = 200;
const MAX_QUANTITY = 1000000;

function cleanSymbol(value) { return String(value ?? '').trim().toUpperCase(); }
function json(data, status=200) { return Response.json(data, { status, headers: { 'cache-control': 'no-store' } }); }

export class PortfolioDurableObject {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY CHECK (id=1), cash REAL NOT NULL);`);
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS positions (symbol TEXT PRIMARY KEY, quantity REAL NOT NULL CHECK (quantity >= 0));`);
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, symbol TEXT NOT NULL, side TEXT NOT NULL, quantity REAL NOT NULL, price REAL NOT NULL, status TEXT NOT NULL, mode TEXT NOT NULL, live_execution INTEGER NOT NULL, timestamp TEXT NOT NULL);`);
      ctx.storage.sql.exec(`CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp DESC);`);
      const account = ctx.storage.sql.exec('SELECT cash FROM account WHERE id=1').one();
      if (!account) ctx.storage.sql.exec('INSERT INTO account (id, cash) VALUES (1, ?)', INITIAL_CASH);
    });
  }

  snapshot() {
    const account = this.ctx.storage.sql.exec('SELECT cash FROM account WHERE id=1').one();
    const cash = Number(account?.cash ?? INITIAL_CASH);
    const positionRows = this.ctx.storage.sql.exec('SELECT symbol, quantity FROM positions ORDER BY symbol').toArray();
    const orderRows = this.ctx.storage.sql.exec('SELECT id, symbol, side, quantity, price, status, mode, live_execution AS liveExecution, timestamp FROM orders ORDER BY timestamp DESC LIMIT ?', MAX_ORDERS).toArray();
    const positions = Object.fromEntries(positionRows.map(row => [row.symbol, Number(row.quantity)]));
    const orders = orderRows.map(row => ({ ...row, quantity: Number(row.quantity), liveExecution: Boolean(row.liveExecution) }));
    return { cash, buyingPower: cash, positions, orders, mode: 'PAPER', liveExecution: false, persistent: true };
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/portfolio') return new Response('Not found', { status: 404 });
    if (request.method === 'GET') return json(this.snapshot());
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });

    let order;
    try { order = await request.json(); } catch { return json({ accepted: false, error: 'Invalid JSON' }, 400); }
    const id = String(order?.id ?? '');
    const symbol = cleanSymbol(order?.symbol);
    const side = String(order?.side ?? '').toUpperCase();
    const quantity = Number(order?.quantity);
    const price = Number(order?.price);
    if (!id || !symbol || !['BUY', 'SELL'].includes(side) || !Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY || !Number.isFinite(price) || price <= 0) return json({ accepted: false, error: 'Invalid order' }, 400);

    const result = this.ctx.storage.transactionSync(() => {
      const duplicate = this.ctx.storage.sql.exec('SELECT id, symbol, side, quantity, price, status, mode, live_execution AS liveExecution, timestamp FROM orders WHERE id=?', id).one();
      if (duplicate) return { duplicate: true, order: { ...duplicate, quantity: Number(duplicate.quantity), liveExecution: Boolean(duplicate.liveExecution) } };
      const account = this.ctx.storage.sql.exec('SELECT cash FROM account WHERE id=1').one();
      const cash = Number(account.cash);
      const currentRow = this.ctx.storage.sql.exec('SELECT quantity FROM positions WHERE symbol=?', symbol).one();
      const current = Number(currentRow?.quantity ?? 0);
      const notional = quantity * price;
      if (!Number.isFinite(notional)) return { error: 'Order calculation overflow', status: 400 };
      if (side === 'BUY' && notional > cash) return { error: 'Insufficient buying power', status: 409 };
      if (side === 'SELL' && quantity > current) return { error: 'Insufficient paper position', status: 409 };
      const nextCash = side === 'BUY' ? cash - notional : cash + notional;
      const nextPosition = side === 'BUY' ? current + quantity : current - quantity;
      this.ctx.storage.sql.exec('UPDATE account SET cash=? WHERE id=1', nextCash);
      if (Math.abs(nextPosition) < 1e-12) this.ctx.storage.sql.exec('DELETE FROM positions WHERE symbol=?', symbol);
      else if (current === 0) this.ctx.storage.sql.exec('INSERT INTO positions(symbol,quantity) VALUES(?,?)', symbol, nextPosition);
      else this.ctx.storage.sql.exec('UPDATE positions SET quantity=? WHERE symbol=?', nextPosition, symbol);
      const timestamp = new Date().toISOString();
      this.ctx.storage.sql.exec('INSERT INTO orders(id,symbol,side,quantity,price,status,mode,live_execution,timestamp) VALUES(?,?,?,?,?,?,?,?,?)', id, symbol, side, quantity, price, 'FILLED_PAPER', 'PAPER', 0, timestamp);
      return { order: { id, symbol, side, quantity, price, status: 'FILLED_PAPER', mode: 'PAPER', liveExecution: false, timestamp } };
    });

    if (result.error) return json({ accepted: false, error: result.error }, result.status);
    if (result.duplicate) return json({ accepted: false, duplicate: true, order: result.order }, 409);
    return json({ accepted: true, order: result.order, portfolio: this.snapshot() });
  }
}

export { INITIAL_CASH };