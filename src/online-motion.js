import {movementInput,stepPlayerMovement} from './online-movement.js';
import {BALL_LIMIT,BALL_RADIUS,PLAYER_LIMIT} from './court-layout.js';

const STEP=1/60,BUFFER_MS=100,EXTRAPOLATE_MS=100,STALE_MS=600;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const mix=(a,b,t)=>a+(b-a)*t;
export const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
const sameInput=(a,b)=>a&&b&&['x','z','sprint','control','shoot','aim','release'].every(key=>a[key]===b[key]);

function interpolateBody(a,b,t){
 const body={...b};
 for(const key of ['x','y','z','vx','vy','vz','stamina'])if(Number.isFinite(a[key])&&Number.isFinite(b[key]))body[key]=mix(a[key],b[key],t);
 if(Number.isFinite(a.angle)&&Number.isFinite(b.angle))body.angle=a.angle+angleDelta(a.angle,b.angle)*t;
 return body;
}
function extrapolate(body,seconds,limit){
 return {...body,x:clamp(body.x+body.vx*seconds,-limit,limit),z:clamp(body.z+body.vz*seconds,-limit,limit)};
}

// The host owns the match. This class only predicts our movement for display and
// plays other actors on a short buffered timeline, independent of packet arrivals.
export class OnlineMotion{
 constructor(clientId,{sendInput=()=>{},now=()=>performance.now()}={}){
  this.clientId=clientId;this.sendInput=sendInput;this.now=now;this.snapshots=[];this.history=[];
  this.seq=0;this.inputStep=0;this.accumulator=0;this.lastSent=-Infinity;this.input=null;
  this.offset={x:0,z:0};this.latest=null;this.predicted=null;this.timeline=null;
 }
 receive(state,receivedAt=this.now()){
  if(this.latest&&state.tick<=this.latest.tick)return false;
  const previous=this.latest,player=state.players.find(p=>p.id===this.clientId);
  const reset=!previous||receivedAt-this.receivedAt>1000||state.pause>previous.pause||state.finished!==previous.finished||player?.lives!==previous.players.find(p=>p.id===this.clientId)?.lives;
  this.latest=state;this.receivedAt=receivedAt;
  if(reset){this.snapshots=[];this.history=[];this.timeline=state.tick*1000/60-BUFFER_MS;this.accumulator=0;this.offset={x:0,z:0}}
  this.snapshots.push(state);
  if(this.snapshots.length>40)this.snapshots.shift();
  if(player){
   const oldX=this.predicted?this.predicted.x+this.offset.x:player.x,oldZ=this.predicted?this.predicted.z+this.offset.z:player.z;
   const ack=player.inputSeq||0,ticks=player.inputTicks||0;
   this.history=this.history.filter(frame=>frame.seq>ack||(frame.seq===ack&&frame.step>ticks));
   this.predicted={...player};
   if(!state.pause&&!state.finished&&player.connected&&player.lives>0){for(const frame of this.history)stepPlayerMovement(this.predicted,frame.input,STEP,frame.context)}else this.history=[];
   // Preserve the displayed position when reconciling, then ease out the small
   // error. Kickoffs and elimination are deliberate resets, not movement errors.
   if(!reset){this.offset={x:oldX-this.predicted.x,z:oldZ-this.predicted.z};if(Math.hypot(this.offset.x,this.offset.z)>3)this.offset={x:0,z:0}}
  }
  return true;
 }
 inputPacket(raw,now=this.now()){
  const input=movementInput(raw);
  if(!sameInput(input,this.input)||now-this.lastSent>=50){
   this.input=input;this.seq++;this.inputStep=0;this.lastSent=now;
   this.sendInput({...input,seq:this.seq});
  }
  return input;
 }
 frame(raw,delta,now=this.now()){
  const input=this.inputPacket(raw,now),state=this.latest;
  if(!state)return null;
  const dt=clamp(delta,0,.1),stale=now-this.receivedAt>STALE_MS;
  this.accumulator+=dt;
  while(this.accumulator>=STEP){
   if(!stale&&!state.pause&&!state.finished&&this.predicted?.connected&&this.predicted.lives>0){
    const context={ball:{x:state.ball.x,z:state.ball.z},hasBall:state.ball.owner===this.clientId};
    stepPlayerMovement(this.predicted,input,STEP,context);
    this.history.push({seq:this.seq,step:++this.inputStep,input,context});
    if(this.history.length>120)this.history.shift();
   }
   this.accumulator-=STEP;
  }
  this.offset.x*=Math.exp(-12*dt);this.offset.z*=Math.exp(-12*dt);
  // Correct clock drift gradually. Bursts and delayed packets cannot move the
  // playback clock backwards or make all the players jump to the latest packet.
  const newestTime=state.tick*1000/60;
  const target=newestTime+Math.min(now-this.receivedAt,EXTRAPOLATE_MS)-BUFFER_MS;
  this.timeline=Math.min(newestTime+EXTRAPOLATE_MS,this.timeline+dt*1000*clamp(1+(target-this.timeline)/1000,.9,1.1));
  const scene=this.sample(this.timeline);
  const oldLocal=scene.players.find(p=>p.id===this.clientId);
  if(this.predicted){
   const local={...this.predicted,x:clamp(this.predicted.x+this.offset.x,-PLAYER_LIMIT,PLAYER_LIMIT),z:clamp(this.predicted.z+this.offset.z,-PLAYER_LIMIT,PLAYER_LIMIT)};
   scene.players=scene.players.map(p=>p.id===this.clientId?local:p);
   if(oldLocal&&scene.ball.owner===this.clientId&&state.ball.owner===this.clientId&&!state.pause){
    scene.ball.x=clamp(scene.ball.x+local.x-oldLocal.x,-BALL_LIMIT,BALL_LIMIT);
    scene.ball.z=clamp(scene.ball.z+local.z-oldLocal.z,-BALL_LIMIT,BALL_LIMIT);
   }
  }
  return scene;
 }
 sample(time){
  const frames=this.snapshots,latest=frames.at(-1);
  let a=frames[0],b=a;
  for(let i=1;i<frames.length;i++){b=frames[i];if(b.tick*1000/60>=time)break;a=b}
  const span=(b.tick-a.tick)*1000/60,t=span>0?clamp((time-a.tick*1000/60)/span,0,1):0;
  let players=b.players.map(p=>interpolateBody(a.players.find(q=>q.id===p.id)||p,p,t));
  let ball=interpolateBody(a.ball,b.ball,t);
  if(time>latest.tick*1000/60&&!latest.pause&&!latest.finished){
   const seconds=Math.min(EXTRAPOLATE_MS,time-latest.tick*1000/60)/1000;
   players=latest.players.map(p=>extrapolate(p,seconds,PLAYER_LIMIT));ball=extrapolate(latest.ball,seconds,BALL_LIMIT);
   ball.y=Math.max(BALL_RADIUS,latest.ball.y+(latest.ball.vy||0)*seconds);
  }
  return {...latest,players,ball};
 }
}
