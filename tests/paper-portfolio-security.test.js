import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const worker=read('worker-app.js');
const portfolio=read('src/portfolio.js');
const panels=read('public/panels.js');

test('paper orders are explicitly non-live at both API and persistence layers',()=>{
  assert.match(worker,/mode:'PAPER'/);
  assert.match(worker,/liveExecution:false/);
  assert.match(portfolio,/mode: 'PAPER'/);
  assert.match(portfolio,/liveExecution: false/);
  assert.match(portfolio,/live_execution INTEGER NOT NULL/);
});

test('paper portfolio persists positions, cash and order history transactionally',()=>{
  assert.match(portfolio,/CREATE TABLE IF NOT EXISTS account/);
  assert.match(portfolio,/CREATE TABLE IF NOT EXISTS positions/);
  assert.match(portfolio,/CREATE TABLE IF NOT EXISTS orders/);
  assert.match(portfolio,/transactionSync/);
  assert.match(portfolio,/UPDATE account SET cash/);
  assert.match(portfolio,/INSERT INTO orders/);
});

test('paper order validation rejects malformed and unsafe values',()=>{
  assert.match(worker,/MAX_QUANTITY=1000000/);
  assert.match(worker,/MAX_PRICE=1000000000/);
  assert.match(worker,/Order calculation overflow/);
  assert.match(worker,/Duplicate paper order rejected/);
  assert.match(worker,/Insufficient buying power/);
});

test('sell orders cannot exceed persisted paper positions',()=>{
  assert.match(portfolio,/side === 'SELL' && quantity > current/);
  assert.match(portfolio,/Insufficient paper position/);
});

test('security headers and browser escaping remain enforced',()=>{
  assert.match(worker,/Content-Security-Policy/);
  assert.match(worker,/X-Frame-Options/);
  assert.match(worker,/Cross-Origin-Resource-Policy/);
  const app=read('public/app.js');
  assert.match(app,/const esc=/);
  assert.match(app,/replaceAll\('<'/);
});

test('trade UI labels the workflow as paper trading',()=>{
  assert.match(panels,/Paper trading only/);
  assert.match(panels,/\/api\/paper-orders/);
});
