// Allocate shared inventory once, in card priority order, for every tracker tab.
((root)=>{
  function allocate(cards,inventory){
    const available={...inventory},allocations={};
    for(const card of cards){
      allocations[card.key]=[];
      if(card.maxed)continue;
      for(const [name,cost] of Object.entries(card.materials||{})){
        const required=Math.max(0,Math.ceil(Number(cost)||0));
        const have=Math.max(0,Number(available[name])||0);
        const allocated=Math.min(required,have);
        available[name]=have-allocated;
        allocations[card.key].push({name,required,allocated,remaining:required-allocated});
      }
    }
    return allocations;
  }
  root.LT_INVENTORY_ALLOCATION={allocate};
})(typeof window!=="undefined"?window:globalThis);
