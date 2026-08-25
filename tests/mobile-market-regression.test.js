import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const css=read('public/mobile-pass.css');
const app=read('public/app.js');
const realtime=read('public/realtime.js');
const panels=read('public/panels.js');
const html=read('public/index.html');

test('mobile layout uses the iPhone safe viewport and responsive cards',()=>{
  assert.match(html,/viewport-fit=cover/);
  assert.match(css,/100dvh/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/@media\(max-width:400px\)/);
});

test('chart sizing is fluid instead of fixed to desktop width',()=>{
  assert.match(css,/\.chart-stage\{height:clamp/);
  assert.match(css,/\.chart-stage svg\{.*max-width:100%/s);
});

test('Home, Explore and Copilot mobile navigation map to real dashboard anchors',()=>{
  assert.match(css,/\.side-nav \.nav-item:nth-child\(1\)/);
  assert.match(css,/\.side-nav \.nav-item:nth-child\(4\)/);
  assert.match(css,/\.side-nav \.nav-item:nth-child\(5\)/);
  assert.match(css,/content:'Explore'/);
  assert.match(css,/content:'Copilot'/);
  assert.match(html,/href=\"#home\"/);
  assert.match(html,/href=\"#screener\"/);
  assert.match(html,/href=\"#nexaai\"/);
});

test('multiple symbols are supported by the market UI and realtime stream',()=>{
  for (const symbol of ['AAPL','NVDA','TSLA','AMZN','AMD','PLTR','CRWD']) assert.match(app,new RegExp(`['\\"]${symbol}['\\"]`));
  assert.match(realtime,/setSymbol:s=>/);
  assert.match(realtime,/state\.symbol/);
  assert.match(app,/nexa:symbol/);
});

test('market outage handling preserves last known values and exposes an error state',()=>{
  assert.match(app,/Market data temporarily unavailable/);
  assert.match(app,/Showing last known values/);
  assert.match(realtime,/streamState\('ERROR'\)/);
  assert.match(realtime,/cache:'no-store'/);
});

test('paper trade UI sends an id and remains explicitly paper-only',()=>{
  assert.match(panels,/const orderId=\(\)=>/);
  assert.match(panels,/id:orderId\(\)/);
  assert.match(panels,/\/api\/paper-orders/);
  assert.match(panels,/Paper trading only/);
  assert.doesNotMatch(panels,/\/api\/live-orders/);
});
