import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const app = read('public/app.js');
const html = read('public/index.html');
const realtime = read('public/realtime.js');


test('dashboard loads the realtime market bridge', () => {
  assert.match(html, /<script src="\/realtime\.js" defer><\/script>/);
  assert.match(html, /id="realtime-pill">POLLING<\/span>/);
});

test('symbol selection is propagated to the realtime stream', () => {
  assert.match(app, /new CustomEvent\('nexa:symbol',\{detail:selected\}\)/);
  assert.match(realtime, /window\.addEventListener\('nexa:symbol',e=>window\.NexaRealtime\.setSymbol\(e\.detail\)\)/);
});

test('realtime client reconnects and falls back to polling', () => {
  assert.match(realtime, /new WebSocket\(/);
  assert.match(realtime, /setTimeout\(\(\)=>\{refreshFallback\(\);connect\(\)\},1500\)/);
  assert.match(realtime, /setInterval\(refreshFallback,5000\)/);
  assert.match(realtime, /streamState\('RECONNECTING'\)/);
});

test('realtime client validates incoming market bars before rendering', () => {
  assert.match(realtime, /function normalizeBar\(b\)/);
  assert.match(realtime, /h<Math\.max\(o,c\)/);
  assert.match(realtime, /l>Math\.min\(o,c\)/);
});
