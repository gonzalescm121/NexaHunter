(()=>{
  document.addEventListener('click',event=>{
    if(event.target?.id!=='nh-save-settings')return;
    window.setTimeout(()=>{
      const seconds=Number(localStorage.getItem('nh.refresh')||15);
      window.dispatchEvent(new CustomEvent('nexa:settings-updated',{detail:{refreshSeconds:Number.isFinite(seconds)?seconds:15}}));
    },0);
  },true);
})();
