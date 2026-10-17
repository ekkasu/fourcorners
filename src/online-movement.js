import {PLAYER_LIMIT} from './court-layout.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const turn=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

// A radial dead zone filters thumb jitter without losing slow, diagonal movement.
export function joystickInput(x,z){
 const length=Math.hypot(x,z),amount=clamp((length-.09)/.91,0,1);
 return length?{x:x/length*amount,z:z/length*amount}:{x:0,z:0};
}
export function movementInput(input={}){
 return {x:clamp(Number(input.x)||0,-1,1),z:clamp(Number(input.z)||0,-1,1),sprint:input.sprint===true,control:input.control===true,shoot:input.shoot===true,aim:Number.isFinite(input.aim)?clamp(input.aim,-Math.PI,Math.PI):null,release:Number.isSafeInteger(input.release)&&input.release>=0?input.release:0};
}

// Offline play, host simulation and client prediction share acceleration and
// braking. Stronger braking than acceleration avoids drifting past an opponent.
export function stepPlayerMovement(player,input,dt=1/60,{ball,hasBall=false,carry=1,boost=false,integrate=true}={}){
 const x=input.x||0,z=input.z||0,amount=Math.hypot(x,z),length=Math.max(1,amount);
 if(player.tired&&player.stamina>=.35)player.tired=false;
 const running=!input.control&&input.sprint&&!player.tired&&player.stamina>.05&&amount>.1;
 const speed=(boost?9:input.control?3.2:running?8:5)*carry;
 const tx=x/length*speed,tz=z/length*speed,oldX=player.vx,oldZ=player.vz;
 const moving=Math.hypot(oldX,oldZ),alignment=amount>.001&&moving>.1?(oldX*x+oldZ*z)/(moving*amount):1;
 const response=amount<.001?30:alignment<0?26:alignment<.7?22:16;
 const decay=Math.exp(-response*dt);
 player.vx=tx+(oldX-tx)*decay;player.vz=tz+(oldZ-tz)*decay;
 if(integrate){
  // Integrate the exponential response, so stopping distance is stable at any FPS.
  player.x=clamp(player.x+tx*dt+(oldX-tx)*(1-decay)/response,-PLAYER_LIMIT,PLAYER_LIMIT);
  player.z=clamp(player.z+tz*dt+(oldZ-tz)*(1-decay)/response,-PLAYER_LIMIT,PLAYER_LIMIT);
 }
 player.stamina=clamp(player.stamina+(running?-.3:.22)*dt,0,1);
 if(player.stamina<=.05&&running)player.tired=true;
 let facing=amount>.001?Math.atan2(x,z):player.angle;
 if(input.control&&!hasBall&&ball&&Math.hypot(ball.x-player.x,ball.z-player.z)>.25)facing=Math.atan2(ball.x-player.x,ball.z-player.z);
 player.angle+=turn(player.angle,facing)*(1-Math.exp(-22*dt));
}
