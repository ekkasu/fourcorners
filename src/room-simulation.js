import {acceptInput,stepMatch,snapshot,disconnectPlayer} from '../server/match.js';
export const INPUT_TIMEOUT_MS=600;
export const SNAPSHOT_INTERVAL_MS=50;
export const MAX_PENDING_SNAPSHOTS=16;
// Network travel time and another device's clock must not determine whether an
// input is usable. Expire controls only after this host stops receiving packets.
export class RoomSimulation{
 constructor(match,{publish,onFinish=()=>{},onError=()=>{},now=()=>performance.now()}={}){
  this.match=match;this.publish=publish;this.onFinish=onFinish;this.onError=onError;this.now=now;this.inputs=new Map();this.previous=now();this.lastPublish=-Infinity;this.accumulator=0;this.pending=0;this.finished=false;
 }
 receiveInput(id,input){
  const old=this.inputs.get(id)?.input;
  if(old&&Number.isSafeInteger(input.seq)&&input.seq<(old.seq||0))return;
  if(!old||['seq','at','x','z','shoot','sprint','control','aim','release'].some(key=>old[key]!==input[key]))this.inputs.set(id,{input,receivedAt:this.now()});
 }
 receiveInputs(values={}){for(const [id,input] of Object.entries(values||{}))this.receiveInput(id,input);
  for(const id of this.inputs.keys())if(!values?.[id])this.inputs.delete(id);
 }
 tick(presence={}){
  if(this.finished)return;
  const now=this.now();this.accumulator+=Math.min(Math.max(0,now-this.previous)/1000,.2);this.previous=now;
  while(this.accumulator>=1/60&&!this.match.finished){
   for(const p of this.match.players){if(presence[p.id]===false&&p.connected)disconnectPlayer(this.match,p.id);const packet=this.inputs.get(p.id);if(packet&&now-packet.receivedAt<INPUT_TIMEOUT_MS)acceptInput(this.match,p.id,packet.input)}
   stepMatch(this.match);this.accumulator-=1/60;
  }
  const final=this.match.finished;
  if(final||(now-this.lastPublish>=SNAPSHOT_INTERVAL_MS&&this.pending<MAX_PENDING_SNAPSHOTS)){
   this.lastPublish=now;this.pending++;
   // Copy before the next simulation tick; Firebase can acknowledge a write
   // later without blocking the next snapshot from being sent.
   const state=JSON.parse(JSON.stringify(snapshot(this.match)));
   Promise.resolve().then(()=>this.publish(state)).catch(this.onError).finally(()=>this.pending--);
  }
  if(final){this.finished=true;this.onFinish()}
 }
}
