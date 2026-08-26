import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('realtime chart renders actual OHLC candles and clears stale unavailable state',()=>{
  const realtime=read('public/realtime.js');
  assert.match(realtime,/function normalizeBar\(b\)/);
  assert.match(realtime,/b\.o/);
  assert.match(realtime,/b\.h/);
  assert.match(realtime,/b\.l/);
  assert.match(realtime,/b\.c/);
  assert.match(realtime,/chart-candle-up/);
  assert.match(realtime,/chart-candle-down/);
  assert.match(realtime,/function clearChartState\(\)/);
  assert.match(realtime,/clearChartState\(\);/);
});

test('live trades continuously update the current candle',()=>{
  const realtime=read('public/realtime.js');
  assert.match(realtime,/function updateLiveBar\(price/);
  assert.match(realtime,/Math\.floor\(time\/60000\)\*60000/);
  assert.match(realtime,/b\.h=Math\.max\(b\.h,price\)/);
  assert.match(realtime,/b\.l=Math\.min\(b\.l,price\)/);
  assert.match(realtime,/b\.c=price/);
  assert.match(realtime,/if\(d\?\.T==='t'\)paintTrade\(d\)/);
  assert.match(realtime,/updateLiveBar\(p,Date\.now\(\)\)/);
});

test('chart exposes numeric price axis and historical hover values',()=>{
  const realtime=read('public/realtime.js');
  const css=read('public/realtime-chart.css');
  assert.match(realtime,/function drawAxis\(/);
  assert.match(realtime,/chart-axis-label/);
  assert.match(realtime,/chart-time-label/);
  assert.match(realtime,/function onChartHover\(/);
  assert.match(realtime,/function drawHover\(/);
  assert.match(realtime,/Open/);
  assert.match(realtime,/High/);
  assert.match(realtime,/Low/);
  assert.match(realtime,/Close/);
  assert.match(realtime,/chart-crosshair/);
  assert.match(realtime,/chart-hover-card/);
  assert.match(css,/\.chart-axis-label/);
  assert.match(css,/\.chart-hover-card/);
});

test('realtime stream subscribes to stock trades, quotes and bars through the Worker bridge',()=>{
  const stream=read('src/market-stream.js');
  assert.match(stream,/trades:\[\.\.\.this\.symbols\]/);
  assert.match(stream,/quotes:\[\.\.\.this\.symbols\]/);
  assert.match(stream,/bars:\[\.\.\.this\.symbols\]/);
  assert.match(stream,/wss:\/\/stream\.data\.alpaca\.markets\/v2\/iex/);
});
