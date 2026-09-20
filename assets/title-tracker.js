(() => {
  const D = window.LT_DATA || { titles: [] };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const THEME_KEY = "lt-theme";
  const TITLE_PROGRESS_KEY = "lt-title-progress-v1";
  const TITLE_VIEW_KEY = "lt-title-view-v1";
  const TITLE_SET_SCENARIOS = {
    "title_set_05":[
      {title:"Webfoot Octopus Pasta",source:"Field mob drop",type:"other"},
      {title:"Star Tree Carver",source:"Adventure exchange",type:"other"}
    ],
    "title_set_06":[
      {title:"Chunsik Bong",source:"Achievement from Chunsik Memorial conquest",type:"other"}
    ],
    "title_set_08":[
      {title:"Desert Adventurer",source:"Eastland Reputation Exchange",type:"other"},
      {title:"Archaeologist",source:"Sub Scenario Ch.3 Ep.4",type:"sub"}
    ],
    "title_set_09":[
      {title:"Goddess' Pet",source:"Sub Scenario Ch.3 Ep.8",type:"sub"},
      {title:"Monster Tree Climber",source:"Eastern Freios Reputation Exchange",type:"other"}
    ],
    "title_set_10":[
      {title:"Another Document",source:"Main Scenario Ch.3 Ep.5",type:"main"},
      {title:"The Power-Hungry One",source:"Sub Scenario Ch.3 Ep.15",type:"sub"},
      {title:"Trace of Glorious Magic",source:"Complete Zerenis Headquarters dungeon quests ×2 (Repeatable)",type:"quest"},
      {title:"Academy Helper",source:"Zerenis Headquarters material / Asma exchange",type:"other"}
    ],
    "title_set_11":[
      {title:"Darkness of Tartaros",source:"Main Scenario Ch.3 Ep.2",type:"main"},
      {title:"Undercity Construction Adventurer",source:"Eastland Reputation Exchange",type:"other"}
    ],
    "title_set_12":[
      {title:"Promise with Gaia",source:"Main Scenario Ch.3 Ep.4",type:"main"},
      {title:"Iris Anxiety",source:"Sub Scenario Ch.3 Ep.12",type:"sub"},
      {title:"Adrica Nightmare",source:"Complete Divine Tree Rapier dungeon quests from Medea in Kali ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_13":[
      {title:"Savior of the Ruins",source:"Main Scenario Ch.3 Ep.6",type:"main"},
      {title:"Shynic's Memory",source:"Sub Scenario Ch.3 Ep.20",type:"sub"},
      {title:"Happy Ending",source:"Complete Dream Oneiro dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_14":[
      {title:"Faith of the Sword Master",source:"Main Scenario Ch.3 Ep.7",type:"main"},
      {title:"Beyond the Oblivion",source:"Complete Oblivion Lake dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_15":[
      {title:"Atkina's Commitment",source:"Main Scenario Ch.3 Ep.8",type:"main"},
      {title:"Champion's Gathering",source:"Sub Scenario Ch.3 Ep.33",type:"sub"},
      {title:"Lack of Souls",source:"Complete Rosengarten dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_16":[
      {title:"Blessed By the Earth",source:"Main Scenario Ch.3 Ep.9",type:"main"},
      {title:"Iris Adventurer",source:"Sub Scenario Ch.3 Ep.37",type:"sub"},
      {title:"Overcoming the Despair",source:"Complete Promised Sanctuary dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_17":[
      {title:"Sea of Fog",source:"Main Scenario Ch.3 Ep.10",type:"main"},
      {title:"Echo of Lies",source:"Complete Spring of the Echo dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_18":[
      {title:"Alley of Chaos",source:"Main Scenario Ch.3 Ep.11",type:"main"},
      {title:"Before the Storm",source:"Sub Scenario Ch.3 Ep.47",type:"sub"},
      {title:"Rage Control",source:"Complete Acro Coffin dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_19":[
      {title:"Savior of Eastland",source:"Main Scenario Ch.3 Ep.12",type:"main"},
      {title:"The Judge",source:"Complete Purgatory Azrael dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_20":[
      {title:"Walking the Time",source:"Main Scenario Ch.3 Ep.13",type:"main"},
      {title:"New Tag Game",source:"Sub Scenario Ch.3 Ep.58",type:"sub"},
      {title:"Fragile Cat Paws",source:"Complete Kairos' Time dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_21":[
      {title:"The First Rehearsal",source:"Main Scenario Ch.1 Ep.1",type:"main"},
      {title:"Delivery Adventurer",source:"Sub Scenario Ch.4 Ep.3",type:"sub"},
      {title:"Main Character",source:"Complete Theater Eugamon dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_22":[
      {title:"Shadow of Orcarium",source:"Main Scenario Ch.1 Ep.2",type:"main"},
      {title:"The Light",source:"Complete Stump of Spirits dungeon quests ×2 (Repeatable)",type:"quest"},
      {title:"Increasing Beauty",source:"Challenge achievement: upgrade Ricaria Brooch to +30",type:"other"}
    ],
    "title_set_23":[
      {title:"Reverberation of Memory",source:"Main Scenario Ch.4 Ep.3",type:"main"},
      {title:"Witch Hunter",source:"Complete Twilight Cathedral dungeon quests ×2 (Repeatable)",type:"quest"}
    ],
    "title_set_26":[
      {title:"Vortex of Fate",source:"Main Scenario Ch.4 Ep.8",type:"main"},
      {title:"La Vita",source:"Main Scenario Ch.4 Ep.9",type:"main"}
    ],
    "title_set_27":[
      {title:"Good Luck",source:"Main Scenario Ch.4 Ep.10",type:"main"},
      {title:"Daydream",source:"Main Scenario Ch.4 Ep.11",type:"main"}
    ],
    "title_set_28":[
      {title:"Goodbye, Hello Again",source:"Main Scenario Ch.4 Ep.12",type:"main"},
      {title:"Ancient Wings",source:"Main Scenario Ch.4 Ep.13",type:"main"}
    ],
    "title_set_29":[
      {title:"Whisper of Deceit and Lies",source:"Main Scenario Ch.4 Ep.14",type:"main"}
    ]
  };


  function loadProgress(){
    try { const value = JSON.parse(localStorage.getItem(TITLE_PROGRESS_KEY) || "{}"); return value && typeof value === "object" ? value : {}; }
    catch { return {}; }
  }
  const progress = loadProgress();
  function saveProgress(){ localStorage.setItem(TITLE_PROGRESS_KEY, JSON.stringify(progress)); }
  function rowState(id){ return progress[id] || (progress[id] = { complete:false, current:[0,0,0] }); }

  function preferredTheme(){ return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; }
  function savedThemeMode(){ const x=localStorage.getItem(THEME_KEY); return ["system","light","dark"].includes(x) ? x : "system"; }
  function applyTheme(mode){
    const resolved=mode === "system" ? preferredTheme() : mode;
    document.documentElement.dataset.theme=resolved; document.documentElement.style.colorScheme=resolved;
    const button=$("theme-toggle"); if(!button) return;
    button.textContent=mode === "light" ? "☀" : mode === "dark" ? "☾" : "◐";
    const label=mode.charAt(0).toUpperCase()+mode.slice(1); button.title=`Theme: ${label}`; button.setAttribute("aria-label",`Theme: ${label}. Click to switch theme.`);
  }
  function cycleTheme(){ const c=savedThemeMode(); const n=c === "system" ? "light" : c === "light" ? "dark" : "system"; localStorage.setItem(THEME_KEY,n); applyTheme(n); }
  applyTheme(savedThemeMode()); $("theme-toggle")?.addEventListener("click",cycleTheme);

  const WELCOME_SESSION_KEY = "lt-welcome-seen-v1";
  const welcomeOverlay = $("welcome-overlay");
  const helpToggle = $("help-toggle");
  const welcomeClose = $("welcome-close");
  function openWelcomePopup(){
    if(!welcomeOverlay) return;
    welcomeOverlay.classList.remove("hidden");
    welcomeOverlay.setAttribute("aria-hidden","false");
    document.body.classList.add("welcome-open");
    requestAnimationFrame(()=>welcomeClose?.focus());
    try{ sessionStorage.setItem(WELCOME_SESSION_KEY,"1"); }catch{}
  }
  function closeWelcomePopup(){
    if(!welcomeOverlay) return;
    welcomeOverlay.classList.add("hidden");
    welcomeOverlay.setAttribute("aria-hidden","true");
    document.body.classList.remove("welcome-open");
    helpToggle?.focus();
  }
  helpToggle?.addEventListener("click",openWelcomePopup);
  welcomeClose?.addEventListener("click",closeWelcomePopup);
  welcomeOverlay?.addEventListener("click",(event)=>{ if(event.target===welcomeOverlay) closeWelcomePopup(); });
  document.addEventListener("keydown",(event)=>{ if(event.key==="Escape" && welcomeOverlay && !welcomeOverlay.classList.contains("hidden")) closeWelcomePopup(); });
  let welcomeSeen=false;
  try{ welcomeSeen=sessionStorage.getItem(WELCOME_SESSION_KEY)==="1"; }catch{}
  if(!welcomeSeen) openWelcomePopup();
  window.matchMedia?.("(prefers-color-scheme: light)")?.addEventListener?.("change",()=>{ if(savedThemeMode()==="system") applyTheme("system"); });

  function renderLastSync(){
    const el=$("last-sync"); if(!el) return; const raw=D.lastSyncedAt;
    if(!raw){el.textContent="Not available";return;} const date=new Date(raw);
    if(Number.isNaN(date.getTime())){el.textContent=String(raw);return;}
    el.dateTime=date.toISOString(); el.textContent=date.toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"});
  }

  function materialName(name){ return String(name || "").trim(); }
  function parseMaterial(name){
    const raw=materialName(name);
    const match=raw.match(/\s*\((Event|ETC|Equipment|Consume)\)\s*$/i);
    if(!match) return { name:raw, type:"" };
    const type=match[1].toLowerCase();
    return { name:raw.slice(0,match.index).trim(), type };
  }
  function materialTypeBadge(type){
    if(type === "event") return '<span class="material-type-badge event">Event</span>';
    if(type === "etc") return '<span class="material-type-badge etc">ETC</span>';
    if(type === "equipment") return '<span class="material-type-badge equipment">Equipment</span>';
    if(type === "consume") return '<span class="material-type-text">(Consume)</span>';
    return "";
  }
  function numericRequired(title){ const n=Number(title.amountRequired); return Number.isFinite(n) && n >= 0 ? n : null; }
  function specialRequirement(title){ const raw=String(title?.amountRequired ?? "").trim(); return raw && numericRequired(title) === null ? raw : ""; }
  function elyRequirement(title){
    let raw=title?.elyRequired;
    if(raw === null || raw === undefined || String(raw).trim() === ""){
      const legacy=(title?.materials||[]).find((m)=>/^\s*[\d,]+\s+ely\s*$/i.test(String(m||"")));
      raw=legacy || "";
    }
    if(raw === null || raw === undefined || String(raw).trim() === "") return "";
    const text=String(raw).trim();
    const n=Number(text.replace(/\s*ely\s*$/i,"").replace(/,/g,""));
    return Number.isFinite(n) ? `${n.toLocaleString()} Ely` : text;
  }
  function currentValue(state,index){ const n=Number(state.current?.[index]); return Number.isFinite(n) && n >= 0 ? n : 0; }

  function updateStats(){
    const total=(D.titles||[]).length; const done=(D.titles||[]).filter(t=>rowState(t.id).complete).length;
    $("title-complete-count").textContent=done; $("title-total-count").textContent=total;
    $("title-progress-bar").style.width=total ? `${(done/total)*100}%` : "0%";
  }

  function displayDungeonLevel(raw){
    const text=String(raw || "").trim();
    if(!text) return "";
    if(/^UL/i.test(text)) return text.replace(/^UL(?:v)?\.?\s*/i,"ULv. ");
    if(/^SL/i.test(text)) return text.replace(/^SL(?:v)?\.?\s*/i,"SLv. ");
    if(/^Lv/i.test(text)) return text.replace(/^Lv\.?\s*/i,"Lv. ");
    return `Lv. ${text}`;
  }

  function hasCouponII(title){
    const value=String(title?.coupon || "").trim().toLowerCase();
    return Boolean(value) && !["no","false","0","-","n/a","na"].includes(value);
  }

  function couponIconHtml(title){
    if(!hasCouponII(title)) return "";
    return `<img class="title-coupon-icon" src="assets/title-coupon.png?v=13.5.2" alt="Coupon II" title="Available from Instance Dungeon Guaranteed Titlebook Coupon II" style="display:inline-block;width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-left:4px;flex:0 0 22px;">`;
  }

  function titleSetParts(value){
    return String(value || "").split(/\r?\n|\s*\|\s*/).map(v=>v.trim()).filter(Boolean);
  }

  function titleSetHtml(value){
    const parts=titleSetParts(value);
    if(!parts.length) return '<span class="empty-cell">—</span>';
    return `<span class="title-set-inline">${parts.map(esc).join(' <span class="title-set-separator">|</span> ')}</span>`;
  }

  function titleCategory(title){
    if(String(title?.unlockType || "").trim().toLowerCase() === "reputation") return "reputation";
    const amount=Number(title?.amountRequired);
    return [30,300,1000,3000,6000].includes(amount) ? String(amount) : "other";
  }

  const categoryBoxes=[...document.querySelectorAll('#title-category-filters input[type="checkbox"]')];
  const categoryAllBox=categoryBoxes.find((box)=>box.value==="all");
  const categoryRangeBoxes=categoryBoxes.filter((box)=>box.value!=="all");

  function selectedTitleCategories(){
    if(!categoryAllBox || categoryAllBox.checked) return new Set(["all"]);
    return new Set(categoryRangeBoxes.filter((box)=>box.checked).map((box)=>box.value));
  }

  const listView=$("title-list-view");
  const setView=$("title-set-view");
  const setGrid=$("title-set-grid");
  const listViewButton=$("title-view-list");
  const setViewButton=$("title-view-sets");
  let titleViewMode=(()=>{ try{return localStorage.getItem(TITLE_VIEW_KEY)==="sets"?"sets":"list";}catch{return "list";} })();

  function visibleTitles(){
    const query=normalize($("title-search").value); const status=$("title-status").value; const categories=selectedTitleCategories();
    return (D.titles||[]).filter((title)=>{
      const state=rowState(title.id);
      if(status === "complete" && !state.complete) return false;
      if(status === "incomplete" && state.complete) return false;
      if(!categories.has("all") && !categories.has(titleCategory(title))) return false;
      if(!query) return true;
      return normalize([title.title,title.dungeon,title.dungeonLevel,title.titleSet,title.exchangePathDescription,title.elyRequired,...(title.materials||[])].join(" ")).includes(query);
    });
  }

  function renderList(visible){
    $("title-table-body").innerHTML=visible.map((title)=>{
      const state=rowState(title.id); const req=numericRequired(title); const specialReq=specialRequirement(title); const elyReq=elyRequirement(title);
      const rawMats=[...(title.materials||[])].filter((mat)=>!/^\s*[\d,]+\s+ely\s*$/i.test(String(mat||"")));
      // If a non-material requirement is supplied in Amount Required, suppress stale
      // untyped requirement notes from older snapshots but keep real typed items.
      const mats=(specialReq ? rawMats.filter((mat)=>Boolean(parseMaterial(mat).type)) : rawMats).slice(0,3);
      const trackedRows=mats.length ? mats.map((mat,i)=>{
        const parsed=parseMaterial(mat);
        if(req === null){
          return `<div class="material-progress-row requirement-only-row"><div class="material-info"><span class="material-name">${esc(parsed.name || mat)}</span>${materialTypeBadge(parsed.type)}</div></div>`;
        }
        const cur=currentValue(state,i); const rem=Math.max(req-cur,0);
        const ready=req > 0 && rem === 0;
        const completed = state.complete || ready;
        return `<div class="material-progress-row">
          <div class="material-info"><span class="material-name">${esc(parsed.name || mat)}</span>${materialTypeBadge(parsed.type)}</div>
          <div class="material-progress-inline">
            <input class="current-input" type="number" min="0" step="1" inputmode="numeric" value="${state.complete ? "" : esc(cur)}" ${state.complete ? "disabled" : ""} data-title-id="${esc(title.id)}" data-index="${i}" aria-label="Current amount for ${esc(parsed.name || mat)}">
            <span class="progress-slash">/</span>
            <span class="material-remaining ${completed ? "ready" : ""}" data-remaining-for="${esc(title.id)}:${i}"><strong${completed ? ' class="material-complete-mark"' : ""}>${completed ? "✓" : `${esc(rem)} remaining`}</strong></span>
          </div>
        </div>`;
      }).join("") : "";
      const specialRow = specialReq ? `<div class="material-progress-row requirement-only-row"><div class="material-info"><span class="material-name">${esc(specialReq)}</span></div></div>` : "";
      const elyRow = elyReq ? `<div class="material-progress-row requirement-only-row ely-requirement"><div class="material-info"><span class="material-name">${esc(elyReq)}</span></div></div>` : "";
      const materialRows = (trackedRows || specialRow || elyRow) ? `${trackedRows}${specialRow}${elyRow}` : '<div class="no-title-materials">No material tracking required.</div>';
      return `<tr class="${state.complete ? "title-complete-row" : ""}" data-title-row="${esc(title.id)}">
        <td class="complete-cell"><input class="title-complete-check" type="checkbox" ${state.complete ? "checked" : ""} data-title-id="${esc(title.id)}" aria-label="Mark ${esc(title.title)} complete"></td>
        <td class="title-name-cell"><span class="title-name-line"><strong>${esc(title.title)}</strong>${couponIconHtml(title)}</span><span class="title-dungeon-name">${esc(title.dungeon || "—")}${title.dungeonLevel ? ` (${esc(displayDungeonLevel(title.dungeonLevel))})` : ""}</span>${title.exchangePathDescription ? `<span class="title-dungeon-name title-exchange-path">↪ ${esc(title.exchangePathDescription)}</span>` : ""}</td>
        <td class="materials-stack-cell">${materialRows}</td>
        <td class="title-set-cell">${titleSetHtml(title.titleSet)}</td>
      </tr>`;
    }).join("");
    $("title-empty-state").classList.toggle("hidden",visible.length>0);
  }

  function renderSets(visible){
    const groups=new Map();
    visible.forEach((title)=>{
      const sets=titleSetParts(title.titleSet);
      const ids=Array.isArray(title.titleSetIds)?title.titleSetIds:[];
      (sets.length?sets:["No Title Set"]).forEach((setName,index)=>{
        if(!groups.has(setName)) groups.set(setName,{titles:[],id:ids[index]||null});
        const group=groups.get(setName);
        group.titles.push(title);
        if(!group.id && ids[index]) group.id=ids[index];
      });
    });
    const setOrder=(group)=>{
      const n=Number(String(group.id||"").match(/(\d+)$/)?.[1]);
      return Number.isFinite(n)?n:Number.POSITIVE_INFINITY;
    };
    const entries=[...groups.entries()].sort(([a,aGroup],[b,bGroup])=>{
      if(a==="No Title Set") return 1;
      if(b==="No Title Set") return -1;
      const orderDiff=setOrder(aGroup)-setOrder(bGroup);
      if(Number.isFinite(orderDiff) && orderDiff!==0) return orderDiff;
      return a.localeCompare(b,undefined,{sensitivity:"base"});
    });
    setGrid.innerHTML=entries.map(([setName,group])=>{
      const titles=group.titles;
      titles.sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""),undefined,{sensitivity:"base"}));
      const scenarios=group.id ? (TITLE_SET_SCENARIOS[group.id]||[]) : [];
      const scenarioRows=scenarios.map((item,index)=>{
        const scenarioId=`scenario:${group.id}:${index}`;
        const state=rowState(scenarioId);
        const badge=item.type==="sub"?"Sub Scenario":item.type==="quest"?"Dungeon Quest":item.type==="main"?"Main Scenario":"";
        return `<label class="title-set-title-row title-set-scenario-row ${state.complete ? "complete" : ""}">
          <input class="title-set-title-check" type="checkbox" ${state.complete ? "checked" : ""} data-title-id="${esc(scenarioId)}" aria-label="Mark ${esc(item.title)} complete">
          <span class="title-set-title-copy">
            <span class="title-set-title-name"><span>${esc(item.type==="quest" ? item.title+" (Questing)" : item.title)}</span>${badge?`<span class="title-source-badge ${item.type==="sub"?"sub":item.type==="quest"?"quest":"main"}">${badge}</span>`:""}</span>
            <span class="title-set-title-meta">${esc(item.source.replace(/^Main Scenario\s*|^Sub Scenario\s*/,""))}</span>
          </span>
        </label>`;
      }).join("");
      const scenarioCount=scenarios.filter((item)=>item.type==="main"||item.type==="sub").length;
      const otherCount=scenarios.filter((item)=>item.type==="quest"||item.type==="other").length;
      const done=titles.filter((title)=>rowState(title.id).complete).length + scenarios.filter((item,index)=>rowState(`scenario:${group.id}:${index}`).complete).length;
      const total=titles.length+scenarios.length;
      const pct=total?(done/total)*100:0;
      const rows=titles.map((title)=>{
        const state=rowState(title.id);
        const dungeon=[title.dungeon,title.dungeonLevel?displayDungeonLevel(title.dungeonLevel):""].filter(Boolean).join(" · ");
        return `<label class="title-set-title-row ${state.complete ? "complete" : ""}">
          <input class="title-set-title-check" type="checkbox" ${state.complete ? "checked" : ""} data-title-id="${esc(title.id)}" aria-label="Mark ${esc(title.title)} complete">
          <span class="title-set-title-copy">
            <span class="title-set-title-name"><span>${esc(title.title)}</span>${couponIconHtml(title)}</span>
            <span class="title-set-title-meta">${esc(dungeon || "—")}</span>
          </span>
        </label>`;
      }).join("");
      return `<article class="title-set-card">
        <header class="title-set-card-head">
          <span class="title-set-card-title"><strong>${esc(setName)}</strong><small>${titles.length} title${titles.length===1?"":"s"}${scenarioCount?` · ${scenarioCount} scenario${scenarioCount===1?"":"s"}`:""}${otherCount?` · ${otherCount} other`:""}</small></span>
          <span class="title-set-card-progress">${done} / ${total}</span>
        </header>
        <div class="title-set-card-list">${scenarioRows}${rows}</div>
        <div class="title-set-card-track" aria-hidden="true"><i style="width:${pct}%"></i></div>
      </article>`;
    }).join("");
    $("title-set-empty-state").classList.toggle("hidden",visible.length>0);
  }

  function syncViewControls(){
    const sets=titleViewMode==="sets";
    listView.classList.toggle("hidden",sets);
    setView.classList.toggle("hidden",!sets);
    listViewButton.classList.toggle("active",!sets);
    setViewButton.classList.toggle("active",sets);
    listViewButton.setAttribute("aria-pressed",String(!sets));
    setViewButton.setAttribute("aria-pressed",String(sets));
  }

  function setTitleView(mode){
    titleViewMode=mode==="sets"?"sets":"list";
    try{localStorage.setItem(TITLE_VIEW_KEY,titleViewMode);}catch{}
    render();
  }

  function render(){
    const visible=visibleTitles();
    syncViewControls();
    if(titleViewMode==="sets") renderSets(visible);
    else renderList(visible);
    $("result-count").textContent=`${visible.length} title${visible.length===1?"":"s"}`;
    updateStats();
  }

  $("title-table-body").addEventListener("input",(event)=>{
    const input=event.target.closest(".current-input"); if(!input)return;
    const id=input.dataset.titleId; const index=Number(input.dataset.index); const state=rowState(id); const value=Math.max(0,Number(input.value)||0);
    state.current=Array.isArray(state.current)?state.current:[0,0,0]; state.current[index]=value; saveProgress();
    const title=(D.titles||[]).find(t=>t.id===id); const req=numericRequired(title); if(req === null) return; const rem=Math.max(req-value,0); const target=document.querySelector(`[data-remaining-for="${CSS.escape(id+":"+index)}"]`); if(target){ const strong=target.querySelector("strong"); const completed=state.complete || (req>0 && rem===0); if(strong){ strong.textContent=completed?"✓":`${rem} remaining`; strong.style.color=""; strong.classList.toggle("material-complete-mark",completed); } target.classList.toggle("ready",completed); }
  });
  $("title-table-body").addEventListener("change",(event)=>{
    const check=event.target.closest(".title-complete-check"); if(!check)return;
    const state=rowState(check.dataset.titleId); state.complete=check.checked; saveProgress();
    check.closest("tr")?.classList.toggle("title-complete-row",check.checked); updateStats();
    render();
  });
  setGrid.addEventListener("change",(event)=>{
    const check=event.target.closest(".title-set-title-check"); if(!check)return;
    const state=rowState(check.dataset.titleId); state.complete=check.checked; saveProgress(); render();
  });
  listViewButton.addEventListener("click",()=>setTitleView("list"));
  setViewButton.addEventListener("click",()=>setTitleView("sets"));
  $("title-search").addEventListener("input",render); $("title-status").addEventListener("change",render);
  categoryBoxes.forEach((box)=>box.addEventListener("change",()=>{
    if(box.value==="all"){
      if(box.checked) categoryRangeBoxes.forEach((item)=>{item.checked=false;});
      else if(!categoryRangeBoxes.some((item)=>item.checked)) box.checked=true;
    } else {
      if(box.checked && categoryAllBox) categoryAllBox.checked=false;
      if(!categoryRangeBoxes.some((item)=>item.checked) && categoryAllBox) categoryAllBox.checked=true;
    }
    render();
  }));
  $("reset-title-progress").addEventListener("click",()=>{
    if(!confirm("Clear all saved Title Tracker progress in this browser?"))return;
    localStorage.removeItem(TITLE_PROGRESS_KEY); Object.keys(progress).forEach(k=>delete progress[k]); render();
  });
  renderLastSync(); render();
})();


/* v13.9.4.21: collapsible dungeon-title section */
(() => {
  const section=document.getElementById('dungeon-title-section');
  const toggle=document.getElementById('dungeon-title-section-toggle');
  const count=document.getElementById('dungeon-title-section-count');
  const result=document.getElementById('result-count');
  if(!section||!toggle)return;
  const syncCount=()=>{if(count&&result)count.textContent=result.textContent||'0 titles';};
  syncCount();
  if(result&&count)new MutationObserver(syncCount).observe(result,{childList:true,subtree:true,characterData:true});
  toggle.addEventListener('click',()=>{
    const collapsed=section.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded',String(!collapsed));
    const b=toggle.querySelector('b'); if(b)b.textContent=collapsed?'▸':'▾';
  });
})();
