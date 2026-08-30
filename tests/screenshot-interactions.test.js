import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('screenshot interaction controls have live routing and current labels',()=>{
  const html=read('public/index.html');
  const router=read('public/button-router.js');
  const fixes=read('public/interaction-fixes.js');
  assert.match(html,/id="positions-tab"[^>]*data-action="positions"/);
  assert.match(html,/>View investments<\/button>/);
  assert.match(router,/case'positions'/);
  assert.match(router,/window\.NexaHunterInvesting\?\.open/);
  for(const label of ['View Analysis','View All','Gainers','Losers','Volume','Add Symbol','Upgrade Pro','Terms','Privacy','Support']){
    assert.match(fixes,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
  }
  assert.match(fixes,/action==='analysis'/);
  assert.match(fixes,/action==='notifications'/);
  assert.match(fixes,/action==='add-symbol'/);
  assert.match(fixes,/action==='pro'/);
  assert.match(fixes,/function footerModal\(kind\)/);
  for(const kind of ['terms','privacy','support'])assert.match(fixes,new RegExp(`${kind}:\\[`));
});

test('screenshot carousel supports click, keyboard, and touch movement',()=>{
  const fixes=read('public/interaction-fixes.js');
  assert.match(fixes,/d\.addEventListener\('click'/);
  assert.match(fixes,/d\.addEventListener\('keydown'/);
  assert.match(fixes,/e\.key!=='ArrowLeft'&&e\.key!=='ArrowRight'/);
  assert.match(fixes,/touchstart/);
  assert.match(fixes,/touchend/);
  assert.match(fixes,/Math\.abs\(endX-startX\)/);
});

test('screenshot controls fail to explicit connected states instead of demo content',()=>{
  const connected=read('public/connected-panels.js');
  assert.match(connected,/async function alerts\(\)/);
  assert.match(connected,/async function ai\(\)/);
  assert.match(connected,/async function screener\(mode='gainers'\)/);
  assert.match(connected,/\/api\/intelligence\?symbols=/);
  assert.match(connected,/Connected screener data is unavailable/);
  assert.match(connected,/Live intelligence is temporarily unavailable/);
});

test('market status has a rendered live-status target for the connected clock',()=>{
  const html=read('public/index.html');
  const app=read('public/app.js');
  assert.match(html,/id="market-status"[^>]*class="top-status"/);
  assert.match(html,/id="clock"/);
  assert.match(app,/document\.querySelector\('\.top-status'\)/);
  assert.match(app,/fetch\('\/api\/market\/clock'/);
});

test('paper trading interaction remains explicitly simulated',()=>{
  const html=read('public/index.html');
  const connected=read('public/connected-panels.js');
  assert.match(html,/Paper trading only/);
  assert.match(html,/No live execution is available/);
  assert.match(connected,/Paper trading only/);
  assert.match(connected,/Live execution: false/);
  assert.match(connected,/\/api\/paper-orders/);
});
