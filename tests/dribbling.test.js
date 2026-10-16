import test from 'node:test';
import assert from 'node:assert/strict';
import {stepDribble} from '../src/dribbling.js';
import {createMatch,acceptInput,stepMatch} from '../server/match.js';

test('touches give momentum without teleporting the ball to a fixed foot offset',()=>{
 for(const fps of [30,60,120]){
  const p={x:0,z:0,vx:0,vz:-5,angle:Math.PI},b={x:.2,z:-.6,vx:0,vz:0};
  for(let n=0;n<fps;n++){
   p.z-=5/fps;const before={...b};
   assert.ok(stepDribble(b,p,1/fps));
   assert.ok(Math.hypot(b.x-before.x,b.z-before.z)<.4);
  }
  assert.ok(b.z<-4,'ball advances with the run');
  assert.ok(Math.hypot(b.x-p.x,b.z-p.z)<1.5);
 }
});
test('ball keeps rolling between touches on a change of direction',()=>{
 const b={x:0,z:-.7,vx:0,vz:-5,touchIn:.12};
 stepDribble(b,{x:0,z:0,vx:5,vz:0,angle:Math.PI/2},1/60);
 assert.ok(b.z<-.7);assert.equal(b.x,0);
});
test('sprinting pushes the ball farther and losing reach releases possession',()=>{
 const lead=speed=>{const b={x:0,z:-.6,vx:0,vz:0};stepDribble(b,{x:0,z:0,vx:0,vz:-speed,angle:Math.PI},1/60);return -b.vz};
 assert.ok(lead(8)>lead(5));
 assert.equal(stepDribble({x:3,z:0,vx:1,vz:0},{x:0,z:0,vx:0,vz:0,angle:0},1/60),false);
});
test('carrying the ball through every opposing goal counts without shooting',()=>{
 for(const side of [0,1,3]){
  const m=createMatch([{id:'a'},{id:'b'},{id:'c'},{id:'d'}]);m.pause=0;
  const [x,z]=[[0,-10.6],[10.6,0],[],[-10.6,0]][side],p=m.players[0];
  Object.assign(p,{x,z,angle:Math.atan2(x,z)});
  Object.assign(m.ball,{x:x*1.06,z:z*1.06,owner:'a',last:'a'});
  acceptInput(m,'a',{x:Math.sign(x),z:Math.sign(z)});
  for(let n=0;n<30&&!m.event;n++)stepMatch(m);
  assert.equal(m.event?.type,'goal');assert.equal(m.event.scorer,'a');assert.equal(p.shots,0);
 }
});
