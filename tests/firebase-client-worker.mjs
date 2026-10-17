// Isolated Firebase Auth session for the opt-in, two-client cloud smoke test.
import {FirebaseRoomConnection} from '../src/firebase-rooms.js';
import {auth} from '../src/firebase.js';
import {deleteUser} from 'firebase/auth';
const nativeFetch=globalThis.fetch;
globalThis.fetch=(url,options)=>nativeFetch(typeof url==='string'&&url.startsWith('/')?process.env.FC_API_BASE+url:url,options);
if(process.env.FC_TEST_CLOCK_SKEW){const original=Date.now;Date.now=()=>original()+Number(process.env.FC_TEST_CLOCK_SKEW)}
const socket=new FirebaseRoomConnection();let interval;
socket.onopen=()=>process.send({type:'open',uid:socket.uid});
socket.onmessage=e=>{const m=JSON.parse(e.data);if(['error','room','matchStart'].includes(m.type))process.send(m);if(m.type==='snapshot')process.send({type:'position',tick:m.tick,players:m.players.map(p=>({id:p.id,x:p.x,z:p.z}))})};
process.on('message',async m=>{
 if(m.type==='move')interval=setInterval(()=>socket.send(JSON.stringify({type:'input',x:1,z:0,release:0})),50);
 else if(m.type==='halt'){clearInterval(interval);socket.send(JSON.stringify({type:'input',x:0,z:0,release:0}))}
 else if(m.type==='stop'){clearInterval(interval);await socket.leave();socket.close();if(auth.currentUser?.isAnonymous)await deleteUser(auth.currentUser);process.exit(0)}
 else socket.send(JSON.stringify(m));
});
