import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const worker=fs.readFileSync(path.join(process.cwd(),'worker-app.js'),'utf8');

test('worker has security headers',()=>{
  assert.match(worker,/X-Content-Type-Options/);
  assert.match(worker,/X-Frame-Options/);
  assert.match(worker,/Content-Security-Policy/);
  assert.match(worker,/Cross-Origin-Resource-Policy/);
});

test('worker enforces JSON content type for orders',()=>{
  assert.match(worker,/Content-Type must be application\/json/);
  assert.match(worker,/application\/json/);
});

test('worker bounds request bodies and nesting',()=>{
  assert.match(worker,/MAX_BODY=16\*1024/);
  assert.match(worker,/MAX_DEPTH=10/);
});

test('worker keeps live execution disabled',()=>{
  assert.match(worker,/liveExecution:false/);
  assert.match(worker,/mode:'PAPER'/);
});

test('worker rejects duplicate paper orders',()=>{
  assert.match(worker,/Duplicate paper order rejected/);
});
