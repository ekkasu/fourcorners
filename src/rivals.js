import {canTouchBall} from './one-touch.js';
import * as THREE from 'three';
import {GOAL_WIDTH,PLAYER_LIMIT,confineBall} from './court-layout.js';
const RIVAL_GOALS=[0,3,1],GOALS=[[0,-11],[11,0],[0,11],[-11,0]];
export const DIFFICULTY={
 easy:{label:'Easy',carry:2.8,press:3.1,rush:4,guard:2.6,pressRange:1.8,tackleWin:.22,save:.2,shootRange:5,aim:4.5,recover:2,shootDelay:1.5,shotSpeed:8,shotSpread:2,controlGrace:1.1,tackleDelay:.8},
 normal:{label:'Normal',carry:3.6,press:4,rush:5,guard:3.1,pressRange:2.8,tackleWin:.38,save:.35,shootRange:6.5,aim:3.6,recover:1.6,shootDelay:1,shotSpeed:10,shotSpread:2.5,controlGrace:.8,tackleDelay:.6},
 hard:{label:'Hard',carry:5.4,press:5.6,rush:7.2,guard:4,pressRange:5,tackleWin:.7,save:.6,shootRange:9,aim:2,recover:1,shootDelay:.6,shotSpeed:12,shotSpread:4,controlGrace:.4,tackleDelay:.4}};
// Each rival has a style that scales the difficulty tuning. guardDist scales how far it stands off its goal.
export const RIVAL_STYLES=[
 {name:'PRESSER',pressRange:1.7,press:1.1,tackleWin:1.15,save:.85},
 {name:'WALL',pressRange:.6,save:1.35,carry:.9,guardDist:.55},
 {name:'SNIPER',shootRange:1.4,aim:.65,tackleWin:.8,press:.95}];
const styledLevel=(L,i)=>{const st=RIVAL_STYLES[i],out={...L,guardDist:st.guardDist||1};for(const k of Object.keys(st))if(typeof st[k]==='number'&&k in L)out[k]=L[k]*st[k];out.save=Math.min(.9,out.save);out.tackleWin=Math.min(.92,out.tackleWin);return out};
// All corners have equal status. Spread possessions across surviving opponents,
// then prefer an open, nearby goal instead of concentrating every attack on one corner.
export function pickRivalTarget(s,i){
 const r=s.rivals[i],counts=s.attackCounts??=[0,0,0,0];
 const candidates=[0,1,2,3].filter(g=>g!==RIVAL_GOALS[i]&&s.alive[g]);
 const least=Math.min(...candidates.map(g=>counts[g]));
 let best=candidates[0],score=Infinity;
 for(const g of candidates){
  if(counts[g]>least)continue;
  const [gx,gz]=GOALS[g],crowding=s.rivals.filter((o,k)=>k!==i&&s.rc===k&&o.target===g).length;
  const value=Math.hypot(gx-r.x,gz-r.z)+(g===r.lastTarget?4:0)+crowding*4;
  if(value<score){best=g;score=value}
 }
 if(best!==undefined){counts[best]++;r.lastTarget=best}
 return best;
}

