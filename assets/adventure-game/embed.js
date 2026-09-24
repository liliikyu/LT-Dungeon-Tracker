(() => {
  if(window.parent===window){location.replace('../../adventure-map.html');return;}
  // Share the surrounding tracker theme without changing its preferences.
  const themeRoot=window.parent.document.documentElement;
  const syncTheme=()=>{document.documentElement.dataset.theme=themeRoot.dataset.theme||'dark'};
  syncTheme();
  new MutationObserver(syncTheme).observe(themeRoot,{attributes:true,attributeFilter:['data-theme']});
  const reportHeight=()=>parent.postMessage({type:'adventure:height',height:document.body.getBoundingClientRect().height},location.origin);
  new ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('load',reportHeight);
  reportHeight();
})();
