import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('worker-app.js','utf8');
const portfolio=fs.readFileSync('src/portfolio.js','utf8');
const app=fs.readFileSync('public/app.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');

test('worker exposes portfolio integration',()=>{
  assert.match(worker,/PortfolioDurableObject/);
  assert.match(worker,/\/portfolio/);
});
test('worker exposes paper-order integration',()=>{
  assert.match(worker,/\/api\/paper-orders/);
  assert.match(worker,/idempotency/);
});
test('portfolio exposes GET and POST contract',()=>{
  assert.match(portfolio,/request\.method === 'GET'/);
  assert.match(portfolio,/request\.method !== 'POST'/);
  assert.match(portfolio,/accepted: true/);
});
test('frontend refreshes portfolio state',()=>{
  assert.match(app,/fetch\(['"]\/portfolio['"]/);
  assert.match(app,/portfolio/);
});
test('UI contains portfolio, markets, orders and trade sections',()=>{
  for(const id of ['portfolio','markets','orders','trade']) assert.match(html,new RegExp(`id=["']${id}["']`));
});
