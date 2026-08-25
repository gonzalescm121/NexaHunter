(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const text=e=>(e?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  const toast=m=>{if(typeof window.toast==='function')return window.toast(m);let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=m;t.classList.add('show');clearTimeout(window.__nhInteractionToast);window.__nhInteractionToast=setTimeout(()=>t.classList.remove('show'),2200)};
  const panel=n=>window.NexaHunter?.openPanel?.(n);
  function addSymbol(){
    const m=window.NexaHunter?.modal?.('Add Symbol','<label>Symbol<input id="nh-add-symbol" maxlength="10" placeholder="AAPL, NVDA, BTC"></label><div class="nh-note">Searches the connected market-data feed. The symbol is added to the Markets/Watchlist view only after a live result is found.</div>','<button type="button" class="blue-btn" id="nh-add-symbol-submit">Add Symbol</button>');
    if(!m)return;
    const input=m.querySelector('#nh-add-symbol'); input?.focus();
    m.querySelector('#nh-add-symbol-submit').onclick=async()=>{
      const value=input.value.trim().toUpperCase(); if(!value)return toast('Enter a symbol');
      const search=$('#global-search'); if(search){search.value=value;search.dispatchEvent(new Event('input',{bubbles:true}));search.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));m.remove();return;}
      m.querySelector('#nh-add-symbol-submit').disabled=true; toast(`Looking up ${value}…`); m.remove();
    };
  }
  function footerModal(kind){
    const content={
      terms:['Terms','NexaHunter is a paper-trading and market-analysis interface. Orders submitted through this application are simulated paper orders. Market information may be delayed or unavailable. Use of the application is subject to applicable laws and platform policies.'],
      privacy:['Privacy','NexaHunter should only use account and market information required to provide the requested features. Sensitive brokerage credentials must remain server-side and must never be placed in browser code.'],
      support:['Support','Need help? Use the NexaHunter support channel configured for this deployment. Include the page, feature, and approximate time of the problem so it can be reproduced.']
    }[kind];
    if(content)window.NexaHunter?.modal?.(content[0],`<div class="nh-note">${content[1]}</div>`,'<button type="button" class="blue-btn" id="nh-support-close">Close</button>')?.querySelector('#nh-support-close')?.addEventListener('click',()=>$('#nh-modal')?.remove());
  }
  function aiDot(index, dots){
    const symbols=['NVDA','AAPL','TSLA']; const names=['NVIDIA Corporation','Apple Inc.','Tesla'];
    const prices=['—','—','—']; const changes=['—','—','—'];
    const root=dots?.closest('.ai-panel,.panel,.right-column')||document;
    const symbol=$('.ai-symbol strong',root); const company=$('.ai-symbol small',root); const price=$('.ai-price',root); const gain=$('.ai-symbol .gain',root);
    if(symbol)symbol.textContent=symbols[index]; if(company)company.textContent=names[index]; if(price)price.textContent=prices[index]; if(gain)gain.textContent=changes[index];
    $$('.carousel-dots i,.carousel-dots b',dots?.parentElement||root).forEach((d,i)=>{d.classList.toggle('active',i===index);d.setAttribute('aria-current',i===index?'true':'false')});
    dots?.parentElement?.querySelectorAll?.('[data-slide]')?.forEach(d=>d.hidden=Number(d.dataset.slide)!==index);
  }
  function wireDots(){
    $$('.carousel-dots i,.carousel-dots b').forEach((d,i)=>{if(d.dataset.interactionWired)return;d.dataset.interactionWired='true';d.setAttribute('role','button');d.setAttribute('tabindex','0');d.setAttribute('aria-label',`AI analysis ${i+1}`);d.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();aiDot(i,d)});d.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();aiDot(i,d)}})});
  }
  function wireExisting(){
    $$('button,a,[role="button"]').forEach(el=>{
      if(el.dataset.interactionFix)return;
      const t=text(el);
      let action=null;
      if(t==='view analysis')action='analysis';
      else if(t==='view all')action='notifications';
      else if(t==='gainers'||t==='losers'||t==='volume')action=`movers:${t}`;
      else if(t==='add symbol'||t.includes('add symbol'))action='add-symbol';
      else if(t==='my positions'||t==='view positions')action='positions';
      else if(t.includes('upgrade pro')||t==='upgrade')action='pro';
      else if(t==='terms')action='terms';
      else if(t==='privacy')action='privacy';
      else if(t==='support')action='support';
      if(!action)return;
      el.dataset.interactionFix=action; el.dataset.action=el.dataset.action||action;
      el.style.cursor='pointer'; el.setAttribute('role',el.getAttribute('role')||'button');
      el.addEventListener('click',e=>{
        e.preventDefault(); e.stopImmediatePropagation();
        if(action==='analysis')panel('NexaAI Analysis');
        else if(action==='notifications')panel('Alerts');
        else if(action==='positions')panel('My Positions');
        else if(action==='pro')panel('NexaHunter Pro');
        else if(action==='add-symbol')addSymbol();
        else if(action.startsWith('movers:')){const mode=action.split(':')[1];$$('.segmented button').forEach(b=>b.classList.toggle('active',text(b)===mode));window.NexaHunter?.openScreener?.(mode.charAt(0).toUpperCase()+mode.slice(1));}
        else footerModal(action);
      },true);
    });
    wireDots();
  }
  function init(){wireExisting();const observer=new MutationObserver(()=>wireExisting());observer.observe(document.body,{subtree:true,childList:true});window.__nexaInteractionFixes=true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