export function createRivalStepper({sfx,burst,touchBall,KICK_LEAD,KICKER_GRACE,ONE_TOUCH_WINDOW}){return function stepRivals(s,d){const L0=s.level||DIFFICULTY.normal,levels=[0,1,2].map(i=>styledLevel(L0,i));
 // Penalty: everyone stands still; a rival taker shoots at the open goal, sometimes missing.
 if(s.penalty){const p=s.penalty;s.rivals.forEach(rv=>{rv.vx=rv.vz=0});if(!p.shot&&typeof p.victim==='number'&&s.rc===p.victim&&s.now>=p.kickBy){const i=p.victim,rv=s.rivals[i],L=levels[i],[gx,gz]=GOALS[p.goal],ox=gx/11,oz=gz/11,
   lateral=(Math.random()*2-1)*(GOAL_WIDTH/2-.3)+(Math.random()-.5)*L.aim*.9,tx=gx-oz*lateral,tz=gz+ox*lateral,ux=tx-s.bx,uz=tz-s.bz,u=Math.hypot(ux,uz),power=13+Math.random()*4;
   s.rc=-1;s.ignore={who:i,until:s.now+KICKER_GRACE};s.bvx=ux/u*power;s.bvz=uz/u*power;s.bvy=.4+Math.random()*1.4;s.curve=0;s.last=i;s.lock=.4;rv.cool=1;rv.kickAt=s.now-KICK_LEAD;rv.kickType='penalty';sfx.kick(.8);burst(s.bx,s.bz,7,'kick',ux/u,uz/u);p.shot=true;p.endAt=s.now+3}
  return}
 s.stealCool-=d;
 if(canTouchBall(s,'player')&&s.rc>=0&&s.now>=(s.controlUntil||0)&&s.stealCool<=0&&Math.hypot(s.bx-s.x,s.bz-s.z)<.85){s.rivals[s.rc].cool=1.2;s.rc=-1;s.attached=true;s.controlUntil=s.now+L0.controlGrace;s.bAng=Math.atan2(s.bx-s.x,s.bz-s.z);s.last='player';s.stealCool=.8;sfx.tackle();if(!touchBall(s,'player'))s.touchUntil=s.now+ONE_TOUCH_WINDOW}
 const ballSpeed=Math.hypot(s.bvx,s.bvz),loose=!s.attached&&s.rc<0;let chaser=-1,best=Infinity;
 s.rivals.forEach((r,i)=>{if(!s.alive[RIVAL_GOALS[i]]||s.rc===i||!canTouchBall(s,i))return;const dist=Math.hypot(s.bx-r.x,s.bz-r.z);if(dist<best){best=dist;chaser=i}});
 s.rivals.forEach((r,i)=>{
  const g=RIVAL_GOALS[i],[gx,gz]=GOALS[g],alive=s.alive[g],L=levels[i];r.cool-=d;let tx=r.x,tz=r.z,speed=0;
  // Fooled by a step-over: the rival keeps lunging the wrong way and stumbles to a stop.
  if(alive&&s.rc!==i&&r.fooledUntil>s.now){r.x=THREE.MathUtils.clamp(r.x+r.vx*d,-PLAYER_LIMIT,PLAYER_LIMIT);r.z=THREE.MathUtils.clamp(r.z+r.vz*d,-PLAYER_LIMIT,PLAYER_LIMIT);r.vx*=Math.exp(-3*d);r.vz*=Math.exp(-3*d);return}
  if(!alive&&s.rc===i)s.rc=-1;
  if(alive&&s.rc===i){if(!s.alive[r.target])r.target=pickRivalTarget(s,i);const[ax,az]=GOALS[r.target];tx=ax*.82;tz=az*.82;speed=L.carry;
   const defenders=[...(s.alive[2]?[s]:[]),...s.rivals.filter((o,k)=>k!==i&&s.alive[RIVAL_GOALS[k]])],near=defenders.reduce((a,o)=>!a||Math.hypot(o.x-r.x,o.z-r.z)<Math.hypot(a.x-r.x,a.z-r.z)?o:a,null),px=(near?.x??r.x)-r.x,pz=(near?.z??r.z)-r.z,pd=Math.hypot(px,pz);if(pd>0&&pd<2.6){const side=px*(tz-r.z)-pz*(tx-r.x)>0?-1:1;tx-=pz/pd*side*2.5;tz+=px/pd*side*2.5}}
  else if(alive){const toGoal=Math.hypot(s.bx-gx,s.bz-gz)||1,threat=toGoal<6.5,used=s.oneTouch&&s.toucher===i;
   if(!used&&(threat||(i===chaser&&(loose||best<L.pressRange)))){tx=s.bx;tz=s.bz;speed=threat&&toGoal<4.5?L.rush:L.press}
   else{const k=Math.min(3*L.guardDist,toGoal*.45);tx=gx+(s.bx-gx)/toGoal*k;tz=gz+(s.bz-gz)/toGoal*k;speed=L.guard}}
  if(alive&&loose&&Math.max(Math.abs(s.bx),Math.abs(s.bz))>10.3&&i!==chaser){const awayX=r.x-s.bx,awayZ=r.z-s.bz,away=Math.hypot(awayX,awayZ);if(away<2.5){const nx=away>.01?awayX/away:-Math.sign(s.bx||1),nz=away>.01?awayZ/away:-Math.sign(s.bz||1);tx=s.bx+nx*3;tz=s.bz+nz*3;speed=L.guard}}
  const dx=tx-r.x,dz=tz-r.z,dist=Math.hypot(dx,dz),want=dist>.25?Math.min(speed,dist*3):0;
  r.vx=THREE.MathUtils.damp(r.vx,dist?dx/dist*want:0,6,d);r.vz=THREE.MathUtils.damp(r.vz,dist?dz/dist*want:0,6,d);
  r.x=THREE.MathUtils.clamp(r.x+r.vx*d,-PLAYER_LIMIT,PLAYER_LIMIT);r.z=THREE.MathUtils.clamp(r.z+r.vz*d,-PLAYER_LIMIT,PLAYER_LIMIT);
  if(alive&&loose&&s.rc<0&&!s.attached&&i===chaser&&r.cool<=0&&s.by<.5&&ballSpeed<=7&&canTouchBall(s,i)&&Math.hypot(s.bx-r.x,s.bz-r.z)<.9){s.attached=false;s.rc=i;r.target=pickRivalTarget(s,i);s.last=i;s.lock=.6;s.stealCool=.9;r.cool=L.shootDelay;s.controlUntil=s.now+L.controlGrace;r.touchUntil=s.now+.25+Math.random()*.35;touchBall(s,i);return}
  for(const o of [s,...s.rivals]){if(o===r||(o!==s&&!s.alive[RIVAL_GOALS[s.rivals.indexOf(o)]]))continue;const ox=r.x-o.x,oz=r.z-o.z,od=Math.hypot(ox,oz);if(od>0&&od<.9){r.x+=ox/od*(.9-od);r.z+=oz/od*(.9-od)}}
  r.x=THREE.MathUtils.clamp(r.x,-PLAYER_LIMIT,PLAYER_LIMIT);r.z=THREE.MathUtils.clamp(r.z,-PLAYER_LIMIT,PLAYER_LIMIT);
  if(s.rc===i){const[ax,az]=GOALS[r.target],heading=Math.hypot(r.vx,r.vz)>.3?Math.atan2(r.vx,r.vz):Math.atan2(ax-r.x,az-r.z);s.bx=r.x+Math.sin(heading)*.65;s.bz=r.z+Math.cos(heading)*.65;s.by=s.bvx=s.bvz=s.bvy=0;{const bounded=confineBall(s.bx,s.bz);s.bx=bounded.x;s.bz=bounded.z}
   if((r.cool<=0&&Math.hypot(ax-s.bx,az-s.bz)<L.shootRange)||(s.oneTouch&&s.now>=(r.touchUntil||0))){const miss=(Math.random()-.5)*L.aim,aimX=ax+(az?miss:0),aimZ=az+(ax?miss:0),ux=aimX-s.bx,uz=aimZ-s.bz,u=Math.hypot(ux,uz),power=L.shotSpeed+Math.random()*L.shotSpread;
    s.rc=-1;s.ignore={who:i,until:s.now+KICKER_GRACE};s.bvx=ux/u*power;s.bvz=uz/u*power;s.bvy=.8+Math.random()*1.6;s.curve=(Math.random()-.5)*.8;s.last=i;s.lock=.25;r.cool=1.2;r.kickAt=s.now-KICK_LEAD;r.kickType='strike';sfx.kick(.7);burst(s.bx,s.bz,7,'kick',ux/u,uz/u)}
   return}
  if(!alive||r.cool>0||s.by>1.9||Math.hypot(s.bx-r.x,s.bz-r.z)>.75||!canTouchBall(s,i))return;
  // Hard shot not saved: it has already deflected off this rival's body in the ball physics.
  if(loose&&ballSpeed>7&&Math.random()>L.save){r.cool=.5;return}
  if(!loose&&s.now<(s.controlUntil||0))return;
  const take=loose?ballSpeed<=7&&s.by<.5:Math.random()<L.tackleWin;
  if(take){if(!loose){sfx.tackle();r.kickAt=s.now;r.kickType='tackle'}if(s.rc>=0)s.rivals[s.rc].cool=1;s.attached=false;s.rc=i;r.target=pickRivalTarget(s,i);s.last=i;s.lock=.6;s.stealCool=.9;r.cool=L.shootDelay;s.controlUntil=s.now+L.controlGrace;r.touchUntil=s.now+.25+Math.random()*.35;touchBall(s,i);return}
  if(!loose){r.cool=L.tackleDelay;return}
  const cx=s.bx-gx,cz=s.bz-gz,c=Math.hypot(cx,cz)||1,spread=(Math.random()-.5)*.9,ux=cx/c-cz/c*spread,uz=cz/c+cx/c*spread,u=Math.hypot(ux,uz);
  r.kickAt=s.now-KICK_LEAD;r.kickType='strike';if(!loose)sfx.tackle();else sfx.save();if(s.rc>=0)s.rivals[s.rc].cool=1;s.attached=false;s.rc=-1;burst(s.bx,s.bz,5,'kick',ux/u,uz/u);s.bvx=ux/u*9;s.bvz=uz/u*9;s.bvy=2.5;s.lock=.6;s.last=i;s.ignore={who:i,until:s.now+KICKER_GRACE};r.cool=L.recover;touchBall(s,i);
 });
}
}
