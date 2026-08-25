const assets=[
  ['AAPL','Apple','$227.16','+0.82%'],['MSFT','Microsoft','$504.26','+0.41%'],['NVDA','NVIDIA','$179.82','+1.27%'],['AMZN','Amazon','$230.56','+0.35%'],['GOOGL','Alphabet','$201.90','+0.62%'],['TSLA','Tesla','$329.25','-0.44%'],['SPY','S&P 500 ETF','$646.20','+0.28%'],['BTC/USD','Bitcoin','$116,400','+1.15%']
];
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
function renderMarkets(){
  $('market-list').innerHTML=assets.map(([symbol,name,price,change])=>`<div class="market-row"><div><span class="ticker">${escapeHtml(symbol)}</span><span class="company">${escapeHtml(name)}</span></div><span class="price">${escapeHtml(price)}</span><span class="change ${change.startsWith('-')?'negative-text':'positive-text'}">${escapeHtml(change)}</span></div>`).join('');
}
function addOrder(order){
  const list=$('order-list');
  if(list.classList.contains('orders-empty')){list.className='';list.innerHTML='';}
  const row=document.createElement('div');row.className='order-row';
  row.innerHTML=`<div><b>${escapeHtml(order.symbol)}</b><span class="order-meta">${escapeHtml(String(order.quantity))} shares @ $${escapeHtml(String(order.price))}</span></div><span class="${order.side==='BUY'?'side-buy':'side-sell'}">${escapeHtml(order.side)}</span><span class="order-meta">PAPER</span><span class="order-meta">Queued</span>`;
  list.prepend(row);
}
async function health(){
  try{const r=await fetch('/health',{cache:'no-store'});$('market-status').textContent=r.ok?'System online':'System issue';$('market-status').className=r.ok?'badge badge-safe':'badge';}catch{$('market-status').textContent='Offline';}
}
$('order-form').addEventListener('submit',async event=>{
  event.preventDefault();const message=$('order-message');const button=event.submitter;button.disabled=true;button.textContent='Validating…';
  const payload={symbol:$('symbol').value.trim().toUpperCase(),side:$('side').value,quantity:$('quantity').value,price:$('price').value};
  try{
    const response=await fetch('/api/paper-orders',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok){message.textContent=data.error||'Order rejected';message.style.color='var(--red)';return;}
    addOrder(data.order);message.textContent='Paper order accepted. No live trade was submitted.';message.style.color='var(--green)';
  }catch{message.textContent='Unable to reach NexaHunter server.';message.style.color='var(--red)';}
  finally{button.disabled=false;button.textContent='Queue paper order';}
});
document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>document.querySelector(button.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
renderMarkets();health();
