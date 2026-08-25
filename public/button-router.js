(()=>{
  const $=id=>document.getElementById(id);
  const open=name=>window.NexaHunter?.openPanel?.(name);
  const route=(action,el)=>{
    switch(action){
      case 'mobile-menu':{
        if(typeof window.NexaHunterToggleMenu==='function'){
          window.NexaHunterToggleMenu();
          return true;
        }
        const sidebar=$('sidebar');
        const openState=sidebar?.classList.toggle('open')??false;
        document.body.classList.toggle('mobile-nav-open',openState);
        el.setAttribute('aria-expanded',String(openState));
        el.setAttribute('aria-label',openState?'Close navigation menu':'Open navigation menu');
        return true;
      }
      case 'analysis': open('NexaAI Analysis'); return true;
      case 'notifications': open('Alerts'); return true;
      case 'positions': open('My Positions'); return true;
      case 'trade': open('Trade'); return true;
      case 'backtest': open('Backtest'); return true;
      case 'performance': open('Performance'); return true;
      case 'explore': document.querySelector('#screener')?.scrollIntoView({behavior:'smooth',block:'start'}); return true;
      default:return false;
    }
  };
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-action]');
    if(!el)return;
    const action=el.getAttribute('data-action');
    if(!route(action,el))return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const el=e.target.closest('[data-action]');
    if(!el)return;
    if(route(el.getAttribute('data-action'),el)){e.preventDefault();e.stopImmediatePropagation()}
  },true);
})();
