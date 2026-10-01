const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context={window:{}};
for(const file of ['data.js','item-upgrade-data.js','material-sources.js']){
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),context);
}
const resolve=context.window.LT_MATERIAL_SOURCES.createResolver(context.window.LT_DATA);
for(const [name,label,key] of [
  ['Banner of Inspiration','Inspirational Playground','dng_132'],
  ['Banner of Inspiraton','Inspirational Playground','dng_132'],
  ['Belial Stone of Ascension','Rikimo Pelke','dng_135'],
  ['Dorothea Ascension Stone','Emeraldia','dng_125'],
  ['Dorothea Stone of Ascension','Emeraldia','dng_125'],
  ['Vigor Mutant Ent Badge','Unknown Forest','dng_129'],
  ['Mutant Clawrence Badge 6','Unknown Beach','dng_138'],
]){
  // Deliberately supply an unrelated upgrade-series hint.
  const source=resolve(name,['dng_79']);
  assert.equal(source?.dungeon.name,label,name);
  assert.equal(source?.key,key,name);
}
assert.equal(resolve('Unlisted material',['dng_135']),null);
assert.equal(resolve('  DOROTHEA Stone of Ascension (Event) ').key,'dng_125');
assert.equal(resolve('Belial Stone of Ascension').key,resolve("Belial's Brooch").key);
assert.equal(resolve('Dorothea Stone of Ascension').key,resolve("Dorothea's Emerald Bow").key);
assert.equal(resolve('Belial Stone of Ascension').difficulty,'V');
assert.equal(resolve('Dorothea Ascension Stone').difficulty,'V');
assert.equal(resolve("Belial's Brooch").difficulty,null);
const multiple=context.window.LT_MATERIAL_SOURCES.createResolver({
  dungeons:[{id:'a',name:'A'},{id:'b',name:'B'}],
  materialSources:[{name:'Shared',dungeonId:'a'},{name:'Shared',dungeonId:'b'}],
});
assert.equal(multiple('Shared',['b']).key,'b');
assert.equal(multiple('Shared',['unrelated']).key,'a');
const heading=context.window.LT_MATERIAL_SOURCES.inventoryHeading;
const data=context.window.LT_DATA;
const catalog=context.window.LT_ITEM_UPGRADE_DATA.battleCatalog;
const emeraldia=data.dungeons.find(d=>d.id==='dng_125');
assert.equal(heading(data,catalog,emeraldia,['Dorothea Stone of Ascension']),
  'UL9000 · Emeraldia (Bindi / Glasses / Stockings)');
assert.equal(heading(data,catalog,emeraldia,['Dorothea Ascension Stone','Dorothea Stone of Ascension']),
  'UL9000 · Emeraldia (Bindi / Glasses / Stockings)');
assert.equal(heading(data,catalog,emeraldia,['Unlisted material']),'UL9000 · Emeraldia');
assert.equal(heading(data,catalog,null,[]),'Dungeon unknown');
assert.equal(heading(data,catalog,data.dungeons.find(d=>d.id==='dng_129'),['Vigor Mutant Ent Badge']),
  'UL3500 · Unknown Forest (Badge 6)');
console.log('Material source mapping regression checks passed.');
