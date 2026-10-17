import {getDatabase,ref,onValue,set,onDisconnect,serverTimestamp} from 'firebase/database';
import {signInAnonymously} from 'firebase/auth';
import {auth,authReady,firebaseApp} from './firebase.js';
import {createMatch} from '../server/match.js';
import {RoomSimulation} from './room-simulation.js';
import {movementInput} from './online-movement.js';
import {OnlineMotion} from './online-motion.js';
export class FirebaseRoomConnection{
 readyState=0;subscriptions=[];queue=Promise.resolve();code=null;match=null;lastMatch=null;closed=false;
 constructor(){this.initialize()}
 emit(m){if(!this.closed)this.onmessage?.({data:JSON.stringify(m)})}
 async initialize(){try{await authReady;if(!auth.currentUser)await signInAnonymously(auth);if(this.closed)return;this.uid=auth.currentUser.uid;this.db=getDatabase(firebaseApp);this.readyState=1;this.emit({type:'connected',id:this.uid});this.onopen?.()}catch{this.emit({type:'error',message:'Firebase connection failed. Check your connection and try again.'});this.close()}}
 async request(action,body={}){const token=await auth.currentUser.getIdToken();const response=await fetch('/api/rooms/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({...body,code:body.code||this.code})});let result;try{result=await response.json()}catch{throw new Error('Room service is unavailable. Try again.')};if(!response.ok)throw new Error(result.error||'Room request failed.');return result}
 writeInput(m){if(!this.code||!this.meta?.started||this.closed)return;
  const input={...movementInput(m),seq:Number.isSafeInteger(m.seq)?m.seq:0};
  this.runner?.receiveInput(this.uid,input);
  set(ref(this.db,`rooms/${this.code}/inputs/${this.uid}`),{...input,at:serverTimestamp()}).catch(()=>{const now=performance.now();if(!this.inputErrorAt||now-this.inputErrorAt>5000){this.inputErrorAt=now;this.emit({type:'error',message:'Movement could not be shared. Check your connection and rejoin the room.'})}});
 }
 send(data){let m;try{m=JSON.parse(data)}catch{return}if(m.type==='input'){if(this.motion)this.motion.inputPacket(m);else this.writeInput(m);return}
 this.queue=this.queue.then(async()=>{if(this.closed)return;
 if(m.type==='authenticate')return;
 if(m.type==='create'||m.type==='join'){if(this.code)await this.leave();const result=await this.request(m.type,m);await this.attach(result.code)}
 else if(m.type==='leave')await this.leave();
 else await this.request(m.type,m);
 }).catch(e=>this.emit({type:'error',message:e.message}))}
 async attach(code){this.code=code;this.lastMatch=null;this.meta=null;this.inputs={};this.presence={};const base=`rooms/${code}`;
 this.disconnect=onDisconnect(ref(this.db,`${base}/presence/${this.uid}`));await this.disconnect.set(false);await set(ref(this.db,`${base}/presence/${this.uid}`),true);
 const listen=(path,fn)=>this.subscriptions.push(onValue(ref(this.db,`${base}/${path}`),s=>fn(s.val()),()=>this.emit({type:'error',message:'Room connection interrupted. Please rejoin.'})));
 listen('presence',v=>{this.presence=v||{};if(this.meta&&this.presence[this.meta.hostId]===false&&!this.state?.finished){this.emit({type:'error',message:'The host disconnected. Create or join a new room.'});this.leave()}});
 listen('inputs',v=>{this.inputs=v||{};this.runner?.receiveInputs(this.inputs)});
 listen('meta',meta=>{if(!meta||meta.closed){this.emit({type:'error',message:'The host left this room.'});this.leave();return}this.meta=meta;const players=Object.values(meta.players||{}).sort((a,b)=>a.joinedAt-b.joinedAt||a.id.localeCompare(b.id));this.emit({type:'room',...meta,players});if(meta.started&&meta.matchId!==this.lastMatch){this.lastMatch=meta.matchId;this.state=null;const seq=Math.max(this.motion?.seq||0,this.inputs?.[this.uid]?.seq||0);this.motion=new OnlineMotion(this.uid,{sendInput:input=>this.writeInput(input)});this.motion.seq=seq;const match=createMatch(Object.values(meta.roster),meta.settings);this.emit({type:'matchStart',settings:meta.settings,players:match.players.map(({id,name,side})=>({id,name,side}))});if(meta.hostId===this.uid)this.startHost(match)}
 if(!meta.started){this.stopHost();this.lastMatch=null}});
 listen('state',state=>{if(state&&state.matchId===this.meta?.matchId&&(!this.state||state.tick>this.state.tick)){this.state=state;this.motion?.receive(state);this.emit(state);if(state.finished&&!this.saving){this.saving=true;this.request('finish').then(()=>{if(!auth.currentUser?.isAnonymous)this.emit({type:'pointsSaved'})}).catch(e=>this.emit({type:'error',message:'Match ended. '+e.message})).finally(()=>{this.saving=false});}}});
 }
 startHost(match){this.stopHost();this.match=match;const code=this.code,matchId=this.lastMatch;
 this.runner=new RoomSimulation(match,{publish:state=>set(ref(this.db,`rooms/${code}/state`),{...state,matchId}),onError:()=>this.emit({type:'error',message:'Could not share match state. Check your connection.'}),onFinish:()=>{clearInterval(this.timer);this.timer=null;this.rematchTimer=setTimeout(()=>this.request('rematch').catch(()=>{}),8000)}});
 this.runner.receiveInputs(this.inputs);this.timer=setInterval(()=>this.runner?.tick(this.presence),1000/60);
 }
 stopHost(){clearInterval(this.timer);clearTimeout(this.rematchTimer);this.runner=null;this.match=null}
 async leave(){if(!this.code)return;const code=this.code;this.subscriptions.splice(0).forEach(unsubscribe=>unsubscribe());this.stopHost();this.code=null;this.meta=null;await set(ref(this.db,`rooms/${code}/presence/${this.uid}`),false).catch(()=>{});await this.disconnect?.cancel().catch(()=>{});await this.request('leave',{code}).catch(()=>{})}
 close(){if(this.closed)return;this.leave();this.closed=true;this.readyState=3;this.onclose?.()}
}
