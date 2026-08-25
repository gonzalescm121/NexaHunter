import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('primary dashboard controls declare explicit actions',()=>{
  const html=read('public/index.html');
  for(const action of ['analysis','notifications','explore','trade','backtest','performance','positions','markets','profile','mobile-menu']) assert.match(html,new RegExp(`data-action="${action}"`),`missing data-action ${action}`);
  for(const id of ['analysis-btn','notification-btn','positions-tab','open-trade','mobile-bottom-nav','mobile-menu']) assert.match(html,new RegExp(`id="${id}"`),`missing control ${id}`);
});

test('central button router covers every primary action',()=>{
  const router=read('public/button-router.js');
  for(const action of ['analysis','notifications','positions','trade','backtest','performance','explore','mobile-menu']) assert.match(router,new RegExp(`case\\s*'${action}'`),`missing router case ${action}`);
  assert.match(router,/stopImmediatePropagation/);
});

test('hamburger menu is functional and routed on mobile',()=>{
  const html=read('public/index.html');
  const router=read('public/button-router.js');
  assert.match(html,/id="mobile-menu"/);
  assert.match(html,/data-action="mobile-menu"/);
  assert.match(router,/case\s*'mobile-menu'/);
  assert.match(router,/function toggleMenu\(\)/);
});

test('dashboard controls have touch-friendly styling',()=>{
  const css=read('public/mobile-final.css');
  assert.match(css,/touch-action:manipulation/);
  assert.match(css,/min-height:(?:36|40|42|44|46)px/);
  assert.match(css,/pointer-events:auto/);
});
