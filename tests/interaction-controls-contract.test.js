import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('reported dashboard controls have explicit interaction fallbacks',()=>{
  const fixes=read('public/interaction-fixes.js');
  for(const label of ['view analysis','view all','gainers','losers','volume','add symbol','my positions']) {
    assert.match(fixes,new RegExp(`['\\"]${label}['\\"]`),`missing interaction detection for ${label}`);
  }
  assert.match(fixes,/upgrade pro/);
  assert.match(fixes,/NexaAI Analysis/);
  assert.match(fixes,/Alerts/);
  assert.match(fixes,/My Positions/);
  assert.match(fixes,/NexaHunter Pro/);
  assert.match(fixes,/function addSymbol\(\)/);
  assert.match(fixes,/openScreener\?/);
});

test('interaction fallback is safe for dynamically-rendered controls',()=>{
  const fixes=read('public/interaction-fixes.js');
  assert.match(fixes,/MutationObserver/);
  assert.match(fixes,/wireExisting\(\)/);
  assert.match(fixes,/stopImmediatePropagation/);
  assert.match(fixes,/dataset\.interactionFix/);
});

test('primary dashboard still exposes the controls that the fallback layer services',()=>{
  const html=read('public/index.html');
  for(const action of ['analysis','notifications','trade','backtest','performance','positions','mobile-menu']) {
    assert.match(html,new RegExp(`data-action=\"${action}\"`),`missing primary action ${action}`);
  }
  assert.match(html,/id=\"positions-tab\"/);
  assert.match(html,/id=\"open-trade\"/);
});
