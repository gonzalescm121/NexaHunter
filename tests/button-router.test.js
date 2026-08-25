import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('all primary dashboard controls declare explicit actions',()=>{
  const html=read('public/index.html');
  for(const action of ['mobile-menu','analysis','notifications','explore','trade','backtest','performance','positions']){
    assert.match(html,new RegExp(`data-action="${action}"`),`missing data-action ${action}`);
  }
  for(const id of ['mobile-menu','analysis-btn','notification-btn','positions-tab','open-trade']){
    assert.match(html,new RegExp(`id="${id}"`),`missing control ${id}`);
  }
});

test('central button router covers every primary action',()=>{
  const router=read('public/button-router.js');
  for(const action of ['mobile-menu','analysis','notifications','positions','trade','backtest','performance','explore']){
    assert.match(router,new RegExp(`case '${action}'`),`missing router case ${action}`);
  }
  assert.match(router,/stopImmediatePropagation/);
  assert.match(router,/aria-expanded/);
});

test('mobile menu has a real touch target and open state styling',()=>{
  const css=read('public/mobile-final.css');
  assert.match(css,/#mobile-menu/);
  assert.match(css,/touch-action:manipulation/);
  assert.match(css,/aria-expanded/);
});
