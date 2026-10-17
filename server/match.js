import {stepDribble} from '../src/dribbling.js';
import {crossedGoal,collideGoalBlocks,GOAL_WIDTH,GOAL_CLEAR_HEIGHT,PLAYER_LIMIT,confineBall,BALL_RADIUS} from '../src/court-layout.js';
export const ARENAS=['uncompleted','accra','kumasi','village','school','london'];
const HOMES=[[0,7],[0,-7],[7,0],[-7,0]],SIDES=[2,0,1,3];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createMatch(players,settings={}){
 settings=settings&&typeof settings==='object'?settings:{};
 return {tick:0,elapsed:0,pause:2,finished:false,winner:null,event:null,eventId:0,settings:{arena:ARENAS.includes(settings.arena)?settings.arena:'uncompleted',lives:[1,2,3,5].includes(settings.lives)?settings.lives:3},players:players.map((p,i)=>({id:p.id,name:p.name,side:SIDES[i],x:HOMES[i][0],z:HOMES[i][1],vx:0,vz:0,angle:Math.atan2(-HOMES[i][0],-HOMES[i][1]),lives:[1,2,3,5].includes(settings.lives)?settings.lives:3,goals:0,shots:0,stamina:1,connected:true,input:{},lastInput:0,lastRelease:0,charge:null,cooldown:0})),ball:{x:0,z:0,y:BALL_RADIUS,vx:0,vz:0,vy:0,owner:null,last:null},timeLeft:180};
}
export function acceptInput(match,id,m){
 const p=match.players.find(p=>p.id===id);if(!p||!p.connected||!p.lives||match.finished)return;
 p.input={x:clamp(Number(m.x)||0,-1,1),z:clamp(Number(m.z)||0,-1,1),sprint:m.sprint===true,shoot:m.shoot===true,release:Number.isSafeInteger(m.release)&&m.release>=0?m.release:0};p.lastInput=match.elapsed;
}
function announce(m,event){m.event={...event,id:++m.eventId}}
function finish(m,reason){const alive=m.players.filter(p=>p.connected&&p.lives>0),best=Math.max(0,...alive.map(p=>p.lives)),leaders=alive.filter(p=>p.lives===best);m.finished=true;m.winner=leaders.length===1?leaders[0].id:null;announce(m,{type:'finished',reason,winner:m.winner})}
export function disconnectPlayer(m,id){const p=m.players.find(p=>p.id===id);if(p){p.connected=false;p.lives=0;if(m.ball.owner===id)m.ball.owner=null;if(m.players.filter(q=>q.connected&&q.lives>0).length<=1)finish(m,'disconnect')}}
function kickoff(m){Object.assign(m.ball,{x:0,z:0,y:BALL_RADIUS,vx:0,vz:0,vy:0,owner:null,last:null});m.players.forEach((p,i)=>{p.x=HOMES[i][0];p.z=HOMES[i][1];p.vx=p.vz=0;p.input={};p.charge=null;p.cooldown=.5})}
export function stepMatch(m,dt=1/60){
 if(m.finished)return;m.tick++;m.elapsed+=dt;m.timeLeft=Math.max(0,180-m.elapsed);
 if(m.timeLeft===0){finish(m,'time');return}
 if(m.pause>0){m.pause=Math.max(0,m.pause-dt);return}
 const b=m.ball,previousBall={x:b.x,z:b.z,y:b.y};
 for(const p of m.players){
  if(!p.lives||!p.connected)continue;if(m.elapsed-p.lastInput>.35){p.input={};p.vx=p.vz=0}
  const c=p.input,len=Math.max(1,Math.hypot(c.x||0,c.z||0)),run=c.sprint&&p.stamina>.05&&len>0,speed=run?7.5:5;
  p.stamina=clamp(p.stamina+(run?-.3:.18)*dt,0,1);const response=1-Math.exp(-12*dt);p.vx+=((c.x||0)/len*speed-p.vx)*response;p.vz+=((c.z||0)/len*speed-p.vz)*response;
  p.x=clamp(p.x+p.vx*dt,-PLAYER_LIMIT,PLAYER_LIMIT);p.z=clamp(p.z+p.vz*dt,-PLAYER_LIMIT,PLAYER_LIMIT);if(Math.hypot(p.vx,p.vz)>.1)p.angle=Math.atan2(p.vx,p.vz);p.cooldown=Math.max(0,p.cooldown-dt);
  if(c.shoot&&p.charge===null)p.charge=m.elapsed;
  const released=(c.release||0)>p.lastRelease||(!c.shoot&&p.charge!==null);
  if(released){p.lastRelease=Math.max(p.lastRelease,c.release||0);if(b.owner===p.id){const charge=clamp((m.elapsed-(p.charge??m.elapsed))/.9,0,1),speed=10+11*charge;b.owner=null;b.vx=Math.sin(p.angle)*speed;b.vz=Math.cos(p.angle)*speed;b.vy=.6+charge*3;b.last=p.id;p.shots++;p.cooldown=.35;announce(m,{type:'kick',player:p.id})}else if(p.cooldown===0&&Math.hypot(b.x-p.x,b.z-p.z)<1.6&&b.y<.9){b.owner=p.id;b.last=p.id;p.cooldown=.4;announce(m,{type:'tackle',player:p.id})}p.charge=null}
 }
 if(b.owner){const p=m.players.find(p=>p.id===b.owner);if(!p?.lives){b.owner=null}else{if(!stepDribble(b,p,dt)){b.owner=null;p.cooldown=.12}b.y=BALL_RADIUS;b.vy=0}}
 if(!b.owner){b.x+=b.vx*dt;b.z+=b.vz*dt;b.y=Math.max(BALL_RADIUS,b.y+b.vy*dt);if(b.y>BALL_RADIUS)b.vy-=9.8*dt;else b.vy=Math.abs(b.vy)>.8?-b.vy*.35:0;const drag=Math.exp(-.65*dt);b.vx*=drag;b.vz*=drag;
  for(const p of m.players){if(!p.lives||!p.connected||p.cooldown>0)continue;if(b.y<.8&&Math.hypot(b.x-p.x,b.z-p.z)<.85){b.owner=p.id;b.last=p.id;break}}
 }
 // Match the rectangular block contacts used by the offline court.
 for(const [gx,gz]of [[0,-11],[11,0],[0,11],[-11,0]]){const ox=gx/11,oz=gz/11,rx=b.x-gx,rz=b.z-gz;const contact=collideGoalBlocks(-rx*oz+rz*ox,rx*ox+rz*oz,b.y,-b.vx*oz+b.vz*ox,b.vx*ox+b.vz*oz);b.x=gx+contact.z*ox-contact.x*oz;b.z=gz+contact.z*oz+contact.x*ox;b.vx=contact.vz*ox-contact.vx*oz;b.vz=contact.vz*oz+contact.vx*ox}
 const side=[0,1,2,3].findIndex(side=>crossedGoal(previousBall,b,side));
 const victim=m.players.find(p=>p.side===side&&p.lives>0&&p.connected);
 if(victim&&b.y<GOAL_CLEAR_HEIGHT){victim.lives--;const scorer=m.players.find(p=>p.id===b.last);if(scorer&&scorer!==victim)scorer.goals++;announce(m,{type:'goal',victim:victim.id,scorer:scorer?.id||null,lives:victim.lives});if(m.players.filter(p=>p.lives>0&&p.connected).length<=1)finish(m,'elimination');else{m.pause=1.5;kickoff(m)}return}
 const bounded=confineBall(b.x,b.z,b.vx,b.vz,.75);Object.assign(b,bounded);

}
export function snapshot(m){return {type:'snapshot',tick:m.tick,timeLeft:m.timeLeft,pause:m.pause,finished:m.finished,winner:m.winner,event:m.event,ball:m.ball,players:m.players.map(({input,lastInput,lastRelease,charge,cooldown,...p})=>p)}}
