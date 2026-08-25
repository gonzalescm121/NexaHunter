(()=>{
  const $=s=>document.querySelector(s);
  const money=v=>Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const id=()=>globalThis.crypto?.randomUUID?.()||`paper-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const toast=m=>{let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=m;t.classList.add('show');clearTimeout(window.__nhUniversalToast);window.__nhUniversalToast=setTimeout(()=>t.classList.remove('show'),2400)};
  const original=window.NexaHunter?.openPanel;
  const cryptoKey=s=>s.includes('/')?s:`${s}/USD`;
  async function lookup(symbol){
    const s=String(symbol||'').trim().toUpperCase();
    if(!/^[A-Z][A-Z0-9./-]{0,9}$/.test(s)) throw Error('Enter a valid ticker or crypto symbol');
    let r=await fetch(`/api/market/snapshot?symbols=${encodeURIComponent(s)}`,{cache:'no-store'});
    if(r.ok){const d=await r.json(),x=d.stocks?.[s];if(x){const p=Number(x.latestTrade?.p??x.dailyBar?.c);if(Number.isFinite(p))return {symbol:s,type:'stock',price:p,name:s,source:'stocks'};}}
    const key=cryptoKey(s);r=await fetch(`/api/market/snapshot?crypto=${encodeURIComponent(key)}`,{cache:'no-store'});
    if(r.ok){const d=await r.json(),x=d.crypto?.[key]||d.crypto?.[s];if(x){const p=Number(x.latestTrade?.p??x.dailyBar?.c);if(Number.isFinite(p))return {symbol:s.replace('/USD',''),type:'crypto',price:p,name:s,source:'crypto',providerSymbol:key};}}
    throw Error('Symbol is not available from the connected market-data feed');
  }
  async function openUniversalTrade(){
    if(!window.NexaHunter?.modal){return original?.('Trade')}
    const initial=$('#detail-symbol')?.textContent?.trim().toUpperCase()||'AAPL';
    const m=window.NexaHunter.modal('Paper Trade — Stocks & Crypto',`<div class="nh-grid2"><label>Symbol / Crypto<input id="universal-symbol" value="${initial}" maxlength="10" autocomplete="off"></label><label>Side<select id="universal-side"><option>BUY</option><option>SELL</option></select></label><label>Quantity<input id="universal-qty" type="number" min="0.000001" step="any" value="1"></label><label>Market Price<input id="universal-price" type="number" min="0.00000001" step="any" placeholder="Lookup symbol first"></label></div><div class="nh-note">All symbols available from the connected market-data feed can be looked up and paper traded. Stocks and crypto use the same validated BUY/SELL paper-order workflow. No live brokerage execution is available.</div><div id="universal-result" class="nh-result" hidden></div>`,`<button type="button" class="blue-btn" id="universal-lookup">Lookup Price</button><button type="button" class="blue-btn" id="universal-submit" disabled>Place Paper Order</button>`);
    const sym=$('#universal-symbol'),price=$('#universal-price'),lookupBtn=$('#universal-lookup'),submit=$('#universal-submit'),result=$('#universal-result');
    let selected=null;
    const doLookup=async()=>{lookupBtn.disabled=true;lookupBtn.textContent='Looking up…';try{selected=await lookup(sym.value);price.value=selected.price;result.hidden=false;result.innerHTML=`<b>${selected.symbol}</b> — ${selected.type==='crypto'?'CRYPTO':'STOCK'}<br>Live reference price: $${money(selected.price)}<br><small>Available for PAPER BUY / SELL</small>`;submit.disabled=false;toast(`Found ${selected.symbol}`)}catch(e){selected=null;submit.disabled=true;result.hidden=false;result.textContent=e.message;toast(e.message)}finally{lookupBtn.disabled=false;lookupBtn.textContent='Lookup Price'}};
    lookupBtn.onclick=doLookup;sym.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doLookup()}};
    submit.onclick=async()=>{if(!selected)return;const order={id:id(),symbol:selected.symbol,side:$('#universal-side').value,quantity:Number($('#universal-qty').value),price:Number(price.value),assetType:selected.type};submit.disabled=true;try{const r=await fetch('/api/paper-orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(order)});const d=await r.json();if(!r.ok||d.accepted===false){result.hidden=false;result.textContent=d.error||'Order rejected';submit.disabled=false;return}result.hidden=false;result.innerHTML=`<b>FILLED — PAPER</b><br>${order.side} ${order.quantity} ${order.symbol} @ $${money(order.price)}<br><small>${selected.type==='crypto'?'Crypto':'Stock'} • Live execution: false</small>`;submit.textContent='Done';submit.onclick=()=>m.remove();toast(`${order.side} ${order.symbol} paper order filled`)}catch{submit.disabled=false;toast('Paper order request failed')}};
    doLookup();
  }
  window.NexaHunterUniversalTrade={open:openUniversalTrade,lookup};
  if(window.NexaHunter){window.NexaHunter.openPanel=(name)=>name==='Trade'?openUniversalTrade():original?.(name)}
})();
