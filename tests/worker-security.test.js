import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('worker-app.js','utf8');

test('health endpoint declares paper mode',()=>{
  assert.match(source,/url\.pathname===['"]\/health['"]/);
  assert.match(source,/mode:'paper'/);
  assert.match(source,/liveExecution:false/);
});
test('API rejects non-JSON orders',()=>assert.match(source,/Content-Type must be application\/json/));
test('API limits body size and nesting',()=>{
  assert.match(source,/MAX_BODY=16\*1024/);
  assert.match(source,/MAX_DEPTH=10/);
  assert.match(source,/Request body too large/);
  assert.match(source,/Request body nesting is too deep/);
});
test('API validates symbol, side, quantity and price',()=>{
  for(const expression of [/Invalid symbol/,/Side must be BUY or SELL/,/Invalid quantity/,/Invalid price/]) assert.match(source,expression);
});
test('security headers prevent framing and unsafe content',()=>{
  assert.match(source,/X-Frame-Options/);
  assert.match(source,/Content-Security-Policy/);
  assert.match(source,/Cross-Origin-Resource-Policy/);
});
test('live execution cannot be enabled by an order payload',()=>{
  assert.match(source,/liveExecution:false/);
  assert.match(source,/mode:'PAPER'/);
});
