(()=>{
  const KEY="lt-dungeon-conquest-mode-v1";
  const toggle=document.getElementById("conquest-mode-toggle");
  const read=()=>{try{return localStorage.getItem(KEY)==="1"}catch{return false}};
  const apply=(enabled,emit=false)=>{
    document.body.classList.toggle("conquest-mode-active",enabled);
    if(toggle) toggle.checked=enabled;
    if(emit) window.dispatchEvent(new CustomEvent("latale:conquest-mode-change",{detail:{enabled}}));
  };
  apply(read());
  toggle?.addEventListener("change",()=>{
    const enabled=toggle.checked;
    try{localStorage.setItem(KEY,enabled?"1":"0")}catch{}
    apply(enabled,true);
  });
  window.addEventListener("storage",e=>{if(e.key===KEY)apply(read(),true)});
})();
