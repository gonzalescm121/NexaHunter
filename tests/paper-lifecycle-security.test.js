import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const worker = fs.readFileSync(path.join(process.cwd(), 'worker-app.js'), 'utf8');
const portfolio = fs.readFileSync(path.join(process.cwd(), 'src/portfolio.js'), 'utf8');

test('paper order endpoint is explicitly paper-only', () => {
  assert.match(worker, /\/api\/paper-orders/);
  assert.match(worker, /mode:'PAPER'/);
  assert.match(worker, /liveExecution:false/);
  assert.match(worker, /Paper order queued/);
});

test('paper fill is persisted as FILLED_PAPER', () => {
  assert.match(portfolio, /status: 'FILLED_PAPER'/);
  assert.match(portfolio, /'FILLED_PAPER', 'PAPER', 0/);
  assert.match(portfolio, /INSERT INTO orders/);
});

test('paper fill updates cash and position atomically', () => {
  assert.match(portfolio, /transactionSync\(\(\) =>/);
  assert.match(portfolio, /UPDATE account SET cash=/);
  assert.match(portfolio, /positions/);
  assert.match(portfolio, /nextPosition = side === 'BUY'/);
});

test('paper portfolio exposes an explicit no-live-execution invariant', () => {
  assert.match(portfolio, /mode: 'PAPER'/);
  assert.match(portfolio, /liveExecution: false/);
  assert.match(portfolio, /live_execution INTEGER NOT NULL/);
});

test('duplicate paper orders fail closed before a second fill', () => {
  assert.match(worker, /Duplicate paper order rejected/);
  assert.match(portfolio, /SELECT id, symbol, side, quantity, price/);
  assert.match(portfolio, /if \(duplicate\) return \{ duplicate: true/);
});

test('live execution has no order endpoint or provider call', () => {
  assert.doesNotMatch(worker, /\/api\/live-orders/);
  assert.doesNotMatch(worker, /alpaca.*\/v2\/orders/i);
  assert.doesNotMatch(portfolio, /liveExecution\s*:\s*true/);
});

test('portfolio state is returned after a paper fill', () => {
  assert.match(portfolio, /accepted: true, order: result\.order, portfolio: this\.snapshot\(\)/);
  assert.match(worker, /portfolioRequest\(env,'\/portfolio','POST',order\)/);
});
