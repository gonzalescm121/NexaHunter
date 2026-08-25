const INITIAL_CASH = 100000;
const MAX_ORDERS = 200;

function emptyState() {
  return { cash: INITIAL_CASH, positions: {}, orders: [] };
}

function cleanSymbol(value) {
  return String(value || '').trim().toUpperCase();
}

export class PortfolioDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async load() {
    return (await this.state.storage.get('portfolio')) || emptyState();
  }

  async save(value) {
    await this.state.storage.put('portfolio', value);
    return value;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/portfolio') return new Response('Not found', { status: 404 });
    if (request.method === 'GET') {
      const state = await this.load();
      return Response.json({ ...state, mode: 'PAPER', liveExecution: false }, { headers: { 'cache-control': 'no-store' } });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });

    let order;
    try { order = await request.json(); } catch { return Response.json({ accepted: false, error: 'Invalid JSON' }, { status: 400 }); }
    if (!order || typeof order !== 'object') return Response.json({ accepted: false, error: 'Invalid order' }, { status: 400 });

    const state = await this.load();
    const id = String(order.id || '');
    if (!id) return Response.json({ accepted: false, error: 'Order id is required' }, { status: 400 });
    if (state.orders.some(item => item.id === id)) {
      return Response.json({ accepted: false, duplicate: true, order: state.orders.find(item => item.id === id) });
    }

    const symbol = cleanSymbol(order.symbol);
    const quantity = Number(order.quantity);
    const price = Number(order.price);
    const side = String(order.side || '').toUpperCase();
    const notional = quantity * price;
    const current = Number(state.positions[symbol] || 0);

    if (!symbol || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0 || !['BUY', 'SELL'].includes(side)) {
      return Response.json({ accepted: false, error: 'Invalid order' }, { status: 400 });
    }
    if (!Number.isFinite(notional)) return Response.json({ accepted: false, error: 'Order calculation overflow' }, { status: 400 });
    if (side === 'BUY' && notional > state.cash) return Response.json({ accepted: false, error: 'Insufficient buying power' }, { status: 409 });
    if (side === 'SELL' && quantity > current) return Response.json({ accepted: false, error: 'Insufficient paper position' }, { status: 409 });

    const signed = side === 'BUY' ? quantity : -quantity;
    state.cash = side === 'BUY' ? state.cash - notional : state.cash + notional;
    const nextPosition = current + signed;
    if (nextPosition === 0) delete state.positions[symbol];
    else state.positions[symbol] = nextPosition;

    const record = { ...order, symbol, quantity, price, side, status: 'FILLED_PAPER', mode: 'PAPER', liveExecution: false };
    state.orders.unshift(record);
    state.orders = state.orders.slice(0, MAX_ORDERS);
    await this.save(state);
    return Response.json({ accepted: true, order: record, portfolio: state }, { headers: { 'cache-control': 'no-store' } });
  }
}

export { INITIAL_CASH };
