export function stepDribble(ball,player,dt){
 const speed=Math.hypot(player.vx,player.vz),distance=Math.hypot(ball.x-player.x,ball.z-player.z);
 if(distance>2.1)return false;
 const close=player.control===true,angle=player.angle;
 ball.touchIn=Math.max(0,(ball.touchIn||0)-dt);
 // A planted foot can make the next touch sooner on a cut, but the ball keeps
 // its momentum between contacts rather than being attached to the player.
 const rolling=Math.hypot(ball.vx,ball.vz),along=ball.vx*Math.sin(angle)+ball.vz*Math.cos(angle);
 if(ball.touchIn<=.06&&rolling>1&&speed>.5&&along<rolling*.3)ball.touchIn=0;
 if(ball.touchIn===0&&distance<1.25){
  const lead=close?.45:speed>6?1.15:.65,strength=close?6:5;
  const tx=player.x+Math.sin(angle)*lead,tz=player.z+Math.cos(angle)*lead;
  ball.vx=player.vx+(tx-ball.x)*strength;ball.vz=player.vz+(tz-ball.z)*strength;
  ball.touchIn=close?.1:speed>6?.24:.16;
 }
 const drag=Math.exp(-(speed<.3?9:close?2.5:1.7)*dt);
 ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;ball.vx*=drag;ball.vz*=drag;
 return true;
}
