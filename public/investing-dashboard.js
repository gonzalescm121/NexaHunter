(()=>{
  const CRYPTO=new Set(['BTC','ETH','SOL','DOGE','XRP','ADA','AVAX','LTC','XCN','BCH','LINK','DOT','MATIC','SHIB']);
  const $=id=>document.getElementById(id);
  const money=v=>Number.isFinite(Number(v))?'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
  const qty=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:6}):'—';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const cryptoKey=s=>s.includes('/')?s:`${s}/USD`;
  const isCrypto=s=>CRYPTO.has(String(s).toUpperCase())||String(s).includes('/');
  const pct=v=>Number.isFinite(Number(v))?`${Number(v)>=0?'+':''}${Number(v).toFixed(2)}%`:'—';
  const dayStart=now=>new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const monthStart=now=>new Date(now.getFullYear(),now.getMonth(),1);
  const yearStart=now=>new Date(now.getFullYear(),0,1);

  function inject(){
    if($('investing-tab'))return;
    const anchor=document.querySelector('.dashboard')||document.querySelector('.main-area');
    if(!anchor)return;
    const section=document.createElement('section');
    section.id='investing-tab'; section.className='investing-tab'; section.hidden=true;
    section.innerHTML=`<div class="investing-head"><div><span class="paper-only-badge">PAPER TRADING ONLY</span><h2>Investing</h2><p>Your connected paper portfolio</p></div><button type="button" id="investing-close" aria-label="Close investing">×</button></div><div id="investing-status" class="investing-status">Loading portfolio…</div><div class="investing-cards"><article><span>Cash available</span><strong id="investing-cash">—</strong><small>Available for paper trading</small></article><article><span>Invested value</span><strong id="investing-value">—</strong><small>Current market value</small></article><article><span>Total account value</span><strong id="investing-total">—</strong><small>Cash + investments</small></article></div><section class="investing-section"><div class="investing-section-head"><h3>Actual investments</h3><button type="button" id="investing-refresh">Refresh</button></div><div id="investing-holdings" class="investing-holdings"></div></section><section class="investing-section"><div class="investing-section-head"><h3>Realized profit &amp; loss</h3><span>Paper fills only</span></div><div class="investing-pnl"><article><span>Today</span><b id="pnl-day">—</b></article><article><span>This month</span><b id="pnl-month">—</b></article><article><span>Year to date</span><b id="pnl-year">—</b></article></div></section><section class="investing-section"><div class="investing-section-head"><h3>Recent activity</h3></div><div id="investing-orders" class="investing-orders"></div></section></section>`;
    anchor.parentNode.insertBefore(section,anchor);
    $('investing-close').addEventListener('click',close);
    $('investing-refresh').addEventListener('click',load);
  }

  function close(){const el=$('investing-tab');if(el)el.hidden=true;history.replaceState(null,'','#home');}
  function open(){inject();const el=$('investing-tab');if(!el)return;el.hidden=false;load();el.scrollIntoView({behavior:'smooth',block:'start'});}

  async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`Request failed: ${r.status}`);return r.json();}

  function realized(orders){
    const avg=new Map(),out={day:0,month:0,year:0};
    const now=new Date(), starts={day:dayStart(now),month:monthStart(now),year:yearStart(now)};
    [...orders].reverse().forEach(o=>{
      if(String(o.status)!=='FILLED_PAPER'||String(o.mode)!=='PAPER')return;
      const s=String(o.symbol||'').toUpperCase(),q=Number(o.quantity),p=Number(o.price);if(!s||!Number.isFinite(q)||!Number.isFinite(p)||q<=0||p<=0)return;
      const a=avg.get(s)||{qty:0,cost:0};
      if(String(o.side).toUpperCase()==='BUY'){
        a.cost+=q*p;a.qty+=q;avg.set(s,a);
      }else if(String(o.side).toUpperCase()==='SELL'){
        const sold=Math.min(q,a.qty),basis=a.qty?sold*(a.cost/a.qty):0,profit=sold*p-basis;
        a.qty=Math.max(0,a.qty-sold);a.cost=Math.max(0,a.cost-basis);if(a.qty)avg.set(s,a);else avg.delete(s);
        const t=new Date(o.timestamp);if(Number.isNaN(t.getTime()))return;
        if(t>=starts.day)out.day+=profit;if(t>=starts.month)out.month+=profit;if(t>=starts.year)out.year+=profit;
      }
    });
    return out;
  }

  async function prices(symbols){
    if(!symbols.length)return {};
    const stocks=symbols.filter(s=>!isCrypto(s));
    const cryptos=symbols.filter(isCrypto).map(cryptoKey);
    const parts=[];
    if(stocks.length)parts.push(`symbols=${encodeURIComponent(stocks.join(','))}`);
    if(cryptos.length)parts.push(`crypto=${encodeURIComponent(cryptos.join(','))}`);
    if(!parts.length)return {};
    const d=await json('/api/market/snapshot?'+parts.join('&'));
    const out={};
    for(const s of stocks){const x=d.stocks?.[s];const p=Number(x?.latestTrade?.p??x?.dailyBar?.c);if(Number.isFinite(p))out[s]={price:p,source:'stock'};}
    for(const s of cryptos){const x=d.crypto?.[s];const p=Number(x?.latestTrade?.p??x?.dailyBar?.c);if(Number.isFinite(p))out[s.replace('/USD','')||s]={price:p,source:'crypto'};}
    return out;
  }

  function render(data,quotes){
    const positions=data.positions||{},details=data.positionDetails||{},symbols=Object.keys(positions);
    let invested=0;
    const rows=symbols.map(s=>{
      const q=Number(positions[s]);const d=details[s]||{};const avg=Number(d.avgPrice);const quote=quotes[s]?.price;const value=Number.isFinite(quote)?q*quote:NaN;const cost=Number.isFinite(avg)?q*avg:NaN;const unreal=Number.isFinite(value)&&Number.isFinite(cost)?value-cost:NaN;invested+=Number.isFinite(value)?value:0;
      return `<div class="investing-row"><div><b>${esc(s)}</b><small>${isCrypto(s)?'Crypto':'Stock'} · ${qty(q)} ${isCrypto(s)?'units':'shares'}</small></div><div><span>Avg. cost</span><b>${money(avg)}</b></div><div><span>Market value</span><b>${money(value)}</b></div><div class="${unreal>=0?'gain':'negative'}"><span>Unrealized</span><b>${money(unreal)}</b></div></div>`;
    }).join('');
    $('investing-cash').textContent=money(data.cash);$('investing-value').textContent=money(invested);$('investing-total').textContent=money(Number(data.cash)+invested);
    const pnl=realized(data.orders||[]);for(const [id,v] of Object.entries({day:pnl.day,month:pnl.month,year:pnl.year})){$('pnl-'+id).textContent=money(v);$('pnl-'+id).classList.toggle('gain',v>=0);$('pnl-'+id).classList.toggle('negative',v<0)}
    $('investing-holdings').innerHTML=rows||'<div class="investing-empty">No current investments. Your paper cash is available for trading.</div>';
    const orders=(data.orders||[]).slice(0,10);$('investing-orders').innerHTML=orders.length?orders.map(o=>`<div class="investing-order"><b>${esc(o.side)} ${esc(o.symbol)}</b><span>${qty(o.quantity)} @ ${money(o.price)}</span><small>${o.timestamp?new Date(o.timestamp).toLocaleString():''} · PAPER FILLED</small></div>`).join(''):'<div class="investing-empty">No paper orders yet.</div>';
    $('investing-status').textContent=`Updated ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} · ${symbols.length} open position${symbols.length===1?'':'s'}`;
  }

  async function load(){
    inject();const status=$('investing-status');if(status)status.textContent='Loading portfolio…';
    try{const data=await json('/api/portfolio');const symbols=Object.keys(data.positions||{});const quotes=await prices(symbols);render(data,quotes);}catch(e){if(status)status.textContent='Portfolio data is temporarily unavailable. Try Refresh.';if($('investing-holdings'))$('investing-holdings').innerHTML='<div class="investing-empty">Unable to load the connected paper portfolio.</div>';}
  }

  window.NexaHunterInvesting={open,close,refresh:load};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
})();
