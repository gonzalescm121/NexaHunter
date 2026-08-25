import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/market-stream.js','utf8');
const worker=fs.readFileSync('worker-app.js','utf8');
const config=fs.readFileSync('wrangler.toml','utf8');

test('market stream Durable Object is registered',()=>{
  assert.match(config,/name = "MARKET_STREAM"/);
  assert.match(config,/class_name = "MarketStreamDurableObject"/);
  assert.match(config,/tag = "v3"/);
});

test('stream bridge exposes a WebSocket endpoint',()=>{
  assert.match(worker,/url\.pathname==='\/api\/market\/stream'/);
  assert.match(worker,/Upgrade.*websocket/i);
  assert.match(worker,/MARKET_STREAM/);
});

test('Alpaca credentials stay server-side',()=>{
  assert.match(source,/this\.env\.ALPACA_API_KEY/);
  assert.match(source,/this\.env\.ALPACA_API_SECRET/);
  assert.doesNotMatch(worker,/streamConfig.*key:env\.ALPACA_API_KEY/s);
});

test('stock and crypto upstreams use Alpaca WebSocket feeds',()=>{
  assert.match(source,/wss:\/\/stream\.data\.alpaca\.markets\/v2\/iex/);
  assert.match(source,/wss:\/\/stream\.data\.alpaca\.markets\/v1beta3\/crypto\/us/);
});

test('upstream authentication precedes subscription',()=>{
  assert.match(source,/action:'auth'/);
  assert.match(source,/message\?\.T === 'success' && message\?\.msg === 'authenticated'/);
  assert.match(source,/this\.pushSubscriptions\(\)/);
  assert.match(source,/this\.stockAuthenticated/);
  assert.match(source,/this\.cryptoAuthenticated/);
});

test('stream handles reconnect and client lifecycle',()=>{
  assert.match(source,/scheduleReconnect\(\)/);
  assert.match(source,/setTimeout\(\(\) => \{ this\.reconnectTimer = null; this\.ensureUpstreams\(\); \}, 1500\)/);
  assert.match(source,/closeUpstreams\(\)/);
  assert.match(source,/this\.clients\.size === 0/);
});

test('stream forwards trades, quotes, and bars',()=>{
  assert.match(source,/trades:\[\.\.\.this\.symbols\]/);
  assert.match(source,/quotes:\[\.\.\.this\.symbols\]/);
  assert.match(source,/bars:\[\.\.\.this\.symbols\]/);
  assert.match(source,/trades:\[\.\.\.this\.crypto\]/);
  assert.match(source,/type:'market'/);
});

test('stream validates subscribed symbols before forwarding upstream',()=>{
  assert.match(source,/\^\[A-Z\]\[A-Z0-9\.\-\]\{0,9\}\$/);
  assert.match(source,/\^\[A-Z0-9\]\+\\\/USD\$/);
});
