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
  assert.match(fixes,/panel\('NexaAI Analysis'\)/);
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
  assert.match(js,/assets\.filter\(a=>watchlist\.has\(a\[0\]\)/);
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

test('dashboard panels use connected portfolio and intelligence data instead of demo metrics',()=>{
  const html=read('public/index.html');
  const connected=read('public/connected-panels.js');
  const panels=read('public/panels.js');
  assert.match(html,/connected-panels\.js/);
  assert.match(connected,/\/api\/portfolio/);
  assert.match(connected,/\/api\/intelligence\?symbols=/);
  assert.match(connected,/function portfolio\(\)/);
  assert.match(connected,/function performance\(\)/);
  assert.match(connected,/function alerts\(\)/);
  assert.match(connected,/function ai\(\)/);
  assert.match(connected,/function screener\(mode\)/);
  assert.match(connected,/window\.NexaHunter\.openPanel=async name/);
  for(const demo of ['42,891.32','132.84','156.32','28.47','398.21','248.91']) assert.doesNotMatch(panels,new RegExp(demo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('dashboard interaction panels resolve to connected data or explicit states',()=>{
  const panels=read('public/panels.js');
  for(const fn of ['performance','positions','alerts','ai']) assert.match(panels,new RegExp(`async function ${fn}\\(\\)`));
  assert.match(panels,/jsonGet\('\/api\/portfolio'\)/);
  assert.match(panels,/jsonGet\('\/api\/intelligence'\)/);
  assert.match(panels,/No paper positions yet/);
  assert.match(panels,/No connected alerts are currently triggered/);
  assert.match(panels,/No live intelligence signal is currently available/);
  assert.match(panels,/Pro account connection is not configured/);
  assert.match(panels,/async function openScreener\(mode\)/);
  assert.match(panels,/Connected market intelligence/);
});

test('carousel and Add Symbol controls use connected market data',()=>{
  const app=read('public/app.js');
  const fixes=read('public/interaction-fixes.js');
  assert.match(app,/window\.searchMarketSymbol=searchMarketSymbol/);
  assert.match(app,/\/api\/market\/snapshot\?symbols=/);
  assert.match(fixes,/async function aiDot\(index,dots\)/);
  assert.match(fixes,/\/api\/intelligence\?symbols=/);
  assert.match(fixes,/Connected AI data unavailable/);
  assert.match(fixes,/window\.searchMarketSymbol/);
});

test('chart uses connected bars and explicit unavailable states',()=>{
  const js=read('public/app.js');
  assert.match(js,/\/api\/market\/bars\?symbol=/);
  assert.match(js,/No live bars available/);
  assert.match(js,/No valid bars available/);
  assert.match(js,/Live chart data unavailable/);
  assert.doesNotMatch(js,/Math\.sin\(|Math\.cos\(|Math\.random\(/);
});

test('gainers losers and volume are semantically different connected views',()=>{
  const connected=read('public/connected-panels.js');
  assert.match(connected,/function screener\(mode='gainers'\)/);
  assert.match(connected,/normalized==='volume'/);
  assert.match(connected,/normalized==='losers'/);
  assert.match(connected,/signal\.volume/);
  assert.match(connected,/signal\.changePercent/);
  assert.match(connected,/Market Screener — '\+label/);
  assert.match(connected,/Connected screener data is unavailable/);
  assert.doesNotMatch(connected,/const \{rows\}=await intelligence\(\);/);
});

test('connected dashboard values fail to an explicit state instead of NaN',()=>{
  const connected=read('public/connected-panels.js');
  assert.match(connected,/Number\.isFinite\(Number\(v\)\)/);
  assert.match(connected,/:'—'/);
  assert.match(connected,/Portfolio data is temporarily unavailable/);
  assert.match(connected,/Performance data is temporarily unavailable/);
});

test('mobile interaction targets and drawer remain touch-safe',()=>{
  const css=read('public/mobile-final.css');
  const router=read('public/button-router.js');
  assert.match(css,/min-width:44px;min-height:44px/);
  assert.match(css,/touch-action:manipulation/);
  assert.match(css,/\.sidebar\.open\{left:0\}/);
  assert.match(css,/\.mobile-nav-open\{overflow:hidden\}/);
  assert.match(router,/aria-expanded/);
  assert.match(router,/Close menu/);
  assert.match(router,/Profile/);
  assert.match(router,/Settings/);
  assert.match(router,/Favorites/);
  assert.match(router,/Watchlist/);
  assert.match(router,/Current investments/);
});
