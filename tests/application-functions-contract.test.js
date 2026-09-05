import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = f => fs.readFileSync(f, 'utf8');
const html = read('public/index.html');
const router = read('public/button-router.js');
const panels = read('public/panels.js');
const connected = read('public/connected-panels.js');
const realtime = read('public/realtime.js');
const crypto = read('public/crypto-experience.js');
const investing = read('public/investing-dashboard.js');
const worker = read('worker-app.js');
const portfolio = read('src/portfolio.js');

const has = (source, value, message) => {
  assert.ok(source.includes(value), message || `missing ${value}`);
};

const hasRouteCase = (action) => {
  assert.ok(router.includes(`case'${action}':`) || router.includes(`case '${action}':`), `router missing ${action}`);
};

test('all primary UI actions have an explicit route', () => {
  const actions = ['analysis', 'notifications', 'explore', 'trade', 'backtest', 'performance', 'positions', 'markets', 'profile', 'mobile-menu'];
  for (const action of actions) {
    has(html, `data-action="${action}"`, `HTML missing ${action}`);
    hasRouteCase(action);
  }
});

test('secondary account and investing actions are routed', () => {
  for (const action of ['settings', 'appearance', 'favorites', 'watchlist', 'holdings']) {
    hasRouteCase(action);
    has(router, `data-action="${action}"`, `menu missing ${action}`);
  }
  has(router, 'NexaHunterInvesting', 'Investing module is not routed');
});

test('paper trade path is connected end-to-end', () => {
  has(connected, '/api/paper-orders');
  has(worker, '/api/paper-orders');
  has(worker, "mode:'PAPER'");
  has(worker, 'liveExecution:false');
  has(portfolio, 'FILLED_PAPER');
  has(portfolio, 'transactionSync');
});

test('market functions expose snapshot, bars, clock and streaming contracts', () => {
  for (const term of ['/api/market/snapshot', '/api/market/bars', '/api/market/clock', '/api/market/stream-config', '/api/market/stream']) has(worker, term);
  assert.ok(realtime.includes('stream-config') || realtime.includes('market/stream'), 'realtime market stream contract missing');
});

test('NexaAI intelligence path is connected', () => {
  has(worker, '/api/intelligence');
  assert.match(crypto, /intelligence|NexaAI|signal/i);
  assert.match(panels, /NexaAI|Analysis/);
});

test('investing dashboard has live portfolio and quote refresh paths', () => {
  has(investing, '/api/portfolio');
  has(investing, '/api/market/snapshot');
  has(investing, 'positionDetails');
  has(investing, 'FILLED_PAPER');
  has(investing, 'investing-refresh');
});

test('security boundary remains enforced for browser and API responses', () => {
  for (const header of ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) has(worker, header);
  has(portfolio, 'liveExecution: false');
});

test('production UI includes legal/support surfaces', () => {
  for (const file of ['public/login.html', 'public/privacy.html', 'public/terms.html', 'public/disclaimer.html', 'public/support.html']) assert.ok(fs.existsSync(file), `missing ${file}`);
});
