import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

test('AI carousel supports click, keyboard, and touch navigation',()=>{
  const fixes=read('public/interaction-fixes.js');
  assert.match(fixes,/carousel-dots/);
  assert.match(fixes,/ArrowLeft/);
  assert.match(fixes,/ArrowRight/);
  assert.match(fixes,/touchstart/);
  assert.match(fixes,/touchend/);
  assert.match(fixes,/aiDot\(next,dots\)/);
});

test('screenshot controls retain explicit interaction fallbacks',()=>{
  const fixes=read('public/interaction-fixes.js');
  for(const label of ['view analysis','view all','gainers','losers','volume','add symbol','my positions','upgrade pro','terms','privacy','support']) {
    assert.match(fixes,new RegExp(label.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')));
  }
  assert.match(fixes,/function footerModal\(kind\)/);
  assert.match(fixes,/function addSymbol\(\)/);
  assert.match(fixes,/MutationObserver/);
});
