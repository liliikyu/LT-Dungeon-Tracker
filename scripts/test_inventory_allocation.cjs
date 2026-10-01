const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/inventory-allocation.js'),'utf8'),context);
const allocate=context.window.LT_INVENTORY_ALLOCATION.allocate;
const cards=[
  {key:'glasses',materials:{bow:3839,shoes:3839}},
  {key:'stockings',materials:{bow:3839,shoes:3839}},
  {key:'bindi',materials:{bow:3839,shoes:3839}},
];
let plan=allocate(cards,{bow:379,shoes:353});
assert.equal(plan.glasses[0].allocated,379);
assert.equal(plan.glasses[1].allocated,353);
assert.equal(plan.glasses.reduce((n,r)=>n+r.remaining,0),6946);
assert.equal(plan.stockings[0].allocated,0);
assert.equal(plan.bindi[1].allocated,0);
assert.equal(plan.stockings.reduce((n,r)=>n+r.remaining,0),7678);
plan=allocate(cards,{bow:4000,shoes:0});
assert.equal(plan.glasses[0].allocated,3839);
assert.equal(plan.stockings[0].allocated,161);
assert.equal(plan.bindi[0].allocated,0);
assert.equal(allocate([...cards].reverse(),{bow:379}).bindi[0].allocated,379);
assert.equal(allocate([{...cards[0],maxed:true},cards[1]],{bow:379}).stockings[0].allocated,379);
assert.equal(allocate([{key:'first',materials:{stone:2.1}},{key:'second',materials:{stone:4}}],{stone:5}).second[0].allocated,2);
console.log('Priority allocation checks passed.');

// Run the real tracker with a tiny DOM fixture, including direct Battle startup.
function tracker(savedTab='battle',stock=379,maxed=false,shoes=353){
  const saved={
    'lt-item-upgrade-tab-v1':savedTab,
    'lt-item-upgrade-inventory-v1':JSON.stringify({"Dorothea's Emerald Bow":stock,"Dorothea's Red Shoes":shoes}),
    'lt-item-upgrade-priority-v1':JSON.stringify({'battle:glasses':1,'battle:stockings':2,'battle:bindi':3}),
    'lt-item-upgrade-progress-v2':JSON.stringify({
      'battle:glasses':{seriesId:'dng_125',current:0,target:6,maxed},
      'battle:stockings':{seriesId:'dng_125',current:0,target:6},
      'battle:bindi':{seriesId:'dng_125',current:0,target:6},
    }),
  };
  const root={innerHTML:'',classList:{toggle(){}},addEventListener(){}};
  const localStorage={getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v};
  const document={documentElement:{dataset:{},style:{}},getElementById:id=>id==='upgrade-tab-content'?root:null,querySelectorAll:()=>[]};
  const ctx={window:{},document,localStorage,console};
  for(const file of ['data.js','item-upgrade-data.js','material-sources.js','inventory-allocation.js']){
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),ctx);
  }
  let source=fs.readFileSync(path.join(__dirname,'../assets/item-upgrade.js'),'utf8');
  source=source.replace('  render();\n})();','  render(); window.testPlan=inventoryPlan; window.testRequirements=(slot,key)=>{const selected=selectedEntry(slot,key);return requirements(slot,key,upgradeItemFor(selected.entry),selected.entry);}; window.testApprox=(slot,key)=>{const selected=selectedEntry(slot,key);return approximateReachableStage(slot,key,upgradeItemFor(selected.entry),selected.entry);};\n})();');
  vm.runInNewContext(source,ctx);
  assert(!root.innerHTML.includes('Unable to render this tab.'));
  return {ctx,root,saved};
}
const battle=tracker();
for(const slot of ['bindi','glasses','stockings']){
  const key='battle:'+slot;
  const req=battle.ctx.window.testRequirements(slot,key);
  const rows=battle.ctx.window.testPlan.allocations[key];
  assert.equal(req.remainingTotal,rows.filter(r=>r.name!==req.stoneName).reduce((n,r)=>n+r.remaining,0));
}
const glasses=battle.ctx.window.testPlan.allocations['battle:glasses'];
assert.equal(glasses.find(r=>r.name==="Dorothea's Emerald Bow").allocated,379);
assert.equal(battle.ctx.window.testRequirements('glasses','battle:glasses').remainingTotal,6946);
assert.equal(battle.ctx.window.testRequirements('bindi','battle:bindi').remainingTotal,7678);
assert.equal(battle.ctx.window.testPlan.allocations['battle:bindi'].find(r=>r.name==="Dorothea's Emerald Bow").allocated,0);
assert(battle.root.innerHTML.includes('readonly title="Edit this quantity using the number field in Summary &amp; Inventory.'));
assert(!battle.root.innerHTML.includes('value="379"')||battle.root.innerHTML.match(/value="379"/g).length===1);
const summary=tracker('summary');
assert.equal(JSON.stringify(summary.ctx.window.testPlan.allocations),JSON.stringify(battle.ctx.window.testPlan.allocations));
const enough=tracker('battle',10000);
assert.equal(enough.ctx.window.testRequirements('glasses','battle:glasses').remainingTotal,enough.ctx.window.testPlan.allocations['battle:glasses'].reduce((n,r)=>n+r.remaining,0));
const maxed=tracker('battle',379,true);
assert.equal(maxed.ctx.window.testPlan.allocations['battle:stockings'].find(r=>r.name==="Dorothea's Emerald Bow").allocated,379);
const reachable=tracker('battle',1000,false,1000);
assert.equal(reachable.ctx.window.testApprox('glasses','battle:glasses'),'Radiant');
assert.equal(reachable.ctx.window.testApprox('bindi','battle:bindi'),'Base');
for(const tab of ['specials','gems']){
  const other=tracker(tab);
  assert.equal(JSON.stringify(other.ctx.window.testPlan.allocations),JSON.stringify(battle.ctx.window.testPlan.allocations));
}
console.log('Battle and Summary integration checks passed.');
