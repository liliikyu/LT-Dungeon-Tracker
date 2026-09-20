(()=>{
  const THEME_KEY="lt-theme";
  const $=(id)=>document.getElementById(id);
  const preferredTheme=()=>window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
  const savedTheme=()=>{const x=localStorage.getItem(THEME_KEY);return ["system","light","dark"].includes(x)?x:"system";};
  const applyTheme=(mode)=>{
    const resolved=mode==="system"?preferredTheme():mode;
    document.documentElement.dataset.theme=resolved;
    document.documentElement.style.colorScheme=resolved;
    const button=$("theme-toggle");
    if(button){
      button.textContent=mode==="light"?"☀":mode==="dark"?"☾":"◐";
      const label=mode.charAt(0).toUpperCase()+mode.slice(1);
      button.title="Theme: "+label;
      button.setAttribute("aria-label","Theme: "+label+". Click to switch theme.");
    }
  };
  $("theme-toggle")?.addEventListener("click",()=>{
    const c=savedTheme();
    const n=c==="system"?"light":c==="light"?"dark":"system";
    localStorage.setItem(THEME_KEY,n);
    applyTheme(n);
  });
  applyTheme(savedTheme());

  const items=[
    {
      category:"weapon",
      itemName:"Annihiliation/Remembrance Weapon",
      dungeon:"Pleroma",
      progression:"tier",
      material:"Torn Wing of the Incomplete Demon God, Horn of the Incomplete Demon God",
      stages:[
        ["Eminent",400,0],["Radiant",480,0],["Immortal",560,0],["Mythic",640,0],
        ["Ethereal",760,0],["Lucent",999,0],["Ascended",999,999]
      ],
      stone:"Demiurge Stone of Ascension (D5 only)"
    },
    {
      category:"accessory",
      itemName:"Witch/Dark Elf Bindi",
      dungeon:"Emeraldia",
      progression:"tier",
      material:"Dorothea's Emerald Bow, Dorothea's Red Shoes",
      stages:[
        ["Eminent",400,0],["Radiant",480,0],["Immortal",560,0],["Mythic",640,0],
        ["Ethereal",760,0],["Lucent",999,0],["Ascended",999,500]
      ],
      stone:"Dorothea Ascension Stone (D5 only)"
    },
    {
      category:"accessory",
      itemName:"Dark Dragon Necklace",
      dungeon:"Emeraldia",
      progression:"tier",
      material:"Tipeta's Dragon Mace",
      stages:[
        ["Eminent",400,0],["Radiant",480,0],["Immortal",560,0],["Mythic",640,0],
        ["Ethereal",760,0],["Lucent",1000,0]
      ]
    },
    {
      category:"accessory",
      itemName:"Mirror Cloak",
      dungeon:"Rikimo Pelke",
      progression:"tier",
      material:"Belial's Brooch, Belial's Heart Sticker",
      stages:[
        ["Eminent",260,0],["Radiant",310,0],["Immortal",365,0],["Mythic",415,0],
        ["Ethereal",495,0],["Lucent",650,0]
      ]
    },
    {
      category:"accessory",
      itemName:"Mirror Earrings",
      dungeon:"Rikimo Pelke",
      progression:"tier",
      material:"Belial's Brooch, Belial's Heart Sticker",
      stages:[
        ["Eminent",260,0],["Radiant",310,0],["Immortal",365,0],["Mythic",415,0],
        ["Ethereal",495,0],["Lucent",650,0],["Ascended",650,250]
      ],
      stone:"Belial Stone of Ascension"
    },
    {
      category:"accessory",
      itemName:"Mirror Ring",
      dungeon:"Rikimo Pelke",
      progression:"tier",
      material:"Belial's Brooch, Belial's Heart Sticker",
      stages:[
        ["Eminent",260,0],["Radiant",310,0],["Immortal",365,0],["Mythic",415,0],
        ["Ethereal",495,0],["Lucent",650,0],["Ascended",650,250]
      ],
      stone:"Belial Stone of Ascension"
    }
  ];

  const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const grid=$("upgrade-grid");

  function render(){
    const q=String($("upgrade-search")?.value||"").trim().toLowerCase();
    const cat=$("upgrade-category")?.value||"all";
    const prog=$("upgrade-progression")?.value||"all";
    const visible=items.filter(item=>{
      if(cat!=="all"&&item.category!==cat)return false;
      if(prog!=="all"&&item.progression!==prog)return false;
      if(!q)return true;
      return [item.itemName,item.dungeon,item.material,item.stone].join(" ").toLowerCase().includes(q);
    });
    grid.innerHTML=visible.map(item=>{
      const last=item.stages[item.stages.length-1];
      const chain=item.stages.map((stage,i)=>`
        ${i?'<span class="upgrade-arrow">→</span>':""}
        <span class="upgrade-step ${i===0?"current":""}">${esc(stage[0])}</span>
      `).join("");
      const ascension=last[2]>0&&item.stone
        ? `<div class="upgrade-cost-row"><span>${esc(item.stone)}</span><strong>${esc(last[2])}</strong></div>`
        :"";
      return `<article class="upgrade-card">
        <header class="upgrade-card-head">
          <span><strong>${esc(item.itemName)}</strong><small>${esc(item.dungeon)} · ${item.stages.length} stages</small></span>
          <span class="upgrade-card-type">${item.category}</span>
        </header>
        <div class="upgrade-chain">${chain}</div>
        <div class="upgrade-costs">
          <div class="upgrade-cost-row"><span>Primary material</span><strong>${esc(item.material)}</strong></div>
          <div class="upgrade-cost-row"><span>Final-stage material cost</span><strong>${esc(last[1])}</strong></div>
          ${ascension}
        </div>
      </article>`;
    }).join("") || '<div class="empty-state">No upgrade items match the current filters.</div>';
  }

  ["upgrade-search","upgrade-category","upgrade-progression"].forEach(id=>{
    $(id)?.addEventListener(id==="upgrade-search"?"input":"change",render);
  });
  render();
})();