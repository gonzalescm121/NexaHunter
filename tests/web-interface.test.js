import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('dashboard controls have explicit click routing including mobile navigation',()=>{
  const html=read('public/index.html');
  const router=read('public/button-router.js');
  const panels=read('public/panels.js');
  assert.match(html,/id="mobile-menu"/);
  assert.match(html,/data-action="mobile-menu"/);
  assert.match(router,/case'mobile-menu'/);
  assert.match(router,/function toggleMenu\(\)/);
  for(const id of ['analysis-btn','notification-btn','positions-tab','open-trade']) assert.match(html,new RegExp(`id="${id}"`));
  for(const action of ['analysis','notifications','positions','trade']) assert.match(router,new RegExp(`case'${action}'`));
  assert.match(html,/id="mobile-bottom-nav"/);
  for(const action of ['markets','positions','trade','profile']) assert.match(html,new RegExp(`data-action="${action}"`));
  assert.match(router,/case'notifications':open\('Alerts'\)/);
  assert.match(panels,/if\(name==='Alerts'\)return alerts\(\)/);
  assert.match(panels,/function alerts\(\)/);
  assert.match(html,/title="Open notifications"/);
  assert.match(html,/data-action="notifications"[^>]*aria-label="Open notifications"/);
  assert.match(router,/document\.addEventListener\('click'/);
});

test('visible legacy dashboard controls have explicit interaction fallbacks',()=>{
  const html=read('public/index.html');
  const fixes=read('public/interaction-fixes.js');
  assert.match(html,/interaction-fixes\.js/);
  for(const label of ['view analysis','view all','gainers','losers','volume','add symbol','my positions','upgrade pro','terms','privacy','support']) assert.match(fixes,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(fixes,/MutationObserver/);
  assert.match(fixes,/carousel-dots/);
  assert.match(fixes,/openPanel\?\.'NexaAI Analysis|panel\('NexaAI Analysis'\)/);
  assert.match(fixes,/panel\('Alerts'\)/);
  assert.match(fixes,/panel\('My Positions'\)/);
  assert.match(fixes,/panel\('NexaHunter Pro'\)/);
  assert.match(fixes,/function addSymbol\(\)/);
  assert.match(fixes,/function footerModal\(kind\)/);
});

test('watchlist panel renders persisted symbols from connected market assets',()=>{
  const html=read('public/index.html');
  const js=read('public/app.js');
  assert.match(html,/id="watchlist-items"/);
  assert.match(js,/function renderWatchlist\(\)/);
  assert.match(js,/assets\.filter\(a=>watchlist\.has\(a\[0\]\)\)/);
  assert.match(js,/renderWatchlist\(\)/);
  assert.match(js,/data-watch-symbol/);
  assert.match(js,/No symbols in your watchlist/);
});

test('market UI never presents stale demo prices as live data',()=>{
  const js=read('public/app.js');
  for(const demo of ['187.32','132.84','248.91','42,891.32','5432.21','17482.91']) assert.doesNotMatch(js,new RegExp(demo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(js,/Live market data unavailable/);
  assert.match(js,/Values shown as — until the connected feed responds/);
});

test('chart uses connected bars and explicit unavailable states',()=>{
  const js=read('public/app.js');
  assert.match(js,/\/api\/market\/bars\?symbol=/);
  assert.match(js,/No live bars available/);
  assert.match(js,/No valid bars available/);
  assert.match(js,/Live chart data unavailable/);
  assert.doesNotMatch(js,/Math\.sin\(|Math\.cos\(|Math\.random\(/);
});
