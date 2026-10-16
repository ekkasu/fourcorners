import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,acceptInput,stepMatch,disconnectPlayer,snapshot} from '../server/match.js';
const players=[{id:'a',name:'Ama'},{id:'b',name:'Kojo'},{id:'c',name:'Yaw'},{id:'d',name:'Akua'}];
const match=(n=2)=>{const m=createMatch(players.slice(0,n));m.pause=0;return m};
test('all friends get unique corners and host settings are sanitized',()=>{
 const m=createMatch(players,{arena:'bad',lives:999});assert.equal(m.settings.arena,'uncompleted');assert.equal(m.settings.lives,3);assert.equal(new Set(m.players.map(p=>p.side)).size,4);assert.doesNotThrow(()=>createMatch(players,null));
});
test('only input controls movement, normalized diagonals cannot teleport',()=>{
 const m=match();acceptInput(m,'a',{x:999,z:999});stepMatch(m);assert.ok(Math.hypot(m.players[0].vx,m.players[0].vz)<=5.001);assert.ok(m.players[0].x<.1);acceptInput(m,'attacker',{x:1});assert.equal(m.players.length,2);
});
test('held movement times out after packet loss',()=>{
 const m=match();acceptInput(m,'a',{x:1});for(let i=0;i<60;i++)stepMatch(m);assert.equal(m.players[0].vx,0);
});
test('ball possession and charged shots are server-controlled',()=>{
 const m=match();Object.assign(m.ball,{x:0,z:7});stepMatch(m);assert.equal(m.ball.owner,'a');acceptInput(m,'a',{shoot:true});stepMatch(m);m.elapsed+=.8;acceptInput(m,'a',{release:1,shoot:false});stepMatch(m);assert.equal(m.ball.owner,null);assert.equal(m.players[0].shots,1);assert.ok(Math.hypot(m.ball.vx,m.ball.vz)>15);
});
test('goals update shared lives and scorer, elimination selects one winner',()=>{
 const m=match();m.players[1].lives=1;Object.assign(m.ball,{x:0,z:-11.4,last:'a'});stepMatch(m);assert.equal(m.players[1].lives,0);assert.equal(m.players[0].goals,1);assert.equal(m.finished,true);assert.equal(m.winner,'a');assert.equal(snapshot(m).winner,'a');
});
test('unused corners are walls in two-player matches',()=>{
 const m=match();Object.assign(m.ball,{x:12,z:0,vx:5});stepMatch(m);assert.ok(m.ball.vx<0);assert.equal(m.finished,false);assert.ok(m.players.every(p=>p.lives===3));
});
test('disconnected players are eliminated and cannot block the room',()=>{
 const m=match();disconnectPlayer(m,'b');assert.equal(m.winner,'a');assert.equal(m.finished,true);assert.equal(m.players[1].connected,false);
});
test('time limit produces a shared result including a tied draw',()=>{
 const m=match();m.elapsed=180;stepMatch(m);assert.equal(m.finished,true);assert.equal(m.winner,null);
});

test('concrete blocks rebound ground shots but no invisible crossbar remains',async()=>{
 const {collideGoalBlocks,BLOCK_CENTERS}=await import('../src/court-layout.js');
 const hit=collideGoalBlocks(BLOCK_CENTERS[1],-.3,.24,0,8);
 assert.ok(hit.vz<0);assert.ok(hit.impact>0);
 const middle=collideGoalBlocks(0,0,1.55,0,8);
 assert.equal(middle.vz,8);assert.equal(middle.impact,0);
 const above=collideGoalBlocks(BLOCK_CENTERS[1],0,1.5,0,8);
 assert.equal(above.impact,0);
});
test('default sideline camera follows play and widens for portrait screens',async()=>{
 const {broadcastView}=await import('../src/court-layout.js');
 const standard=broadcastView(0,0,16/9),portrait=broadcastView(0,0,9/16),edge=broadcastView(100,-100,16/9);
 assert.ok(standard.position[2]>standard.position[1]);
 assert.ok(portrait.position[1]>standard.position[1]);assert.ok(portrait.fov>standard.fov);
 assert.equal(edge.position[0],6);assert.equal(edge.lookAt[0],6);
});

