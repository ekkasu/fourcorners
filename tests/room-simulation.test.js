import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomSimulation,MAX_PENDING_SNAPSHOTS} from '../src/room-simulation.js';
import {createMatch} from '../server/match.js';
const players=[{id:'host',name:'Host'},{id:'friend',name:'Friend'}];
test('a delayed packet from a device with a different clock still moves its player',()=>{
 let now=0;const match=createMatch(players);match.pause=0;const runner=new RoomSimulation(match,{now:()=>now,publish:()=>{}});
 for(let i=0;i<60;i++){now+=1000/60;if(i%3===0)runner.receiveInputs({friend:{x:1,z:0,at:-5000+i,release:0}});runner.tick()}
 assert.ok(match.players[1].x>3,'friend should move despite the sender clock offset');
 // Another player's traffic must not keep an abandoned input alive.
 for(let i=0;i<120;i++){now+=1000/60;runner.receiveInputs({friend:{x:1,z:0,at:-4943,release:0},host:{x:0,z:0,at:i}});runner.tick()}
 assert.equal(match.players[1].vx,0);
});
test('unacknowledged Firebase writes do not reduce snapshots to one per round trip',async()=>{
 let now=0;const writes=[],match=createMatch(players),runner=new RoomSimulation(match,{now:()=>now,publish:state=>new Promise(resolve=>writes.push({state,resolve}))});
 for(let i=0;i<60;i++){now+=1000/60;runner.tick();await Promise.resolve()}
 assert.equal(writes.length,MAX_PENDING_SNAPSHOTS);assert.ok(writes[1].state.tick>writes[0].state.tick);
 writes.forEach(w=>w.resolve());await new Promise(resolve=>setImmediate(resolve));now+=60;runner.tick();await Promise.resolve();assert.equal(writes.length,MAX_PENDING_SNAPSHOTS+1);
});
test('final state is published once even when the normal write queue is full',async()=>{
 let now=0,finished=0;const writes=[],match=createMatch(players),runner=new RoomSimulation(match,{now:()=>now,publish:s=>{writes.push(s);return new Promise(()=>{})},onFinish:()=>finished++});
 for(let i=0;i<100;i++){now+=20;runner.tick();await Promise.resolve()}
 match.finished=true;now+=20;runner.tick();await Promise.resolve();runner.tick();assert.equal(writes.length,MAX_PENDING_SNAPSHOTS+1);assert.equal(writes.at(-1).finished,true);assert.equal(finished,1);
});
