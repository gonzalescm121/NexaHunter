import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const worker = fs.readFileSync(path.join(process.cwd(), 'worker-app.js'), 'utf8');
const portfolio = fs.readFileSync(path.join(process.cwd(), 'src/portfolio.js'), 'utf8');

function makeEnv() {
  const orders = new Map();
  let cash = 100000;
  const positions = new Map();

  const portfolioStub = {
    async fetch(request) {
      if (request.method === 'GET') {
        return Response.json({
          cash,
          positions: Object.fromEntries(positions),
          orders: [...orders.values()],
          mode: 'PAPER',
          liveExecution: false,
          persistent: true
        });
      }
      const order = await request.json();
      if (orders.has(order.id)) return Response.json({ accepted: false, duplicate: true, order: orders.get(order.id) }, { status: 409 });
      const notional = order.quantity * order.price;
      const current = positions.get(order.symbol) || 0;
      if (order.side === 'BUY' && notional > cash) return Response.json({ accepted: false, error: 'Insufficient buying power' }, { status: 409 });
      if (order.side === 'SELL' && order.quantity > current) return Response.json({ accepted: false, error: 'Insufficient paper position' }, { status: 409 });
      cash += order.side === 'BUY' ? -notional : notional;
      const next = order.side === 'BUY' ? current + order.quantity : current - order.quantity;
      if (next) positions.set(order.symbol, next); else positions.delete(order.symbol);
      const filled = { ...order, status: 'FILLED_PAPER', mode: 'PAPER', liveExecution: false };
      orders.set(order.id, filled);
      return Response.json({ accepted: true, order: filled, portfolio: { cash, positions: Object.fromEntries(positions), orders: [...orders.values()], mode: 'PAPER', liveExecution: false, persistent: true } });
    }
  };

  return {
    PORTFOLIO: {
      idFromName: () => 'paper-account',
      get: () => portfolioStub
    }
  };
}

async function loadWorker() {
  const source = worker.replace(/export default /, 'const workerApp = ')
    .replace(/export \{ IdempotencyDurableObject \} from '[^']+';\nexport \{ PortfolioDurableObject \} from '[^']+';\nexport \{ MarketStreamDurableObject \} from '[^']+';\s*$/, '');
  const module = await import(`data:text/javascript;base64,${Buffer.from(`${source}\nexport default workerApp;`).toString('base64')}`);
  return module.default;
}

test('POST /api/paper-orders performs a complete request-level paper fill', async () => {
  const app = await loadWorker();
  const env = makeEnv();
  const response = await app.fetch(new Request('https://nexahunter.test/api/paper-orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol: 'AAPL', quantity: 10, price: 100, side: 'BUY' })
  }), env);

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.accepted, true);
  assert.equal(data.order.status, 'FILLED_PAPER');
  assert.equal(data.order.mode, 'PAPER');
  assert.equal(data.order.liveExecution, false);
  assert.equal(data.portfolio.cash, 99000);
  assert.equal(data.portfolio.positions.AAPL, 10);
});

test('request validation rejects malformed paper orders before portfolio mutation', async () => {
  const app = await loadWorker();
  const env = makeEnv();
  const response = await app.fetch(new Request('https://nexahunter.test/api/paper-orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol: 'AAPL', quantity: 0, price: 100, side: 'BUY' })
  }), env);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).accepted, false);
  const portfolio = await env.PORTFOLIO.get().fetch(new Request('https://portfolio/portfolio'));
  const snapshot = await portfolio.json();
  assert.equal(snapshot.cash, 100000);
  assert.deepEqual(snapshot.positions, {});
});

test('request-level duplicate guard rejects an identical retry', async () => {
  const app = await loadWorker();
  const env = makeEnv();
  const payload = { symbol: 'MSFT', quantity: 5, price: 200, side: 'BUY' };
  const first = await app.fetch(new Request('https://nexahunter.test/api/paper-orders', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
  }), env);
  assert.equal(first.status, 200);

  const second = await app.fetch(new Request('https://nexahunter.test/api/paper-orders', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
  }), env);
  assert.equal(second.status, 409);
  assert.equal((await second.json()).accepted, false);

  const snapshot = await (await env.PORTFOLIO.get().fetch(new Request('https://portfolio/portfolio'))).json();
  assert.equal(snapshot.cash, 99000);
  assert.equal(snapshot.positions.MSFT, 5);
  assert.equal(snapshot.orders.length, 1);
});

test('request-level paper boundary never enables live execution', async () => {
  const app = await loadWorker();
  const env = makeEnv();
  const response = await app.fetch(new Request('https://nexahunter.test/api/paper-orders', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ symbol: 'NVDA', quantity: 1, price: 100, side: 'BUY' })
  }), env);
  const data = await response.json();
  assert.equal(data.order.mode, 'PAPER');
  assert.equal(data.order.liveExecution, false);
  assert.equal(data.portfolio.mode, 'PAPER');
  assert.equal(data.portfolio.liveExecution, false);
  assert.equal(data.order.status, 'FILLED_PAPER');
});

// Keep the integration fixture honest about the production implementation it exercises.
test('integration fixture covers the production request and portfolio boundaries', () => {
  assert.match(worker, /url\.pathname==='\/api\/paper-orders'/);
  assert.match(worker, /portfolioRequest\(env,'\/portfolio','POST',order\)/);
  assert.match(worker, /portfolioRequest\(env,'\/portfolio','GET'\)/);
  assert.match(portfolio, /status: 'FILLED_PAPER'/);
  assert.match(portfolio, /transactionSync\(\(\) =>/);
});
