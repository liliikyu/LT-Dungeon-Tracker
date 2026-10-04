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
function tracker(savedTab='battle',stock=379,maxed=false,shoes=353,badgeSeries='dng_138',badgeCurrent=0,badgeStock=0,bannerStock=0,badge1Maxed=true){
  const saved={
    'lt-item-upgrade-tab-v1':savedTab,
    'lt-item-upgrade-inventory-v1':JSON.stringify({"Dorothea's Emerald Bow":stock,"Dorothea's Red Shoes":shoes,'Mutant Clawrence Badge 6':badgeStock,'Banner of Inspiraton':bannerStock}),
    'lt-item-upgrade-priority-v1':JSON.stringify({'battle:glasses':1,'battle:stockings':2,'battle:bindi':3}),
    'lt-item-upgrade-progress-v2':JSON.stringify({
      'battle:glasses':{seriesId:'dng_125',current:0,target:6,maxed},
      'battle:stockings':{seriesId:'dng_125',current:0,target:6},
      'battle:bindi':{seriesId:'dng_125',current:0,target:6},
      'special:badge_6':{seriesId:badgeSeries,current:badgeCurrent,target:30},
      'special:badge_1':{maxed:badge1Maxed},
    }),
  };
  const root={innerHTML:'',classList:{toggle(){}},addEventListener(){}};
  const localStorage={getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v};
  const stylesheet={href:'assets/styles.css?v=old',getAttribute(){return this.href;},setAttribute(name,value){this[name]=value;}};
  const document={documentElement:{dataset:{},style:{}},getElementById:id=>id==='upgrade-tab-content'?root:null,querySelectorAll:()=>[],querySelector:()=>stylesheet};
  const ctx={window:{},document,localStorage,console};
  for(const file of ['data.js','item-upgrade-data.js','material-sources.js','inventory-allocation.js']){
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),ctx);
  }
  let source=fs.readFileSync(path.join(__dirname,'../assets/item-upgrade.js'),'utf8').replace(/\r\n/g,'\n');
  source=source.replace('  render();\n})();','  render(); window.testMove=(key,direction)=>{const moved=moveSummaryPriority(key,direction);render();window.testRefundLine=(id,type,current)=>decomposableLine(D.items.find(item=>item.itemId===id),{itemType:type,itemName:D.items.find(item=>item.itemId===id)?.itemName},current); window.testRefund=(id,type,current)=>decompositionRefund(D.items.find(item=>item.itemId===id),{itemType:type},current); window.testPlan=inventoryPlan;return moved;}; window.testRefundLine=(id,type,current)=>decomposableLine(D.items.find(item=>item.itemId===id),{itemType:type,itemName:D.items.find(item=>item.itemId===id)?.itemName},current); window.testRefund=(id,type,current)=>decompositionRefund(D.items.find(item=>item.itemId===id),{itemType:type},current); window.testPlan=inventoryPlan; window.testAdd=addInventoryAmount; window.testRuns=summaryRunsText; window.testProjection=(key)=>summaryProjectedProgress(inventoryPlan.cards.find(card=>card.key===key)); window.testRequirements=(slot,key)=>{const selected=selectedEntry(slot,key);return requirements(slot,key,upgradeItemFor(selected.entry),selected.entry);}; window.testApprox=(slot,key)=>{const selected=selectedEntry(slot,key);return approximateReachableStage(slot,key,upgradeItemFor(selected.entry),selected.entry);};\n})();');
  vm.runInNewContext(source,ctx);
  assert.equal(stylesheet.href,'assets/styles.css?v=13.9.4.165-inventory-add','fresh tracker replaces the stylesheet from cached HTML');
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
assert(!summary.root.innerHTML.includes('data-material="Banner of Inspiraton"'),'hide empty saved material for maxed Badge 1');
assert(tracker('summary',379,false,353,'dng_138',0,0,5).root.innerHTML.includes('data-material="Banner of Inspiraton"'),'keep unused stock editable');
assert(tracker('summary',379,false,353,'dng_138',0,0,0,false).root.innerHTML.includes('data-material="Banner of Inspiraton"'),'keep zero stock material needed by an unfinished item');
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
const claw=tracker('specials');
const clawReq=claw.ctx.window.testRequirements('badge_6','special:badge_6');
assert.deepEqual(Object.keys(clawReq.mats),['Mutant Clawrence Badge 6']);
assert.equal(Math.ceil(clawReq.mats['Mutant Clawrence Badge 6']),43);
assert(claw.root.innerHTML.includes('<strong>22 runs</strong>'));
assert(!claw.root.innerHTML.includes('Vigor Mutant Ent Badge</span>'));
const partial=tracker('specials',379,false,353,'dng_138',29,1);
assert.equal(partial.ctx.window.testRequirements('badge_6','special:badge_6').remainingTotal,0);
const forest=tracker('specials',379,false,353,'dng_129');
const forestReq=forest.ctx.window.testRequirements('badge_6','special:badge_6');
assert.equal(forestReq.mats['Vigor Mutant Ent Badge'],30);
assert.equal(forestReq.elyMillions,0);
assert(forest.root.innerHTML.includes('<strong>15 runs</strong>'));
console.log('Independent Badge 6 enhancement regressions passed.');

