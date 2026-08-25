import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('hamburger menu exposes requested account and investing controls', () => {
  const router = read('public/button-router.js');
  const html = read('public/index.html');
  for (const action of ['profile','settings','appearance','favorites','watchlist','holdings','markets','trade']) {
    assert.match(router, new RegExp(`data-action=\\"${action}\\"`), action);
  }
  for (const label of ['Profile','Settings','Dark / Light','Favorites','Watchlist','Current investments','Markets','Paper Trade']) {
    assert.match(router, new RegExp(label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')), label);
  }
  assert.match(router, /function populate\(\)/);
  assert.match(router, /nav\.innerHTML=/);
  assert.match(router, /case'mobile-menu'/);
  assert.match(router, /window\.NexaHunterToggleMenu=toggleMenu/);
  assert.match(html, /id="mobile-menu"[^>]*aria-controls="sidebar"/);
});

test('mobile menu has an accessible toggle contract', () => {
  const mobile = read('public/mobile-menu.js');
  assert.match(mobile, /getElementById\('mobile-menu'\)/);
  assert.match(mobile, /getElementById\('sidebar'\)/);
  assert.match(mobile, /addEventListener\('click',toggle/);
  assert.match(mobile, /classList\.toggle\('open',open\)/);
  assert.match(mobile, /aria-expanded/);
  assert.match(mobile, /Escape/);
});
