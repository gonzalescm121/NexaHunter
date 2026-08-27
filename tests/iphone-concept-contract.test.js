import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('iPhone concept uses compact wolf logo and white/blue NexaHunter wordmark',()=>{
  const html=read('public/index.html');
  const logo=read('public/assets/nexahunter-mobile-logo.svg');
  const css=read('public/mobile-concept.css');
  assert.match(html,/nexahunter-mobile-logo\.svg/);
  assert.match(html,/class="mobile-brand"/);
  assert.match(logo,/Nexa/);
  assert.match(logo,/Hunter/);
  assert.match(logo,/fill="#f4f8ff"/);
  assert.match(logo,/fill="#1688ff"/);
  assert.match(css,/\.mobile-brand/);
  assert.match(css,/color:#fff/);
  assert.match(css,/--nh-blue:#0A5CFF/);
  assert.match(css,/--nh-gold:#F5B942/);
});

test('iPhone concept keeps semantic market-change and candle colors',()=>{
  const css=read('public/mobile-concept.css');
  assert.match(css,/--nh-green:#19D47B/);
  assert.match(css,/--nh-red:#FF4355/);
  assert.match(css,/\.gain\{color:var\(--nh-green\)!important\}/);
  assert.match(css,/\.negative\{color:var\(--nh-red\)!important\}/);
  assert.match(css,/\.asset-heading \.gain\{color:var\(--nh-green\)!important\}/);
  assert.match(css,/\.asset-heading \.negative\{color:var\(--nh-red\)!important\}/);
  assert.match(css,/candles rect:nth-child\(odd\)/);
  assert.match(css,/candles rect:nth-child\(even\)/);
});

test('mobile concept provides five-button bottom navigation and functional hamburger',()=>{
  const html=read('public/index.html');
  const css=read('public/mobile-concept.css');
  const router=read('public/button-router.js');
  assert.match(html,/id="mobile-menu"/);
  assert.match(html,/data-action="mobile-menu"/);
  assert.match(html,/aria-controls="sidebar"/);
  assert.match(html,/id="mobile-bottom-nav"/);
  for(const action of ['markets','positions','trade','profile']) assert.match(html,new RegExp(`data-action="${action}"`));
  assert.match(css,/\.mobile-bottom-nav/);
  assert.match(css,/grid-template-columns:repeat\(5,1fr\)/);
  assert.match(css,/@media\(max-width:900px\)[\s\S]*?\.mobile-menu-btn\{display:grid!important/);
  assert.match(router,/case\s*'mobile-menu'/);
  assert.match(router,/function toggleMenu\(\)/);
});

test('hamburger exposes the core mobile account menu actions',()=>{
  const router=read('public/button-router.js');
  for(const action of ['settings','profile','appearance','favorites','watchlist','holdings']) {
    assert.match(router,new RegExp(`data-action=\\"${action}\\"`),`missing hamburger action ${action}`);
  }
  for(const action of ['settings','profile','appearance','favorites','watchlist','holdings']) {
    assert.match(router,new RegExp(`case'${action}'`),`missing route ${action}`);
  }
});

test('Add Symbol persists a connected symbol into the watchlist and refreshes the UI',()=>{
  const fixes=read('public/interaction-fixes.js');
  const app=read('public/app.js');
  assert.match(fixes,/nexahunter\.watchlist\.v5/);
  assert.match(fixes,/set\.add\(symbol\)/);
  assert.match(fixes,/nexa:watchlist-updated/);
  assert.match(app,/addToWatchlist|nexa:watchlist-updated/);
  assert.match(app,/window\.addEventListener\('nexa:watchlist-updated'/);
});
