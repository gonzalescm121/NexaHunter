import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('iPhone crypto experience uses NexaHunter dark and orange-green palette', () => {
  const css = read('public/crypto-experience.css');
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /background:#030303/);
  assert.match(css, /#f15b2a/);
  assert.match(css, /#51c832/);
  assert.match(css, /color:#fff/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('iPhone crypto experience contains concept actions and bottom navigation', () => {
  const js = read('public/crypto-experience.js');
  for (const id of ['cx-recurring','cx-watch','cx-alerts','cx-share','cx-history-more','cx-save-plan','cx-save-alert']) assert.match(js, new RegExp(`id=\\"${id}\\"`));
  for (const action of ['market','investing','trade','portfolio','account']) assert.match(js, new RegExp(`data-cx-nav=\\"${action}\\"`));
});

test('iPhone crypto controls have explicit touch/click handlers', () => {
  const js = read('public/crypto-experience.js');
  for (const token of ['toggleRecurring','savePlan','toggleWatch','toggleAlerts','saveAlert','shareAsset','navTo']) assert.match(js, new RegExp(`${token}`));
  assert.match(js, /addEventListener\('pointerdown'/);
  assert.match(js, /addEventListener\('pointermove'/);
  assert.match(js, /touch-action:none/);
});

test('recurring investment and alerts remain paper/local only', () => {
  const js = read('public/crypto-experience.js');
  assert.match(js, /mode:'PAPER'/);
  assert.match(js, /nexahunter\.recurring\./);
  assert.match(js, /nexahunter\.alert\./);
  assert.doesNotMatch(js, /\/api\/live/);
  assert.doesNotMatch(js, /liveOrder/);
});

test('mobile hamburger is absent from the current HTML', () => {
  const html = read('public/index.html');
  assert.doesNotMatch(html, /id="mobile-menu"/);
  assert.doesNotMatch(html, /mobile-menu\.js/);
});
