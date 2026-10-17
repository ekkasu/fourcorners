import {PLAYER_LIMIT} from './court-layout.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Keep prediction and the authoritative match on exactly the same movement model.
export function movementInput(input={}){
 return {x:clamp(Number(input.x)||0,-1,1),z:clamp(Number(input.z)||0,-1,1),sprint:input.sprint===true,shoot:input.shoot===true,release:Number.isSafeInteger(input.release)&&input.release>=0?input.release:0};
}

export function stepPlayerMovement(player,input,dt=1/60){
 const length=Math.max(1,Math.hypot(input.x||0,input.z||0));
 const running=input.sprint&&player.stamina>.05&&Math.hypot(input.x||0,input.z||0)>0;
 const speed=running?7.5:5,response=1-Math.exp(-12*dt);
 player.stamina=clamp(player.stamina+(running?-.3:.18)*dt,0,1);
 player.vx+=((input.x||0)/length*speed-player.vx)*response;
 player.vz+=((input.z||0)/length*speed-player.vz)*response;
 player.x=clamp(player.x+player.vx*dt,-PLAYER_LIMIT,PLAYER_LIMIT);
 player.z=clamp(player.z+player.vz*dt,-PLAYER_LIMIT,PLAYER_LIMIT);
 if(Math.hypot(player.vx,player.vz)>.1)player.angle=Math.atan2(player.vx,player.vz);
}
