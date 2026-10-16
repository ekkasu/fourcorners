import test from 'node:test';
import assert from 'node:assert/strict';
import {stepPlayerTackle,TACKLE_COOLDOWN} from '../src/tackling.js';
const state=()=>({x:2,z:7,vx:0,vz:0,rot:Math.PI,bx:10,bz:0,by:0,rc:-1,attached:false,now:1,tackleCool:0,tackleWindow:0,seenPress:0,oneTouch:false,rivals:[{cool:0}],stats:{tackles:0}});

test('a missed tackle never forces movement at 30, 60 or 120 fps',()=>{
 for(const fps of [30,60,120]){
  const s=state(),c={shootAt:10};s.vx=1;s.vz=-2;
  for(let n=0;n<fps;n++){stepPlayerTackle(s,c,1/fps);s.now+=1/fps}
  assert.deepEqual([s.x,s.z,s.vx,s.vz],[2,7,1,-2]);
  assert.equal(s.attached,false);assert.equal(s.stats.tackles,0);assert.equal(s.tackleWindow,0);
 }
});
test('a nearby standing tackle takes possession without moving past the ball',()=>{
 const s=state(),c={shootAt:10};Object.assign(s,{bx:2,bz:6.2,rc:0});
 const result=stepPlayerTackle(s,c,1/60);
 assert.deepEqual(result,{started:true,won:true});
 assert.deepEqual([s.x,s.z,s.vx,s.vz],[2,7,0,0]);
 assert.equal(s.rc,-1);assert.equal(s.attached,true);assert.equal(s.stats.tackles,1);
 assert.equal(c.tackleShootAt,10);assert.equal(s.cancelShot,10);
 assert.equal(s.kickType,'strike','use a standing animation rather than a slide');
 assert.ok(s.controlUntil>s.now);
});
test('repeated presses respect the tackle cooldown and cannot win distant or airborne balls',()=>{
 const s=state(),c={shootAt:10};stepPlayerTackle(s,c,1/60);
 assert.equal(s.tackleCool,TACKLE_COOLDOWN);
 c.shootAt=11;assert.equal(stepPlayerTackle(s,c,1/60).started,false);
 s.tackleCool=0;s.by=1;s.bx=s.x;s.bz=s.z;c.shootAt=12;
 assert.equal(stepPlayerTackle(s,c,1/60).won,false);assert.equal(s.attached,false);
});
test('standing tackles preserve the one-touch lock and pause rules',()=>{
 for(const options of [{oneTouch:true,toucher:'player'},{frozen:true},{penalty:true}]){
  const s=state(),c={shootAt:10};Object.assign(s,{bx:s.x,bz:s.z,oneTouch:options.oneTouch,toucher:options.toucher});
  assert.deepEqual(stepPlayerTackle(s,c,1/60,options),{started:false,won:false});
  assert.equal(s.attached,false);
 }
});
