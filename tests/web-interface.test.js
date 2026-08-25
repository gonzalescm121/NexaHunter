import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('web interface files exist',()=>{
  for(const file of ['public/index.html','public/styles.css','public/fix.css','public/master-visual.css','public/app.js','public/panels.js','public/realtime.js','public/assets/nexahunter-master-logo.svg']) assert.equal(fs.existsSync(path.join(root,file)),true,file);
});

test('master visual uses the approved wolf wordmark',()=>{
  const css=read('public/master-visual.css');
  const fix=read('public/fix.css');
  const logo=read('public/assets/nexahunter-master-logo.svg');
  assert.match(css,/nexahunter-master-logo\.svg/);
  assert.match(fix,/nexahunter-master-logo\.svg/);
  assert.match(logo,/NexaHunter/);
  assert.match(logo,/HUNT SMARTER, TRADE BETTER\./);
  assert.match(logo,/fill="#f4f8ff"/);
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
  for(const target of ['watchKey','saveWatch','setDetail','renderMarkets']) assert.match(js,new RegExp(target));
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

test('dashboard renders persistent portfolio state',()=>{
  const html=read('public/index.html');
  const js=read('public/app.js');
  assert.match(html,/portfolio-value/);
  assert.match(html,/buying-power/);
  assert.match(html,/position-count/);
  assert.match(js,/loadPortfolio/);
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
