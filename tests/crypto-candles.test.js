import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('live crypto candlestick renderer is wired',()=>{
  const html=fs.readFileSync('public/index.html','utf8');
  const js=fs.readFileSync('public/crypto-candles.js','utf8');
  assert.match(html,/crypto-candles\.js/);
  assert.match(js,/api\/market\/crypto-bars/);
  assert.match(js,/cx-candles/);
  assert.match(js,/cx-candle-up/);
  assert.match(js,/cx-candle-down/);
  assert.match(js,/Open \$\{money\(b\.o\)\}/);
  assert.match(js,/setInterval\(load,5000\)/);
});
