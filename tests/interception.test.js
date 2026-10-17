import test from 'node:test';
import assert from 'node:assert/strict';
import {ballInterception} from '../src/interception.js';
import {createMatch,acceptInput,stepMatch,snapshot} from '../server/match.js';
const player={x:0,z:0,angle:0,vx:0,vz:0};
const ball=(x,z,vz=-8)=>({x,z,y:.11,vx:0,vz});

test('defend traps a pass in the wider foot lane; an unprepared player misses it',()=>{
 const before=ball(.88,1.2),after=ball(.88,.3);
 assert.equal(ballInterception(player,after,before),null);
 const hit=ballInterception(player,after,before,{control:true});
 assert.equal(hit.kind,'trap');assert.ok(Math.abs(hit.vz)<2);
 assert.equal(hit.x,.88,'first touch does not teleport the ball onto the player');
});
test('hard shots are blocked rather than instantly possessed',()=>{
 const hit=ballInterception(player,ball(.1,-1,-22),ball(.1,2,-22),{control:true});
 assert.equal(hit.kind,'block');assert.ok(hit.vz>0);assert.ok(Math.hypot(hit.vx,hit.vz)<10);
});
test('swept interception catches crossing passes even with both endpoints outside reach',()=>{
 const hit=ballInterception(player,ball(.1,-2),ball(.1,2),{control:true});
 assert.equal(hit.kind,'trap');assert.ok(hit.z>0);
});
test('defending cannot vacuum distant, high, departing or behind-the-back balls',()=>{
 for(const [p,b,previous]of [
  [player,ball(2,0),ball(2,2)],
  [player,{...ball(0,.5),y:1.5},{...ball(0,1.2),y:1.5}],
  [player,ball(0,.8,10),ball(0,.3,10)],
  [player,ball(0,-.8,0),ball(0,-.8,0)],
 ])assert.equal(ballInterception(p,b,previous,{control:true}),null);
});
test('player movement is included when stepping into a stationary ball',()=>{
 const p={...player,x:1,vx:5,angle:Math.PI/2},b=ball(1.4,0,0);
 assert.equal(ballInterception(p,b,b,{previousPlayer:{x:0,z:0}})?.kind,'trap');
});
test('host traps and blocks passes consistently across frame rates',()=>{
 for(const fps of [30,60,120])for(const speed of [10,22]){
  const m=createMatch([{id:'a'},{id:'b'}]);m.pause=0;
  Object.assign(m.players[0],player);Object.assign(m.players[1],{x:5,z:5});
  Object.assign(m.ball,ball(.75,2,speed*-1),{owner:null,last:'b'});
  let contact=false;
  for(let n=0;n<fps&&!contact;n++){
   acceptInput(m,'a',{control:true,seq:n+1});stepMatch(m,1/fps);
   contact=m.ball.owner==='a'||m.event?.type==='block';
  }
  assert.ok(contact,`${fps} FPS shot ${speed} must meet the defender`);
  if(speed===10)assert.equal(m.ball.owner,'a');
  else{assert.equal(m.ball.owner,null);assert.equal(m.event.type,'block');assert.equal(m.players[0].kickType,'standingTackle')}
 }
});
test('tackle animation and defensive stance are shared with room clients',()=>{
 const m=createMatch([{id:'a'},{id:'b'}]);m.pause=0;
 acceptInput(m,'a',{control:true,shoot:true,seq:1});stepMatch(m);
 const p=snapshot(m).players[0];
 assert.equal(p.defending,true);assert.equal(p.kickType,'standingTackle');assert.ok(p.kickAt>0);
});
