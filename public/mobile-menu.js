(()=>{
  const init=()=>{
    const button=document.getElementById('mobile-menu');
    const sidebar=document.getElementById('sidebar');
    if(!button||!sidebar)return;
    const setOpen=open=>{
      sidebar.classList.toggle('open',open);
      document.body.classList.toggle('mobile-nav-open',open);
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
    };
    // Direct listener: this remains functional even if another delegated router changes.
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      setOpen(!sidebar.classList.contains('open'));
    },false);
    sidebar.querySelectorAll('.nav-item').forEach(item=>{
      item.addEventListener('click',()=>setOpen(false),false);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&sidebar.classList.contains('open'))setOpen(false);
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
