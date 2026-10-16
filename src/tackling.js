import {canTouchBall,touchBall} from './one-touch.js';
export const TACKLE_WINDOW=.16,TACKLE_COOLDOWN=.65;

// A standing challenge never changes position or movement velocity. The player
// keeps steering normally instead of being propelled past the opponent.
export function stepPlayerTackle(s,c,dt,{frozen=false,penalty=false,touchWindow=.6}={}){
 let started=false,won=false;
 if(c.shootAt&&c.shootAt!==s.seenPress){
  s.seenPress=c.shootAt;
  if(!s.attached&&!frozen&&!penalty){
   s.cancelShot=c.tackleShootAt=c.shootAt;
   if(canTouchBall(s,'player')&&s.tackleCool<=0){
    s.tackleWindow=TACKLE_WINDOW;s.tackleCool=TACKLE_COOLDOWN;
    s.kickAt=s.now;s.kickType='strike';started=true;
   }
  }
 }
 if(s.tackleWindow>0){
  if(!frozen&&!penalty&&!s.attached&&canTouchBall(s,'player')&&s.by<.6&&Math.hypot(s.bx-s.x,s.bz-s.z)<1.15){
   if(s.rc>=0){s.rivals[s.rc].cool=1.3;s.rc=-1}
   s.attached=true;s.bAng=s.rot;s.last='player';s.tackleWindow=0;
   s.stats.tackles++;s.stealCool=.8;
   s.controlUntil=s.now+(s.level?.controlGrace||.8);
   if(!touchBall(s,'player'))s.touchUntil=s.now+touchWindow;
   won=true;
  }
  s.tackleWindow=Math.max(0,s.tackleWindow-dt);
 }
 return {started,won};
}
