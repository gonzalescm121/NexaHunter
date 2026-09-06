import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const worker = read('worker-app.js');
const entry = read('worker-idempotent-entry.js');
const app = read('public/app.js');
const css = read('public/concept-dashboard.css');
const testWorkflow = read('.github/workflows/test.yml');
const deployWorkflow = read('.github/workflows/deploy.yml');
const wrangler = read('wrangler.toml');

test('health endpoint reports paper-only runtime and dependency readiness', () => {
  assert.match(worker, /status:\s*'ok'/);
  assert.match(worker, /liveExecution:\s*false/);
  assert.match(worker, /marketDataConfigured/);
});

test('market read endpoints enforce GET and stream endpoint enforces WebSocket upgrade', () => {
  assert.match(worker, /api\/market\/snapshot/);
  assert.match(worker, /api\/market\/bars/);
  assert.match(worker, /api\/market\/stream/);
  assert.match(worker, /Upgrade/);
});

test('non-persistent portfolio fallback never fabricates demo cash in either Worker entrypoint', () => {
  assert.doesNotMatch(worker, /100000/);
  assert.doesNotMatch(entry, /100000/);
});

test('dashboard ignores non-numeric portfolio values until connected state is available', () => {
  assert.match(app, /Number\.isFinite\(cash\)/);
  assert.match(app, /Number\.isFinite\(buyingPower\)/);
});

test('dashboard visual grid has explicit four-column market rows and stable responsive regions', () => {
  assert.match(css, /market-row/);
  assert.match(css, /grid-template-columns/);
  assert.match(css, /content-grid/);
});

test('production workflow validates source syntax, full tests and required deployment files', () => {
  assert.match(testWorkflow, /npm run syntax/);
  assert.match(testWorkflow, /npm test/);
  assert.match(deployWorkflow, /npm run syntax && npm test/);
});

test('Cloudflare deployment declares required Durable Object bindings', () => {
  assert.match(wrangler, /durable_objects/);
  assert.match(wrangler, /Portfolio/);
  assert.match(wrangler, /MarketStream/);
});

test('production deployment is manually guarded and validates before deploy', () => {
  assert.match(deployWorkflow, /workflow_dispatch/);
  assert.match(deployWorkflow, /confirm/);
  assert.match(deployWorkflow, /DEPLOY/);
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
  assert.match(deployWorkflow, /smoke_origin=\"https:\/\/nexahunter\.gonzalescm121\.workers\.dev\"/);
  assert.match(deployWorkflow, /health=\"\$\(get \"\$smoke_origin\/health\"\)\"/);
  assert.match(deployWorkflow, /grep -q '\"status\":\"ok\"'/);
  assert.match(deployWorkflow, /grep -q '\"marketDataConfigured\":true'/);
  assert.match(deployWorkflow, /grep -q '\"liveExecution\":false'/);
  assert.match(deployWorkflow, /api\/market\/snapshot/);
  assert.match(deployWorkflow, /api\/market\/bars/);
  assert.match(deployWorkflow, /api\/market\/stream-config/);
  assert.match(deployWorkflow, /Upgrade: websocket/);
  assert.match(deployWorkflow, /test \"\$ws\" = 101/);
});
