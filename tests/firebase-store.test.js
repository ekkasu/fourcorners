import test from 'node:test';
import assert from 'node:assert/strict';
import {FirebaseStore,validateIdentity} from '../server/firebase-store.js';
// Transactional in-memory adapter: exercises server write logic without cloud credentials.
function database(){
 const values=new Map();
 const query=()=>({where:()=>query(),count:()=>({get:async()=>({data:()=>({count:0})})})});
 const ref=(collection,id)=>({id,key:collection+'/'+id,get:async()=>snapshot(ref(collection,id)),create:async value=>{const r=ref(collection,id);assert.ok(!values.has(r.key));values.set(r.key,structuredClone(value))},update:async value=>{const r=ref(collection,id);assert.ok(values.has(r.key));values.set(r.key,{...values.get(r.key),...value})}});
 const snapshot=r=>({exists:values.has(r.key),ref:r,data:()=>structuredClone(values.get(r.key))});
 return {values,collection:name=>({doc:id=>ref(name,id),where:()=>query()}),runTransaction:async fn=>{const writes=[];const result=await fn({get:async r=>snapshot(r),create:(r,v)=>writes.push(()=>{assert.ok(!values.has(r.key));values.set(r.key,structuredClone(v))}),update:(r,v)=>writes.push(()=>{assert.ok(values.has(r.key));values.set(r.key,{...values.get(r.key),...structuredClone(v)})}),set:(r,v)=>writes.push(()=>values.set(r.key,structuredClone(v)))});writes.forEach(fn=>fn());return result}};
}
test('Firebase profiles use verified UID and cannot accept supplied statistics',async()=>{
 const db=database(),store=new FirebaseStore(db);
 const p=await store.register('uid-a',{username:'ama',displayName:'Ama',points:999,wins:999});assert.equal(p.id,'uid-a');assert.equal(p.points,0);
 await assert.rejects(()=>store.register('uid-b',{username:'ama',displayName:'Other'}),/unavailable/);
 const updated=await store.update('uid-a',{displayName:'Ama Star',bio:'Home court',points:999});assert.equal(updated.points,0);assert.equal(updated.displayName,'Ama Star');
 assert.throws(()=>validateIdentity({username:'bad/name',displayName:'Bad'},true),/username/);
});
test('solo tickets persist across instances, bind the UID and deduplicate repeats and reject implausible results',async()=>{
 const db=database(),first=new FirebaseStore(db);await first.register('uid-a',{username:'ama',displayName:'Ama'});
 const ticket=await first.beginSolo('uid-a'),coldStart=new FirebaseStore(db),result={result:'won',mode:'ffa',time:1,stats:{goals:3}};
 await assert.rejects(()=>coldStart.finishSolo('uid-b',{ticket,result}),/session/);
 const saved=await coldStart.finishSolo('uid-a',{ticket,result});assert.equal(saved.points,3);assert.equal(saved.matches,1);assert.equal(saved.goals,3);
 const repeated=await coldStart.finishSolo('uid-a',{ticket,result});assert.equal(repeated.matches,1);assert.equal(repeated.points,3);
 const next=await coldStart.beginSolo('uid-a');await assert.rejects(()=>coldStart.finishSolo('uid-a',{ticket:next,result:{...result,time:999}}),/Invalid/);
});
test('server multiplayer results update Firebase once and never award guest IDs',async()=>{
 const store=new FirebaseStore(database());await store.register('uid-a',{username:'ama',displayName:'Ama'});
 const match={finished:true,elapsed:60,winner:'p1',players:[{id:'p1',accountId:'uid-a',goals:2,lives:1,connected:true},{id:'p2',accountId:null,goals:0,lives:0,connected:true}]};
 assert.equal(await store.record('m1',match),true);assert.equal(await store.record('m1',match),false);
 const p=await store.profile('uid-a');assert.equal(p.points,3);assert.equal(p.matches,1);
 assert.equal(await store.record('short',{...match,elapsed:1}),false);
});
