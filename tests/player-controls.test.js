import test from 'node:test';
import assert from 'node:assert/strict';
import {joystickInput,stepPlayerMovement} from '../src/online-movement.js';
import {stepDribble} from '../src/dribbling.js';
import {createMatch,acceptInput,stepMatch,snapshot} from '../server/match.js';
import {OnlineMotion} from '../src/online-motion.js';
const player=()=>({x:0,z:0,vx:0,vz:0,angle:0,stamina:1});

test('thumb dead zone removes jitter while retaining progressive diagonal control',()=>{
 assert.deepEqual(joystickInput(.04,.04),{x:0,z:0});
 const slow=joystickInput(.18,.24),fast=joystickInput(.6,.8),edge=joystickInput(3,4);
 assert.ok(Math.hypot(slow.x,slow.z)<.3);assert.ok(Math.abs(slow.z/slow.x-4/3)<1e-9);
 assert.ok(Math.abs(Math.hypot(fast.x,fast.z)-1)<1e-9);assert.deepEqual(edge,fast);
});
test('releasing movement brakes within a third of a metre at every frame rate',()=>{
 const distances=[];
 for(const fps of [30,60,120]){
  const p=player();p.vx=8;
  for(let n=0;n<fps/2;n++)stepPlayerMovement(p,{},1/fps);
  assert.ok(p.x<.28);assert.ok(Math.abs(p.vx)<.001);distances.push(p.x);
 }
 assert.ok(Math.max(...distances)-Math.min(...distances)<1e-9);
});
test('reversing direction plants quickly and smooths body rotation',()=>{
 const p=player();p.vx=5;p.angle=Math.PI/2;
 stepPlayerMovement(p,{x:-1},1/60);
 assert.ok(p.angle!==-Math.PI/2,'body should turn instead of snapping');
 for(let n=0;n<5;n++)stepPlayerMovement(p,{x:-1},1/60);
 assert.ok(p.vx<-3);assert.ok(p.x<0);
});
test('precision movement overrides sprint and jockey faces the ball while retreating',()=>{
 const p=player(),ball={x:0,z:-4};
 for(let n=0;n<60;n++)stepPlayerMovement(p,{z:1,sprint:true,control:true},1/60,{ball,hasBall:false});
 assert.ok(p.z>2.5&&p.z<3.2);assert.ok(Math.cos(p.angle)<-.99);assert.equal(p.stamina,1);
 const attacker=player();
 for(let n=0;n<60;n++)stepPlayerMovement(attacker,{x:1,control:true},1/60,{ball,hasBall:true});
 assert.ok(Math.sin(attacker.angle)>.99,'carrier faces their movement, not the ball');
});
test('close control shortens touches without pinning the ball to the feet',()=>{
 const run=control=>{const p={...player(),vx:3.2,angle:Math.PI/2,control},b={x:.45,z:0,vx:0,vz:0};let distance=0;
  for(let n=0;n<120;n++){p.x+=p.vx/60;const last=b.x;assert.ok(stepDribble(b,p,1/60));assert.ok(Math.abs(b.x-last)<.2);distance+=Math.abs(b.x-p.x)}
  return distance/120;
 };
 assert.ok(run(true)<run(false));
});
const match=()=>{const m=createMatch([{id:'a'},{id:'b'}]);m.pause=0;Object.assign(m.players[0],{x:0,z:0,angle:0});Object.assign(m.players[1],{x:4,z:4});Object.assign(m.ball,{x:0,z:.9,owner:null});return m};
test('online standing challenge reacts on press and its release never shoots the ball',()=>{
 const m=match(),p=m.players[0];
 acceptInput(m,'a',{shoot:true,seq:1});stepMatch(m);
 assert.equal(m.ball.owner,'a');assert.equal(m.event.type,'tackle');assert.deepEqual([p.x,p.z,p.vx,p.vz],[0,0,0,0]);
 acceptInput(m,'a',{shoot:false,release:10,seq:2});stepMatch(m);
 assert.equal(p.shots,0);assert.equal(m.ball.owner,'a');
 acceptInput(m,'a',{shoot:true,seq:3});stepMatch(m);
 acceptInput(m,'a',{shoot:false,release:20,seq:4,aim:Math.PI/2});stepMatch(m);
 assert.equal(p.shots,1);assert.ok(m.ball.vx>9);assert.ok(Math.abs(m.ball.vz)<.01);
});
test('a defender cannot reach backwards or spam challenges through their cooldown',()=>{
 const m=match();m.ball.z=-1;
 acceptInput(m,'a',{shoot:true,seq:1});stepMatch(m);assert.equal(m.ball.owner,null);
 acceptInput(m,'a',{shoot:false,release:1,seq:2});
 for(let n=0;n<18;n++)stepMatch(m);
 m.ball.z=1;
 acceptInput(m,'a',{shoot:true,seq:3});stepMatch(m);assert.equal(m.ball.owner,null);
});
test('precision controls and defensive facing agree between host and prediction',()=>{
 let now=0;const m=match(),motion=new OnlineMotion('a',{now:()=>now,sendInput:input=>acceptInput(m,'a',input)});
 for(let i=0;i<60;i++){
  motion.receive(JSON.parse(JSON.stringify(snapshot(m))));
  const shown=motion.frame({x:.4,z:.3,control:true},1/60).players[0];stepMatch(m);now+=1000/60;
  assert.ok(Math.abs(shown.x-m.players[0].x)<1e-9);assert.ok(Math.abs(shown.angle-m.players[0].angle)<1e-9);
 }
});


test('a quick tackle tap survives a press and release between simulation ticks',()=>{
 const m=match();
 acceptInput(m,'a',{shoot:true,seq:1});
 acceptInput(m,'a',{shoot:false,release:10,seq:2});stepMatch(m);
 assert.equal(m.event.type,'tackle');assert.equal(m.ball.owner,'a');assert.equal(m.players[0].shots,0);
});
