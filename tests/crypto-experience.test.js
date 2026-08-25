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

test('crypto experience action buttons have concrete handlers',()=>{
 const js=read('public/crypto-experience.js');
 assert.match(js,/cx-recurring.*onclick/);
 assert.match(js,/cx-save-plan.*onclick=savePlan/);
 assert.match(js,/cx-watch.*onclick/);
 assert.match(js,/cx-history-more.*onclick/);
 assert.match(js,/localStorage\.setItem\('nexahunter\.recurring\./);
 assert.match(js,/classList\.toggle\('expanded'\)/);
});

test('crypto experience uses white text on dark surfaces',()=>{
 const css=read('public/crypto-experience.css');
 assert.match(css,/\.crypto-experience\{[^}]*background:#071221[^}]*color:#fff/);
 assert.match(css,/\.crypto-experience \*\{color:#fff\}/);
 assert.match(css,/\.cx-recurring\{[^}]*background:#0a1728/);
});

test('crypto API gateway exposes historical bars and metadata',()=>{
 const js=read('worker-entry.js');
 assert.match(js,/api\/market\/crypto-bars/);
 assert.match(js,/v1beta3\/crypto\/us\/bars/);
 assert.match(js,/api\/crypto\/metadata/);
 assert.match(js,/api\.coingecko\.com/);
});

test('Cloudflare uses crypto API gateway entrypoint',()=>{
 const cfg=read('wrangler.toml');
 assert.match(cfg,/main\s*=\s*"worker-entry\.js"/);
});
