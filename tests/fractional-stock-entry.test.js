import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker-entry.js';

const context={access:{async getIdentity(){return {id:'fractional-stock-test-user',email:'test@nexahunter.local',name:'Paper Test User'};}}};
const request=body=>worker.fetch(new Request('https://nexahunter.test/api/paper-orders',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify(body)
}),{},context);

test('production entry accepts fractional stock paper orders',async()=>{
  const response=await request({symbol:'FRACSTK',quantity:0.25,price:200,side:'BUY',assetType:'STOCK'});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.accepted,true);
  assert.equal(data.order.quantity,0.25);
  assert.equal(data.order.mode,'PAPER');
  assert.equal(data.order.liveExecution,false);
});

test('production entry rejects zero or negative fractional quantities',async()=>{
  for(const quantity of [0,-0.25]){
    const response=await request({symbol:`BAD${Math.abs(quantity)}`.replace('.',''),quantity,price:200,side:'BUY',assetType:'STOCK'});
    assert.equal(response.status,400);
  }
});
