// Acquisition sources come from dungeon_drop, independently of upgrade series.
((root)=>{
  function materialKey(name){
    return String(name||"").toLowerCase()
      .replace(/\s*\((event|etc|consume|equipment|equip)\)\s*$/i,"")
      .replace(/stone of ascension/g,"ascension stone")
      .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  }
  function createResolver(data){
    const dungeons=new Map((data.dungeons||[]).map(d=>[d.id||d.dungeonId,d]));
    const index=new Map();
    for(const source of data.materialSources||[]){
      for(const name of [source.name,...(source.aliases||[])]){
        const key=materialKey(name);
        if(!index.has(key))index.set(key,[]);
        index.get(key).push(source);
      }
    }
    return (name,preferredDungeonIds=[])=>{
      const candidates=(index.get(materialKey(name))||[]).filter(s=>dungeons.has(s.dungeonId));
      // A hint can disambiguate real drop sources; it cannot invent a location.
      const source=candidates.find(s=>preferredDungeonIds.includes(s.dungeonId))||candidates[0];
      if(!source)return null;
      const dungeon=dungeons.get(source.dungeonId);
      // Difficulty describes the material source, not a separate inventory group.
      return {key:source.dungeonId,dungeon,difficulty:source.difficulty||null};
    };
  }
  function inventoryHeading(data,catalog,dungeon,materialNames){
    if(!dungeon)return "Dungeon unknown";
    const names=new Set(materialNames.map(materialKey));
    const targets=new Set();
    for(const source of data.materialSources||[]){
      if(source.dungeonId!==(dungeon.id||dungeon.dungeonId))continue;
      if(![source.name,...(source.aliases||[])].some(name=>names.has(materialKey(name))))continue;
      for(const id of source.upgradeItemIds||[])targets.add(id.toLowerCase().replace(/bellial/g,"belial"));
    }
    const labels={weapon:"Weapon",elemental_stone:"Elemental Stone",armor:"Armor",
      bindi:"Bindi",glasses:"Glasses",stockings:"Stockings",earrings:"Earrings",ring:"Ring",cloak:"Cloak",
      charm:"Charm",totem:"Totem",relic:"Relic",watch:"Watch",necklace:"Necklace",textbook:"Textbook",
      sticker:"Sticker",belt:"Belt",brooch:"Brooch",pendant:"Pendant",
      badge_1:"Badge 1",badge_2:"Badge 2",badge_3:"Badge 3",badge_4:"Badge 4",badge_5:"Badge 5",badge_6:"Badge 6",
      red_gem:"Red Gem",yellow_gem:"Yellow Gem",blue_gem:"Blue Gem"};
    const types=new Set();
    for(const item of catalog||[]){
      if(!targets.has(String(item.itemId||"").toLowerCase().replace(/bellial/g,"belial")))continue;
      const type=String(item.itemType||"").toLowerCase();
      const slot=Object.keys(labels).find(key=>type===key||type.startsWith(key+"_"));
      if(slot)types.add(slot);
    }
    // Early evolution materials may link to an upgrade ID absent from the catalog.
    for(const id of targets){
      const slot=Object.keys(labels).find(key=>id.endsWith("_"+key));
      if(slot)types.add(slot);
    }
    const equipment=Object.keys(labels).filter(key=>types.has(key)).map(key=>labels[key]);
    return [dungeon.level,dungeon.name].filter(Boolean).join(" · ")+
      (equipment.length?" ("+equipment.join(" / ")+")":"");
  }
  function compareInventoryMaterials(a,b){
    const ascension=name=>/\bascension stone$/.test(materialKey(name));
    return Number(ascension(a))-Number(ascension(b))||a.localeCompare(b);
  }
  root.LT_MATERIAL_SOURCES={materialKey,createResolver,inventoryHeading,compareInventoryMaterials};
})(typeof window!=="undefined"?window:globalThis);
