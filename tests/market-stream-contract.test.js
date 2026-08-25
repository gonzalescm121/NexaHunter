import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const worker=read('worker-app.js');
const stream=read('src/market-stream.js');
const realtime=read('public/realtime.js');

test('market stream bridge is server-side and WebSocket-only',()=>{
  assert.match(worker,/pathname==='\/api\/market\/stream'/);
  assert.match(worker,/Upgrade.*websocket/i);
  assert.match(worker,/MARKET_STREAM/);
});

test('upstream stock and crypto streams authenticate only inside the Worker',()=>{
  assert.match(stream,/wss:\/\/stream\.data\.alpaca\.markets\/v2\/iex/);
  assert.match(stream,/wss:\/\/stream\.data\.alpaca\.markets\/v1beta3\/crypto\/us/);
  assert.match(stream,/ALPACA_API_KEY/);
  assert.match(stream,/ALPACA_API_SECRET/);
  assert.doesNotMatch(realtime,/ALPACA_API_SECRET/);
  assert.doesNotMatch(realtime,/APCA-API-SECRET-KEY/);
});

test('stream subscribes to trades, quotes and bars and reconnects after upstream close',()=>{
  assert.match(stream,/trades:\[\.\.\.this\.symbols\]/);
  assert.match(stream,/quotes:\[\.\.\.this\.symbols\]/);
  assert.match(stream,/bars:\[\.\.\.this\.symbols\]/);
  assert.match(stream,/scheduleReconnect\(\)/);
  assert.match(stream,/reconnectTimer = setTimeout\(\(\) => \{ this\.reconnectTimer = null; this\.ensureUpstreams\(\); \}, 1500\)/);
});

test('browser stream handles trades quotes bars and reconnect fallback',()=>{
  assert.match(realtime,/msg\.type==='market'/);
  assert.match(realtime,/d\?\.T==='t'/);
  assert.match(realtime,/d\?\.T==='b'/);
  assert.match(realtime,/d\?\.T==='q'/);
  assert.match(realtime,/reconnectTimer=setTimeout\(\(\)=>\{refreshFallback\(\);connect\(\)\},1500\)/);
});

test('market endpoints are no-store and reject malformed symbols',()=>{
  assert.match(worker,/cache-control':'no-store'/);
  assert.match(worker,/Invalid symbol/);
  assert.match(worker,/feed=iex/);
});
