// Isolated Firebase Auth session for the opt-in, two-client cloud smoke test.
import {FirebaseRoomConnection} from '../src/firebase-rooms.js';
import {auth} from '../src/firebase.js';
import {deleteUser} from 'firebase/auth';
const nativeFetch=globalThis.fetch;
globalThis.fetch=(url,options)=>nativeFetch(typeof url==='string'&&url.startsWith('/')?process.env.FC_API_BASE+url:url,options);
if(process.env.FC_TEST_CLOCK_SKEW){const original=Date.now;Date.now=()=>original()+Number(process.env.FC_TEST_CLOCK_SKEW)}
const socket=new FirebaseRoomConnection();let input={x:0,z:0,release:0},previous=performance.now(),measuring=false,lastShown,maxStep=0,maxStepDelta=0,movementFrames=0;
// Exercise the same per-frame prediction/interpolation used by OnlineArena.
const interval=setInterval(()=>{const now=performance.now(),delta=(now-previous)/1000;previous=now;
 const scene=socket.motion?.frame(input,delta,now),player=scene?.players.find(p=>p.id===socket.uid);
 if(measuring&&player){if(lastShown){const step=Math.hypot(player.x-lastShown.x,player.z-lastShown.z);if(step>maxStep){maxStep=step;maxStepDelta=delta}if(step>.001)movementFrames++}lastShown=player}
},1000/60);
socket.onopen=()=>process.send({type:'open',uid:socket.uid});
socket.onmessage=e=>{const m=JSON.parse(e.data);if(['error','room','matchStart'].includes(m.type))process.send(m);if(m.type==='snapshot')process.send({type:'position',tick:m.tick,players:m.players.map(p=>({id:p.id,x:p.x,z:p.z,vx:p.vx,vz:p.vz}))})};
process.on('message',async m=>{
 if(m.type==='move'){input={...input,x:1};measuring=true;lastShown=null;maxStep=0;maxStepDelta=0;movementFrames=0}
 else if(m.type==='turn')input={...input,x:-1,control:true};
 else if(m.type==='halt'){input={...input,x:0};process.send({type:'motion',maxStep,maxStepDelta,movementFrames});measuring=false}
 else if(m.type==='stop'){clearInterval(interval);await socket.leave();socket.close();if(auth.currentUser?.isAnonymous)await deleteUser(auth.currentUser);process.exit(0)}
 else socket.send(JSON.stringify(m));
});
