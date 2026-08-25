import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('mobile header intentionally omits the hamburger menu', () => {
  const html = read('public/index.html');
  const router = read('public/button-router.js');
  assert.doesNotMatch(html, /id="mobile-menu"/);
  assert.doesNotMatch(html, /data-action="mobile-menu"/);
  assert.doesNotMatch(router, /case\s*'mobile-menu'/);
  assert.doesNotMatch(router, /NexaHunterToggleMenu=toggleMenu/);
});

test('account and investing controls remain wired with mobile navigation', () => {
  const router = read('public/button-router.js');
  for (const action of ['profile','settings','appearance','favorites','watchlist','holdings','markets','trade']) {
    assert.match(router, new RegExp(`data-action=\\"${action}\\"`), action);
  }
  for (const label of ['Profile','Settings','Dark / Light','Favorites','Watchlist','Current investments','Markets','Paper Trade']) {
    assert.match(router, new RegExp(label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')), label);
  }
});
