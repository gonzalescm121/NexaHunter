import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('primary dashboard controls declare explicit actions',()=>{
  const html=read('public/index.html');
  for(const action of ['analysis','notifications','explore','trade','backtest','performance','positions']) assert.match(html,new RegExp(`data-action="${action}"`),`missing data-action ${action}`);
  for(const id of ['analysis-btn','notification-btn','positions-tab','open-trade']) assert.match(html,new RegExp(`id="${id}"`),`missing control ${id}`);
  assert.doesNotMatch(html,/id="mobile-menu"/);
});

test('central button router covers every remaining primary action',()=>{
  const router=read('public/button-router.js');
  for(const action of ['analysis','notifications','positions','trade','backtest','performance','explore']) assert.match(router,new RegExp(`case\\s*'${action}'`),`missing router case ${action}`);
  assert.doesNotMatch(router,/case\\s*'mobile-menu'/);
});

test('hamburger menu is intentionally removed',()=>{
  const html=read('public/index.html');
  const router=read('public/button-router.js');
  assert.doesNotMatch(html,/mobile-menu/);
  assert.doesNotMatch(router,/NexaHunterToggleMenu/);
});

test('dashboard controls have touch-friendly styling',()=>{
  const css=read('public/mobile-final.css');
  assert.match(css,/touch-action:manipulation/);
  assert.match(css,/min-height:36px/);
  assert.match(css,/min-height:40px/);
});
