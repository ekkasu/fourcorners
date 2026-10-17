import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
if(!process.env.FC_API_BASE)throw new Error('Set FC_API_BASE to the Firebase-backed game API origin. This test creates and cleans up two temporary guests.');
const workers=[0,-5000].map(skew=>fork(new URL('./firebase-client-worker.mjs',import.meta.url),{env:{...process.env,FC_TEST_CLOCK_SKEW:String(skew)},silent:true}));
const clients=[{},{}];let code,started=false,moving=false,finished=false;
const timeout=setTimeout(()=>finish(new Error('Timed out waiting for two Firebase clients to move and synchronize.')),45000);
const readySent=[false,false];
for(let i=0;i<2;i++){
 workers[i].stderr.on('data',buffer=>process.stderr.write(buffer));
 workers[i].on('message',m=>{
  if(finished)return;
  if(m.type==='open'){clients[i].uid=m.uid;if(i===0)workers[i].send({type:'create',name:'QA Host'});else if(code)workers[i].send({type:'join',code,name:'QA Friend'})}
  if(m.type==='room'){
   if(i===0&&!code){code=m.code;if(clients[1].uid)workers[1].send({type:'join',code,name:'QA Friend'})}
   if(m.players.length===2&&!m.started){if(!readySent[i]){readySent[i]=true;workers[i].send({type:'ready',ready:true})}if(i===0&&m.players.every(p=>p.ready)&&!started){started=true;workers[0].send({type:'start'})}}
  }
  if(m.type==='position'){
   clients[i].last=m;
   if(m.tick>180&&!moving){moving=true;workers.forEach(w=>w.send({type:'move'}));setTimeout(()=>{workers.forEach(w=>w.send({type:'halt'}));setTimeout(()=>finish(),1500)},1500)}
  }
  if(m.type==='error')finish(new Error(m.message));
 });
}
function finish(error){
 if(finished)return;finished=true;clearTimeout(timeout);
 try{if(error)throw error;for(const client of clients){assert.ok(client.last,'both clients receive snapshots');for(const p of client.last.players)assert.ok(p.x>2,'both players move even with different clocks')}
  for(const p of clients[0].last.players){const remote=clients[1].last.players.find(q=>q.id===p.id);assert.ok(Math.abs(p.x-remote.x)<.2,'both clients agree on settled player positions')}
  console.log('PASS: real Firebase clients create/join/start, move with a five-second clock difference, and synchronize their positions.');
 }catch(e){process.exitCode=1;console.error(e.message)}finally{workers.forEach(w=>w.send({type:'stop'}));setTimeout(()=>workers.forEach(w=>w.kill()),5000).unref()}
}
