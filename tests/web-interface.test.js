import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('web interface files exist',()=>{
  for(const file of ['public/index.html','public/styles.css','public/app.js']) assert.equal(fs.existsSync(path.join(root,file)),true,file);
});

test('navigation exposes core pages',()=>{
  const html=read('public/index.html');
  for(const target of ['#markets','#portfolio','#orders','#trade']) assert.match(html,new RegExp(target.replace('#','\\#')));
});

test('paper trading safety is visible in UI',()=>{
  const html=read('public/index.html');
  assert.match(html,/Live execution off/);
  assert.match(html,/Paper trading only/);
});

test('frontend uses paper order endpoint and health endpoint',()=>{
  const js=read('public/app.js');
  assert.match(js,/\/api\/paper-orders/);
  assert.match(js,/\/health/);
  assert.match(js,/content-type/);
});

test('frontend escapes rendered server values',()=>{
  const js=read('public/app.js');
  assert.match(js,/escapeHtml/);
  assert.match(js,/replaceAll\('&'/);
});

test('responsive and branded styles are present',()=>{
  const css=read('public/styles.css');
  assert.match(css,/--green:#00c805/);
  assert.match(css,/--bg:#050505/);
  assert.match(css,/@media\(max-width:800px\)/);
});
