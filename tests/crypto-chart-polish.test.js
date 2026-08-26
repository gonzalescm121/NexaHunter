import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('secondary crypto chart polish is wired and renders a value scale',()=>{
  const html=read('public/index.html');
  const js=read('public/crypto-chart-polish.js');
  assert.match(html,/crypto-chart-polish\.js/);
  assert.match(js,/cx-price-scale/);
  assert.match(js,/cx-current-value/);
  assert.match(js,/scale-label/);
  assert.match(js,/api\/market\/crypto-bars/);
  assert.match(js,/setInterval\(load,5000\)/);
});

test('secondary crypto chart uses a fine line and visible current value',()=>{
  const js=read('public/crypto-chart-polish.js');
  const css=read('public/crypto-experience.css');
  assert.match(js,/stroke-width:1\.35/);
  assert.match(js,/ui\.current\.textContent=money\(last\)/);
  assert.match(js,/scale\.innerHTML=''/);
  assert.match(css,/\.cx-chart-wrap path\{[^}]*stroke-width:1\.35/);
  assert.doesNotMatch(css,/\.cx-chart-wrap path\{[^}]*stroke-width:3\.2/);
});

test('mobile chart reserves a readable value rail and busts stale chart assets',()=>{
  const html=read('public/index.html');
  const css=read('public/crypto-experience.css');
  assert.match(html,/crypto-experience\.css\?v=20260826-2/);
  assert.match(html,/crypto-chart-polish\.js\?v=20260826-2/);
  assert.match(css,/\.cx-chart-wrap\{padding-right:64px/);
  assert.match(css,/\.cx-price-scale\{right:0!important/);
  assert.match(css,/\.cx-current-value\{right:4px!important/);
  assert.match(css,/@media\(max-width:700px\).*?\.cx-chart-wrap\{height:250px;padding-right:58px/s);
});
