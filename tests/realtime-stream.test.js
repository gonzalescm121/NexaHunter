import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('realtime client connects through NexaHunter stream bridge',()=>{
  const js=read('public/realtime.js');
  assert.match(js,/\/api\/market\/stream/);
  assert.match(js,/new WebSocket/);
  assert.match(js,/action:'subscribe'/);
  assert.match(js,/stocks:\[state\.symbol\]/);
  assert.match(js,/crypto:\['BTC\/USD','ETH\/USD'\]/);
});

test('realtime client processes trades, quotes and bars',()=>{
  const js=read('public/realtime.js');
  assert.match(js,/d\?\.T==='t'/);
  assert.match(js,/d\?\.T==='b'/);
  assert.match(js,/d\?\.T==='q'/);
  assert.match(js,/upsertBar/);
  assert.match(js,/paintTrade/);
});

test('realtime client has reconnect and polling fallback',()=>{
  const js=read('public/realtime.js');
  assert.match(js,/setTimeout\(\(\)=>\{refreshFallback\(\);connect\(\)\},1500\)/);
  assert.match(js,/setInterval\(refreshFallback,5000\)/);
  assert.match(js,/RECONNECTING/);
});

test('realtime client validates incoming OHLC bars',()=>{
  const js=read('public/realtime.js');
  assert.match(js,/Number\.isFinite/);
  assert.match(js,/h<Math\.max\(o,c\)/);
  assert.match(js,/l>Math\.min\(o,c\)/);
});

test('worker exposes websocket stream bridge and durable object binding',()=>{
  const worker=read('worker-app.js');
  const stream=read('src/market-stream.js');
  const wrangler=read('wrangler.toml');
  assert.match(worker,/\/api\/market\/stream/);
  assert.match(worker,/env\.MARKET_STREAM/);
  assert.match(worker,/idFromName\('global-market-stream'\)/);
  assert.match(stream,/wss:\/\/stream\.data\.alpaca\.markets\/v2\/iex/);
  assert.match(stream,/wss:\/\/stream\.data\.alpaca\.markets\/v1beta3\/crypto\/us/);
  assert.match(stream,/action:'auth'/);
  assert.match(stream,/action:'subscribe'/);
  assert.match(wrangler,/name = "MARKET_STREAM"/);
  assert.match(wrangler,/class_name = "MarketStreamDurableObject"/);
});

test('market stream never exposes credentials through client source',()=>{
  const js=read('public/realtime.js');
  assert.doesNotMatch(js,/ALPACA_API_SECRET|APCA-API-SECRET-KEY|streamConfig/);
});
