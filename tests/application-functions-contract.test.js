import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=f=>fs.readFileSync(f,'utf8');
const html=read('public/index.html');
const router=read('public/button-router.js');
const panels=read('public/panels.js');
const connected=read('public/connected-panels.js');
const realtime=read('public/realtime.js');
const crypto=read('public/crypto-experience.js');
const investing=read('public/investing-dashboard.js');
const worker=read('worker-app.js');
const portfolio=read('src/portfolio.js');

test('all primary UI actions have an explicit route',()=>{
  const actions=['analysis','notifications','explore','trade','backtest','performance','positions','markets','profile','mobile-menu'];
  for(const action of actions){
    assert.match(html,new RegExp(`data-action=\\"${action}\\"`),`HTML missing ${action}`);
    assert.match(router,new RegExp(`case'${action}'`),`router missing ${action}`);
  }
});

test('secondary account and investing actions are routed',()=>{
  for(const action of ['settings','appearance','favorites','watchlist','holdings']){
    assert.match(router,new RegExp(`case'${action}'`),`router missing ${action}`);
    assert.match(router,new RegExp(`data-action=\\"${action}\\"`),`menu missing ${action}`);
  }
  assert.match(router,/NexaHunterInvesting\\?\\.open/);
});

test('paper trade path is connected end-to-end',()=>{
  assert.match(connected,/\\/api\\/paper-orders/);
  assert.match(worker,/url\\.pathname==='\\/api\\/paper-orders'/);
  assert.match(worker,/mode:'PAPER'/);
  assert.match(worker,/liveExecution:false/);
  assert.match(portfolio,/FILLED_PAPER/);
  assert.match(portfolio,/transactionSync/);
});

test('market functions expose snapshot, bars, clock and streaming contracts',()=>{
  for(const term of ['/api/market/snapshot','/api/market/bars','/api/market/clock','/api/market/stream-config','/api/market/stream']) assert.match(worker,new RegExp(term.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')));
  assert.match(realtime,/stream-config|market\\/stream/);
});

test('NexaAI intelligence path is connected',()=>{
  assert.match(worker,/\\/api\\/intelligence/);
  assert.match(crypto,/intelligence|NexaAI|signal/i);
  assert.match(panels,/NexaAI|Analysis/);
});

test('investing dashboard has live portfolio and quote refresh paths',()=>{
  assert.match(investing,/\\/api\\/portfolio/);
  assert.match(investing,/\\/api\\/market\\/snapshot/);
  assert.match(investing,/positionDetails/);
  assert.match(investing,/FILLED_PAPER/);
  assert.match(investing,/investing-refresh/);
});

test('security boundary remains enforced for browser and API responses',()=>{
  assert.match(worker,/Content-Security-Policy/);
  assert.match(worker,/X-Frame-Options/);
  assert.match(worker,/X-Content-Type-Options/);
  assert.match(worker,/Referrer-Policy/);
  assert.match(worker,/Permissions-Policy/);
  assert.match(portfolio,/liveExecution: false/);
});

test('production UI includes legal/support surfaces',()=>{
  for(const file of ['public/login.html','public/privacy.html','public/terms.html','public/disclaimer.html','public/support.html']) assert.ok(fs.existsSync(file),`missing ${file}`);
});
