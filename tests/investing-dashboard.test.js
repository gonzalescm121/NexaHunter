import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('Investing tab is wired into production mobile UI',()=>{
 const html=read('public/index.html');
 assert.match(html,/investing-dashboard\.css/);
 assert.match(html,/investing-dashboard\.js/);
 assert.match(html,/data-action="positions"/);
 assert.match(html,/Investing/);
});

test('Investing tab reads the persistent paper portfolio and live market values',()=>{
 const js=read('public/investing-dashboard.js');
 for(const term of ['/api/portfolio','/api/market/snapshot','Cash available','Actual investments','Realized profit &amp; loss','Year to date','investing-cash','investing-value','investing-total']) assert.match(js,new RegExp(term.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')),`missing ${term}`);
 assert.match(js,/positionDetails/);
 assert.match(js,/avgPrice/);
 assert.match(js,/FILLED_PAPER/);
 assert.match(js,/mode.*PAPER/);
});

test('Investing navigation opens the full portfolio tab instead of a placeholder modal',()=>{
 const js=read('public/button-router.js');
 assert.match(js,/case'positions':if\(window\.NexaHunterInvesting\?\.open\)/);
 assert.match(js,/case'holdings':if\(window\.NexaHunterInvesting\?\.open\)/);
});

test('Investing tab displays cash, invested value and realized P&L periods',()=>{
 const css=read('public/investing-dashboard.css');
 assert.match(css,/\.investing-cards/);
 assert.match(css,/\.investing-pnl/);
 assert.match(css,/\.investing-row/);
 assert.match(css,/@media\(max-width:700px\)/);
});
