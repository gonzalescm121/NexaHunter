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
    sidebar.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',close,false));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('open'))close();});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
