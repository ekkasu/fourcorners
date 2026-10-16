import test from 'node:test';
import assert from 'node:assert/strict';
import {confineBall,BALL_LIMIT,PLAYER_LIMIT,CORNER_RADIUS} from '../src/court-layout.js';
import {createMatch,acceptInput,stepMatch} from '../server/match.js';
test('rounded corners reflect shots inward without cancelling tangential motion',()=>{
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const b=confineBall(sx*BALL_LIMIT,sz*BALL_LIMIT,sx*5,sz*3);
  assert.ok(Math.abs(b.x)<BALL_LIMIT&&Math.abs(b.z)<BALL_LIMIT);
  assert.ok((b.vx*sx+b.vz*sz)<0);assert.ok(Math.hypot(b.vx,b.vz)>0);
  const center=BALL_LIMIT-CORNER_RADIUS;assert.ok(Math.abs(Math.hypot(Math.abs(b.x)-center,Math.abs(b.z)-center)-CORNER_RADIUS)<1e-8);
 }
});
test('every stopped ball at a rounded corner remains within ordinary pickup reach',()=>{
 for(const sx of [-1,1])for(const sz of [-1,1]){const b=confineBall(sx*BALL_LIMIT,sz*BALL_LIMIT);const px=Math.max(-PLAYER_LIMIT,Math.min(PLAYER_LIMIT,b.x)),pz=Math.max(-PLAYER_LIMIT,Math.min(PLAYER_LIMIT,b.z));assert.ok(Math.hypot(b.x-px,b.z-pz)<.75)}
});
test('an idle boundary ball stays in place indefinitely without a restart',()=>{
 const m=createMatch([{id:'a',name:'Ama'},{id:'b',name:'Kojo'}]);m.pause=0;Object.assign(m.ball,{x:BALL_LIMIT,z:5,y:.24,vx:0,vz:0});
 for(let i=0;i<600;i++)stepMatch(m);
 assert.equal(m.ball.x,BALL_LIMIT);assert.equal(m.ball.z,5);assert.equal(m.event,null);assert.equal(m.finished,false);assert.deepEqual(m.players.map(p=>p.lives),[3,3]);
 // A friend can walk over and collect it normally, without resetting the clock or score.
 const p=m.players[0];for(let i=0;i<300&&m.ball.owner!=='a';i++){acceptInput(m,'a',{x:Math.sign(m.ball.x-p.x),z:Math.sign(m.ball.z-p.z)});stepMatch(m)}
 assert.equal(m.ball.owner,'a');assert.ok(m.timeLeft<170);assert.deepEqual(m.players.map(p=>p.lives),[3,3]);
});

test('actual offline AI collects a crowded one-touch corner before separation pushes it away',async()=>{
 const {createRivalStepper,DIFFICULTY}=await import('../src/rivals.js');
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const touches=[],step=createRivalStepper({sfx:{tackle(){},kick(){},save(){}},burst(){},touchBall(s,who){assert.notEqual(who,s.toucher,'collector must respect the one-touch restriction');touches.push(who);s.toucher=who;return false},KICK_LEAD:.1,KICKER_GRACE:.3,ONE_TOUCH_WINDOW:.6});
  const s={x:sx*10.9,z:sz*11.55,bx:sx*11.85,bz:sz*11.85,by:0,bvx:0,bvz:0,bvy:0,attached:false,rc:-1,oneTouch:true,toucher:0,prevToucher:'player',last:0,stealCool:0,now:0,alive:[true,true,true,true],lives:[3,3,3,3],level:DIFFICULTY.normal,rivals:[{x:sx*11.55,z:sz*10.5},{x:sx*11.55,z:sz*11.2},{x:sx*10.8,z:sz*11.5}].map(r=>({...r,vx:0,vz:0,cool:0,target:2}))};
  for(let i=0;i<120&&s.rc<0;i++){s.now+=1/60;step(s,1/60)}
  assert.ok(s.rc>=0,'AI must collect the ball naturally');assert.equal(touches.length,1);assert.equal(s.rc,s.toucher);assert.equal(s.bx,sx*11.85,'collection does not relocate the ball');assert.equal(s.bz,sz*11.85);
 }
});
test('actual offline AI chases a loose corner ball even beyond its old ten-metre cutoff',async()=>{
 const {createRivalStepper,DIFFICULTY}=await import('../src/rivals.js');
 const step=createRivalStepper({sfx:{tackle(){},kick(){},save(){}},burst(){},touchBall(){return false},KICK_LEAD:.1,KICKER_GRACE:.3,ONE_TOUCH_WINDOW:.6});
 const s={x:8,z:8,bx:-11.5,bz:11.5,by:0,bvx:0,bvz:0,bvy:0,attached:false,rc:-1,oneTouch:true,toucher:0,stealCool:0,now:0,alive:[true,true,true,true],lives:[3,3,3,3],level:DIFFICULTY.normal,rivals:[{x:0,z:-6},{x:-6,z:0},{x:6,z:0}].map(r=>({...r,vx:0,vz:0,cool:0,target:2}))};
 for(let i=0;i<600&&s.rc<0;i++){s.now+=1/60;step(s,1/60)}
 assert.ok(s.rc>=0,'AI should reach and collect the distant ball without any restart');
});
