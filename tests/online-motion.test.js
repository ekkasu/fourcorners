import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineMotion,angleDelta} from '../src/online-motion.js';
import {createMatch,acceptInput,stepMatch,snapshot} from '../server/match.js';
import {PLAYER_LIMIT} from '../src/court-layout.js';

const players=[{id:'host',name:'Host'},{id:'friend',name:'Friend'}];
const copy=value=>JSON.parse(JSON.stringify(value));
function state(tick=0){const m=createMatch(players);m.pause=0;m.tick=tick;return copy(snapshot(m))}

test('local controls move on the next frame without waiting for the network',()=>{
 let now=0;const sent=[],motion=new OnlineMotion('friend',{now:()=>now,sendInput:p=>sent.push(p)});
 motion.receive(state());now+=1000/60;
 const frame=motion.frame({x:1},1/60);
 assert.ok(frame.players[1].x>0);assert.equal(sent.length,1);assert.equal(sent[0].seq,1);
 assert.equal(motion.latest.players[1].x,0,'prediction must not change the authoritative match');
});

test('updates at irregular intervals play back as continuous movement',()=>{
 let now=0;const motion=new OnlineMotion('observer',{now:()=>now});
 const arrivals=[0,50,150,160,225,255,340,350,450,460,525,555,640,650,750,760,825,855,940,950];
 let packet=0,last,steps=[];
 for(now=0;now<1100;now+=1000/60){
  while(packet<arrivals.length&&arrivals[packet]<=now){const s=state(packet*3);s.players[0].x=packet*.25;s.players[0].vx=5;motion.receive(s);packet++}
  const x=motion.frame({},1/60).players[0].x;
  if(last!==undefined&&now>200&&now<1000)steps.push(x-last);last=x;
 }
 assert.ok(steps.every(n=>n>0&&n<.11),`running should not stop or jump between packets: ${Math.min(...steps)}..${Math.max(...steps)}`);
});

test('old snapshots cannot pull players back and turns use the shortest angle',()=>{
 const motion=new OnlineMotion('observer');const newer=state(60);newer.players[0].x=4;
 assert.equal(motion.receive(newer),true);assert.equal(motion.receive(state(30)),false);assert.equal(motion.receive(newer),false);
 assert.equal(motion.latest.players[0].x,4);assert.ok(Math.abs(angleDelta(Math.PI-.05,-Math.PI+.05)-.1)<1e-9);
});

test('late acknowledgements reconcile smoothly while turns and stops remain responsive',()=>{
 let now=0;const match=createMatch(players);match.pause=0;
 const inputs=[],states=[],motion=new OnlineMotion('friend',{now:()=>now,sendInput:input=>inputs.push({at:now+90,input})});
 motion.receive(copy(snapshot(match)));let shown,lastX=0,maxJump=0,stopStart;
 for(let tick=0;tick<360;tick++){
  now=tick*1000/60;
  while(inputs[0]?.at<=now)acceptInput(match,'friend',inputs.shift().input);
  stepMatch(match);
  if(tick%3===0)states.push({at:now+80+(tick%9===0?40:0),state:copy(snapshot(match))});
  while(states[0]?.at<=now)motion.receive(states.shift().state);
  const x=tick<90?1:tick<180?-1:0;
  shown=motion.frame({x},1/60).players[1];
  maxJump=Math.max(maxJump,Math.abs(shown.x-lastX));lastX=shown.x;
  if(tick===180)stopStart=shown.x;
 }
 assert.ok(maxJump<.16,`maximum visible movement per frame: ${maxJump}`);
 assert.ok(Math.abs(shown.x-match.players[1].x)<.03,'stopped player converges to host position');
 assert.ok(Math.abs(shown.x-stopStart)<.8,'releasing controls brakes promptly');
 assert.ok(motion.history.length<15,'acknowledged prediction frames are retired');
});

test('kickoffs clear predicted movement instead of interpolating across the court',()=>{
 let now=0;const motion=new OnlineMotion('friend',{now:()=>now});motion.receive(state());
 for(let i=0;i<20;i++){now+=1000/60;motion.frame({x:1},1/60)}
 const goal=state(60);goal.pause=1.5;goal.players[1].lives--;motion.receive(goal);
 const shown=motion.frame({x:1},1/60);
 assert.equal(shown.players[1].x,0);assert.equal(shown.ball.x,0);assert.equal(motion.history.length,0);
});

test('prediction respects court limits and stops during an interrupted connection',()=>{
 let now=0;const motion=new OnlineMotion('friend',{now:()=>now}),s=state();s.players[1].x=PLAYER_LIMIT-.01;motion.receive(s);
 let shown;
 for(let i=0;i<60;i++){now+=1000/60;shown=motion.frame({x:1,z:1,sprint:true},1/60).players[1]}
 assert.ok(shown.x<=PLAYER_LIMIT);const stopped=shown.z;
 for(let i=0;i<60;i++){now+=1000/60;shown=motion.frame({x:1,z:1},1/60).players[1]}
 assert.equal(shown.z,stopped);
});

test('spectator extrapolation is bounded when snapshots stop',()=>{
 let now=0;const motion=new OnlineMotion('observer',{now:()=>now}),s=state();s.players[0].vx=5;motion.receive(s);
 let shown;
 for(let i=0;i<180;i++){now+=1000/60;shown=motion.frame({},1/60)}
 assert.ok(shown.players[0].x<=.5);assert.equal(shown.players[0].z,7);
});

test('host rejects out-of-order control packets and acknowledges simulated movement ticks',()=>{
 const match=createMatch(players);match.pause=0;
 acceptInput(match,'friend',{x:1,seq:4});stepMatch(match);stepMatch(match);
 acceptInput(match,'friend',{x:-1,seq:3});stepMatch(match);
 const player=snapshot(match).players[1];assert.equal(player.inputSeq,4);assert.equal(player.inputTicks,3);assert.ok(player.vx>0);
 acceptInput(match,'friend',{x:0,seq:5});stepMatch(match);assert.equal(player.inputTicks,3);assert.equal(snapshot(match).players[1].inputTicks,1);
});

test('30, 60 and 120 Hz screens predict the same distance and retain analog steering',()=>{
 const distances=[];
 for(const fps of [30,60,120]){
  let now=0;const motion=new OnlineMotion('friend',{now:()=>now});motion.receive(state());
  let shown;
  for(let i=0;i<fps/2;i++){now+=1000/fps;shown=motion.frame({x:.3,z:.4},1/fps).players[1]}
  distances.push(shown.x);assert.ok(Math.abs((shown.z+7)/shown.x-4/3)<1e-9);
 }
 assert.ok(Math.max(...distances)-Math.min(...distances)<1e-9);
});

test('dribbling display follows the predicted player without moving the authoritative ball',()=>{
 let now=0;const motion=new OnlineMotion('friend',{now:()=>now}),s=state();
 s.ball={...s.ball,owner:'friend',z:-6.5};motion.receive(s);
 for(let i=0;i<20;i++){now+=1000/60;const shown=motion.frame({x:1},1/60);assert.ok(Math.abs(shown.ball.x-shown.players[1].x)<1e-9)}
 assert.equal(s.ball.x,0);
});
