import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const worker = read('worker-app.js');
const entry = read('worker-entry.js');
const app = read('public/app.js');
const workflow = read('.github/workflows/test.yml');
const deployWorkflow = read('.github/workflows/deploy.yml');
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
  assert.match(worker, /json\(\{error:'WebSocket upgrade required'\},\s*426\)/);
});

test('non-persistent portfolio fallback never fabricates demo cash in either Worker entrypoint', () => {
  for (const source of [worker, entry]) {
    assert.match(source, /persistent:false/);
    assert.match(source, /unavailable:true/);
    assert.doesNotMatch(source, /cash:100000/);
  }
});

test('dashboard ignores non-numeric portfolio values until connected state is available', () => {
  assert.match(app, /const cash=Number\(d\.cash\),buyingPower=Number\(d\.buyingPower\)/);
  assert.match(app, /Number\.isFinite\(cash\)/);
  assert.match(app, /Number\.isFinite\(buyingPower\)/);
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

test('production deployment is manually guarded and validates before deploy', () => {
  assert.match(deployWorkflow, /workflow_dispatch:/);
  assert.match(deployWorkflow, /confirm:/);
  assert.match(deployWorkflow, /github\.event\.inputs\.confirm == 'DEPLOY'/);
  assert.match(deployWorkflow, /npm run syntax && npm test/);
  assert.match(deployWorkflow, /wrangler@4\.126\.0 deploy/);
});

test('production deployment requires Cloudflare credentials and a public origin', () => {
  assert.match(deployWorkflow, /CLOUDFLARE_API_TOKEN:/);
  assert.match(deployWorkflow, /CLOUDFLARE_ACCOUNT_ID:/);
  assert.match(deployWorkflow, /PUBLIC_ORIGIN:\s*\$\{\{ secrets\.NEXAHUNTER_PUBLIC_ORIGIN \}\}/);
  assert.match(deployWorkflow, /CF_ACCESS_CLIENT_ID:\s*\$\{\{ secrets\.CF_ACCESS_CLIENT_ID \}\}/);
  assert.match(deployWorkflow, /CF_ACCESS_CLIENT_SECRET:\s*\$\{\{ secrets\.CF_ACCESS_CLIENT_SECRET \}\}/);
  assert.match(deployWorkflow, /test -n \"\$PUBLIC_ORIGIN\"/);
});

test('production smoke test verifies health, market data, streaming and paper-only execution', () => {
  assert.match(deployWorkflow, /smoke_get 'health'/);
  assert.match(deployWorkflow, /\$PUBLIC_ORIGIN\/health/);
  assert.match(deployWorkflow, /grep -q '\"status\":\"ok\"'/);
  assert.match(deployWorkflow, /grep -q '\"liveExecution\":false'/);
  assert.match(deployWorkflow, /api\/market\/snapshot/);
  assert.match(deployWorkflow, /api\/market\/bars/);
  assert.match(deployWorkflow, /api\/market\/stream-config/);
  assert.match(deployWorkflow, /Upgrade: websocket/);
  assert.match(deployWorkflow, /ws_status/);
  assert.match(deployWorkflow, /!= \"101\"/);
});
