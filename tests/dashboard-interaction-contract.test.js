import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('public/index.html');
const app=read('public/app.js');
const realtime=read('public/realtime.js');
const volume=read('public/chart-volume.js');
const router=read('public/button-router.js');
const concept=read('public/concept-dashboard.js');

test('dashboard loads live chart and volume modules',()=>{
  assert.match(html,/\/realtime\.js/);
  assert.match(html,/\/chart-volume\.js/);
  assert.match(realtime,/new WebSocket/);
  assert.match(realtime,/nexa:bar/);
  assert.match(volume,/chart-volume-layer/);
  assert.match(volume,/\/api\/market\/bars/);
});

test('dashboard timeframe controls map to API timeframes',()=>{
  assert.match(app,/data-timeframe/);
  assert.match(app,/1D.*1Min/);
  assert.match(app,/1W.*5Min/);
  assert.match(app,/1M.*15Min/);
  assert.match(app,/3M.*1Hour/);
  assert.match(app,/1Y.*1Day/);
});

test('dashboard action router covers primary interactive controls',()=>{
  for(const action of ['analysis','notifications','positions','trade','backtest','order-history','performance','explore','profile','settings','appearance','favorites','watchlist','holdings','markets'])assert.match(router,new RegExp(`case['\\"]${action}['\\"]`));
});

test('concept dashboard exposes wired buy sell watch alert and panel actions',()=>{
  for(const action of ['buy','sell','watch','alert'])assert.match(concept,new RegExp(`data-concept-action=\\"${action}\\"`));
  for(const view of ['positions','pro','movers','add','news'])assert.match(concept,new RegExp(`view==='${view}'`));
});
