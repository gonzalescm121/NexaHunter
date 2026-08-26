import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/portfolio.js','utf8');

test('portfolio uses transactional state changes',()=>assert.match(source,/transactionSync\(\(\) =>/));
test('portfolio initializes persistent account and tables',()=>{
  assert.match(source,/CREATE TABLE IF NOT EXISTS account/);
  assert.match(source,/CREATE TABLE IF NOT EXISTS positions/);
  assert.match(source,/CREATE TABLE IF NOT EXISTS orders/);
});
test('buy and sell update cash and positions',()=>{
  assert.match(source,/nextCash = side === 'BUY' \? cash - notional : cash \+ notional/);
  assert.match(source,/nextPosition = side === 'BUY' \? current \+ quantity : current - quantity/);
});
test('risk controls reject invalid paper trades',()=>{
  assert.match(source,/Insufficient buying power/);
  assert.match(source,/Insufficient paper position/);
  assert.match(source,/Order calculation overflow/);
});
test('duplicate IDs are rejected transactionally',()=>{
  assert.match(source,/SELECT id, symbol, side, quantity, price/);
  assert.match(source,/duplicate: true/);
  assert.match(source,/status: 409/);
});
test('live execution is hard-disabled',()=>{
  assert.match(source,/mode: 'PAPER'/);
  assert.match(source,/liveExecution: false/);
  assert.match(source,/INSERT INTO orders\(id,symbol,side,quantity,price,status,mode,live_execution,timestamp\) VALUES\(\?,\?,\?,\?,\?,\?,\?,\?,\?\)/);
});
test('paper portfolio exposes cost basis details without changing legacy position quantities',()=>{
  assert.match(source,/positionDetails\(\)/);
  assert.match(source,/positionDetails: this\.positionDetails\(\)/);
  assert.match(source,/avgPrice/);
  assert.match(source,/ORDER BY timestamp ASC/);
  assert.match(source,/positions = Object\.fromEntries/);
});
