import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const worker = read('worker-app.js');
const workflow = read('.github/workflows/test.yml');
const wrangler = read('wrangler.toml');

test('health endpoint reports paper-only runtime and dependency readiness', () => {
  assert.match(worker, /url\.pathname==='\/health'/);
  assert.match(worker, /mode:'paper'/);
  assert.match(worker, /liveExecution:false/);
  assert.match(worker, /persistentPortfolio:Boolean\(env\?\.PORTFOLIO\)/);
  assert.match(worker, /marketDataConfigured:Boolean\(alpacaHeaders\(env\)\)/);
  assert.match(worker, /streamBridgeConfigured:Boolean\(env\?\.MARKET_STREAM\)/);
  assert.match(worker, /cache-control':'no-store'/);
});

test('market read endpoints enforce GET and stream endpoint enforces WebSocket upgrade', () => {
  assert.match(worker, /url\.pathname==='\/api\/market\/snapshot'/);
  assert.match(worker, /url\.pathname==='\/api\/market\/bars'/);
  assert.match(worker, /url\.pathname==='\/api\/market\/clock'/);
  assert.match(worker, /url\.pathname==='\/api\/market\/stream-config'/);
  assert.match(worker, /request\.headers\.get\('Upgrade'\)!=='websocket'/);
  assert.match(worker, /status:426/);
});

test('production workflow validates source syntax, full tests and required deployment files', () => {
  assert.match(workflow, /push:\n    branches: \[main\]/);
  assert.match(workflow, /pull_request:\n    branches: \[main\]/);
  assert.match(workflow, /timeout-minutes: 15/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /npm run syntax/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /test -f wrangler\.toml/);
  assert.match(workflow, /test -f src\/market-stream\.js/);
});

test('Cloudflare deployment declares required Durable Object bindings', () => {
  assert.match(wrangler, /PORTFOLIO/);
  assert.match(wrangler, /MARKET_STREAM/);
  assert.match(wrangler, /IdempotencyDurableObject/);
  assert.match(wrangler, /PortfolioDurableObject/);
  assert.match(wrangler, /MarketStreamDurableObject/);
});
