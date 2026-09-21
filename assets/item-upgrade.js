(()=>{
  const D=window.LT_ITEM_UPGRADE_DATA||{items:[]};
  const $=(id)=>document.getElementById(id);
  const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const THEME_KEY="lt-theme";
  const STATE_KEY="lt-item-upgrade-progress-v1";
  const MODE_KEY="lt-item-upgrade-mode-v1";
  const TAB_KEY="lt-item-upgrade-tab-v1";
  const RUN_MIN=90, RUN_MAX=150;

  function preferredTheme(){return window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}
  function savedTheme(){const x=localStorage.getItem(THEME_KEY);return ["system","light","dark"].includes(x)?x:"system";}
  function applyTheme(mode){
    const resolved=mode==="system"?preferredTheme():mode;
    document.documentElement.dataset.theme=resolved;
    document.documentElement.style.colorScheme=resolved;
    const b=$("theme-toggle"); if(!b)return;
    b.textContent=mode==="light"?"☀":mode==="dark"?"☾":"◐";
    const label=mode.charAt(0).toUpperCase()+mode.slice(1);
    b.title="Theme: "+label;b.setAttribute("aria-label","Theme: "+label+". Click to switch theme.");
  }
  $("theme-toggle")?.addEventListener("click",()=>{const c=savedTheme();const n=c==="system"?"light":c==="light"?"dark":"system";localStorage.setItem(THEME_KEY,n);applyTheme(n);});
  applyTheme(savedTheme());

  function loadState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||"{}")||{};}catch{return {};}}
  const state=loadState();
  const saveState=()=>localStorage.setItem(STATE_KEY,JSON.stringify(state));
  const itemState=(id)=>state[id]||(state[id]={stage:0,mats:0,maxed:false,secondHand:false,secondStage:0});

  function slotOf(item){
    const id=String(item.itemId||"").toLowerCase();
    const tests=[
      ["weapon",/weapon/],["elemental_stone",/elemental_stone/],["bindi",/bindi/],["glasses",/glasses/],["stockings",/stockings/],
      ["earrings",/earring/],["ring",/_ring/],["cloak",/cloak/],["charm",/charm/],["totem",/totem/],["relic",/relic/],
      ["watch",/watch/],["necklace",/necklace/],["textbook",/textxbook|textbook/],["sticker",/sticker/],["belt",/belt/],
      ["brooch",/brooch/],["pendant",/pendant/],["badge_1",/badge_1/],["badge_2",/badge_2/],["badge_3",/badge_3/],
      ["badge_4",/badge_4/],["badge_5",/badge_5/],["badge_6",/badge_6/],["red_gem",/red_gem/],["yellow_gem",/yellow_gem/],["blue_gem",/blue_gem/]
    ];
    return tests.find(([,re])=>re.test(id))?.[0]||"other";
  }
  const itemBySlot={};
  for(const item of D.items||[]){
    const slot=slotOf(item);
    (itemBySlot[slot]||(itemBySlot[slot]=[])).push(item);
  }
  const dungeonNum=(item)=>Number(String(item.dungeonId||"").match(/(\d+)/)?.[1]||0);
  function latestItems(slot){
    const list=itemBySlot[slot]||[];
    if(!list.length)return [];
    const max=Math.max(...list.map(dungeonNum));
    return list.filter(x=>dungeonNum(x)===max);
  }
  function isLatest(item){
    const slot=slotOf(item),list=itemBySlot[slot]||[];
    if(!list.length)return false;
    return dungeonNum(item)===Math.max(...list.map(dungeonNum));
  }

  const SLOT_LABELS={
    weapon:"Weapon",elemental_stone:"Elemental Stone",bindi:"Bindi",glasses:"Glasses",stockings:"Stockings",earrings:"Earrings",ring:"Ring",cloak:"Cloak",
    charm:"Charm",totem:"Totem",relic:"Relic",watch:"Watch",necklace:"Necklace",textbook:"Textbook",sticker:"Sticker",belt:"Belt",brooch:"Brooch",pendant:"Pendant",
    badge_1:"Badge 1",badge_2:"Badge 2",badge_3:"Badge 3",badge_4:"Badge 4",badge_5:"Badge 5",badge_6:"Badge 6",
    red_gem:"Red Gem",yellow_gem:"Yellow Gem",blue_gem:"Blue Gem"
  };

  const unavailable=new Set(["totem","pendant","badge_5"]);
  function parseNum(v){const n=Number(String(v??"").replace(/,/g,""));return Number.isFinite(n)?n:null;}
  function parseRate(v){const n=Number(String(v||"").replace(/%/g,""));return Number.isFinite(n)&&n>0?Math.min(n/100,1):1;}
  function stageLabel(item,stage){
    if(item.progressionType==="enhancement") return stage.name||("+"+(stage.enhancementLevel??stage.sequence));
    return stage.name||("Stage "+stage.sequence);
  }
  function remainingFor(item,stageIndex){
    const st=itemState(item.itemId);
    if(st.maxed)return {raw:0,expected:0,stone:0,rateAdjusted:false};
    let raw=0,expected=0,stone=0,rateAdjusted=false;
    for(const stage of item.stages||[]){
      if((stage.sequence||0)<=stageIndex)continue;
      const c=parseNum(stage.materialCost);
      const rate=parseRate(stage.successRate);
      if(c!==null){raw+=c;expected+=c/rate;if(rate<1)rateAdjusted=true;}
      const s=parseNum(stage.ascensionStoneCost); if(s!==null)stone+=s;
    }
    return {raw,expected,stone,rateAdjusted};
  }
  function totalRemaining(item){
    const st=itemState(item.itemId);
    let primary=remainingFor(item,Number(st.stage)||0);
    let totalExpected=primary.expected;
    let totalRaw=primary.raw;
    let totalStone=primary.stone;
    let rateAdjusted=primary.rateAdjusted;
    if(slotOf(item)==="weapon"&&st.secondHand){
      const second=remainingFor(item,Number(st.secondStage)||0);
      totalExpected+=second.expected;totalRaw+=second.raw;totalStone+=second.stone;rateAdjusted=rateAdjusted||second.rateAdjusted;
    }
    const owned=Math.max(0,Number(st.mats)||0);
    const need=Math.max(0,Math.ceil(totalExpected-owned));
    return {need,raw:Math.ceil(totalRaw),stone:Math.ceil(totalStone),owned,rateAdjusted};
  }
  function runsText(need){
    if(need<=0)return "0 runs";
    const best=Math.ceil(need/RUN_MAX),worst=Math.ceil(need/RUN_MIN);
    return best===worst?best+" runs":best+"–"+worst+" runs";
  }

  function stageOptions(item,current){
    const opts=[`<option value="0">${item.progressionType==="tier"?"Base / before Eminent":"+0"}</option>`];
    for(const s of item.stages||[]) opts.push(`<option value="${s.sequence}" ${Number(current)===Number(s.sequence)?"selected":""}>${esc(stageLabel(item,s))}</option>`);
    return opts.join("");
  }

  function detailedTable(item){
    const rows=(item.stages||[]).map(s=>{
      const cost=s.materialCost||"—";
      const stone=s.ascensionStoneCost||"—";
      const rate=s.successRate||"100%";
      return `<tr><td>${esc(stageLabel(item,s))}</td><td>${esc(cost)}</td><td>${esc(stone)}</td><td>${esc(rate)}</td></tr>`;
    }).join("");
    return `<div class="upgrade-detail-table-wrap"><table class="upgrade-detail-table"><thead><tr><th>Stage</th><th>Materials</th><th>Ascension Stone</th><th>Success</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function materialName(item){return item.stages?.find(s=>s.materialName)?.materialName||"Material";}
  function stoneName(item){return item.stages?.find(s=>s.ascensionStoneName)?.ascensionStoneName||"Ascension Stone";}

  function itemCard(item,mode){
    const slot=slotOf(item),st=itemState(item.itemId),calc=totalRemaining(item);
    const latest=isLatest(item);
    const maxStage=Math.max(0,...(item.stages||[]).map(s=>Number(s.sequence)||0));
    const secondHand=slot==="weapon"?`
      <label class="upgrade-inline-check"><input class="upgrade-second-hand" type="checkbox" data-id="${esc(item.itemId)}" ${st.secondHand?"checked":""}> Track second-handed weapon</label>
      <label class="upgrade-field upgrade-second-stage ${st.secondHand?"":"hidden"}"><span>Second weapon stage</span><select data-id="${esc(item.itemId)}" class="upgrade-second-stage-select">${stageOptions(item,st.secondStage)}</select></label>`:"";
    const rateNote=calc.rateAdjusted?'<span class="upgrade-estimate-note">Expected value uses the sheet success rate.</span>':"";
    return `<article class="upgrade-calc-card" data-item-card="${esc(item.itemId)}">
      <header class="upgrade-calc-head">
        <div><strong>${esc(item.itemName)}</strong><small>${esc(item.dungeonName||item.dungeonId||"Dungeon not specified")} · ${esc(SLOT_LABELS[slot]||slot)}</small></div>
        <div class="upgrade-card-badges">${latest?'<span class="upgrade-latest-badge">Latest slot data</span>':""}<span class="upgrade-card-type">${esc(item.progressionType||"upgrade")}</span></div>
      </header>
      <div class="upgrade-calc-controls">
        <label class="upgrade-field"><span>Current stage</span><select class="upgrade-stage-select" data-id="${esc(item.itemId)}">${stageOptions(item,st.stage)}</select></label>
        <label class="upgrade-field"><span>Materials owned</span><input class="upgrade-mats-input" data-id="${esc(item.itemId)}" type="number" min="0" step="1" value="${esc(st.mats||0)}"></label>
        <label class="upgrade-inline-check upgrade-max-check"><input class="upgrade-maxed-check" data-id="${esc(item.itemId)}" type="checkbox" ${st.maxed?"checked":""}> Maxed</label>
        ${secondHand}
      </div>
      <div class="upgrade-calc-summary">
        <div><span>Material</span><strong>${esc(materialName(item))}</strong></div>
        <div><span>Remaining to max</span><strong>${calc.need.toLocaleString()}</strong></div>
        <div><span>Estimated runs</span><strong>${runsText(calc.need)}</strong></div>
        ${calc.stone>0?`<div><span>${esc(stoneName(item))}</span><strong>${calc.stone.toLocaleString()}</strong></div>`:""}
      </div>
      ${rateNote}
      ${mode==="detailed"?detailedTable(item):""}
    </article>`;
  }

  function unavailableCard(slot){
    return `<article class="upgrade-calc-card unavailable"><header class="upgrade-calc-head"><div><strong>${esc(SLOT_LABELS[slot])}</strong><small>Upgrade data not yet available</small></div><span class="upgrade-unavailable-badge">Data not available</span></header><div class="upgrade-unavailable-copy">This slot is reserved in the tracker and will activate when rows are added to the <code>item_upgrade</code> sheet.</div></article>`;
  }

  function groupSummary(title,slots){
    const items=slots.flatMap(s=>latestItems(s));
    if(!items.length)return "";
    let need=0;
    const checks=items.map(item=>{
      need+=totalRemaining(item).need;
      const st=itemState(item.itemId);
      return `<label><input class="upgrade-group-max" data-id="${esc(item.itemId)}" type="checkbox" ${st.maxed?"checked":""}> ${esc(item.itemName)}</label>`;
    }).join("");
    return `<section class="upgrade-group-summary"><div><strong>${esc(title)}</strong><small>Set remaining materials</small></div><div class="upgrade-group-checks">${checks}</div><div class="upgrade-group-total"><span>Remaining</span><strong>${need.toLocaleString()}</strong></div></section>`;
  }

  function renderBattle(mode){
    const weapon=latestItems("weapon"),stone=latestItems("elemental_stone");
    const g1=["bindi","glasses","stockings"],g2=["earrings","ring","cloak"];
    return `
      <section class="upgrade-section-block"><h2>Weapon & Elemental Stone</h2><div class="upgrade-card-grid">${weapon.map(x=>itemCard(x,mode)).join("")}${stone.map(x=>itemCard(x,mode)).join("")}</div></section>
      <section class="upgrade-section-block"><h2>Accessories · Bindi / Glasses / Stockings</h2>${groupSummary("Accessory Set A",g1)}<div class="upgrade-card-grid">${g1.flatMap(s=>latestItems(s)).map(x=>itemCard(x,mode)).join("")}</div></section>
      <section class="upgrade-section-block"><h2>Accessories · Earrings / Ring / Cloak</h2>${groupSummary("Accessory Set B",g2)}<div class="upgrade-card-grid">${g2.flatMap(s=>latestItems(s)).map(x=>itemCard(x,mode)).join("")}</div></section>`;
  }

  function renderSpecials(mode){
    const slots=["charm","totem","relic","watch","necklace","textbook","sticker","belt","brooch","pendant","badge_1","badge_2","badge_3","badge_4","badge_5","badge_6"];
    return `<section class="upgrade-section-block"><h2>Special Equipment</h2><div class="upgrade-card-grid">${slots.map(slot=>unavailable.has(slot)?unavailableCard(slot):((latestItems(slot).map(x=>itemCard(x,mode)).join(""))||unavailableCard(slot))).join("")}</div></section>`;
  }

  function renderGems(mode){
    const slots=["red_gem","yellow_gem","blue_gem"];
    return `<section class="upgrade-section-block"><h2>Gems</h2>${groupSummary("Gem Set",slots)}<div class="upgrade-card-grid">${slots.flatMap(s=>latestItems(s)).map(x=>itemCard(x,mode)).join("")}</div></section>`;
  }

  let mode=localStorage.getItem(MODE_KEY)==="detailed"?"detailed":"simple";
  let tab=["battle","specials","gems"].includes(localStorage.getItem(TAB_KEY))?localStorage.getItem(TAB_KEY):"battle";

  function syncMode(){
    $("upgrade-mode-simple")?.classList.toggle("active",mode==="simple");
    $("upgrade-mode-detailed")?.classList.toggle("active",mode==="detailed");
    $("upgrade-mode-simple")?.setAttribute("aria-pressed",String(mode==="simple"));
    $("upgrade-mode-detailed")?.setAttribute("aria-pressed",String(mode==="detailed"));
  }
  function syncTabs(){
    document.querySelectorAll(".upgrade-game-tab").forEach(b=>{
      const active=b.dataset.upgradeTab===tab;
      b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));
    });
  }
  function render(){
    syncMode();syncTabs();
    const root=$("upgrade-tab-content"); if(!root)return;
    root.innerHTML=tab==="battle"?renderBattle(mode):tab==="specials"?renderSpecials(mode):renderGems(mode);
  }

  $("upgrade-mode-simple")?.addEventListener("click",()=>{mode="simple";localStorage.setItem(MODE_KEY,mode);render();});
  $("upgrade-mode-detailed")?.addEventListener("click",()=>{mode="detailed";localStorage.setItem(MODE_KEY,mode);render();});
  document.querySelectorAll(".upgrade-game-tab").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.upgradeTab;localStorage.setItem(TAB_KEY,tab);render();}));

  $("upgrade-tab-content")?.addEventListener("change",(event)=>{
    const el=event.target,id=el.dataset?.id;if(!id)return;
    const st=itemState(id);
    if(el.classList.contains("upgrade-stage-select"))st.stage=Number(el.value)||0;
    if(el.classList.contains("upgrade-second-stage-select"))st.secondStage=Number(el.value)||0;
    if(el.classList.contains("upgrade-second-hand"))st.secondHand=el.checked;
    if(el.classList.contains("upgrade-maxed-check")||el.classList.contains("upgrade-group-max"))st.maxed=el.checked;
    saveState();render();
  });
  $("upgrade-tab-content")?.addEventListener("input",(event)=>{
    const el=event.target,id=el.dataset?.id;if(!id||!el.classList.contains("upgrade-mats-input"))return;
    itemState(id).mats=Math.max(0,Number(el.value)||0);saveState();render();
  });

  render();
})();