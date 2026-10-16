import test from 'node:test';
import assert from 'node:assert/strict';
import {canTouchBall,touchBall} from '../src/one-touch.js';
import {createRivalStepper,DIFFICULTY} from '../src/rivals.js';

test('each player waits for someone else; time and rebounds never restore their turn',()=>{
 const s={oneTouch:true,toucher:null,penalty:null,pause:0};
 for(const who of ['player',0,1,2,'player']){
  assert.equal(canTouchBall(s,who),true);
  assert.equal(touchBall(s,who),false);
  s.now=(s.now||0)+600;
  assert.equal(canTouchBall(s,who),false);
  assert.equal(touchBall(s,who),true);
  assert.equal(s.toucher,who);
  assert.equal(s.penalty,null,'blocked contact must not start a penalty or restart');
 }
});

test('free possession still permits repeated touches when the rule is off',()=>{
 const s={oneTouch:false,toucher:'player'};
 for(let i=0;i<3;i++){
  assert.equal(canTouchBall(s,'player'),true);
  assert.equal(touchBall(s,'player'),false);
 }
});

test('the actual rival loop cannot give the last player another touch',()=>{
 const step=createRivalStepper({sfx:{tackle(){},kick(){},save(){}},burst(){},touchBall,KICK_LEAD:.1,KICKER_GRACE:.3,ONE_TOUCH_WINDOW:.6});
 const state=()=>({x:0,z:0,bx:0,bz:.1,by:0,bvx:0,bvz:0,bvy:0,attached:false,rc:-1,oneTouch:true,toucher:0,stealCool:0,now:0,alive:[true,false,true,false],lives:[3,3,3,3],level:DIFFICULTY.normal,rivals:[{x:0,z:0},{x:-10,z:0},{x:10,z:0}].map(r=>({...r,vx:0,vz:0,cool:0,target:2}))});
 const s=state();
 for(let i=0;i<120;i++){s.now+=1/60;step(s,1/60)}
 assert.equal(s.rc,-1);assert.equal(s.toucher,0);
 // Another player's contact makes the rival eligible immediately.
 touchBall(s,'player');Object.assign(s.rivals[0],{x:0,z:0,vx:0,vz:0,cool:0});
 step(s,1/60);assert.equal(s.rc,0);assert.equal(s.toucher,0);
 // Even an automatic close-range steal must respect the human player's lock.
 const blocked=state();Object.assign(blocked,{toucher:'player',rc:0});
 blocked.rivals[0].cool=10;blocked.rivals[0].touchUntil=10;
 step(blocked,1/60);assert.equal(blocked.attached,false);assert.equal(blocked.rc,0);
});
