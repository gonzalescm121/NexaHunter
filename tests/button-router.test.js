import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('all primary dashboard controls declare explicit actions',()=>{
  const html=read('public/index.html');
  for(const action of ['mobile-menu','analysis','notifications','explore','trade','backtest','performance','positions']) assert.match(html,new RegExp(`data-action="${action}"`),`missing data-action ${action}`);
  for(const id of ['mobile-menu','analysis-btn','notification-btn','positions-tab','open-trade']) assert.match(html,new RegExp(`id="${id}"`),`missing control ${id}`);
});

test('central button router covers every primary action',()=>{
  const router=read('public/button-router.js');
  for(const action of ['mobile-menu','analysis','notifications','positions','trade','backtest','performance','explore']) assert.match(router,new RegExp(`case\\s*'${action}'`),`missing router case ${action}`);
  assert.match(router,/stopImmediatePropagation/);
  assert.match(router,/aria-expanded/);
  assert.match(router,/NexaHunterToggleMenu/);
});

test('mobile menu has exactly one click routing path',()=>{
  const html=read('public/index.html');
  const router=read('public/button-router.js');
  assert.doesNotMatch(html,/onclick\s*=|NexaHunterToggleMenu\s*=\s*function/,'mobile menu must not have a competing inline handler');
  assert.match(router,/case\s*'mobile-menu'/);
  assert.match(router,/NexaHunterToggleMenu=toggleMenu/);
});

test('mobile menu wiring has a concrete toggle path',()=>{
  const html=read('public/index.html');
  const router=read('public/button-router.js');
  const controller=read('public/mobile-menu.js');
  assert.match(html,/id="mobile-menu"/);
  assert.match(router,/NexaHunterToggleMenu/);
  assert.match(router,/classList\.toggle\('open'/);
  assert.match(controller,/getElementById\('mobile-menu'\)/);
  assert.match(controller,/getElementById\('sidebar'\)/);
  assert.match(controller,/classList\.remove\('open'/);
  assert.match(controller,/aria-expanded/);
});

test('mobile menu has a real touch target and open state styling',()=>{
  const css=read('public/mobile-final.css');
  assert.match(css,/#mobile-menu/);
  assert.match(css,/touch-action:manipulation/);
  assert.match(css,/aria-expanded/);
  assert.match(css,/\.sidebar\.open/);
  assert.match(css,/pointer-events:auto/);
});
