import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('dashboard controls have explicit click routing including mobile navigation',()=>{
  const html=read('public/index.html');
  const router=read('public/button-router.js');
  assert.match(html,/id="mobile-menu"/);
  assert.match(html,/data-action="mobile-menu"/);
  assert.match(router,/case'mobile-menu'/);
  assert.match(router,/function toggleMenu\(\)/);
  for(const id of ['analysis-btn','notification-btn','positions-tab','open-trade']) assert.match(html,new RegExp(`id="${id}"`));
  for(const action of ['analysis','notifications','positions','trade']) assert.match(router,new RegExp(`case'${action}'`));
  assert.match(html,/id="mobile-bottom-nav"/);
  for(const action of ['markets','positions','trade','profile']) assert.match(html,new RegExp(`data-action="${action}"`));
  assert.match(router,/document\.addEventListener\('click'/);
});
