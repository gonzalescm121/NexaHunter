import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('crypto experience is wired into production UI',()=>{
 const html=read('public/index.html');
 assert.match(html,/crypto-experience\.css/);
 assert.match(html,/crypto-experience\.js/);
});

test('crypto experience provides interactive history and recurring investments',()=>{
 const js=read('public/crypto-experience.js');
 for(const term of ['52 wk high','52 wk low','24h volume','Market cap','History','Recurring investment','pointermove','nexahunter.recurring']) assert.match(js,new RegExp(term.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')),`missing ${term}`);
 assert.match(js,/api\/market\/crypto-bars/);
 assert.match(js,/api\/crypto\/metadata/);
});

test('crypto experience action buttons have concrete event listeners',()=>{
 const js=read('public/crypto-experience.js');
 for(const pair of [['cx-recurring','toggleRecurring'],['cx-save-plan','savePlan'],['cx-watch','toggleWatch'],['cx-alerts','toggleAlerts'],['cx-save-alert','saveAlert'],['cx-share','shareAsset'],['cx-history-more','classList\\.toggle'],['cx-recurring-close','toggleRecurring']]){
   assert.match(js,new RegExp(`getElementById\\(['"]${pair[0]}['"]\\).*${pair[1]}`),`missing handler ${pair[0]}`);
 }
 assert.match(js,/addEventListener\('click'/);
 assert.match(js,/addEventListener\('pointerdown'/);
 assert.match(js,/localStorage\.setItem\('nexahunter\.recurring\./);
});

test('crypto experience uses white text on dark surfaces',()=>{
 const css=read('public/crypto-experience.css');
 assert.match(css,/\.crypto-experience\{[^}]*background:#071221[^}]*color:#fff/);
 assert.match(css,/\.crypto-experience \*\{color:#fff\}/);
 assert.match(css,/\.cx-recurring\{[^}]*background:#0a1728/);
});

test('Cloudflare uses crypto API gateway entrypoint',()=>{
 const cfg=read('wrangler.toml');
 assert.match(cfg,/main\s*=\s*"worker-entry\.js"/);
});
