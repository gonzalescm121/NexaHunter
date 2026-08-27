(()=>{
  const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const modal=(title,body,actions)=>window.NexaHunter?.modal?.(title,body,actions);
  async function json(url){const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||`Request failed: ${r.status}`);return d}
  async function portfolio(){
    try{
      const d=await json('/api/portfolio');
      const positions=Object.entries(d.positions||{});
      const orders=Array.isArray(d.orders)?d.orders:[];
      const rows=positions.length?positions.map(([s,p])=>{const x=p&&typeof p==='object'?p:{quantity:p};const qty=x.quantity??x.qty??'—';return `<div>${esc(s)}</div><div>${esc(qty)}</div><div>Paper position</div>`}).join(''):'<div class="nh-note" style="grid-column:1/-1">No paper positions yet. Place a paper order to create one.</div>';
      const buying=Number.isFinite(Number(d.buyingPower))?d.buyingPower:d.cash;
      modal('My Positions',`<div class="nh-table"><div>Symbol</div><div>Quantity</div><div>Status</div>${rows}</div><div class="nh-note">Paper account · ${orders.length} persisted order${orders.length===1?'':'s'} · Buying power $${money(buying)}</div>`);
    }catch{modal('My Positions','<div class="nh-note">Portfolio data is temporarily unavailable. Try again when the connected paper account responds.</div>')}
  }
  async function performance(){
    try{
      const d=await json('/api/portfolio');
      const orders=Array.isArray(d.orders)?d.orders:[];
      const cash=money(d.cash),buying=money(d.buyingPower??d.cash),count=Object.keys(d.positions||{}).length;
      modal('Performance',`<div class="nh-metrics"><b>$${cash}<small>Paper Cash</small></b><b>$${buying}<small>Buying Power</small></b><b>${count}<small>Positions</small></b></div><div class="nh-note">Calculated from the connected persistent paper portfolio. ${orders.length} persisted order${orders.length===1?'':'s'}.</div>`);
    }catch{modal('Performance','<div class="nh-note">Performance data is temporarily unavailable.</div>')}
  }
  async function intelligence(){
    try{
      const d=await json('/api/intelligence?symbols=AAPL,NVDA,TSLA,AMZN,AMD,PLTR,CRWD');
      return {d,strongest:d.strongest,alerts:Array.isArray(d.alerts)?d.alerts:[],movers:Array.isArray(d.movers)?d.movers:[]};
    }catch{return {d:null,strongest:null,alerts:[],movers:[]}}
  }
  async function alerts(){
    const {alerts:items}=await intelligence();
    modal('Alert Center',items.length?items.map(x=>`<div class="nh-alert"><b>${esc(x.symbol)}</b><span>${esc(x.message)}</span><em>${esc(x.type)}</em></div>`).join(''):'<div class="nh-note">No current connected alerts.</div>');
  }
  async function ai(){
    const {strongest}=await intelligence();
    if(!strongest){modal('NexaAI Analysis','<div class="nh-note">Live intelligence is temporarily unavailable.</div>');return}
    const s=strongest.signal||{};
    modal('NexaAI Analysis',`<strong>${esc(strongest.symbol)} — ${esc(s.label||'Signal')}</strong><div class="nh-metrics"><b>${Number.isFinite(Number(s.confidence))?esc(s.confidence)+'%':'—'}<small>AI confidence</small></b><b>${s.price===null?'—':'$'+money(s.price)}<small>Live price</small></b><b>${Number.isFinite(Number(s.changePercent))?((s.changePercent>=0?'+':'')+Number(s.changePercent).toFixed(2)+'%'):'—'}<small>Daily change</small></b></div><div class="nh-note">Signal is calculated from connected market snapshot momentum and volume. It is analytical information, not financial advice.</div>`);
  }
  async function screener(mode='gainers'){
    const {movers}=await intelligence();
    const normalized=String(mode).toLowerCase();
    const rows=[...movers].filter(x=>x&&x.signal).sort((a,b)=>{
      if(normalized==='volume')return Number(b.signal.volume??b.volume??0)-Number(a.signal.volume??a.volume??0);
      return Number(b.signal.changePercent??-Infinity)-Number(a.signal.changePercent??-Infinity);
    });
    if(normalized==='losers')rows.reverse();
    const usable=rows.filter(x=>normalized==='volume'?Number.isFinite(Number(x.signal.volume??x.volume)):Number.isFinite(Number(x.signal.changePercent)));
    const body=usable.length?usable.slice(0,8).map(x=>{
      const s=x.signal||{}, change=Number(s.changePercent), volume=Number(s.volume??x.volume);
      if(normalized==='volume')return `<div class="nh-screener-row"><b>${esc(x.symbol)}</b><span>Volume</span><em>${Number.isFinite(volume)?volume.toLocaleString():'—'}</em></div>`;
      return `<div class="nh-screener-row"><b>${esc(x.symbol)}</b><span>${s.price===null?'—':'$'+money(s.price)}</span><em class="${change>=0?'gain':'negative'}">${Number.isFinite(change)?((change>=0?'+':'')+change.toFixed(2)+'%'):'—'}</em></div>`;
    }).join(''):'<div class="nh-note">Connected screener data is unavailable for this category right now.</div>';
    const label=normalized==='volume'?'Volume':normalized==='losers'?'Losers':'Gainers';
    modal('Market Screener — '+label,body,'<button type="button" class="blue-btn" id="nh-screener-close">Close</button>')?.querySelector('#nh-screener-close')?.addEventListener('click',()=>document.querySelector('#nh-modal')?.remove());
  }
  function trade(){
    const body='<div class="nh-grid2"><label>Symbol<input id="nh-symbol" value="AAPL" maxlength="10" autocomplete="off"></label><label>Side<select id="nh-side"><option>BUY</option><option>SELL</option></select></label><label>Quantity<input id="nh-qty" type="number" min="1" step="1" value="1"></label><label>Live Price<input id="nh-price" type="number" min="0.01" step="0.01" placeholder="Loading quote…" readonly></label></div><div id="nh-quote-state" class="nh-note" aria-live="polite">Loading a connected market quote…</div><div class="nh-note">Paper trading only. The order price is taken from the connected market snapshot; no live brokerage order will be submitted.</div><div id="nh-trade-result" class="nh-result" hidden></div>';
    const m=modal('Paper Trade',body,'<button class="blue-btn" id="nh-submit" disabled>Loading quote…</button>');
    const symbolInput=m.querySelector('#nh-symbol'),priceInput=m.querySelector('#nh-price'),quoteState=m.querySelector('#nh-quote-state'),submit=m.querySelector('#nh-submit');
    let quoteRequest=0,liveQuote=null;
    const loadQuote=async()=>{
      const requestId=++quoteRequest;
      const symbol=symbolInput.value.trim().toUpperCase();
      submit.disabled=true;submit.textContent='Loading quote…';priceInput.value='';priceInput.placeholder='Loading quote…';liveQuote=null;
      if(!symbol){quoteState.textContent='Enter a symbol to load a connected quote.';return}
      quoteState.textContent=`Loading connected ${symbol} quote…`;
      try{
        const d=await json(`/api/market/snapshot?symbols=${encodeURIComponent(symbol)}`);
        if(requestId!==quoteRequest)return;
        const q=d?.stocks?.[symbol];
        const price=Number(q?.price??q?.last??q?.close);
        if(!q||!Number.isFinite(price)||price<=0)throw Error(`No live quote available for ${symbol}`);
        liveQuote={symbol,price};priceInput.value=price.toFixed(2);priceInput.placeholder='';quoteState.textContent=`Connected quote · ${symbol} · $${money(price)}`;submit.disabled=false;submit.textContent='Place Paper Order';
      }catch(e){
        if(requestId!==quoteRequest)return;
        quoteState.textContent=`Quote unavailable: ${e.message}. Order submission is disabled until a connected quote is available.`;submit.disabled=true;submit.textContent='Waiting for quote';
      }
    };
    let debounce;
    symbolInput.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(loadQuote,350)});
    loadQuote();
    submit.onclick=async()=>{
      submit.disabled=true;
      try{
        const symbol=symbolInput.value.trim().toUpperCase(),quantity=Number(m.querySelector('#nh-qty').value);
        if(!liveQuote||liveQuote.symbol!==symbol)throw Error('Refresh the connected quote before placing the paper order');
        if(!Number.isFinite(quantity)||quantity<=0)throw Error('Enter a valid quantity');
        const order={id:globalThis.crypto?.randomUUID?.()||`paper-${Date.now()}`,symbol,side:m.querySelector('#nh-side').value,quantity,price:liveQuote.price,assetType:'STOCK'};
        const r=await fetch('/api/paper-orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(order)});const d=await r.json();if(!r.ok||d.accepted===false)throw Error(d.error||'Order rejected');
        m.querySelector('#nh-trade-result').hidden=false;m.querySelector('#nh-trade-result').innerHTML='<b>FILLED — PAPER</b><br>'+esc(order.side)+' '+esc(order.quantity)+' '+esc(order.symbol)+' @ $'+money(order.price)+'<br><small>Live execution: false</small>';submit.textContent='Done';submit.disabled=false;submit.onclick=()=>m.remove();
      }catch(e){submit.disabled=false;submit.textContent='Place Paper Order';const t=document.querySelector('#toast');if(t){t.textContent=e.message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}}
    };
  }
  function override(){
    if(!window.NexaHunter)return;
    const original=window.NexaHunter.openPanel;
    window.NexaHunter.openPanel=async name=>{if(name==='My Positions')return portfolio();if(name==='Performance')return performance();if(name==='Alerts')return alerts();if(name==='NexaAI Analysis')return ai();if(name==='NexaHunter Pro')return original(name);if(name==='Trade')return trade();return original(name)};
    window.NexaHunter.openScreener=mode=>screener(mode);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(override,0),{once:true});else setTimeout(override,0);
})();
