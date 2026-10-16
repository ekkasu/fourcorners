import {GOAL_WIDTH,BALL_RADIUS} from './court-layout.js';
const GOALS=[[0,-11],[11,0],[0,11],[-11,0]],SIDES=[0,3,1];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function opponents(s,i){
 return [...(s.alive[2]?[s]:[]),...s.rivals.filter((_,k)=>k!==i&&s.alive[SIDES[k]])];
}

// Evaluate three lanes through each goal mouth. A defender in the shot corridor
// matters more than distance or previous targets; no corner has a human bias.
export function assessRivalGoal(s,i,goal){
 if(goal===SIDES[i]||!s.alive[goal])return null;
 const r=s.rivals[i],[gx,gz]=GOALS[goal],ox=gx/11,oz=gz/11;
 const depth=-(r.x-gx)*ox-(r.z-gz)*oz;
 if(depth<.2)return null;
 let best=null;
 for(const offset of [-(GOAL_WIDTH/2-BALL_RADIUS-.3),0,GOAL_WIDTH/2-BALL_RADIUS-.3]){
  const x=gx-oz*offset,z=gz+ox*offset,dx=x-r.x,dz=z-r.z,length=Math.hypot(dx,dz),length2=length*length;
  let obstruction=0;
  for(const p of opponents(s,i)){
   const px=p.x+clamp((p.vx||0)*.2,-1,1),pz=p.z+clamp((p.vz||0)*.2,-1,1);
   const t=((px-r.x)*dx+(pz-r.z)*dz)/length2;
   if(t<.06||t>1.08)continue;
   const distance=Math.hypot(px-(r.x+clamp(t,0,1)*dx),pz-(r.z+clamp(t,0,1)*dz));
   obstruction=Math.max(obstruction,Math.exp(-distance*distance/(.65+BALL_RADIUS)**2));
  }
  const openness=1-obstruction,angle=depth/length;
  const history=Math.min(3,(s.attackCounts?.[goal]||0)*.3)+(r.lastTarget===goal?.35:0);
  const score=openness*10+angle*2-length*.3-history;
  const option={goal,x,z,distance:length,openness,score};
  if(!best||option.score>best.score)best=option;
 }
 return best;
}
export function chooseRivalShot(s,i){
 let best=null;
 for(let goal=0;goal<4;goal++){
  const option=assessRivalGoal(s,i,goal);
  if(option&&(!best||option.score>best.score))best=option;
 }
 return best;
}

// One rival presses the ball; the others advance into distinct interception
// lanes instead of camping beside their blocks or piling onto the same spot.
export function rivalOffBallPosition(s,i,chaser){
 const r=s.rivals[i],[gx,gz]=GOALS[SIDES[i]],holder=s.attached?s:s.rc>=0?s.rivals[s.rc]:null;
 const bx=clamp(s.bx+(holder?.vx??s.bvx??0)*.3,-11.4,11.4),bz=clamp(s.bz+(holder?.vz??s.bvz??0)*.3,-11.4,11.4);
 const distance=Math.hypot(bx-gx,bz-gz)||1,used=s.oneTouch&&s.toucher===i;
 if(!used&&(i===chaser||distance<4.2))return{x:bx,z:bz,role:'press',urgent:distance<4.2};
 const advance=Math.min(7.5,distance*.6),spread=(i%2?1:-1)*1.5;
 return {x:clamp(gx+(bx-gx)/distance*advance-(bz-gz)/distance*spread,-10.7,10.7),z:clamp(gz+(bz-gz)/distance*advance+(bx-gx)/distance*spread,-10.7,10.7),role:'intercept',urgent:false};
}
