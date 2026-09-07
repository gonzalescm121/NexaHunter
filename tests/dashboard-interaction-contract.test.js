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
  assert.match(html,/data-timeframe="1D"/);
  assert.match(html,/data-timeframe="1W"/);
  assert.match(html,/data-timeframe="1M"/);
  assert.match(html,/data-timeframe="3M"/);
  assert.match(html,/data-timeframe="1Y"/);
  assert.match(app,/\{\'1D\':\'1Min\',\'1W\':\'5Min\',\'1M\':\'15Min\',\'3M\':\'1Hour\',\'1Y\':\'1Day\'/);
});

test('dashboard action router covers primary interactive controls',()=>{
  for(const action of ['analysis','notifications','positions','trade','backtest','order-history','performance','explore','profile','settings','appearance','favorites','watchlist','holdings','markets'])assert.match(router,new RegExp(`case['\\"]${action}['\\"]`));
});

test('concept dashboard exposes wired buy sell watch alert and panel actions',()=>{
  for(const action of ['buy','sell','watch','alert'])assert.match(concept,new RegExp(`data-concept-action=\\"${action}\\"`));
  for(const view of ['positions','pro','movers','add','news'])assert.match(concept,new RegExp(`view==='${view}'`));
  assert.match(concept,/Sign in to view/);
  assert.match(concept,/response\.status===401\|\|response\.status===403/);
});
