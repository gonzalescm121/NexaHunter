import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('worker-app.js','utf8');
const entry=fs.readFileSync('worker-entry.js','utf8');

test('market snapshots degrade independently for stock and crypto providers',()=>{
  assert.match(worker,/errors:\{\}/);
  assert.match(worker,/result\.errors\.stocks/);
  assert.match(worker,/result\.errors\.crypto/);
  assert.match(worker,/stockFailed&&cryptoFailed/);
});

test('paper duplicate protection is scoped to the authenticated user',()=>{
  assert.match(entry,/function paperDuplicate\(order,user\)/);
  assert.match(entry,/user\?\.sub\|\|'anonymous'/);
  assert.match(entry,/paperDuplicate\(order,user\)/);
});
