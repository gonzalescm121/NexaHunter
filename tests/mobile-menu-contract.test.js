import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('mobile header exposes an accessible hamburger menu with a concrete toggle path', () => {
  const html = read('public/index.html');
  const router = read('public/button-router.js');
  const css = read('public/mobile-final.css');
  assert.match(html, /id="mobile-menu"/);
  assert.match(html, /data-action="mobile-menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(router, /case\s*'mobile-menu'/);
  assert.match(router, /NexaHunterToggleMenu=toggleMenu/);
  assert.match(router, /classList\.toggle\('open'/);
  assert.match(router, /aria-expanded/);
  assert.match(css, /\.sidebar\.open/);
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
