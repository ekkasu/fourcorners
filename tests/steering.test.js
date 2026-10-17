import test from 'node:test';
import assert from 'node:assert/strict';
import {steerPlayer,joystickInput} from '../src/steering.js';
test('release brakes within a small step at common frame rates',()=>{
 for(const fps of [30,60,120]){
  const p={vx:8,vz:0};let travel=0;
  for(let n=0;n<fps*.25;n++){steerPlayer(p,0,0,8,1/fps);travel+=p.vx/fps}
  assert.equal(p.vx,0);assert.ok(travel<.2);
 }
});
test('reversals and side steps respond promptly without faster diagonals',()=>{
 for(const fps of [30,60,120]){
  const p={vx:5,vz:0};
  for(let n=0;n<fps*.1;n++)steerPlayer(p,-1,0,5,1/fps);
  assert.ok(p.vx<-3.5);
  for(let n=0;n<fps;n++)steerPlayer(p,1,1,5,1/fps);
  assert.ok(Math.hypot(p.vx,p.vz)<=5.001);
 }
});
test('joystick ignores drift and offers fine control before full running pace',()=>{
 assert.deepEqual(joystickInput(.05,.02),{x:0,z:0});
 const fine=joystickInput(.3,0);assert.ok(fine.x>0&&fine.x<.3);
 assert.deepEqual(joystickInput(1,0),{x:1,z:0});
});