const projectedSummary=tracker('summary',1000,false,1000);
assert.equal(projectedSummary.ctx.window.testProjection('battle:glasses'),33);
assert.equal(projectedSummary.ctx.window.testProjection('battle:bindi'),0);
assert(projectedSummary.root.innerHTML.includes('summary-projected-progress'));

const reordered=tracker('summary');
assert.equal(reordered.ctx.window.testMove('battle:glasses',-1),false);
for(let step=0;step<3;step++)assert.equal(reordered.ctx.window.testMove('battle:stockings',-1),true);
assert.equal(reordered.ctx.window.testPlan.allocations['battle:stockings'][0].allocated,379);
assert.equal(reordered.ctx.window.testPlan.allocations['battle:glasses'][0].allocated,0);
assert.equal(JSON.parse(reordered.saved['lt-item-upgrade-priority-v1'])['battle:stockings'],1);
assert.equal(reordered.ctx.window.testMove('battle:stockings',1),true);
assert.equal(reordered.ctx.window.testPlan.allocations['battle:glasses'][0].allocated,379);

assert.equal(battle.ctx.window.testRefund('dng_131_armor_icarus','armor_icarus',0).length,0);
const armorRefund=battle.ctx.window.testRefund('dng_131_armor_icarus','armor_icarus',2);
assert.equal(armorRefund.length,2);
assert.equal(armorRefund[0].quantity,114);
assert.equal(armorRefund[1].quantity,114);
assert.equal(battle.ctx.window.testRefund('dng_135_ring_mirror','ring_mirror',2).reduce((sum,m)=>sum+m.quantity,0),342);
assert.equal(battle.ctx.window.testRefund('dng_131_armor_icarus','armor_grendel',2),null);
assert(battle.root.innerHTML.includes('Is decomposable?: <strong>No</strong>'));
assert(battle.root.innerHTML.includes('Is decomposable?: <strong>Yes</strong>'));

assert(projectedSummary.root.innerHTML.includes('Current: Base · Projected: Radiant · Target: Lucent'));
assert(summary.root.innerHTML.includes('Current: +0 · Projected: +0 · Target: +30'));
assert(summary.root.innerHTML.includes('Current: Sky Coliseum +0 · Projected: Sky Coliseum +0 · Target: Zerenis Training Center +30'));

const mirrorLine=battle.ctx.window.testRefundLine('dng_135_ring_mirror','ring_mirror',2);
assert(mirrorLine.includes('171 unique material to be refunded'));
assert(!mirrorLine.includes('ascension stones'));
const ascendedLine=battle.ctx.window.testRefundLine('dng_135_ring_mirror','ring_mirror',7);
assert(ascendedLine.includes('and 75 ascension stones to be refunded'));

const additions=tracker('summary');
assert.equal(additions.ctx.window.testAdd('Coin of Restraint',3366),true);
assert.equal(additions.ctx.window.testAdd('Coin of Restraint',166),true);
for(const invalid of [0,-1,1.5,'invalid'])assert.equal(additions.ctx.window.testAdd('Coin of Restraint',invalid),false);
const stockValue=Object.values(additions.saved).find(value=>typeof value==='string'&&value.includes('Coin of Restraint'));
assert.equal(JSON.parse(stockValue)['Coin of Restraint'],3532);
assert.match(summary.root.innerHTML, /Target: Lucent<br>/);
assert.equal(summary.ctx.window.testRuns({slot:'weapon',key:'battle:weapon1'},[{name:'Horn of the Incomplete Demon God',remaining:115},{name:'Demiurge Stone of Ascension',required:37,remaining:37}]),'Approx. 1–2 Difficulty IV runs and / or 2 Difficulty V runs');
console.log('Inventory addition and summary run estimates passed.');assert.equal(summary.ctx.window.testRuns({slot:'weapon',key:'battle:weapon1'},[{name:'Horn of the Incomplete Demon God',required:115,remaining:115}]),'Approx. 1–2 Difficulty IV runs');
assert.equal(summary.ctx.window.testRuns({slot:'weapon',key:'battle:weapon1'},[{name:'Demiurge Stone of Ascension',required:37,remaining:0}]),'Approx. 0 Difficulty IV runs and / or 0 Difficulty V runs');
