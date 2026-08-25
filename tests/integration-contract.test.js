import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('worker-app.js','utf8');
const portfolio=fs.readFileSync('src/portfolio.js','utf8');
const app=fs.readFileSync('public/app.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');

test('worker exposes portfolio integration',()=>{
  assert.match(worker,/PortfolioDurableObject/);
  assert.match(worker,/\/api\/portfolio/);
});
test('worker exposes paper-order integration',()=>{
  assert.match(worker,/\/api\/paper-orders/);
  assert.match(worker,/duplicate/);
});
test('portfolio exposes GET and POST contract',()=>{
  assert.match(portfolio,/request.method === 'GET'/);
  assert.match(portfolio,/request.method !== 'POST'/);
  assert.match(portfolio,/accepted: true/);
});
test('frontend refreshes persistent portfolio state',()=>{
  assert.match(app,/fetch\(['"]\/api\/portfolio['"]/);
  assert.match(app,/portfolio-value/);
  assert.match(app,/position-count/);
});
test('UI contains portfolio, markets and trade navigation',()=>{
  assert.match(html,/id=["']portfolio["']/);
  assert.match(html,/id=["']markets["']/);
  assert.match(html,/href=["']#trade["']/);
});
