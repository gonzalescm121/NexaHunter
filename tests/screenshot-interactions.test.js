import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('screenshot controls have production wiring and connected panel targets',()=>{
  const html=read('public/index.html');
  const fixes=read('public/interaction-fixes.js');
  const panels=read('public/panels.js');

  assert.match(html,/src="\/interaction-fixes\.js"/);
  for(const label of ['View Analysis','View All','Gainers','Losers','Volume','Add Symbol','My Positions','Upgrade Pro','Terms','Privacy','Support']) {
    assert.match(fixes,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
  }
  for(const target of ['NexaAI Analysis','Alerts','My Positions','NexaHunter Pro']) {
    assert.match(fixes,new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
  for(const fn of ['addSymbol','footerModal','wireDots','aiDot']) assert.match(fixes,new RegExp(`function ${fn}\\(`));
  for(const fn of ['openPanel','alerts','ai','pro','openScreener']) assert.match(panels,new RegExp(`function ${fn}\\(`));
});

test('screenshot controls preserve safe connected-data and paper-only behavior',()=>{
  const fixes=read('public/interaction-fixes.js');
  const panels=read('public/panels.js');
  assert.match(fixes,/\/api\/intelligence/);
  assert.match(fixes,/Connected market-data feed/);
  assert.match(panels,/\/api\/paper-orders/);
  assert.match(panels,/Live execution: false/);
  assert.match(panels,/No live brokerage order will be submitted/);
});

test('AI carousel has click, keyboard and touch interaction contracts',()=>{
  const fixes=read('public/interaction-fixes.js');
  assert.match(fixes,/addEventListener\('click'/);
  assert.match(fixes,/addEventListener\('keydown'/);
  assert.match(fixes,/ArrowLeft/);
  assert.match(fixes,/ArrowRight/);
  assert.match(fixes,/touchstart/);
  assert.match(fixes,/touchend/);
});
