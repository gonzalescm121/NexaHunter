import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker-entry.js';

test('production entry accepts fractional stock paper orders', async () => {
  const response = await worker.fetch(new Request('https://nexahunter.test/api/paper-orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      symbol: 'FRACSTK',
      quantity: 0.25,
      price: 200,
      side: 'BUY',
      assetType: 'STOCK'
    })
  }), {});

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.accepted, true);
  assert.equal(data.order.quantity, 0.25);
  assert.equal(data.order.mode, 'PAPER');
  assert.equal(data.order.liveExecution, false);
});

test('production entry rejects zero or negative fractional quantities', async () => {
  for (const quantity of [0, -0.25]) {
    const response = await worker.fetch(new Request('https://nexahunter.test/api/paper-orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        symbol: `BAD${Math.abs(quantity)}`,
        quantity,
        price: 200,
        side: 'BUY',
        assetType: 'STOCK'
      })
    }), {});
    assert.equal(response.status, 400);
  }
});
