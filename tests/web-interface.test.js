import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('web interface files exist',()=>{
  for(const file of ['public/index.html','public/styles.css','public/fix.css','public/master-visual.css','public/master-highlights.css','public/app.js','public/panels.js','public/realtime.js','public/mobile-menu.js','public/assets/nexahunter-master-logo.svg']) assert.equal(fs.existsSync(path.join(root,file)),true,file);
});

test('master visual uses the approved wolf wordmark',()=>{
  const css=read('public/master-visual.css');
  const highlights=read('public/master-highlights.css');
  const fix=read('public/fix.css');
  const logo=read('public/assets/nexahunter-master-logo.svg');
  assert.match(css,/nexahunter-master-logo\.svg/);
  assert.match(highlights,/nexahunter-master-logo\.svg/);
  assert.match(fix,/nexahunter-master-logo\.svg/);
  assert.match(logo,/NexaHunter/);
  assert.match(logo,/HUNT SMARTER, TRADE BETTER\./);
  assert.match(logo,/fill="#f4f8ff"/);
});

test('master concept includes layered highlights, backgrounds and watermark effects',()=>{
  const css=read('public/master-highlights.css');
  for(const token of ['radial-gradient','repeating-linear-gradient','ticker-card:before','panel:before','chart-stage:before','chart-watermark','watermark-wolf','ai-panel','footer:before']) assert.match(css,new RegExp(token.replace(':','\\:')));
  assert.match(css,/drop-shadow/);
  assert.match(css,/@media\(max-width:900px\)/);
});

test('navigation exposes dashboard sections and trade/backtest controls',()=>{
  const html=read('public/index.html');
  for(const target of ['#markets','#watchlist','#trade','#backtest','#performance']) assert.match(html,new RegExp(target.replace('#','\\#')));
  assert.match(html,/id="portfolio"/);
});

test('market workspace exposes search, selection, watchlist and detail views',()=>{
  const html=read('public/index.html');
  const js=read('public/app.js');
  assert.match(html,/global-search/);
  assert.match(html,/market-list/);
  for(const target of ['detail-symbol','detail-price','price-tag']) assert.match(html,new RegExp(target));
  for(const target of ['watchKey','saveWatch','setDetail','renderMarkets','searchMarketSymbol','handleSearchKey']) assert.match(js,new RegExp(target));
  assert.match(js,/search\.oninput/);
  assert.match(js,/search\.onkeydown=handleSearchKey/);
  assert.match(js,/\/api\/market\/snapshot/);
});

