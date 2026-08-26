(()=>{
  const money=v=>Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const modal=(title,body,actions)=>window.NexaHunter?.modal?.(title,body,actions);
  async function json(url){const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||`Request failed: ${r.status}`);return d}
  async function portfolio(){
    try{
      const d=await json('/api/portfolio');
      const positions=Object.entries(d.positions||{});
      const orders=d.orders||[];
      const value=Number(d.cash);
      const rows=positions.length?positions.map(([s,q])=>`<div>${esc(s)}</div><div>${esc(q)}</div><div>Paper position</div>`).join(''):'<div class="nh-note" style="grid-column:1/-1">No paper positions yet. Place a paper order to create one.</div>';
      modal('My Positions',`<div class="nh-table"><div>Symbol</div><div>Quantity</div><div>Status</div>${rows}</div><div class="nh-note">Paper account · ${orders.length} persisted order${orders.length===1?'':'s'} · Buying power $${money(d.buyingPower??d.cash)}</div>`);
    }catch{modal('My Positions','<div class="nh-note">Portfolio data is temporarily unavailable. Try again when the connected paper account responds.</div>')}
  }
  async function performance(){
    try{
      const d=await json('/api/portfolio');
      const orders=d.orders||[];
      modal('Performance',`<div class="nh-metrics"><b>$${money(d.cash)}<small>Paper Cash</small></b><b>$${money(d.buyingPower??d.cash)}<small>Buying Power</small></b><b>${Object.keys(d.positions||{}).length}<small>Positions</small></b></div><div class="nh-note">Calculated from the connected persistent paper portfolio. ${orders.length} persisted order${orders.length===1?'':'s'}.</div>`);
    }catch{modal('Performance','<div class="nh-note">Performance data is temporarily unavailable.</div>')}
  }
  async function intelligence(){
    try{
      const d=await json('/api/intelligence?symbols=AAPL,NVDA,TSLA,AMZN,AMD,PLTR,CRWD');
      const strongest=d.strongest;
      const alerts=d.alerts||[];
      const rows=(d.movers||[]).slice(0,8).map(x=>`<div class="nh-screener-row"><b>${esc(x.symbol)}</b><span>${x.signal.price===null?'—':'$'+money(x.signal.price)}</span><em class="${(x.signal.changePercent||0)>=0?'gain':'negative'}">${Number.isFinite(x.signal.changePercent)?((x.signal.changePercent>=0?'+':'')+x.signal.changePercent.toFixed(2)+'%'):'—'}</em></div>`).join('');
      return {d,strongest,alerts,rows};
    }catch{return {d:null,strongest:null,alerts:[],rows:''}}
  }
  async function alerts(){
    const {alerts:items}=await intelligence();
    modal('Alert Center',items.length?items.map(x=>`<div class="nh-alert"><b>${esc(x.symbol)}</b><span>${esc(x.message)}</span><em>${esc(x.type)}</em></div>`).join(''):'<div class="nh-note">No current connected alerts.</div>');
  }
  async function ai(){
    const {strongest}=await intelligence();
    if(!strongest){modal('NexaAI Analysis','<div class="nh-note">Live intelligence is temporarily unavailable.</div>');return}
    const s=strongest.signal;
    modal('NexaAI Analysis',`<strong>${esc(strongest.symbol)} — ${esc(s.label)}</strong><div class="nh-metrics"><b>${esc(s.confidence)}%<small>AI confidence</small></b><b>${s.price===null?'—':'$'+money(s.price)}<small>Live price</small></b><b>${Number.isFinite(s.changePercent)?((s.changePercent>=0?'+':'')+s.changePercent.toFixed(2)+'%'):'—'}<small>Daily change</small></b></div><div class="nh-note">Signal is calculated from connected market snapshot momentum and volume. It is analytical information, not financial advice.</div>`);
  }
  async function screener(mode){
    const {rows}=await intelligence();
    modal('Market Screener — '+esc(mode),rows||'<div class="nh-note">Live screener data is temporarily unavailable.</div>');
  }
  function trade(){
    const body='<div class="nh-grid2"><label>Symbol<input id="nh-symbol" value="AAPL" maxlength="10"></label><label>Side<select id="nh-side"><option>BUY</option><option>SELL</option></select></label><label>Quantity<input id="nh-qty" type="number" min="1" step="1" value="1"></label><label>Limit Price<input id="nh-price" type="number" min="0.01" step="0.01" placeholder="Live price required"></label></div><div class="nh-note">Paper trading only. Enter a live price returned by the market feed. No live brokerage order will be submitted.</div><div id="nh-trade-result" class="nh-result" hidden></div>';
    const m=modal('Paper Trade',body,'<button class="blue-btn" id="nh-submit">Place Paper Order</button>');
    m.querySelector('#nh-submit').onclick=async()=>{const button=m.querySelector('#nh-submit');button.disabled=true;try{const symbol=m.querySelector('#nh-symbol').value.trim().toUpperCase(),price=Number(m.querySelector('#nh-price').value),quantity=Number(m.querySelector('#nh-qty').value);if(!symbol||!Number.isFinite(price)||price<=0||!Number.isFinite(quantity)||quantity<=0)throw Error('Enter a valid symbol, live price and quantity');const order={id:globalThis.crypto?.randomUUID?.()||`paper-${Date.now()}`,symbol,side:m.querySelector('#nh-side').value,quantity,price,assetType:'STOCK'};const r=await fetch('/api/paper-orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(order)});const d=await r.json();if(!r.ok||d.accepted===false)throw Error(d.error||'Order rejected');m.querySelector('#nh-trade-result').hidden=false;m.querySelector('#nh-trade-result').innerHTML='<b>FILLED — PAPER</b><br>'+esc(order.side)+' '+esc(order.quantity)+' '+esc(order.symbol)+' @ $'+money(order.price)+'<br><small>Live execution: false</small>';button.textContent='Done';button.disabled=false;button.onclick=()=>m.remove()}catch(e){button.disabled=false;const t=document.querySelector('#toast');if(t){t.textContent=e.message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}}};
  }
  function override(){
    if(!window.NexaHunter)return;
    const original=window.NexaHunter.openPanel;
    window.NexaHunter.openPanel=async name=>{
      if(name==='My Positions')return portfolio();
      if(name==='Performance')return performance();
      if(name==='Alerts')return alerts();
      if(name==='NexaAI Analysis')return ai();
      if(name==='NexaHunter Pro')return original(name);
      if(name==='Trade')return trade();
      return original(name);
    };
    window.NexaHunter.openScreener=mode=>screener(mode);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(override,0),{once:true});else setTimeout(override,0);
})();
