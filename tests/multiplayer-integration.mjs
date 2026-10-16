import assert from 'node:assert/strict';
import WebSocket from 'ws';
const address=process.env.TEST_WS_URL||'ws://localhost:4190/ws',clients=[];
async function client(){const ws=new WebSocket(address),messages=[];ws.on('message',data=>{messages.push(JSON.parse(data));if(messages.length>1000)messages.shift()});clients.push(ws);const wait=async(predicate)=>{const until=Date.now()+12000;while(Date.now()<until){const found=messages.find(predicate);if(found)return found;await new Promise(r=>setTimeout(r,20))}throw new Error('Timed out waiting for server message')};const id=(await wait(m=>m.type==='connected')).id;return {ws,id,messages,wait,send:m=>ws.send(JSON.stringify(m))}}
try{
 const a=await client(),b=await client(),c=await client(),d=await client(),extra=await client();
 a.send({type:'create',name:'Ama',settings:{arena:'uncompleted',lives:2}});const room=await a.wait(m=>m.type==='room');
 b.send({type:'join',code:room.code,name:'Kojo'});await a.wait(m=>m.type==='room'&&m.players.length===2);
 a.send({type:'start'});await a.wait(m=>m.type==='error'&&m.message.includes('ready'));
 for(const [p,name]of [[c,'Yaw'],[d,'Akua']])p.send({type:'join',code:room.code,name});
 await a.wait(m=>m.type==='room'&&m.players.length===4);extra.send({type:'join',code:room.code});await extra.wait(m=>m.type==='error'&&m.message==='Room is full');
 a.send({type:'configure',settings:{arena:'uncompleted',lives:2}});await a.wait(m=>m.type==='room'&&m.players.length===4&&!m.players.some(p=>p.ready));
 for(const p of [a,b,c,d])p.send({type:'ready',ready:true});await a.wait(m=>m.type==='room'&&m.players.length===4&&m.players.every(q=>q.ready));
 b.send({type:'start'});await new Promise(r=>setTimeout(r,100));assert.equal(a.messages.some(m=>m.type==='matchStart'),false);
 a.send({type:'start',settings:{arena:'uncompleted',lives:2}});for(const p of [a,b,c,d]){const start=await p.wait(m=>m.type==='matchStart');assert.equal(start.settings.lives,2);assert.equal(start.players.length,4)}
 const move=setInterval(()=>a.send({type:'input',x:1,z:0}),50);
 const moved=await a.wait(m=>m.type==='snapshot'&&m.players.find(p=>p.id===a.id).x>1);clearInterval(move);
 const same=await b.wait(m=>m.type==='snapshot'&&m.tick===moved.tick);assert.deepEqual(same.ball,moved.ball);assert.deepEqual(same.players,moved.players);
 c.ws.close();await b.wait(m=>m.type==='snapshot'&&m.players.find(p=>p.id===c.id)?.connected===false);
 a.ws.close();await b.wait(m=>m.type==='room'&&m.hostId===b.id);
 b.ws.close();const result=await d.wait(m=>m.type==='snapshot'&&m.finished);assert.equal(result.winner,d.id);await d.wait(m=>m.type==='room'&&!m.started&&m.players.length===1&&!m.players[0].ready);
 console.log('PASS: 4 clients, readiness, host authority, room capacity, shared state, movement, disconnect, host migration and rematch reset');
}finally{for(const ws of clients)ws.close()}