test('dashboard controls have explicit click routing',()=>{
  const html=read('public/index.html');
  const js=read('public/app.js');
  const mobile=read('public/mobile-menu.js');
  for(const id of ['mobile-menu','analysis-btn','notification-btn','positions-tab','open-trade']) assert.match(html,new RegExp(`id="${id}"`));
  for(const id of ['analysis-btn','notification-btn','positions-tab','open-trade']) assert.match(js,new RegExp(`(?:#${id}|\\$\\(['"]${id}['"]\\))`));
  assert.match(mobile,/getElementById\('mobile-menu'\)/);
  assert.match(mobile,/addEventListener\('click',toggle/);
  assert.match(mobile,/classList\.toggle\('open',open\)/);
  assert.match(mobile,/aria-expanded/);
  assert.match(js,/document\.querySelectorAll\('\.action-link'\)/);
  assert.match(js,/Explore:'Explore'/);
  assert.match(js,/Trade:'Trade'/);
  assert.match(js,/Backtest:'Backtest'/);
  assert.match(js,/Performance:'Performance'/);
});

test('timeframe buttons update chart data and active state',()=>{
  const html=read('public/index.html');
  const js=read('public/app.js');
  assert.match(html,/class="time-tabs"/);
  assert.match(js,/document\.querySelectorAll\('\.time-tabs button'\)/);
  assert.match(js,/chartTimeframe=/);
  assert.match(js,/loadBars\(selected\)/);
});

test('dropdown controls have functional change paths',()=>{
  const panels=read('public/panels.js');
  assert.match(panels,/id="nh-side"/);
  assert.match(panels,/id="bt-strategy"/);
  assert.match(panels,/id="nh-refresh"/);
  assert.match(panels,/m\.querySelector\('#nh-refresh'\)\.value=localStorage/);
  assert.match(panels,/m\.querySelector\('#bt-run'\)\.onclick=async/);
  assert.match(panels,/m\.querySelector\('#nh-submit'\)\.onclick=async/);
});

test('paper trading safety is visible in UI and worker',()=>{
  const html=read('public/index.html');
  const panels=read('public/panels.js');
  const worker=read('worker-app.js');
  assert.match(html,/Trade/);
  assert.match(panels,/Paper trading only/);
  assert.match(worker,/liveExecution:false/);
});

test('frontend uses paper order, portfolio, and market endpoints',()=>{
  const js=read('public/app.js');
  const panels=read('public/panels.js');
  assert.match(panels,/\/api\/paper-orders/);
  assert.match(js,/\/api\/portfolio/);
  assert.match(js,/\/api\/market\/snapshot/);
  assert.match(js,/\/api\/market\/clock/);
  assert.match(panels,/content-type/);
});

test('frontend escapes rendered market values',()=>{
  const js=read('public/app.js');
  assert.match(js,/const esc=/);
  assert.match(js,/replaceAll\('&'/);
  assert.match(js,/replaceAll\('<'/);
});

test('market cards do not ship hard-coded demo prices',()=>{
  const js=read('public/app.js');
  for(const value of ['187.32','132.84','248.91','42,891.32','5,432.21','67,231.48']) assert.doesNotMatch(js,new RegExp(value.replace(',','\\,')));
  assert.match(js,/FALLBACK_ASSETS=\[\['AAPL','Apple Inc\.','—','—'\]/);
  assert.match(js,/\/api\/market\/snapshot/);
});

test('dashboard renders persistent portfolio state',()=>{
  const html=read('public/index.html');
  const js=read('public/app.js');
  assert.match(html,/portfolio-value/);
  assert.match(html,/buying-power/);
  assert.match(html,/position-count/);
  assert.match(js,/loadPortfolio/);
  assert.match(js,/d\.buyingPower/);
});

test('responsive and branded styles are present',()=>{
  const css=read('public/styles.css');
  assert.match(css,/--green/);
  assert.match(css,/--bg/);
  assert.match(css,/@media/);
  assert.match(css,/sidebar/);
  assert.match(css,/market-row/);
});

test('dashboard navigation targets are either real sections or panel actions',()=>{
  const html=read('public/index.html');
  const panels=read('public/panels.js');
  const navTargets=[...html.matchAll(/class="nav-item[^\"]*" href="(#[^"]+)"/g)].map(m=>m[1]);
  const panelActions=['Trade','Backtest','Performance','Notebook','Settings'];
  for(const target of navTargets){
    if(target==='#home') assert.match(html,/id="home"/);
    else if(html.includes(`id="${target.slice(1)}"`)) continue;
    else {
      const name=target.slice(1);
      const expected=panelActions.find(action=>action.toLowerCase()===name.toLowerCase());
      assert.ok(expected,`navigation target ${target} has no section or supported panel action`);
      assert.match(panels,new RegExp(`name===['"]${expected}['"]`));
      assert.match(panels,/function wire\(\)/);
      assert.match(panels,/openPanel\(name\)/);
    }
  }
});

test('panel router is exported for dashboard controls',()=>{
  const panels=read('public/panels.js');
  assert.match(panels,/window\.NexaHunter=\{openPanel,openScreener,modal\}/);
  for(const name of ['Trade','Backtest','Performance','My Positions','Alerts','NexaAI Analysis']) assert.match(panels,new RegExp(`name==='${name}'`));
});

test('index has no external stylesheet dependency outside the CSP boundary',()=>{
  const html=read('public/index.html');
  assert.doesNotMatch(html,/<link[^>]+href=["']https?:\/\//i);
  assert.doesNotMatch(html,/fonts\.googleapis\.com/i);
  assert.doesNotMatch(html,/fonts\.gstatic\.com/i);
});