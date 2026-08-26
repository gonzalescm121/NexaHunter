import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const sync=fs.readFileSync(new URL('../public/settings-sync.js',import.meta.url),'utf8');

test('saved market refresh setting controls the live refresh scheduler',()=>{
  assert.match(app,/refreshIntervalMs\(\)/);
  assert.match(app,/scheduleMarketRefresh\(\)/);
  assert.match(app,/nexa:settings-updated/);
  assert.doesNotMatch(app,/setInterval\(refreshMarket,15000\)/);
  assert.match(sync,/nh\.refresh/);
  assert.match(sync,/nexa:settings-updated/);
  assert.match(index,/settings-sync\.js/);
});
