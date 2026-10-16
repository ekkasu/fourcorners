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

test('all touch devices start without the crowd, shadows or decorative props',()=>{
 for(const device of [{memory:16,cores:12},{memory:undefined,cores:undefined},{memory:8,cores:8}]){
  const preset=GRAPHICS[initialQuality({...device,coarse:true})];
  assert.equal(preset.crowd,false);assert.equal(preset.shadows,false);
  assert.equal(preset.props,false);assert.equal(preset.effects,false);
  assert.ok(preset.dpr<=.85);
 }
});

test('mobile camera makes nearby players larger and still fits separated play',async()=>{
 const {broadcastView,BALL_LIMIT,PLAYER_LIMIT}=await import('../src/court-layout.js');
 const {PerspectiveCamera,Vector3}=await import('three');
 const cameraFor=(view,aspect)=>{const c=new PerspectiveCamera(view.fov,aspect,.1,200);c.position.set(...view.position);c.lookAt(...view.lookAt);c.updateMatrixWorld();return c};
 const aspect=844/390;
 const height=mobile=>{const c=cameraFor(broadcastView(0,0,aspect,0,1.5,mobile),aspect);return Math.abs(new Vector3(0,2.4,1.5).project(c).y-new Vector3(0,0,1.5).project(c).y)};
 assert.ok(height(true)>height(false)*1.3,'nearby characters should be at least 30% larger');
 for(const aspect of [844/390,667/375,9/16])for(const bx of [-BALL_LIMIT,BALL_LIMIT])for(const bz of [-BALL_LIMIT,BALL_LIMIT])for(const px of [-PLAYER_LIMIT,PLAYER_LIMIT])for(const pz of [-PLAYER_LIMIT,PLAYER_LIMIT]){
  const c=cameraFor(broadcastView(bx,bz,aspect,px,pz,true),aspect);
  for(const[x,z]of[[bx,bz],[px,pz]])for(const y of [0,2.4]){const p=new Vector3(x,y,z).project(c);assert.ok(Math.abs(p.x)<=.83&&Math.abs(p.y)<=.83,`mobile framing at ${aspect}: ${p.x},${p.y}`)}
 }
});
