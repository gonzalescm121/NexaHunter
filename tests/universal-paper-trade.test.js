import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=f=>fs.readFileSync(f,'utf8');

test('universal paper trade supports stocks and crypto lookup',()=>{
  const js=read('public/universal-paper-trade.js');
  assert.match(js,/\/api\/market\/snapshot\?symbols=/);
  assert.match(js,/\/api\/market\/snapshot\?crypto=/);
  assert.match(js,/source:'stocks'/);
  assert.match(js,/source:'crypto'/);
});

test('universal paper trade exposes BUY and SELL',()=>{
  const js=read('public/universal-paper-trade.js');
  assert.match(js,/<option>BUY<\/option>/);
  assert.match(js,/<option>SELL<\/option>/);
  assert.match(js,/\/api\/paper-orders/);
  assert.match(js,/assetType:selected\.type/);
});

test('universal trade is wired into every Trade entry point',()=>{
  const html=read('public/index.html');
  const js=read('public/universal-paper-trade.js');
  assert.match(html,/universal-paper-trade\.js/);
  assert.match(js,/name==='Trade'\?openUniversalTrade/);
  assert.match(js,/window\.NexaHunterUniversalTrade/);
});

test('paper trading remains explicitly non-live',()=>{
  const js=read('public/universal-paper-trade.js');
  assert.match(js,/No live brokerage execution is available/);
  assert.match(js,/Live execution: false/);
});
