const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context={window:{}};
for(const file of ['data.js','material-sources.js']){
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),context);
}
const resolve=context.window.LT_MATERIAL_SOURCES.createResolver(context.window.LT_DATA);
for(const [name,label,key] of [
  ['Banner of Inspiration','Inspirational Playground','dng_132'],
  ['Banner of Inspiraton','Inspirational Playground','dng_132'],
  ['Belial Stone of Ascension','Rikimo Pelke Difficulty V','dng_135:V'],
  ['Dorothea Ascension Stone','Emeraldia Difficulty V','dng_125:V'],
  ['Dorothea Stone of Ascension','Emeraldia Difficulty V','dng_125:V'],
  ['Vigor Mutant Ent Badge','Unknown Forest','dng_129'],
  ['Mutant Clawrence Badge 6','Unknown Beach','dng_138'],
]){
  // Deliberately supply an unrelated upgrade-series hint.
  const source=resolve(name,['dng_79']);
  assert.equal(source?.dungeon.name,label,name);
  assert.equal(source?.key,key,name);
}
assert.equal(resolve('Unlisted material',['dng_135']),null);
assert.equal(resolve('  DOROTHEA Stone of Ascension (Event) ').key,'dng_125:V');
assert.notEqual(resolve('Belial Stone of Ascension').key,resolve("Belial's Brooch").key);
const multiple=context.window.LT_MATERIAL_SOURCES.createResolver({
  dungeons:[{id:'a',name:'A'},{id:'b',name:'B'}],
  materialSources:[{name:'Shared',dungeonId:'a'},{name:'Shared',dungeonId:'b'}],
});
assert.equal(multiple('Shared',['b']).key,'b');
assert.equal(multiple('Shared',['unrelated']).key,'a');
console.log('Material source mapping regression checks passed.');
