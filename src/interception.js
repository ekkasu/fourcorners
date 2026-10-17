import {BALL_RADIUS} from './court-layout.js';

// Test the whole ball path against the moving player's feet. Endpoint-only
// checks let a quick pass cross a defender between two frames.
export function ballInterception(player,ball,previous=ball,{control=false,previousPlayer=player}={}){
 const radius=control?1.02:.72;
 const ax=previous.x-previousPlayer.x,az=previous.z-previousPlayer.z;
 const dx=ball.x-player.x-ax,dz=ball.z-player.z-az;
 const a=dx*dx+dz*dz,c=ax*ax+az*az-radius*radius;
 let t=0;
 if(c>0){
  const b=2*(ax*dx+az*dz),disc=b*b-4*a*c;
  if(a<1e-10||disc<0)return null;
  t=(-b-Math.sqrt(disc))/(2*a);if(t<0||t>1)return null;
 }
 const rx=ax+dx*t,rz=az+dz*t,distance=Math.hypot(rx,rz);
 const height=previous.y+(ball.y-previous.y)*t;
 if(height>(control?.62:.48)||height<BALL_RADIUS-.05)return null;
 const vx=ball.vx-(player.vx||0),vz=ball.vz-(player.vz||0),speed=Math.hypot(vx,vz);
 // Never pull a departing shot back into the player's feet, or reach behind
 // the body. Walking onto a stationary ball is still a normal first touch.
 if(speed>2&&rx*vx+rz*vz>.1)return null;
 const facing=distance>.001?(rx*Math.sin(player.angle)+rz*Math.cos(player.angle))/distance:1;
 if(distance>.35&&facing<(control?-.1:.1))return null;
 const x=previous.x+(ball.x-previous.x)*t,z=previous.z+(ball.z-previous.z)*t;
 if(speed<=(control?12:7))return {kind:'trap',t,x,z,vx:(player.vx||0)*.65+vx*.12,vz:(player.vz||0)*.65+vz*.12};
 if(!control)return null;
 // A braced foot blocks a hard shot; it cannot instantly collect every shot.
 const nx=distance>.001?rx/distance:Math.sin(player.angle),nz=distance>.001?rz/distance:Math.cos(player.angle);
 const inward=Math.min(0,vx*nx+vz*nz);
 return {kind:'block',t,x,z,vx:(vx-1.3*inward*nx)*.55+(player.vx||0)*.3,vz:(vz-1.3*inward*nz)*.55+(player.vz||0)*.3};
}
