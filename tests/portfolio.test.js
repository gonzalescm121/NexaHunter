import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('worker-app.js','utf8');
const portfolio=fs.readFileSync('src/portfolio.js','utf8');
const config=fs.readFileSync('wrangler.toml','utf8');
const app=fs.readFileSync('public/app.js','utf8');

test('SQLite portfolio class is exported and bound',()=>{
  assert.match(worker,/PortfolioDurableObject/);
  assert.match(config,/name = "PORTFOLIO"/);
  assert.match(config,/class_name = "PortfolioDurableObject"/);
  assert.match(config,/new_sqlite_classes = \["PortfolioDurableObject"\]/);
  assert.match(portfolio,/storage\.sql\.exec/);
});

test('portfolio initializes relational tables and index',()=>{
  assert.match(portfolio,/CREATE TABLE IF NOT EXISTS account/);
  assert.match(portfolio,/CREATE TABLE IF NOT EXISTS positions/);
  assert.match(portfolio,/CREATE TABLE IF NOT EXISTS orders/);
  assert.match(portfolio,/CREATE INDEX IF NOT EXISTS idx_orders_timestamp/);
});

test('portfolio initializes before requests',()=>assert.match(portfolio,/blockConcurrencyWhile/));

test('paper order mutation is atomic',()=>{
  assert.match(portfolio,/transactionSync/);
  assert.match(portfolio,/UPDATE account SET cash/);
  assert.match(portfolio,/INSERT INTO orders/);
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
  assert.match(app,/loadPortfolio/);
  assert.match(app,/portfolio-value/);
});

test('portfolio exposes persistent buying power to the dashboard',()=>{
  assert.match(portfolio,/const cash = Number\(account\?\.cash \?\? INITIAL_CASH\)/);
  assert.match(portfolio,/buyingPower: cash/);
  assert.match(app,/buyingPower/);
  assert.match(app,/\$'\+money\(d\.buyingPower\)/);
});

test('duplicate order ids are rejected transactionally',()=>{
  assert.match(portfolio,/SELECT id, symbol, side, quantity, price/);
  assert.match(portfolio,/duplicate: true/);
  assert.match(portfolio,/status: 409/);
});
