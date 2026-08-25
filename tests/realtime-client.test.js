import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('public/realtime.js','utf8');

test('realtime client connects to NexaHunter stream',()=>{
  assert.match(source,/\/api\/market\/stream/);
  assert.match(source,/new WebSocket/);
});

test('realtime client subscribes to selected stock and crypto feeds',()=>{
  assert.match(source,/action:'subscribe'/);
  assert.match(source,/stocks:\[state\.symbol\]/);
  assert.match(source,/crypto:\['BTC\/USD','ETH\/USD'\]/);
});

test('realtime client processes trades quotes and bars',()=>{
  assert.match(source,/d\?\.T==='t'/);
  assert.match(source,/d\?\.T==='q'/);
  assert.match(source,/d\?\.T==='b'/);
  assert.match(source,/upsertBar\(d\)/);
});

test('realtime client has fallback and reconnect behavior',()=>{
  assert.match(source,/refreshFallback/);
  assert.match(source,/setTimeout\(\(\)=>\{refreshFallback\(\);connect\(\)\},1500\)/);
  assert.match(source,/setInterval\(refreshFallback,5000\)/);
});

test('realtime chart rejects malformed OHLC bars',()=>{
  assert.match(source,/h<Math\.max\(o,c\)/);
  assert.match(source,/l>Math\.min\(o,c\)/);
  assert.match(source,/h<l/);
});
