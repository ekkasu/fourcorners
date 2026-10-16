import test from 'node:test';
import assert from 'node:assert/strict';
import {DIFFICULTY,pickRivalTarget,createRivalStepper} from '../src/rivals.js';
import {chooseRivalShot,rivalOffBallPosition} from '../src/rival-tactics.js';
import {touchBall} from '../src/one-touch.js';
const step=createRivalStepper({sfx:{tackle(){},kick(){},save(){}},burst(){},touchBall,KICK_LEAD:.1,KICKER_GRACE:.3,ONE_TOUCH_WINDOW:.6});
const state=()=>({x:0,z:0,bx:0,bz:.65,by:0,bvx:0,bvz:0,bvy:0,attached:true,rc:-1,oneTouch:false,toucher:null,stealCool:0,now:0,controlUntil:0,alive:[true,false,true,false],lives:[3,3,3,3],level:DIFFICULTY.easy,rivals:[{x:0,z:.9},{x:-10,z:0},{x:10,z:0}].map(r=>({...r,vx:0,vz:0,cool:0,target:2}))});

test('equally open goals receive attacks without a preferred player',()=>{
 for(let i=0;i<3;i++){
  const s=state();s.alive=[true,true,true,true];s.x=s.z=0;
  s.rivals.forEach(r=>{r.x=r.z=0});
  const counts=[0,0,0,0];
  for(let n=0;n<12;n++)counts[pickRivalTarget(s,i)]++;
  assert.equal(counts[[0,3,1][i]],0);
  assert.deepEqual(counts.filter((_,g)=>g!==[0,3,1][i]),[4,4,4]);
 }
});

test('rivals take open opportunities and switch when a defender covers the lane',()=>{
 const s=state();s.alive=[true,true,true,true];s.x=0;s.z=10;
 Object.assign(s.rivals[0],{x:0,z:0});
 Object.assign(s.rivals[1],{x:-10,z:0});
 Object.assign(s.rivals[2],{x:0,z:0});
 assert.equal(chooseRivalShot(s,0).goal,1,'open east goal beats defended goals');
 Object.assign(s.rivals[2],{x:10,z:0});
 s.x=0;s.z=0;
 assert.equal(chooseRivalShot(s,0).goal,2,'human goal becomes a valid opportunity when open');
 s.alive[2]=false;
 for(let i=0;i<3;i++)for(let n=0;n<10;n++){
  const target=pickRivalTarget(s,i);
  assert.notEqual(target,2);assert.notEqual(target,[0,3,1][i]);
 }
 s.alive=[false,false,true,true];assert.equal(pickRivalTarget(s,1),2);
});

test('off-ball rivals press and advance into interception positions',()=>{
 const s=state();s.alive=[true,true,true,true];s.bx=s.bz=0;
 for(let i=0;i<3;i++){
  const p=rivalOffBallPosition(s,i,0);
  if(i===0){assert.equal(p.role,'press');assert.equal(p.x,0);assert.equal(p.z,0)}
  else {assert.equal(p.role,'intercept');assert.ok(Math.hypot(p.x,p.z)<7,'move away from the post and into play')}
 }
 s.oneTouch=true;s.toucher=0;
 assert.equal(rivalOffBallPosition(s,0,0).role,'intercept','used touch must not chase possession');
});

test('a failed AI tackle leaves possession and ball velocity intact',t=>{
 t.mock.method(Math,'random',()=>.99);
 const s=state();step(s,1/60);
 assert.equal(s.attached,true);assert.equal(s.rc,-1);
 assert.equal(s.bvx,0);assert.equal(s.bvz,0);assert.equal(s.bvy,0);
 assert.ok(s.rivals[0].cool>0,'failure must wait before retrying');
});

test('protection after gaining possession gives the player time to act',t=>{
 t.mock.method(Math,'random',()=>0);
 const s=state();s.controlUntil=1.1;
 for(let n=0;n<60;n++){
  s.now+=1/60;Object.assign(s.rivals[0],{x:0,z:.9,vx:0,vz:0});step(s,1/60);
  assert.equal(s.attached,true);
 }
 s.now=1.2;Object.assign(s.rivals[0],{x:0,z:.9,vx:0,vz:0});step(s,1/60);
 assert.equal(s.rc,0,'a valid tackle can succeed after the protection window');
});

test('failed tackles are rate limited at both 30 and 120 fps',t=>{
 let attempts=0;t.mock.method(Math,'random',()=>{attempts++;return .99});
 for(const fps of [30,120]){
  attempts=0;const s=state();
  for(let n=0;n<fps*2;n++){
   s.now+=1/fps;Object.assign(s.rivals[0],{x:0,z:.9,vx:0,vz:0});step(s,1/fps);
  }
  assert.ok(attempts<=3,`${fps} fps: ${attempts} attempts`);
  assert.equal(s.attached,true);
 }
});

test('Easy carriers wait before shooting and use slower shots',t=>{
 t.mock.method(Math,'random',()=>.5);
 const s=state();Object.assign(s,{x:10,z:10,attached:false,rc:1,alive:[true,false,true,true]});
 Object.assign(s.rivals[0],{x:10,z:0,cool:10});
 Object.assign(s.rivals[1],{x:0,z:-7,target:0,cool:DIFFICULTY.easy.shootDelay});
 for(let n=0;n<60;n++){s.now+=1/60;step(s,1/60)}
 assert.equal(s.rc,1,'no instant shot during the first second');
 for(let n=0;n<90&&s.rc===1;n++){s.now+=1/60;step(s,1/60)}
 assert.equal(s.rc,-1);assert.ok(Math.hypot(s.bvx,s.bvz)<=10);
});
