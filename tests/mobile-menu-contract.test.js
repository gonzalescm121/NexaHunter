import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('mobile hamburger menu is present and routed', () => {
  const html = read('public/index.html');
  const router = read('public/button-router.js');
  assert.match(html, /id="mobile-menu"/);
  assert.match(html, /data-action="mobile-menu"/);
  assert.match(html, /aria-controls="sidebar"/);
  assert.match(router, /case'mobile-menu'/);
  assert.match(router, /function toggleMenu\(\)/);
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
