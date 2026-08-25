import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('worker-app.js','utf8');
const portfolio=fs.readFileSync('src/portfolio.js','utf8');
const config=fs.readFileSync('wrangler.toml','utf8');
const app=fs.readFileSync('public/app.js','utf8');

test('persistent portfolio class is exported and bound',()=>{
  assert.match(worker,/PortfolioDurableObject/);
  assert.match(config,/name = "PORTFOLIO"/);
  assert.match(config,/class_name = "PortfolioDurableObject"/);
  assert.match(config,/new_sqlite_classes = \["PortfolioDurableObject"\]/);
});

test('portfolio persists cash, positions, and orders',()=>{
  assert.match(portfolio,/storage\.get\('portfolio'\)/);
  assert.match(portfolio,/storage\.put\('portfolio'/);
  assert.match(portfolio,/positions/);
  assert.match(portfolio,/orders/);
});

test('paper portfolio prevents overspending and naked sells',()=>{
  assert.match(portfolio,/Insufficient buying power/);
  assert.match(portfolio,/Insufficient paper position/);
});

test('portfolio is permanently paper-only',()=>{
  assert.match(portfolio,/mode: 'PAPER'/);
  assert.match(portfolio,/liveExecution: false/);
  assert.match(worker,/liveExecution:false/);
});

test('dashboard reads persistent portfolio state',()=>{
  assert.match(worker,/\/api\/portfolio/);
  assert.match(app,/\/api\/portfolio/);
  assert.match(app,/renderPortfolio/);
});
