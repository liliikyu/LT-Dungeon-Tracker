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
  root.LT_MATERIAL_SOURCES={materialKey,createResolver};
})(typeof window!=="undefined"?window:globalThis);
