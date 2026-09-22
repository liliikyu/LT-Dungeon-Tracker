(()=>{
  const D=window.LT_ITEM_UPGRADE_DATA||{items:[],battleCatalog:[]};
  const $=(id)=>document.getElementById(id);
  const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const THEME_KEY="lt-theme";
  const STATE_KEY="lt-item-upgrade-progress-v2";
  const MODE_KEY="lt-item-upgrade-mode-v1";
  const TAB_KEY="lt-item-upgrade-tab-v1";
  const RUN_MIN=90,RUN_MAX=150;
  const upcomingByItemId=new Map((window.LT_UPCOMING_ITEMS||[]).map(item=>[normId(item.itemId),item]));

  function upcomingForEntry(entry){
    return entry?upcomingByItemId.get(normId(entry.itemId))||null:null;
  }
  function upcomingLabel(entry){
    return upcomingForEntry(entry)?" — Upcoming change":"";
  }
  function upcomingWarning(entry){
    const change=upcomingForEntry(entry);
    if(!change)return "";
    const type=String(change.changeType||"").toLowerCase();
    const cost=Number(change.newMaterialCost);
    const hasCost=Number.isFinite(cost)&&cost>0;
    let title="Upcoming item change";
    let message="";
    if(type==="evolution_chain_ends"){
      title="Evolution chain ends next update";
      message="This is the final item in the current evolution chain. The next "+(change.replacementItem||"Totem")+" will be obtained as an independent special-equipment drop rather than evolving from this item.";
    }else if(type==="replacement_and_nerf"||(type==="replacement"&&hasCost)){
      title="Upcoming replacement & upgrade cost change";
      message="This item is expected to be replaced in the next update"+(change.replacementItem?" by "+change.replacementItem:"")+".";
    }else if(type==="replacement"){
      title="Being replaced next update";
      message="A newer item is expected to replace this equipment"+(change.replacementItem?" ("+change.replacementItem+")":"")+".";
    }else if(type==="material_nerf"){
      title="Upgrade cost reduction next update";
      message="Upgrade material requirements are expected to be reduced in the next update.";
    }else{
      message="This item has a documented change coming in the next update.";
    }
    if(hasCost)message+=" Upgrade requirements are expected to become "+cost.toLocaleString()+" of each material per enhancement.";
    if(change.note)message+=" "+change.note+".";
    const when=change.whenUpdate?'<small>Expected update: '+esc(change.whenUpdate)+'</small>':"";
    return '<div class="upcoming-item-warning"><strong>'+esc(title)+'</strong><span>'+esc(message)+'</span>'+when+'</div>';
  }

  function preferredTheme(){return window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}
  function savedTheme(){const x=localStorage.getItem(THEME_KEY);return ["system","light","dark"].includes(x)?x:"system";}
  function applyTheme(mode){
    const resolved=mode==="system"?preferredTheme():mode;
    document.documentElement.dataset.theme=resolved;
    document.documentElement.style.colorScheme=resolved;
    const b=$("theme-toggle");if(!b)return;
    b.textContent=mode==="light"?"☀":mode==="dark"?"☾":"◐";
    const label=mode.charAt(0).toUpperCase()+mode.slice(1);
    b.title="Theme: "+label;b.setAttribute("aria-label","Theme: "+label+". Click to switch theme.");
  }
  $("theme-toggle")?.addEventListener("click",()=>{const c=savedTheme();const n=c==="system"?"light":c==="light"?"dark":"system";localStorage.setItem(THEME_KEY,n);applyTheme(n);});
  applyTheme(savedTheme());

  function loadState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||"{}")||{};}catch{return {};}}
  const state=loadState();
  const saveState=()=>{try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}};
  const getState=(key)=>{
    const existing=state[key];
    if(!existing || typeof existing!=="object" || Array.isArray(existing)){
      state[key]={seriesId:"",typeIndex:0,current:0,target:0,maxed:false,mats:{}};
    }
    state[key].mats = (state[key].mats && typeof state[key].mats==="object" && !Array.isArray(state[key].mats)) ? state[key].mats : {};
    return state[key];
  };
  const normId=(id)=>String(id||"").toLowerCase().replace(/bellial/g,"belial").replace(/textxbook/g,"textbook");
  const upgradeById=new Map((D.items||[]).map(item=>[normId(item.itemId),item]));

  function itemSlot(item){
    const id=normId(item.itemId);
    const tests=[["weapon",/weapon/],["elemental_stone",/elemental_stone/],["bindi",/bindi/],["glasses",/glasses/],["stockings",/stockings/],
      ["earrings",/earring/],["ring",/_ring/],["cloak",/cloak/],["charm",/charm/],["totem",/totem/],["relic",/relic/],["watch",/watch/],
      ["necklace",/necklace/],["textbook",/textbook/],["sticker",/sticker/],["belt",/belt/],["brooch",/brooch/],["pendant",/pendant/],
      ["badge_1",/badge_1/],["badge_2",/badge_2/],["badge_3",/badge_3/],["badge_4",/badge_4/],["badge_5",/badge_5/],["badge_6",/badge_6/],
      ["red_gem",/red_gem/],["yellow_gem",/yellow_gem/],["blue_gem",/blue_gem/],["armor",/armor_/]];
    return tests.find(([,re])=>re.test(id))?.[0]||"other";
  }
  function catalogSlot(entry){
    const type=String(entry.itemType||"").toLowerCase();
    if(type==="weapon")return"weapon";if(type==="elemental_stone")return"elemental_stone";
    if(type==="bindi")return"bindi";if(type==="glasses")return"glasses";if(type==="stockings")return"stockings";
    if(type.startsWith("earrings"))return"earrings";if(type.startsWith("ring"))return"ring";if(type.startsWith("cloak"))return"cloak";
    if(type.startsWith("armor_"))return"armor";
    if(type==="red_gem")return"red_gem";
    if(type==="yellow_gem")return"yellow_gem";
    if(type==="blue_gem")return"blue_gem";
    if(type==="charm")return"charm";
    if(type==="totem")return"totem";
    if(type==="relic")return"relic";
    if(type==="watch")return"watch";
    if(type==="necklace")return"necklace";
    if(type==="textbook")return"textbook";
    if(type==="sticker")return"sticker";
    if(type==="belt")return"belt";
    if(type==="brooch")return"brooch";
    if(type==="badge_1")return"badge_1";
    if(type==="badge_2")return"badge_2";
    if(type==="badge_3")return"badge_3";
    if(type==="badge_4")return"badge_4";
    if(type==="badge_5")return"badge_5";
    if(type==="badge_6")return"badge_6";
    return"other";
  }
  const catalogBySlot={};
  for(const entry of D.battleCatalog||[]){const slot=catalogSlot(entry);if(slot==="other")continue;(catalogBySlot[slot]||(catalogBySlot[slot]=[])).push(entry);}
  const dungeonNum=(id)=>Number(String(id||"").match(/(\d+)/)?.[1]||0);

  function seriesGroups(slot){
    const map=new Map();
    for(const e of catalogBySlot[slot]||[]){
      // Legacy item drops before the UL era do not use the modern upgrade flow.
      // Keep Totem and Badge 5 selectable because those slots still rely on their older progression chains.
      const n=dungeonNum(e.dungeonId);
      if(n>0&&n<79&&slot!=="totem"&&slot!=="badge_5")continue;
      if(!map.has(e.dungeonId))map.set(e.dungeonId,{id:e.dungeonId,dungeonName:e.dungeonName||e.dungeonId,entries:[]});
      map.get(e.dungeonId).entries.push(e);
    }
    const out=[...map.values()];
    out.forEach(g=>g.entries.sort((a,b)=>{
      const ao=Number(a.typeOrder),bo=Number(b.typeOrder);
      const ah=Number.isFinite(ao)&&ao>0,bh=Number.isFinite(bo)&&bo>0;
      if(ah&&bh&&ao!==bo)return ao-bo;
      if(ah!==bh)return ah?-1:1;
      return a.itemName.localeCompare(b.itemName);
    }));
    out.sort((a,b)=>dungeonNum(b.id)-dungeonNum(a.id));
    return out;
  }
  function latestSeriesId(slot){return seriesGroups(slot)[0]?.id||"";}
  function groupLabel(group,slot){
    const names=group.entries.map(e=>e.itemName.replace(new RegExp("\\s+(Weapon|Elemental Stone|Bindi|Glasses|Stockings|Earrings?|Ring|Cloak|Armor)$","i"),"")).filter(Boolean);
    const unique=[...new Set(names)];
    const series=unique.length<=2?unique.join(" / "):(group.dungeonName||group.id);
    return series+(group.dungeonName&&series!==group.dungeonName?" · "+group.dungeonName:"");
  }
  function missingUpgradeCopy(latest){
    return latest
      ? '<div class="upgrade-unavailable-copy"><strong>Upgrade data not available for this series.</strong><br>The item exists in <code>dungeon_drop</code>, but there are no matching upgrade rows in <code>item_upgrade</code>.</div>'
      : '<div class="upgrade-unavailable-copy"><strong>Upgrade data not available for this series.</strong><br>Assumes it costs 10 matts per upgrade for older equipment.</div>';
  }

  function selectedEntry(slot,key){
    const groups=seriesGroups(slot);if(!groups.length)return null;
    const st=getState(key);
    if(!st.seriesId||!groups.some(g=>g.id===st.seriesId))st.seriesId=groups[0].id;
    const group=groups.find(g=>g.id===st.seriesId)||groups[0];
    st.typeIndex=Math.max(0,Math.min(Number(st.typeIndex)||0,group.entries.length-1));
    return {group,entry:group.entries[st.typeIndex],state:st};
  }
  function upgradeItemFor(entry){
    if(!entry)return null;
    const id=normId(entry.itemId);
    const direct=upgradeById.get(id);
    if(id==="dng_129_badge_6"){
      return {
        ...(direct||{}),
        itemId:entry.itemId,
        itemName:entry.itemName||direct?.itemName||"Vigor Mutant Ent Badge",
        dungeonId:entry.dungeonId||direct?.dungeonId||"dng_129",
        dungeonName:entry.dungeonName||direct?.dungeonName||"",
        progressionType:"enhancement",
        syntheticRule:"badge6_copy_100_two_per_run",
        stages:Array.from({length:30},(_,i)=>({
          sequence:i+1,
          key:"enh_"+(i+1),
          name:"+"+(i+1),
          enhancementLevel:i+1,
          materialCost:"1",
          ascensionStoneCost:"",
          materialName:entry.itemName||direct?.itemName||"Vigor Mutant Ent Badge",
          ascensionStoneName:"",
          elyCostMillions:"0",
          successRate:"100%",
          upgradeItemId:(entry.itemId||"dng_129_badge_6")+"_enh_"+(i+1),
          materials:[{sequence:1,name:entry.itemName||direct?.itemName||"Vigor Mutant Ent Badge",cost:"1"}]
        }))
      };
    }
    if(direct)return direct;
    if(id==="dng_138_badge_6"){
      return {
        itemId:entry.itemId,
        itemName:entry.itemName||"Unknown Star Badge",
        dungeonId:entry.dungeonId||"dng_138",
        dungeonName:entry.dungeonName||"",
        progressionType:"enhancement",
        syntheticRule:"badge6_copy_70",
        stages:Array.from({length:30},(_,i)=>({
          sequence:i+1,
          key:"enh_"+(i+1),
          name:"+"+(i+1),
          enhancementLevel:i+1,
          materialCost:"1",
          ascensionStoneCost:"",
          materialName:entry.itemName||"Unknown Star Badge",
          ascensionStoneName:"",
          elyCostMillions:"100",
          successRate:"70%",
          upgradeItemId:(entry.itemId||"dng_138_badge_6")+"_enh_"+(i+1)
        }))
      };
    }
    return null;
  }
  function prefixOf(name){return String(name||"").split(/\s+/)[0].toLowerCase();}
  function stagesFor(item,entry){
    if(!item)return[];
    const stages=[...(item.stages||[])].sort((a,b)=>(a.sequence||0)-(b.sequence||0));
    const hasAsc=stages.some(s=>String(s.name||"").toLowerCase()==="ascended"||String(s.key||"").toLowerCase()==="ascended");
    if(item.progressionType==="tier"&&!hasAsc){
      const prefix=prefixOf(entry?.itemName||item.itemName);
      const sibling=(D.items||[]).find(x=>x!==item&&x.dungeonId===item.dungeonId&&prefixOf(x.itemName)===prefix&&(x.stages||[]).some(s=>String(s.name||"").toLowerCase()==="ascended"));
      const asc=sibling?.stages?.find(s=>String(s.name||"").toLowerCase()==="ascended");
      if(asc)stages.push({...asc,sequence:Math.max(...stages.map(s=>Number(s.sequence)||0))+1});
    }
    return stages;
  }
  function stageName(item,s){return item?.progressionType==="enhancement"?(s.name||("+"+(s.enhancementLevel??s.sequence))):(s.name||("Stage "+s.sequence));}
  function splitMaterials(stage){return String(stage?.materialName||"").split(",").map(x=>x.trim()).filter(Boolean);}
  function stageMaterialEntries(stage){
    if(Array.isArray(stage?.materials)&&stage.materials.length){
      const expanded=[];
      stage.materials.forEach((m,i)=>{
        const seq=Number(m.sequence)||i+1;
        const rawName=String(m.name||"").trim();
        const names=rawName.split(",").map(v=>v.trim()).filter(Boolean);
        if(names.length>1){
          names.forEach(name=>expanded.push({
            sequence:expanded.length+1,
            name,
            cost:number(m.cost)
          }));
        }else{
          expanded.push({
            sequence:seq,
            name:rawName||("Material "+seq),
            cost:number(m.cost)
          });
        }
      });
      const deduped=[];
      const seen=new Set();
      for(const entry of expanded.sort((a,b)=>a.sequence-b.sequence)){
        const key=String(entry.name||"").trim().toLowerCase();
        if(seen.has(key))continue;
        seen.add(key);
        deduped.push(entry);
      }
      return deduped;
    }
    const names=splitMaterials(stage),cost=number(stage?.materialCost);
    if(names.length){
      const seen=new Set();
      return names.filter(name=>{
        const key=String(name||"").trim().toLowerCase();
        if(seen.has(key))return false;
        seen.add(key);
        return true;
      }).map((name,i)=>({sequence:i+1,name,cost}));
    }
    return cost>0?[{sequence:1,name:"Evolution material",cost}]:[];
  }
  function number(v){const n=Number(String(v??"").replace(/,/g,""));return Number.isFinite(n)?n:0;}
  function rate(v){const n=Number(String(v||"").replace(/%/g,""));return Number.isFinite(n)&&n>0?Math.min(n/100,1):1;}
  function formatElyMillions(v){
    const n=number(v);
    if(n<=0)return "—";
    if(n>=1000){
      const b=n/1000;
      const decimals=Number.isInteger(b)?0:(b>=10?1:2);
      return Number(b.toFixed(decimals)).toLocaleString(undefined,{maximumFractionDigits:decimals})+"B";
    }
    return n.toLocaleString()+"M";
  }

  function ensureTargets(slot,key,item,entry){
    const st=getState(key),stages=stagesFor(item,entry);
    const max=Math.max(0,...stages.map(s=>Number(s.sequence)||0));
    if(!st.target||st.target>max)st.target=max;
    if(st.current>st.target)st.current=st.target;
    return {st,stages,max};
  }
  function requirements(slot,key,item,entry){
    const {st,stages}=ensureTargets(slot,key,item,entry);
    const mats={};let stoneRequired=0,stoneName="",expected=false,elyMillions=0;
    for(const s of stages){
      const seq=Number(s.sequence)||0;if(seq<=Number(st.current)||seq>Number(st.target))continue;
      const success=rate(s.successRate);
      const ely=number(s.elyCostMillions);
      if(success<1)expected=true;
      if(ely>0)elyMillions+=ely/success;
      const materials=stageMaterialEntries(s);
      for(const material of materials){
        const effective=material.cost/success;
        mats[material.name]=(mats[material.name]||0)+effective;
      }
      const stone=number(s.ascensionStoneCost);if(stone>0){stoneRequired+=stone;s.ascensionStoneName&&(stoneName=s.ascensionStoneName);}
    }
    let remainingTotal=0,rawTotal=0;
    for(const [name,required] of Object.entries(mats)){
      const owned=Math.max(0,Number(st.mats?.[name])||0);
      const rounded=Math.ceil(required);rawTotal+=rounded;remainingTotal+=Math.max(0,rounded-owned);
    }
    const stoneOwned=Math.max(0,Number(st.mats?.["__stone"])||0);
    const stoneRemaining=Math.max(0,Math.ceil(stoneRequired)-stoneOwned);
    const target=Math.max(1,Number(st.target)||1),completion=Math.min(100,Math.round((Number(st.current)||0)/target*100));
    if(st.maxed){
      return {mats,stoneName,stoneRequired:Math.ceil(stoneRequired),stoneRemaining:0,remainingTotal:0,rawTotal,completion:100,expected,elyMillions:0};
    }
    return {mats,stoneName,stoneRequired:Math.ceil(stoneRequired),stoneRemaining,remainingTotal,rawTotal,completion,expected,elyMillions};
  }
  function runsText(remaining){if(remaining<=0)return"0 runs";const best=Math.ceil(remaining/RUN_MAX),worst=Math.ceil(remaining/RUN_MIN);return best===worst?best+" runs":best+"–"+worst+" runs";}

  function seriesSelect(slot,key){
    const groups=seriesGroups(slot),st=getState(key);
    if(!st.seriesId&&groups.length)st.seriesId=groups[0].id;
    return `<select class="battle-series-select" data-key="${esc(key)}" data-slot="${esc(slot)}" ${st.maxed?"disabled":""}>${groups.map(g=>`<option value="${esc(g.id)}" ${g.id===st.seriesId?"selected":""}>${esc(groupLabel(g,slot)+upcomingLabel(g.entries[0]))}</option>`).join("")}</select>`;
  }
  function typeChoices(group,key,st){
    const enabled=group.entries.length>1;
    const labels=group.entries.slice(0,2).map((e,i)=>`<label class="${enabled?"":"disabled"}"><input class="battle-type-choice" type="radio" name="${esc(key)}-type" data-key="${esc(key)}" value="${i}" ${Number(st.typeIndex)===i?"checked":""} ${enabled?"":"disabled"}> Type ${i+1}<small>${esc(e.itemName)}</small></label>`).join("");
    if(group.entries.length===1)return `<div class="battle-type-row"><label class="disabled"><input type="radio" checked disabled> Type 1<small>${esc(group.entries[0].itemName)}</small></label><label class="disabled"><input type="radio" disabled> Type 2</label></div>`;
    return `<div class="battle-type-row">${labels}</div>`;
  }
  function stageSelect(item,entry,key,kind){
    const {st,stages}=ensureTargets("",key,item,entry),value=kind==="current"?st.current:st.target;
    const baseLabel=item?.progressionType==="tier"?"Base":"+0";
    const opts=[`<option value="0" ${Number(value)===0?"selected":""}>${baseLabel}</option>`].concat(stages.map(s=>`<option value="${s.sequence}" ${Number(value)===Number(s.sequence)?"selected":""}>${esc(stageName(item,s))}</option>`));
    return `<select class="battle-${kind}-select" data-key="${esc(key)}" ${st.maxed?"disabled":""}>${opts.join("")}</select>`;
  }
  function detailTable(item,entry){
    const stages=stagesFor(item,entry);
    return `<div class="upgrade-detail-table-wrap"><table class="upgrade-detail-table"><thead><tr><th>Stage</th><th>Material Qty</th><th>Ascension Stone</th><th>Ely</th><th>Success</th></tr></thead><tbody>${stages.map(s=>`<tr><td>${esc(stageName(item,s))}</td><td>${esc(s.materialCost||"—")}</td><td>${s.ascensionStoneCost&&number(s.ascensionStoneCost)>0?esc(s.ascensionStoneCost):"—"}</td><td>${esc(formatElyMillions(s.elyCostMillions))}</td><td>${esc(s.successRate||"100%")}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function materialRows(key,req){
    const st=getState(key),rows=[];
    Object.entries(req.mats).forEach(([name,requiredRaw],index)=>{
      const required=Math.ceil(requiredRaw),owned=Math.max(0,Number(st.mats?.[name])||0),remaining=st.maxed?0:Math.max(0,required-owned);
      rows.push(`<div class="battle-material-row battle-stacked-material">
        <span class="battle-material-name"><small>MATERIAL ${index+1}</small><span>${esc(name)}</span></span>
        <input class="battle-material-input" type="number" min="0" step="1" data-key="${esc(key)}" data-material="${esc(name)}" value="${esc(owned)}" ${st.maxed?"disabled":""}>
        <span class="battle-material-total">/ ${remaining.toLocaleString()} remaining</span>
      </div>`);
    });
    if(req.stoneName||req.stoneRequired>0){
      const owned=Math.max(0,Number(st.mats?.["__stone"])||0),remaining=st.maxed?0:Math.max(0,req.stoneRequired-owned);
      rows.push(`<div class="battle-material-row battle-stacked-material ascension">
        <span class="battle-material-name"><small>ASCENSION STONE</small><span>${esc(req.stoneName||"Ascension Stone")}</span></span>
        <input class="battle-material-input" type="number" min="0" step="1" data-key="${esc(key)}" data-material="__stone" value="${esc(owned)}" ${st.maxed?"disabled":""}>
        <span class="battle-material-total">/ ${remaining.toLocaleString()} remaining</span>
      </div>`);
    }else{
      rows.push(`<div class="battle-material-row battle-stacked-material ascension muted">
        <span class="battle-material-name"><small>ASCENSION STONE</small><span>Not required</span></span>
        <input type="number" value="0" disabled>
        <span class="battle-material-total">/ 0 remaining</span>
      </div>`);
    }
    if(req.elyMillions>0){
      const ely=formatElyMillions(req.elyMillions);
      rows.push(`<div class="battle-ely-row battle-stacked-ely"><span class="battle-material-name"><small>Ely</small><span>${req.expected?"Expected cost at current success rate":"Required Ely"}</span></span><strong>${esc(ely)}</strong><span class="battle-material-total"></span></div>`);
    }else{
      rows.push('<div class="battle-ely-row battle-stacked-ely"><span class="battle-material-name"><small>Ely</small><span>Not supplied in item_upgrade</span></span><strong>—</strong><span class="battle-material-total"></span></div>');
    }
    return rows.join("");
  }
  function battleCalculator(slot,key,title,mode,opts={}){
    const sel=selectedEntry(slot,key);
    if(!sel)return `<article class="battle-item-card unavailable"><header><strong>${esc(title)}</strong></header><p>No series found in dungeon_drop.</p></article>`;
    const {group,entry,state:st}=sel,item=upgradeItemFor(entry),latest=group.id===latestSeriesId(slot);
    if(item)ensureTargets(slot,key,item,entry);
    const req=item?requirements(slot,key,item,entry):null;
    const maxed=st.maxed;
    return `<article class="battle-item-card ${maxed?"maxed":""}">
      <header class="battle-item-head"><strong>${esc(title)}</strong><label class="battle-maxed"><input class="battle-maxed-check" type="checkbox" data-key="${esc(key)}" ${maxed?"checked":""}> MAXED</label></header>
      <label class="battle-field full"><span>Select ${esc(opts.seriesLabel||title.toLowerCase())} series</span>${seriesSelect(slot,key)}</label>
      <div class="battle-latest-line">Is latest: <strong>${latest?"Yes":"No"}</strong></div>
      ${upcomingWarning(entry)}
      ${opts.showTypes?typeChoices(group,key,st):""}
      ${!item?missingUpgradeCopy(latest):`
        <div class="battle-stage-pair">
          <label class="battle-field"><span>Current stage</span>${stageSelect(item,entry,key,"current")}</label>
          <label class="battle-field"><span>Target stage</span>${stageSelect(item,entry,key,"target")}</label>
        </div>
        <div class="battle-materials">${materialRows(key,req)}</div>
        <div class="battle-estimate"><span>Estimated runs</span><strong>${runsText(req.remainingTotal)}</strong>${req.expected?'<small>Expected value adjusted for upgrade success rate.</small>':""}</div>
        ${mode==="detailed"?detailTable(item,entry):""}
      `}
    </article>`;
  }
  function percentFor(slot,key){
    const sel=selectedEntry(slot,key);if(!sel)return 0;const item=upgradeItemFor(sel.entry);if(!item)return 0;return requirements(slot,key,item,sel.entry).completion;
  }
  function remainingForKey(slot,key){
    const sel=selectedEntry(slot,key);if(!sel)return 0;const item=upgradeItemFor(sel.entry);if(!item)return 0;return requirements(slot,key,item,sel.entry).remainingTotal;
  }
  function sectionPreview(parts,keys){
    const totalPct=Math.round(keys.reduce((s,x)=>s+percentFor(x.slot,x.key),0)/Math.max(1,keys.length));
    const remaining=keys.reduce((s,x)=>s+remainingForKey(x.slot,x.key),0);
    return `<div class="battle-preview"><div class="battle-preview-items">${parts.map(p=>`<span>${esc(p.label)} <strong>${p.pct}%</strong></span>`).join("")}</div><div class="battle-preview-overall"><span>Overall <strong>${totalPct}%</strong></span><span>${runsText(remaining)} left</span></div></div>`;
  }
  function section(title,preview,body,open=true){
    return `<details class="battle-section" ${open?"open":""}><summary><span class="battle-section-title">${esc(title)}</span>${preview}<span class="battle-section-chevron">▾</span></summary><div class="battle-section-body">${body}</div></details>`;
  }

  function weaponStoneSection(mode){
    const enabled=Boolean(state["battle:weapon2Enabled"]);
    const keys=[{slot:"weapon",key:"battle:weapon1"}];if(enabled)keys.push({slot:"weapon",key:"battle:weapon2"});keys.push({slot:"elemental_stone",key:"battle:stone"});
    const parts=[{label:"Weapon",pct:percentFor("weapon","battle:weapon1")}];
    if(enabled)parts.push({label:"Weapon 2",pct:percentFor("weapon","battle:weapon2")});
    parts.push({label:"Stone",pct:percentFor("elemental_stone","battle:stone")});
    const weapon1=battleCalculator("weapon","battle:weapon1","Weapon",mode,{seriesLabel:"weapon"});
    const weapon2=enabled?`<div class="battle-second-weapon">${battleCalculator("weapon","battle:weapon2","Second Weapon",mode,{seriesLabel:"weapon"})}</div>`:"";
    const body=`<div class="battle-two-grid"><div><div class="battle-primary-card">${weapon1}</div><label class="battle-add-second"><input id="battle-second-weapon-toggle" type="checkbox" ${enabled?"checked":""}> Add second-handed weapon</label>${weapon2}</div><div>${battleCalculator("elemental_stone","battle:stone","Elemental Stone",mode,{seriesLabel:"elemental stone"})}</div></div>`;
    return section("WEAPON & ELEMENTAL STONE",sectionPreview(parts,keys),body);
  }

  function tripleSection(title,slots,keys,labels,mode,showTypes=false){
    const parts=keys.map((key,i)=>({label:labels[i],pct:percentFor(slots[i],key)}));
    const refs=keys.map((key,i)=>({slot:slots[i],key}));
    const body=`<div class="battle-three-grid">${keys.map((key,i)=>battleCalculator(slots[i],key,labels[i],mode,{seriesLabel:labels[i].toLowerCase(),showTypes})).join("")}</div>`;
    return section(title,sectionPreview(parts,refs),body);
  }

  function armorSection(mode){
    const pieces=["Helmet","Top","Bottom","Gloves","Boots"],keys=pieces.map(x=>"battle:armor:"+x.toLowerCase());
    const refs=keys.map(key=>({slot:"armor",key}));
    const parts=keys.map((key,i)=>({label:pieces[i],pct:percentFor("armor",key)}));
    const cards=keys.map((key,i)=>battleCalculator("armor",key,pieces[i],mode,{seriesLabel:"armor",showTypes:true}));
    const body=`<div class="battle-three-grid">${cards.slice(0,3).join("")}</div><div class="battle-three-grid battle-armor-second-row">${cards.slice(3).join("")}</div>`;
    return section("ARMOR",sectionPreview(parts,refs),body);
  }

  function safeBattleBlock(label,fn){
    try{return fn();}
    catch(err){
      console.error("Item Upgrade Battle section failed:",label,err);
      return `<section class="battle-section battle-section-error"><div class="battle-section-error-copy"><strong>${esc(label)}</strong><span>This section could not load. Refresh once; if it persists, the source data for this section needs checking.</span></div></section>`;
    }
  }
  function renderBattle(mode){
    return safeBattleBlock("Weapon & Elemental Stone",()=>weaponStoneSection(mode))
      +safeBattleBlock("Accessories · Bindi / Glasses / Stockings",()=>tripleSection("ACCESSORIES · BINDI / GLASSES / STOCKINGS",["bindi","glasses","stockings"],["battle:bindi","battle:glasses","battle:stockings"],["Bindi","Glasses","Stockings"],mode,false))
      +safeBattleBlock("Accessories · Earrings / Ring / Cloak",()=>tripleSection("ACCESSORIES · EARRINGS / RING / CLOAK",["earrings","ring","cloak"],["battle:earrings","battle:ring","battle:cloak"],["Earrings","Ring","Cloak"],mode,true))
      +safeBattleBlock("Armor",()=>armorSection(mode));
  }


  function gemMaterialRows(key,req){
    const st=getState(key),rows=[];
    const materials=Object.entries(req.mats);
    materials.forEach(([name,requiredRaw],index)=>{
      const required=Math.ceil(requiredRaw);
      const owned=Math.max(0,Number(st.mats?.[name])||0);
      const remaining=st.maxed?0:Math.max(0,required-owned);
      rows.push(`<div class="battle-material-row battle-stacked-material gem-material-row">
        <span class="battle-material-name"><small>MATERIAL ${index+1}</small><span>${esc(name)}</span></span>
        <input class="battle-material-input" type="number" min="0" step="1" data-key="${esc(key)}" data-material="${esc(name)}" value="${esc(owned)}" ${st.maxed?"disabled":""}>
        <span class="battle-material-total">/ ${remaining.toLocaleString()} remaining</span>
      </div>`);
    });
    if(!materials.length){
      rows.push('<div class="battle-material-row battle-stacked-material gem-material-row muted"><span class="battle-material-name"><small>MATERIAL</small><span>Not available</span></span><input type="number" value="0" disabled><span class="battle-material-total">/ 0 remaining</span></div>');
    }
    if(req.elyMillions>0){
      const ely=formatElyMillions(req.elyMillions);
      rows.push(`<div class="battle-ely-row battle-stacked-ely gem-ely-row"><span class="battle-material-name"><small>Ely</small><span>${req.expected?"Expected cost at current success rate":"Required Ely"}</span></span><strong>${esc(ely)}</strong><span class="battle-material-total"></span></div>`);
    }else{
      rows.push('<div class="battle-ely-row battle-stacked-ely gem-ely-row"><span class="battle-material-name"><small>Ely</small><span>Not supplied in item_upgrade</span></span><strong>—</strong><span class="battle-material-total"></span></div>');
    }
    return rows.join("");
  }

  function gemDetailTable(item,entry){
    const stages=stagesFor(item,entry);
    return `<div class="upgrade-detail-table-wrap"><table class="upgrade-detail-table"><thead><tr><th>Stage</th><th>Material Qty</th><th>Ely</th><th>Success</th></tr></thead><tbody>${stages.map(s=>`<tr><td>${esc(stageName(item,s))}</td><td>${esc(stageMaterialEntries(s).length?stageMaterialEntries(s).map(m=>m.name+": "+m.cost.toLocaleString()).join(" · "):(s.materialCost||"—"))}</td><td>${esc(formatElyMillions(s.elyCostMillions))}</td><td>${esc(s.successRate||"100%")}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function specialDetailTable(item,entry){
    const stages=stagesFor(item,entry);
    return `<div class="upgrade-detail-table-wrap"><table class="upgrade-detail-table"><thead><tr><th>Stage</th><th>Material Qty</th><th>Ely</th><th>Success</th></tr></thead><tbody>${stages.map(s=>{
      const materials=stageMaterialEntries(s);
      const qty=materials.length
        ? materials.map(m=>{
            const raw=Array.isArray(s.materials)
              ? s.materials.find(x=>String(x.name||"").trim()===String(m.name||"").trim())?.cost
              : null;
            return String(raw??m.cost??"").trim()||"—";
          }).join(" / ")
        : (String(s.materialCost||"").trim()||"—");
      return `<tr><td>${esc(stageName(item,s))}</td><td>${esc(qty)}</td><td>${esc(formatElyMillions(s.elyCostMillions))}</td><td>${esc(s.successRate||"100%")}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  function gemCalculator(slot,key,title,mode){
    const sel=selectedEntry(slot,key);
    if(!sel)return `<article class="battle-item-card unavailable"><header class="battle-item-head"><strong>${esc(title)}</strong></header><div class="upgrade-unavailable-copy">No gem series found in dungeon_drop.</div></article>`;
    const {group,entry,state:st}=sel;
    const item=upgradeItemFor(entry);
    const latest=group.id===latestSeriesId(slot);
    if(item)ensureTargets(slot,key,item,entry);
    const req=item?requirements(slot,key,item,entry):null;
    return `<article class="battle-item-card ${st.maxed?"maxed":""}">
      <header class="battle-item-head"><strong>${esc(title)}</strong><label class="battle-maxed"><input class="battle-maxed-check" type="checkbox" data-key="${esc(key)}" ${st.maxed?"checked":""}> MAXED</label></header>
      <label class="battle-field full"><span>Select gem series</span>${seriesSelect(slot,key)}</label>
      <div class="battle-latest-line">Is latest: <strong>${latest?"Yes":"No"}</strong></div>
      ${!item?missingUpgradeCopy(latest):`
        <div class="battle-stage-pair">
          <label class="battle-field"><span>Current stage</span>${stageSelect(item,entry,key,"current")}</label>
          <label class="battle-field"><span>Target stage</span>${stageSelect(item,entry,key,"target")}</label>
        </div>
        <div class="battle-materials gem-materials">${gemMaterialRows(key,req)}</div>
        <div class="battle-estimate"><span>Estimated runs</span><strong>${runsText(req.remainingTotal)}</strong>${req.expected?'<small>Expected value adjusted for upgrade success rate.</small>':""}</div>
        ${mode==="detailed"?gemDetailTable(item,entry):""}
      `}
    </article>`;
  }

  function syncGemSeriesDefaults(){
    const red=getState("gems:red");
    const redGroups=seriesGroups("red_gem");
    if(!red.seriesId&&redGroups.length)red.seriesId=redGroups[0].id;
    for(const key of ["gems:yellow","gems:blue"]){
      const st=getState(key);
      if(!st.seriesId&&!st.customSeries)st.seriesId=red.seriesId;
    }
  }

  function renderGemSection(mode){
    syncGemSeriesDefaults();
    const slots=["red_gem","yellow_gem","blue_gem"];
    const keys=["gems:red","gems:yellow","gems:blue"];
    const labels=["Red First Gem","Yellow First Gem","Blue First Gem"];
    const parts=keys.map((key,i)=>({label:labels[i],pct:percentFor(slots[i],key)}));
    const refs=keys.map((key,i)=>({slot:slots[i],key}));
    const cards=keys.map((key,i)=>gemCalculator(slots[i],key,labels[i],mode)).join("");
    return section("GEMS",sectionPreview(parts,refs),`<div class="battle-three-grid">${cards}</div>`);
  }

  function evolveProgressSummary(item,key,req){
    const {st,stages}=ensureTargets("totem",key,item,null);
    const current=Number(st.current)||0;
    const max=stages.length?Math.max(...stages.map(s=>Number(s.sequence)||0)):0;
    const remaining=Math.max(0,max-current);
    return `<div class="evolve-progress-box">
      <div><span>Progression</span><strong>Evolve</strong></div>
      <div><span>Current</span><strong>${current?("+"+current):"+0"}</strong></div>
      <div><span>Goal</span><strong>+${max}</strong></div>
      <div><span>Remaining evolutions</span><strong>${remaining}</strong></div>
    </div>`;
  }

  function evolutionGroups(slot){
    return seriesGroups(slot)
      .filter(group=>group.entries.some(entry=>upgradeItemFor(entry)))
      .slice()
      .sort((a,b)=>dungeonNum(a.id)-dungeonNum(b.id));
  }
  function evolutionPhaseMax(slot,entry){
    const item=upgradeItemFor(entry);
    if(item){
      const stages=stagesFor(item,entry);
      const max=Math.max(0,...stages.map(s=>Number(s.sequence)||0));
      if(max>0)return max;
    }
    return slot==="badge_5"?30:slot==="totem"?50:0;
  }
  function evolutionDungeonSelect(slot,key,kind,selectedId,disabled){
    const groups=evolutionGroups(slot);
    return `<select class="evolution-${kind}-series" data-key="${esc(key)}" ${disabled?"disabled":""}>${groups.map(g=>`<option value="${esc(g.id)}" ${g.id===selectedId?"selected":""}>${esc(g.dungeonName||g.id)} · ${esc((g.entries[0]?.itemName||"")+upcomingLabel(g.entries[0]))}</option>`).join("")}</select>`;
  }
  function evolutionLevelSelect(slot,key,kind,entry,value,disabled){
    const max=evolutionPhaseMax(slot,entry);
    const opts=Array.from({length:max+1},(_,i)=>`<option value="${i}" ${Number(value)===i?"selected":""}>+${i}</option>`).join("");
    return `<select class="evolution-${kind}-level" data-key="${esc(key)}" ${disabled?"disabled":""}>${opts}</select>`;
  }
  function evolutionPlan(slot,key){
    const groups=evolutionGroups(slot),st=getState(key);
    if(!groups.length)return null;
    if(!st.currentSeriesId||!groups.some(g=>g.id===st.currentSeriesId))st.currentSeriesId=groups[0].id;
    if(!st.targetSeriesId||!groups.some(g=>g.id===st.targetSeriesId))st.targetSeriesId=groups[groups.length-1].id;
    let ci=groups.findIndex(g=>g.id===st.currentSeriesId),ti=groups.findIndex(g=>g.id===st.targetSeriesId);
    if(ci<0)ci=0;
    if(ti<ci){ti=ci;st.targetSeriesId=groups[ti].id;}
    const currentGroup=groups[ci],targetGroup=groups[ti];
    const currentEntry=currentGroup.entries[0],targetEntry=targetGroup.entries[0];
    const currentMax=evolutionPhaseMax(slot,currentEntry),targetMax=evolutionPhaseMax(slot,targetEntry);
    st.current=Math.max(0,Math.min(Number(st.current)||0,currentMax));
    if(st.target===0&&ti===groups.length-1)st.target=targetMax;
    st.target=Math.max(0,Math.min(Number(st.target)||0,targetMax));
    if(ci===ti&&st.target<st.current)st.target=st.current;

    const rows=[];
    let elyMillions=0,elyComplete=true,totalMats=0,totalRemainingMats=0,materialsComplete=true;

    for(let i=ci;i<=ti;i++){
      const group=groups[i],entry=group.entries[0],item=upgradeItemFor(entry);
      const max=evolutionPhaseMax(slot,entry);
      const from=i===ci?st.current:0;
      const to=i===ti?st.target:max;
      const enteringLaterSeries=i>ci;
      if(to<=from&&!enteringLaterSeries)continue;

      let phaseEly=0,phaseElyComplete=true,phaseMaterialsComplete=true;
      const materialTotals=new Map();

      let selectedStages=[];
      if(item){
        const stages=stagesFor(item,entry).filter(s=>{
          const seq=Number(s.sequence)||0;
          if(enteringLaterSeries&&seq===0)return true;
          return seq>from&&seq<=to;
        });
        selectedStages=stages;

        for(const s of stages){
          const materialEntries=stageMaterialEntries(s);
          if(materialEntries.length){
            for(const material of materialEntries){
              const rawMatch=Array.isArray(s.materials)
                ? s.materials.find(m=>String(m.name||"").trim()===String(material.name||"").trim())
                : null;
              const rawCost=String(rawMatch?.cost ?? s.materialCost ?? "").trim();
              const known=material.cost>0;
              const existing=materialTotals.get(material.name)||{name:material.name,required:0,complete:true};
              if(known)existing.required+=material.cost/rate(s.successRate);
              else if(rawCost&&rawCost!=="0")existing.complete=false;
              materialTotals.set(material.name,existing);
              if(!known&&rawCost&&rawCost!=="0")phaseMaterialsComplete=false;
            }
          }else{
            const costRaw=String(s.materialCost??"").trim();
            if(costRaw&&costRaw!=="0")phaseMaterialsComplete=false;
          }

          const ev=number(s.elyCostMillions);
          if(ev>0)phaseEly+=ev/rate(s.successRate);
          else phaseElyComplete=false;
        }

        if(!stages.length){
          const steps=to-from;
          const fallbackName="Upgrade material";
          materialTotals.set(fallbackName,{name:fallbackName,required:steps*10,complete:true});
          phaseElyComplete=false;
        }
      }else{
        const steps=to-from;
        const fallbackName="Upgrade material";
        materialTotals.set(fallbackName,{name:fallbackName,required:steps*10,complete:true});
        phaseElyComplete=false;
      }

      const materials=[...materialTotals.values()].map((m,index)=>{
        const required=Math.ceil(m.required);
        const stateKey=entry.itemId+"::"+m.name;
        const owned=Math.max(0,Number(st.mats?.[stateKey])||0);
        const remaining=st.maxed?0:Math.max(0,required-owned);
        if(m.complete){
          totalMats+=required;
          totalRemainingMats+=remaining;
        }
        return {...m,required,owned,remaining,stateKey,index:index+1};
      });

      if(!phaseMaterialsComplete||materials.some(m=>!m.complete))materialsComplete=false;
      if(phaseElyComplete)elyMillions+=phaseEly;
      else elyComplete=false;

      rows.push({
        group,entry,from,to,materials,stages:selectedStages,
        materialsComplete:phaseMaterialsComplete&&materials.every(m=>m.complete),
        elyMillions:phaseEly,
        elyComplete:phaseElyComplete
      });
    }

    return {groups,st,ci,ti,currentGroup,targetGroup,currentEntry,targetEntry,rows,totalMats,totalRemainingMats,materialsComplete,elyMillions,elyComplete};
  }

  function evolutionDetailedTable(slot,rows,totalMats,materialsComplete,elyMillions,elyComplete){
    if(!rows.length)return "";
    const latestEvolutionId=evolutionGroups(slot).at(-1)?.id||"";
    const variableMaterialSummary=(r)=>{
      if(r.group.id!==latestEvolutionId)return "";
      const item=upgradeItemFor(r.entry);
      const allStages=item?stagesFor(item,r.entry).sort((a,b)=>(Number(a.sequence)||0)-(Number(b.sequence)||0)):[];
      if(allStages.length<2)return "";
      const perMaterial=new Map();
      for(const stage of allStages){
        const level=Number(stage.enhancementLevel??stage.sequence);
        for(const material of stageMaterialEntries(stage)){
          if(!(material.cost>0))continue;
          if(!perMaterial.has(material.name))perMaterial.set(material.name,[]);
          perMaterial.get(material.name).push({level,cost:material.cost});
        }
      }
      if(!perMaterial.size)return "";
      const summaries=[];
      for(const [name,values] of perMaterial){
        values.sort((a,b)=>a.level-b.level);
        const zero=values.find(v=>v.level===0);
        if(!zero||values.length<2)return "";
        const deltas=[];
        for(let i=1;i<values.length;i++){
          const levelDiff=values[i].level-values[i-1].level;
          if(levelDiff<=0)return "";
          deltas.push((values[i].cost-values[i-1].cost)/levelDiff);
        }
        const increase=deltas[0];
        if(!(increase>0)||!deltas.every(v=>Math.abs(v-increase)<1e-9))return "";
        summaries.push({name,initial:zero.cost,increase});
      }
      const grouped=new Map();
      summaries.forEach(s=>{
        const key=s.initial+"::"+s.increase;
        if(!grouped.has(key))grouped.set(key,{initial:s.initial,increase:s.increase,names:[]});
        grouped.get(key).names.push(s.name);
      });
      return [...grouped.values()].map(g=>
        g.initial.toLocaleString()+" at +0 · +"+g.increase.toLocaleString()+" per level · "+g.names.join(", ")
      ).join(" · ");
    };
    const body=rows.map(r=>{
      const variableSummary=variableMaterialSummary(r);
      const materialText=variableSummary || (r.materials.length
        ? (()=>{
            const byQty=new Map();
            r.materials.forEach(m=>{
              const qty=m.complete?m.required.toLocaleString():"TBC";
              if(!byQty.has(qty))byQty.set(qty,[]);
              byQty.get(qty).push(m.name);
            });
            return [...byQty.entries()].map(([qty,names])=>qty+" · "+names.join(", ")).join(" · ");
          })()
        : "—");
      const phaseEly=r.elyComplete?formatElyMillions(r.elyMillions):"—";
      return `<tr>
        <td>${esc(r.entry.itemName)}</td>
        <td>${esc(materialText)}</td>
        <td>${esc(phaseEly)}</td>
      </tr>`;
    }).join("");
    const totalMaterial=materialsComplete?totalMats.toLocaleString()+" matts":totalMats.toLocaleString()+" known + TBC";
    const totalEly=elyComplete?formatElyMillions(elyMillions):"—";
    return `<div class="upgrade-detail-table-wrap evolution-detail-table-wrap">
      <table class="upgrade-detail-table">
        <thead><tr><th>Evolution</th><th>Material Qty</th><th>Ely</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th>Selected path total</th><th>${esc(totalMaterial)}</th><th>${esc(totalEly)}</th></tr></tfoot>
      </table>
    </div>`;
  }

  function evolutionChainCalculator(slot,key,title,mode){
    const plan=evolutionPlan(slot,key);
    if(!plan)return unavailableCard(slot);
    const {st,currentGroup,targetGroup,currentEntry,targetEntry,rows,totalMats,totalRemainingMats,materialsComplete,elyMillions,elyComplete}=plan;
    const currentLatest=currentGroup.id===latestSeriesId(slot);
    const targetLatest=targetGroup.id===latestSeriesId(slot);

    const materialRows=rows.length?rows.map((r,index)=>{
      const phaseMaterials=r.materials.length?r.materials.map(material=>{
        const remainingText=material.complete
          ? (st.maxed?0:material.remaining).toLocaleString()+" remaining"
          : "TBC remaining";
        return `<div class="evolution-phase-material">
          <span class="evolution-phase-material-name">${esc(material.name)}</span>
          <input class="battle-material-input evolution-material-input" type="number" min="0" step="1" data-key="${esc(key)}" data-material="${esc(material.stateKey)}" value="${esc(material.owned)}" ${st.maxed?"disabled":""}>
          <span class="evolution-phase-remaining">/ ${esc(remainingText)}</span>
        </div>`;
      }).join(""):'<div class="evolution-phase-material muted"><span>Upgrade material not specified</span></div>';

      return `<div class="evolution-material-row">
        <div class="evolution-material-copy">
          <strong>${index+1}. ${esc(r.entry.itemName)} <span class="evolution-item-dungeon">· ${esc(r.group.dungeonName||r.group.id)}</span></strong>
          ${phaseMaterials}
        </div>
      </div>`;
    }).join(""):'<div class="evolution-material-empty">No upgrades required for the selected range.</div>';

    const elyText=st.maxed?"0":(rows.length&&elyComplete?formatElyMillions(elyMillions):"—");

    return `<article class="battle-item-card special-item-card evolution-chain-card ${st.maxed?"maxed":""}">
      <header class="battle-item-head"><strong>${esc(title)}</strong><label class="battle-maxed"><input class="battle-maxed-check" type="checkbox" data-key="${esc(key)}" ${st.maxed?"checked":""}> MAXED</label></header>
      <div class="evolution-stage-block">
        <span class="evolution-stage-title">Current stage</span>
        <div class="evolution-stage-controls">
          <label class="battle-field"><span>${esc(title)} Dungeon</span>${evolutionDungeonSelect(slot,key,"current",currentGroup.id,st.maxed)}</label>
          <label class="battle-field"><span>Enhancement level</span>${evolutionLevelSelect(slot,key,"current",currentEntry,st.current,st.maxed)}</label>
        </div>
        <small class="evolution-latest-note">Is latest: <strong>${currentLatest?"Yes":"No"}</strong></small>
      </div>
      <div class="evolution-stage-block">
        <span class="evolution-stage-title">Target stage</span>
        <div class="evolution-stage-controls">
          <label class="battle-field"><span>${esc(title)} Dungeon</span>${evolutionDungeonSelect(slot,key,"target",targetGroup.id,st.maxed)}</label>
          <label class="battle-field"><span>Enhancement level</span>${evolutionLevelSelect(slot,key,"target",targetEntry,st.target,st.maxed)}</label>
        </div>
        <small class="evolution-latest-note">Is latest: <strong>${targetLatest?"Yes":"No"}</strong></small>
      </div>
      ${[currentEntry,targetEntry].filter((entry,index,arr)=>entry&&upcomingForEntry(entry)&&arr.findIndex(x=>normId(x?.itemId)===normId(entry.itemId))===index).map(upcomingWarning).join("")}
      <details class="evolution-material-details">
        <summary class="evolution-material-head"><span>Upgrade Material</span></summary>
        <div class="evolution-material-list">
          ${materialRows}
        </div>
      </details>
      ${slot==="badge_5"?'<div class="evolution-assumption-note">Older Badge 5 phases without <code>item_upgrade</code> rows assume <strong>10 matts per enhancement</strong>.</div>':""}
      <div class="evolution-material-total">
        <span><small>Material</small><strong>Total for selected path</strong></span>
        <b>${st.maxed?"0":(materialsComplete?totalRemainingMats.toLocaleString()+" matts":totalRemainingMats.toLocaleString()+" known + TBC")}</b>
        ${!materialsComplete&&rows.length?'<small>Some material costs are not supplied for the selected evolution path.</small>':""}
      </div>
      <div class="evolution-ely-total">
        <span><small>Ely</small><strong>Total for selected path</strong></span>
        <b>${esc(elyText)}</b>
        ${!elyComplete&&rows.length?'<small>Ely data is not supplied for every selected evolution phase.</small>':""}
      </div>
      ${mode==="detailed"?evolutionDetailedTable(slot,rows,totalMats,materialsComplete,elyMillions,elyComplete):""}
    </article>`;
  }

  function specialCalculator(slot,key,title,mode){
    const sel=selectedEntry(slot,key);
    if(!sel)return `<article class="battle-item-card unavailable"><header class="battle-item-head"><strong>${esc(title)}</strong></header><div class="upgrade-unavailable-copy">No item series found in dungeon_drop.</div></article>`;
    const {group,entry,state:st}=sel;
    const item=upgradeItemFor(entry);
    const latest=group.id===latestSeriesId(slot);
    if(item)ensureTargets(slot,key,item,entry);
    const req=item?requirements(slot,key,item,entry):null;
    return `<article class="battle-item-card special-item-card ${st.maxed?"maxed":""}">
      <header class="battle-item-head"><strong>${esc(title)}</strong><label class="battle-maxed"><input class="battle-maxed-check" type="checkbox" data-key="${esc(key)}" ${st.maxed?"checked":""}> MAXED</label></header>
      <label class="battle-field full"><span>Select ${esc(title.toLowerCase())} series</span>${seriesSelect(slot,key)}</label>
      <div class="battle-latest-line">Is latest: <strong>${latest?"Yes":"No"}</strong></div>
      ${upcomingWarning(entry)}
      ${item?.syntheticRule==="badge6_copy_70"?`<div class="special-rule-note"><strong>Upgrade rule</strong><span>Each attempt consumes <b>1 × ${esc(entry.itemName)}</b> + <b>100M Ely</b> with a <b>70% success rate</b>.</span><small>Expected-cost calculation uses 1 ÷ 70% ≈ 1.43 attempts per successful enhancement.</small></div>`:""}
      ${item?.syntheticRule==="badge6_copy_100_two_per_run"?`<div class="special-rule-note"><strong>Upgrade rule</strong><span>Each enhancement consumes <b>1 × ${esc(entry.itemName)}</b>, costs <b>0 Ely</b>, and succeeds at <b>100%</b>.</span><small>This badge drops <b>2 per dungeon run</b>, so +0 → +30 requires 30 copies = 15 runs.</small></div>`:""}
      ${item?.progressionType==="evolve"?`<div class="special-rule-note evolve-rule-note"><strong>Evolution progression</strong><span>This series evolves level-by-level rather than changing Battle tiers.</span><small>The tracker follows <code>stage_sequence</code> from +1 through the final evolution level.</small></div>`:""}
      ${!item?missingUpgradeCopy(latest):`
        ${item.progressionType==="evolve"?evolveProgressSummary(item,key,req):""}
        <div class="battle-stage-pair special-stage-pair">
          <label class="battle-field"><span>${item.progressionType==="evolve"?"Current evolution":"Current stage"}</span>${stageSelect(item,entry,key,"current")}</label>
          <label class="battle-field"><span>${item.progressionType==="evolve"?"Target evolution":"Target stage"}</span>${stageSelect(item,entry,key,"target")}</label>
        </div>
        <div class="battle-materials special-materials">${gemMaterialRows(key,req)}</div>
        ${item.syntheticRule==="badge6_copy_70"
          ?`<div class="battle-estimate"><span>Expected attempts</span><strong>≈${Math.ceil(req.rawTotal)} attempts</strong><small>Based on 70% success; actual attempts may vary.</small></div>`
          :item.syntheticRule==="badge6_copy_100_two_per_run"
            ?`<div class="battle-estimate"><span>Estimated runs</span><strong>${Math.ceil(req.remainingTotal/2)} runs</strong><small>Based on 2 badge copies per dungeon run.</small></div>`
            :`<div class="battle-estimate"><span>${item.progressionType==="evolve"?"Estimated runs to max":"Estimated runs"}</span><strong>${runsText(req.remainingTotal)}</strong>${req.expected?'<small>Expected value adjusted for upgrade success rate.</small>':""}</div>`}
        ${mode==="detailed"?specialDetailTable(item,entry):""}
      `}
    </article>`;
  }

  function renderSpecials(mode){
    const slots=["charm","totem","relic","watch","necklace","textbook","sticker","belt","brooch","badge_1","badge_2","badge_3","badge_4","badge_5","badge_6"];
    return `<section class="upgrade-section-block"><h2>Special Equipment</h2><div class="battle-three-grid specials-card-grid">${slots.map(slot=>{
      if(slot==="pendant") return unavailableCard(slot);
      const title=labels[slot]||slot;
      if(slot==="totem"||slot==="badge_5")return seriesGroups(slot).length?evolutionChainCalculator(slot,"special:"+slot,title,mode):unavailableCard(slot);
      return seriesGroups(slot).length?specialCalculator(slot,"special:"+slot,title,mode):unavailableCard(slot);
    }).join("")}</div></section>`;
  }

  // Existing compact calculators remain for Specials and Gems while Battle is refined.
  const itemBySlot={};for(const item of D.items||[]){const slot=itemSlot(item);(itemBySlot[slot]||(itemBySlot[slot]=[])).push(item);}
  function latestItems(slot){const list=itemBySlot[slot]||[];if(!list.length)return[];const max=Math.max(...list.map(x=>dungeonNum(x.dungeonId)));return list.filter(x=>dungeonNum(x.dungeonId)===max);}
  function simpleStageOptions(item,current){const stages=item.stages||[];return ['<option value="0">Base</option>'].concat(stages.map(s=>`<option value="${s.sequence}" ${Number(current)===Number(s.sequence)?"selected":""}>${esc(stageName(item,s))}</option>`)).join("");}
  function compactCard(item,mode){
    const key="compact:"+item.itemId,st=getState(key),stages=item.stages||[],max=Math.max(0,...stages.map(s=>Number(s.sequence)||0));
    if(!st.target||st.target>max)st.target=max;
    const req=requirements(itemSlot(item),key,item,{itemName:item.itemName});
    return `<article class="battle-item-card special-item-card ${st.maxed?"maxed":""}">
      <header class="battle-item-head">
        <strong>${esc(item.itemName)}</strong>
        <label class="battle-maxed"><input class="battle-maxed-check" type="checkbox" data-key="${esc(key)}" ${st.maxed?"checked":""}> MAXED</label>
      </header>
      <div class="special-source-line">${esc(item.dungeonName||item.dungeonId||"Dungeon not specified")}</div>
      <div class="battle-stage-pair">
        <label class="battle-field"><span>Current stage</span>${stageSelect(item,{itemName:item.itemName},key,"current")}</label>
        <label class="battle-field"><span>Target stage</span>${stageSelect(item,{itemName:item.itemName},key,"target")}</label>
      </div>
      <div class="battle-materials special-materials">${gemMaterialRows(key,req)}</div>
      <div class="battle-estimate"><span>Estimated runs</span><strong>${runsText(req.remainingTotal)}</strong>${req.expected?'<small>Expected value adjusted for upgrade success rate.</small>':""}</div>
      ${mode==="detailed"?gemDetailTable(item,{itemName:item.itemName}):""}
    </article>`;
  }
  const unavailable=new Set(["totem","pendant","badge_5"]);
  const labels={charm:"Charm",totem:"Totem",relic:"Relic",watch:"Watch",necklace:"Necklace",textbook:"Textbook",sticker:"Sticker",belt:"Belt",brooch:"Brooch",pendant:"Pendant",badge_1:"Badge 1",badge_2:"Badge 2",badge_3:"Badge 3",badge_4:"Badge 4",badge_5:"Badge 5",badge_6:"Badge 6"};
  function unavailableCard(slot){return `<article class="upgrade-calc-card unavailable"><header class="upgrade-calc-head"><div><strong>${esc(labels[slot]||slot)}</strong><small>Upgrade data not yet available</small></div></header><div class="upgrade-unavailable-copy">Data not available in <code>item_upgrade</code>.</div></article>`;}
  function renderGems(mode){return renderGemSection(mode);}

  let mode=localStorage.getItem(MODE_KEY)==="detailed"?"detailed":"simple";
  let tab=["battle","specials","gems"].includes(localStorage.getItem(TAB_KEY))?localStorage.getItem(TAB_KEY):"battle";
  function syncMode(){$("upgrade-mode-simple")?.classList.toggle("active",mode==="simple");$("upgrade-mode-detailed")?.classList.toggle("active",mode==="detailed");$("upgrade-mode-simple")?.setAttribute("aria-pressed",String(mode==="simple"));$("upgrade-mode-detailed")?.setAttribute("aria-pressed",String(mode==="detailed"));}
  function syncTabs(){document.querySelectorAll(".upgrade-game-tab").forEach(b=>{const active=b.dataset.upgradeTab===tab;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});}
  function render(){
    syncMode();syncTabs();
    const root=$("upgrade-tab-content");if(!root)return;
    try{
      root.innerHTML=tab==="battle"?renderBattle(mode):tab==="specials"?renderSpecials(mode):renderGems(mode);
    }catch(err){
      console.error("Item Upgrade tab render failed:",tab,err);
      root.innerHTML='<div class="upgrade-render-error"><strong>Unable to render this tab.</strong><span>Please refresh the page. The tracker will preserve your saved inputs.</span></div>';
    }
  }
  $("upgrade-mode-simple")?.addEventListener("click",()=>{mode="simple";localStorage.setItem(MODE_KEY,mode);render();});
  $("upgrade-mode-detailed")?.addEventListener("click",()=>{mode="detailed";localStorage.setItem(MODE_KEY,mode);render();});
  document.querySelectorAll(".upgrade-game-tab").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.upgradeTab;localStorage.setItem(TAB_KEY,tab);render();}));

  $("upgrade-tab-content")?.addEventListener("change",(event)=>{
    const el=event.target;
    if(el.id==="battle-second-weapon-toggle"){state["battle:weapon2Enabled"]=el.checked;saveState();render();return;}
    const key=el.dataset?.key;if(!key)return;const st=getState(key);
    if(el.classList.contains("evolution-current-series")){
      st.currentSeriesId=el.value;st.current=0;st.mats={};
      const groups=evolutionGroups(key.endsWith("totem")?"totem":"badge_5");
      const ci=groups.findIndex(g=>g.id===st.currentSeriesId),ti=groups.findIndex(g=>g.id===st.targetSeriesId);
      if(ti<ci){st.targetSeriesId=st.currentSeriesId;st.target=0;}
    }
    if(el.classList.contains("evolution-target-series")){
      st.targetSeriesId=el.value;st.target=0;st.mats={};
      const groups=evolutionGroups(key.endsWith("totem")?"totem":"badge_5");
      const ci=groups.findIndex(g=>g.id===st.currentSeriesId),ti=groups.findIndex(g=>g.id===st.targetSeriesId);
      if(ti<ci){st.currentSeriesId=st.targetSeriesId;st.current=0;}
    }
    if(el.classList.contains("evolution-current-level"))st.current=Number(el.value)||0;
    if(el.classList.contains("evolution-target-level"))st.target=Number(el.value)||0;
    if(el.classList.contains("battle-series-select")){
      st.seriesId=el.value;st.typeIndex=0;st.current=0;st.target=0;st.mats={};
      if(key==="gems:red"){
        for(const otherKey of ["gems:yellow","gems:blue"]){
          const other=getState(otherKey);
          if(!other.customSeries){other.seriesId=el.value;other.typeIndex=0;other.current=0;other.target=0;other.mats={};}
        }
      }else if(key==="gems:yellow"||key==="gems:blue"){
        st.customSeries=true;
      }
    }
    if(el.classList.contains("battle-type-choice")){st.typeIndex=Number(el.value)||0;st.current=0;st.target=0;st.mats={};}
    if(el.classList.contains("battle-current-select"))st.current=Number(el.value)||0;
    if(el.classList.contains("battle-target-select"))st.target=Number(el.value)||0;
    if(el.classList.contains("battle-maxed-check"))st.maxed=el.checked;
    if(el.classList.contains("battle-material-input")||el.classList.contains("compact-mats")){st.mats=st.mats||{};st.mats[el.dataset.material]=Math.max(0,Number(el.value)||0);}
    saveState();render();
  });
  $("upgrade-tab-content")?.addEventListener("input",(event)=>{
    const el=event.target,key=el.dataset?.key;if(!key)return;
    if(el.classList.contains("battle-material-input")||el.classList.contains("compact-mats")){const st=getState(key);st.mats=st.mats||{};st.mats[el.dataset.material]=Math.max(0,Number(el.value)||0);saveState();}
  });

  render();
})();