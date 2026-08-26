import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const has = (text, needle) => assert.equal(text.includes(needle), true, `Missing expected source contract: ${needle}`);

test('screenshot controls have production wiring and connected panel targets', () => {
  const html = read('public/index.html');
  const fixes = read('public/interaction-fixes.js');
  const panels = read('public/panels.js');

  has(html, 'src="/interaction-fixes.js"');

  for (const label of [
    'View Analysis',
    'View All',
    'Gainers',
    'Losers',
    'Volume',
    'Add Symbol',
    'My Positions',
    'Upgrade Pro',
    'Terms',
    'Privacy',
    'Support'
  ]) {
    has(fixes.toLowerCase(), label.toLowerCase());
  }

  for (const target of [
    'NexaAI Analysis',
    'Alerts',
    'My Positions',
    'NexaHunter Pro'
  ]) {
    has(fixes, target);
  }

  for (const fn of [
    'addSymbol',
    'footerModal',
    'wireDots',
    'aiDot'
  ]) {
    has(fixes, `function ${fn}(`);
  }

  for (const fn of [
    'openPanel',
    'alerts',
    'ai',
    'pro',
    'openScreener'
  ]) {
    has(panels, `function ${fn}(`);
  }
});

test('screenshot controls preserve safe connected-data and paper-only behavior', () => {
  const fixes = read('public/interaction-fixes.js');
  const panels = read('public/panels.js');

  has(fixes, '/api/intelligence');
  has(fixes, 'Connected market-data feed');
  has(panels, '/api/paper-orders');
  has(panels, 'Live execution: false');
  has(panels, 'No live brokerage order will be submitted');
});

test('AI carousel has click, keyboard and touch interaction contracts', () => {
  const fixes = read('public/interaction-fixes.js');

  has(fixes, "addEventListener('click'");
  has(fixes, "addEventListener('keydown'");
  has(fixes, 'ArrowLeft');
  has(fixes, 'ArrowRight');
  has(fixes, 'touchstart');
  has(fixes, 'touchend');
});
