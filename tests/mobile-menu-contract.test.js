import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('mobile header intentionally has no hamburger menu', () => {
  const html = read('public/index.html');
  assert.doesNotMatch(html, /id="mobile-menu"/);
  assert.doesNotMatch(html, /mobile-menu\.js/);
  assert.match(html, /id="analysis-btn"[^>]*data-action="analysis"/);
  assert.match(html, /id="notification-btn"[^>]*data-action="notifications"/);
});

test('account and investing controls remain wired without hamburger navigation', () => {
  const router = read('public/button-router.js');
  for (const action of ['profile','settings','appearance','favorites','watchlist','holdings','markets','trade']) {
    assert.match(router, new RegExp(`data-action=\\"${action}\\"`), action);
  }
  for (const label of ['Profile','Settings','Dark / Light','Favorites','Watchlist','Current investments','Markets','Paper Trade']) {
    assert.match(router, new RegExp(label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')), label);
  }
});
