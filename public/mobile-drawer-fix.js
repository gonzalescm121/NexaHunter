(()=>{
  const close=()=>{const sidebar=document.getElementById('sidebar'),button=document.getElementById('mobile-menu');if(!sidebar?.classList.contains('open'))return;sidebar.classList.remove('open');button?.setAttribute('aria-expanded','false');button?.setAttribute('aria-label','Open menu');if(button)button.textContent='☰';document.documentElement.classList.remove('mobile-nav-open')};
  const init=()=>{document.addEventListener('click',e=>{if(window.innerWidth>900)return;const sidebar=document.getElementById('sidebar'),button=document.getElementById('mobile-menu');if(sidebar?.classList.contains('open')&&!sidebar.contains(e.target)&&!button?.contains(e.target))close()},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.innerWidth<=900)close()});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