test('a stopped ball is recoverable and stays dribbleable in every corner',async()=>{
 const {BALL_LIMIT,PLAYER_LIMIT}=await import('../src/court-layout.js');
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const m=match();Object.assign(m.players[0],{x:sx*10.5,z:sz*10.5});Object.assign(m.ball,{x:sx*BALL_LIMIT,z:sz*BALL_LIMIT,vx:0,vz:0});
  for(let i=0;i<90;i++){acceptInput(m,'a',{x:sx,z:sz});stepMatch(m)}
  assert.equal(m.ball.owner,'a',`corner ${sx},${sz} should remain reachable`);
  assert.ok(Math.abs(m.players[0].x)<=PLAYER_LIMIT);assert.ok(Math.abs(m.players[0].z)<=PLAYER_LIMIT);
  assert.ok(Math.abs(m.ball.x)<=BALL_LIMIT);assert.ok(Math.abs(m.ball.z)<=BALL_LIMIT);
 }
});
test('stationary balls along every non-goal wall can be picked up',async()=>{
 const {BALL_LIMIT}=await import('../src/court-layout.js');
 for(const [x,z]of [[BALL_LIMIT,5],[-BALL_LIMIT,5],[5,BALL_LIMIT],[5,-BALL_LIMIT]]){
  const m=match(),p=m.players[0];p.x=Math.max(-10.5,Math.min(10.5,x));p.z=Math.max(-10.5,Math.min(10.5,z));Object.assign(m.ball,{x,z,vx:0,vz:0});
  for(let i=0;i<90;i++){acceptInput(m,'a',{x:Math.sign(x-p.x),z:Math.sign(z-p.z)});stepMatch(m)}
  assert.equal(m.ball.owner,'a',`wall ${x},${z}`);
 }
});
test('offline AI pickup range reaches the entire wall strip including corners',async()=>{
 const {BALL_LIMIT,PLAYER_LIMIT}=await import('../src/court-layout.js');
 assert.ok(Math.hypot(BALL_LIMIT-PLAYER_LIMIT,BALL_LIMIT-PLAYER_LIMIT)<.75);
});
test('wall rebounds keep an inward-moving ball moving into play',async()=>{
 const {confineBall,BALL_LIMIT,broadcastView}=await import('../src/court-layout.js');
 assert.equal(confineBall(BALL_LIMIT+.1,0,2,0).vx,-1.2);
 assert.equal(confineBall(BALL_LIMIT+.1,0,-2,0).vx,-2);
 assert.ok(broadcastView(0,BALL_LIMIT).lookAt[2]>4);
});

test('sideline view keeps both ball and player visible at opposite court edges',async()=>{
 const {broadcastView,BALL_LIMIT,PLAYER_LIMIT}=await import('../src/court-layout.js');
 const {PerspectiveCamera,Vector3}=await import('three');
 for(const aspect of [16/9,9/16,4/3])for(const bx of [-BALL_LIMIT,BALL_LIMIT])for(const bz of [-BALL_LIMIT,BALL_LIMIT])for(const px of [-PLAYER_LIMIT,PLAYER_LIMIT])for(const pz of [-PLAYER_LIMIT,PLAYER_LIMIT]){
  const view=broadcastView(bx,bz,aspect,px,pz),camera=new PerspectiveCamera(view.fov,aspect,.1,200);camera.position.set(...view.position);camera.lookAt(...view.lookAt);camera.updateMatrixWorld();
  for(const [x,z]of [[bx,bz],[px,pz]])for(const y of [0,2.4]){const p=new Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=.83&&Math.abs(p.y)<=.83,`visible at aspect ${aspect}: ${p.x},${p.y}`)}
 }
});
