(()=>{
  const init=()=>{
    const button=document.getElementById('mobile-menu');
    const sidebar=document.getElementById('sidebar');
    if(!button||!sidebar)return;
    const close=()=>{
      sidebar.classList.remove('open');
      document.body.classList.remove('mobile-nav-open');
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-label','Open navigation menu');
    };
    const toggle=()=>{
      const open=!sidebar.classList.contains('open');
      sidebar.classList.toggle('open',open);
      document.body.classList.toggle('mobile-nav-open',open);
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
    };
    button.addEventListener('click',toggle,false);
    sidebar.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',close,false));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('open'))close();});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
