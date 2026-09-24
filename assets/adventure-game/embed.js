(() => {
  if(window.parent===window){location.replace('../../adventure-map.html');return;}
  const reportHeight=()=>parent.postMessage({type:'adventure:height',height:document.body.getBoundingClientRect().height},location.origin);
  new ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('load',reportHeight);
  reportHeight();
})();
