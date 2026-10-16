import test from 'node:test';
import assert from 'node:assert/strict';
import {initialQuality,lowerQuality,GRAPHICS} from '../src/graphics.js';
import {navigateScreens} from '../src/navigation.js';
test('data-saving and low-memory devices avoid expensive graphics',()=>{
 for(const device of [{memory:2,cores:8},{memory:16,cores:16,saveData:true},{memory:8,cores:4,coarse:true}]){
  const preset=GRAPHICS[initialQuality(device)];
  assert.equal(preset.shadows,false);assert.equal(preset.effects,false);assert.ok(preset.dpr<=1);
 }
});
test('powerful touch devices do not enable desktop post-processing',()=>{
 assert.equal(GRAPHICS[initialQuality({memory:16,cores:12,coarse:true})].effects,false);
});
test('missing hardware APIs still yield a usable graphics preset',()=>{
 assert.equal(initialQuality(),'balanced');
 assert.ok(GRAPHICS[initialQuality({memory:undefined,cores:undefined})]);
});
test('repeated slow-frame downgrades reach a stable low setting',()=>{
 let tier='high';for(let i=0;i<10;i++)tier=lowerQuality(tier);
 assert.equal(tier,'low');
});
test('returning from a preview preserves the calling screen without loops',()=>{
 assert.deepEqual(navigateScreens(['home','modes','arenas'],'modes'),['home','modes']);
 assert.deepEqual(navigateScreens(['home','lobby'],'game'),['home','lobby','game']);
});

test('the childhood court is available immediately without changing existing arena requirements',async()=>{
 const {arenaUnlocked,arenaRequirement,ARENA_ORDER}=await import('../src/progress.js');
 assert.equal(ARENA_ORDER[0],'uncompleted');
 assert.equal(arenaUnlocked('uncompleted',{xp:0,arenaWins:{}}),true);
 assert.equal(arenaUnlocked('accra',{xp:0,arenaWins:{}}),true);
 assert.deepEqual(arenaRequirement('kumasi'),{previous:'accra',level:3});
});
