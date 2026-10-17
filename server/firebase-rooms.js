import {randomBytes} from 'node:crypto';
import {createMatch} from './match.js';
const cleanSettings=s=>createMatch([],s).settings;
const failure=message=>{throw new Error(message)};
// Membership and roster changes go through the API. Clients only write their own
// controls/presence; the host publishes simulation snapshots through Firebase.
export async function roomRequest(realtime,store,uid,action,body){
 const code=String(body.code||'').toUpperCase();
 if(action!=='create'&&!/^[A-F0-9]{6}$/.test(code))failure('Room code is invalid.');
 const now=Date.now(),profile=await store.profile(uid);
 const member={id:uid,name:profile?.displayName||String(body.name||'Guest').trim().slice(0,20)||'Guest',accountId:profile?.id||null,ready:false,joinedAt:now};
 const rooms=realtime.ref('rooms');
 if(action==='create'){
  for(let n=0;n<5;n++){const code=randomBytes(3).toString('hex').toUpperCase();const result=await rooms.child(code).transaction(old=>old?undefined:{meta:{code,hostId:uid,createdAt:now,expires:now+3600000,started:false,settings:cleanSettings(body.settings),players:{[uid]:member}}});if(result.committed)return {code}}
  failure('Room could not be created. Try again.');
 }
 const ref=rooms.child(code),root=(await ref.get()).val();
 if(!root?.meta||root.meta.expires<now)failure('Room not found or expired.');
 const meta=root.meta,me=meta.players?.[uid],host=meta.hostId===uid;
 if(action==='finish'){
  if(!me||!meta.started||!root.state?.finished||root.state.matchId!==meta.matchId)failure('Room match is not finished.');
  const s=root.state,roster=Object.values(meta.roster||{});
  if(now-meta.startedAt<30000||s.tick<1800||s.tick>(now-meta.startedAt)/1000*60+300||!Array.isArray(s.players)||s.players.length!==roster.length||s.players.some(p=>!roster.some(r=>r.id===p.id)||!Number.isInteger(p.goals)||p.goals<0||p.goals>100)||s.winner&&!roster.some(p=>p.id===s.winner))failure('Room result is invalid.');
  const players=roster.map(p=>({...s.players.find(r=>r.id===p.id),accountId:p.accountId}));
  await store.record(meta.matchId,{finished:true,elapsed:s.tick/60,winner:s.winner||null,players});return {saved:true};
 }
 let error='Room changed. Please try again.';
 const result=await ref.child('meta').transaction(current=>{
  // RTDB may initially call a transaction with an empty local cache. Seed it
  // from the verified read; the server retries with its current value on conflict.
  current=current||meta;
  if(!current||current.expires<now){error='Room not found or expired.';return}
  const players={...current.players},isHost=current.hostId===uid;
  if(action==='join'){
   if(current.started){error='Room match already started.';return}
   if(!players[uid]&&Object.keys(players).length>=4){error='Room is full.';return}
   players[uid]=players[uid]||member;return {...current,players};
  }
  if(!players[uid]){error='Room membership expired.';return}
  if(action==='leave'){delete players[uid];if(isHost)return {...current,closed:true,players};return {...current,players}}
  if(current.closed){error='Room host has left. Create a new room.';return}
  if(action==='ready'&&!current.started){players[uid]={...players[uid],ready:body.ready===true};return {...current,players}}
  if(action==='configure'&&isHost&&!current.started){Object.values(players).forEach(p=>p.ready=false);return {...current,settings:cleanSettings(body.settings),players}}
  if(action==='start'&&isHost&&(!current.started||root.state?.finished)){
   const roster=Object.values(players).sort((a,b)=>a.joinedAt-b.joinedAt||a.id.localeCompare(b.id));
   if(roster.length<2||!roster.every(p=>p.ready)){error='Room needs at least two ready players.';return}
   return {...current,started:true,startedAt:now,matchId:randomBytes(16).toString('hex'),roster};
  }
  if(action==='rematch'&&isHost&&root.state?.finished){Object.values(players).forEach(p=>p.ready=false);return {...current,started:false,players}}
  error='Room action is unavailable.';
 });
 if(!result.committed)failure(error);return {code};
}
