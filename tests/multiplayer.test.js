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
