import {WebSocketServer} from 'ws';
import {randomBytes} from 'node:crypto';
const server=new WebSocketServer({port:3001,path:'/ws'});
const rooms=new Map();
const send=(ws,obj)=>{if(ws.readyState===1)ws.send(JSON.stringify(obj))};
const publish=(room)=>{for(const player of room.players)send(player.ws,{type:'room',code:room.code,players:room.players.map(p=>({id:p.id,name:p.name,ready:p.ready})),started:room.started,hostId:room.players[0]?.id})};
const code=()=>randomBytes(3).toString('hex').toUpperCase();
server.on('connection',ws=>{
 const id=randomBytes(8).toString('hex');let current=null;
 const leave=()=>{if(!current)return;const room=rooms.get(current);if(room){room.players=room.players.filter(p=>p.id!==id);if(!room.players.length)rooms.delete(current);else publish(room)}current=null};
 send(ws,{type:'connected',id});
 ws.on('message',data=>{let m;try{m=JSON.parse(data.toString())}catch{return}if(!m||typeof m.type!=='string')return;
 if(m.type==='create'||m.type==='join'){
  leave();let room;if(m.type==='create'){let c=code();while(rooms.has(c))c=code();room={code:c,players:[],started:false};rooms.set(c,room)}else{room=rooms.get(String(m.code||'').toUpperCase());if(!room)return send(ws,{type:'error',message:'Room not found'});if(room.players.length>=4)return send(ws,{type:'error',message:'Room is full'});if(room.started)return send(ws,{type:'error',message:'Match already started'})}
  current=room.code;room.players.push({id,ws,name:String(m.name||'Guest').slice(0,20),ready:false});publish(room)
 }else if(m.type==='ready'&&current){const room=rooms.get(current);const p=room?.players.find(p=>p.id===id);if(p){p.ready=!!m.ready;publish(room)}}
 else if(m.type==='start'&&current){const room=rooms.get(current);if(room?.players[0]?.id!==id)return; if(room.players.length<2)return send(ws,{type:'error',message:'At least 2 players needed'});if(!room.players.every(p=>p.ready))return send(ws,{type:'error',message:'All players must be ready'});room.started=true;publish(room);for(const p of room.players)send(p.ws,{type:'matchStart',players:room.players.map(q=>({id:q.id,name:q.name}))})}
 else if(m.type==='position'&&current){const room=rooms.get(current);if(!room?.started)return;const x=Number(m.x),z=Number(m.z);if(!Number.isFinite(x)||!Number.isFinite(z))return;for(const p of room.players)if(p.id!==id)send(p.ws,{type:'position',id,x:Math.max(-12,Math.min(12,x)),z:Math.max(-12,Math.min(12,z))})}
 else if(m.type==='leave')leave();
 });ws.on('close',leave)
});
console.log('Four Corners room server listening on ws://localhost:3001/ws');
