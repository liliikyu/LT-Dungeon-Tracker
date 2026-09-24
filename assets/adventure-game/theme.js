(() => {
 const KEY='lt-theme',valid=value=>['system','light','dark'].includes(value)?value:'system';
 const media=window.matchMedia('(prefers-color-scheme: light)');
 const read=()=>{try{return valid(localStorage.getItem(KEY))}catch{return 'system'}};
 let mode=read();
 function apply(){
  const resolved=mode==='system'?(media.matches?'light':'dark'):mode;
  document.documentElement.dataset.theme=resolved;document.documentElement.style.colorScheme=resolved;
  const button=document.getElementById('theme-toggle');if(!button)return;
  button.textContent=mode==='light'?'☀':mode==='dark'?'☾':'◐';
  const label=mode.charAt(0).toUpperCase()+mode.slice(1);
  button.title='Theme: '+label;button.setAttribute('aria-label','Theme: '+label+'. Click to switch theme.');
 }
 apply();
 document.addEventListener('DOMContentLoaded',()=>{
  apply();
  document.getElementById('theme-toggle')?.addEventListener('click',()=>{
   mode=mode==='system'?'light':mode==='light'?'dark':'system';
   try{localStorage.setItem(KEY,mode)}catch{}
   apply();
  });
 });
 media.addEventListener('change',()=>{if(mode==='system')apply()});
 window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){mode=read();apply()}});
})();
