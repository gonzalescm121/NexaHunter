import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('iPhone crypto experience uses NexaHunter blue white gold palette', () => {
  const css = read('public/nexahunter-iphone-theme.css');
  assert.match(css, /BLUE \+ WHITE \+ GOLD/);
  assert.match(css, /--nh-blue:#0A5CFF/);
  assert.match(css, /--nh-white:#FFFFFF/);
  assert.match(css, /--nh-gold:#F5B942/);
  assert.match(css, /color:#fff/);
  assert.match(css, /min-height:44px|\.cx-actions button/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('iPhone crypto experience contains concept actions and bottom navigation', () => {
  const js = read('public/crypto-experience.js');
  for (const id of ['cx-recurring','cx-watch','cx-alerts','cx-share','cx-history-more','cx-save-plan','cx-save-alert']) assert.match(js, new RegExp(`id=\\"${id}\\"`));
  for (const action of ['market','investing','trade','portfolio','account']) assert.match(js, new RegExp(`data-cx-nav=\\"${action}\\"`));
});

test('iPhone crypto controls have explicit touch/click handlers', () => {
  const js = read('public/crypto-experience.js');
  const css = read('public/crypto-experience.css');
  for (const token of ['toggleRecurring','savePlan','toggleWatch','toggleAlerts','saveAlert','shareAsset','navTo']) assert.match(js, new RegExp(token));
  assert.match(js, /addEventListener\('pointerdown'/);
  assert.match(js, /addEventListener\('pointermove'/);
  assert.match(js, /addEventListener\('click'/);
  assert.match(css, /touch-action:none/);
});

test('recurring investment and alerts remain paper/local only', () => {
  const js = read('public/crypto-experience.js');
  assert.match(js, /mode:'PAPER'/);
  assert.match(js, /nexahunter\.recurring\./);
  assert.match(js, /nexahunter\.alert\./);
  assert.doesNotMatch(js, /\/api\/live/);
  assert.doesNotMatch(js, /liveOrder/);
});

test('mobile hamburger is functional and routed', () => {
  const html = read('public/index.html');
  const router = read('public/button-router.js');
  assert.match(html, /id="mobile-menu"/);
  assert.match(html, /data-action="mobile-menu"/);
  assert.match(html, /aria-controls="sidebar"/);
  assert.match(router, /case\s*'mobile-menu'/);
  assert.match(router, /function toggleMenu\(\)/);
});
