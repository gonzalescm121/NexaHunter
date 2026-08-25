import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

const request = body => worker.fetch(new Request('https://nexahunter.test/api/paper-orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));

test('fractional crypto BUY is accepted as PAPER', async()=>{
  const response=await request({symbol:'BTC/USD',assetType:'CRYPTO',quantity:0.01,price:100000,side:'BUY'});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.accepted,true);
  assert.equal(data.order.assetType,'CRYPTO');
  assert.equal(data.order.quantity,0.01);
  assert.equal(data.order.mode,'PAPER');
  assert.equal(data.order.liveExecution,false);
});

test('fractional stock BUY remains rejected', async()=>{
  const response=await request({symbol:'AAPL',assetType:'STOCK',quantity:0.5,price:200,side:'BUY'});
  assert.equal(response.status,400);
});
