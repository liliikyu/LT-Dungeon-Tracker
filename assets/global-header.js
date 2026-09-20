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

  // Treat Fields / Dungeons / Titles as the three primary tracker tabs.
  // They remain real URLs for refresh/back-button reliability, while same-origin
  // cross-document view transitions and prefetching make switching feel tab-like.
  const trackerTabFiles=new Set(["fields.html","dungeons.html","titles.html"]);
  const trackerTabLinks=[...document.querySelectorAll(".site-nav-link")].filter((link)=>{
    try{
      const url=new URL(link.href,location.href);
      return url.origin===location.origin && trackerTabFiles.has(url.pathname.split("/").pop());
    }catch{return false;}
  });
  const nav=trackerTabLinks[0]?.closest(".site-nav");
  if(nav) nav.setAttribute("role","tablist");
  trackerTabLinks.forEach((link)=>{
    link.setAttribute("role","tab");
    link.setAttribute("aria-selected",link.classList.contains("active")?"true":"false");
    const url=new URL(link.href,location.href);
    if(url.pathname!==location.pathname){
      const prefetch=document.createElement("link");
      prefetch.rel="prefetch";
      prefetch.href=url.href;
      document.head.appendChild(prefetch);
    }
  });

  // Dungeon Conquest Preview is presented as a site-native popup rather than
  // navigating away from the tracker page.
  const previewLinks=[...document.querySelectorAll('a[href$="conquest-preview.html"]')];
  if(!previewLinks.length) return;

  const overlay=document.createElement("div");
  overlay.className="conquest-modal-overlay hidden";
  overlay.setAttribute("aria-hidden","true");
  overlay.innerHTML=`
    <section class="conquest-modal" role="dialog" aria-modal="true" aria-labelledby="conquest-modal-title">
      <header class="conquest-modal-topbar">
        <div class="conquest-modal-brand">
          <img src="assets/favicon-purple.png?v=13.9.4.31" alt="" aria-hidden="true">
          <span><strong>Dungeon Conquest Preview</strong><small>SHINING · Light of the Soul</small></span>
        </div>
        <button class="icon-button conquest-modal-close" type="button" aria-label="Close Dungeon Conquest Preview" title="Close">×</button>
      </header>
      <div class="conquest-modal-site">
        <header class="conquest-preview-hero conquest-modal-hero">
          <span class="conquest-preview-kicker">SHINING · Light of the Soul</span>
          <h1 id="conquest-modal-title">Dungeon Conquest Preview</h1>
          <p>English translation of the Korean LaTale update notice describing the upcoming Dungeon Conquest system.</p>
        </header>
        <div class="conquest-preview-content conquest-modal-content">
          <h2>Dungeon Conquest System Added</h2>
          <img class="conquest-preview-image" src="https://static.latale.com/latale/Contents/2026/06/2026062414120772065.PNG" alt="Korean LaTale Dungeon Conquest interface preview">
          <ul>
            <li>This system grants stats to characters on your account when a dungeon is cleared.</li>
            <li>In the Dungeon Information UI, you can check each dungeon's Dungeon Conquest effects and the total options you have obtained.</li>
            <li>The Dungeon Conquest filter lets you view conquered and unconquered dungeons.</li>
            <li>When the update went live, conquest status was determined based on whether each dungeon reward had already been claimed in the Guidebook.</li>
          </ul>
          <h2>Stats and effects transferred to Dungeon Conquest</h2>
          <ul>
            <li>Item Codex stats were transferred to Dungeon Conquest and removed from the Item Codex.</li>
            <li>Engraving stats were transferred to Dungeon Conquest and removed.</li>
            <li>Item Drop Rate stats on combat equipment were transferred to Dungeon Conquest.</li>
            <li>Ely Gain stats on some equipment were transferred to Dungeon Conquest and removed.</li>
            <li>Effects from some food items, Title Codex entries, content skills, Trait skills, and related systems were transferred to Dungeon Conquest and removed.</li>
          </ul>
          <div class="conquest-preview-note">This is a translation of the Korean update notice. Final English terminology may differ when the feature is officially localized.</div>
          <div class="conquest-preview-source"><a href="https://www.latale.com/news/notice/view/3705?category=3&amp;page=1" target="_blank" rel="noopener noreferrer">Read more on the official LaTale notice ↗</a></div>
        </div>
      </div>
    </section>`;
  document.body.appendChild(overlay);
  const close=overlay.querySelector(".conquest-modal-close");
  let returnFocus=null;
  const openModal=(trigger)=>{
    returnFocus=trigger||document.activeElement;
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden","false");
    document.body.classList.add("conquest-modal-open");
    requestAnimationFrame(()=>close?.focus());
  };
  const closeModal=()=>{
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden","true");
    document.body.classList.remove("conquest-modal-open");
    returnFocus?.focus?.();
  };
  previewLinks.forEach(link=>link.addEventListener("click",e=>{e.preventDefault();openModal(link)}));
  close?.addEventListener("click",closeModal);
  overlay.addEventListener("click",e=>{if(e.target===overlay)closeModal()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.classList.contains("hidden"))closeModal()});
})();
