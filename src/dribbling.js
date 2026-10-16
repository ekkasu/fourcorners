// Possession means the next touch is available, not that the ball is attached.
// Between touches it rolls freely; sprinting pushes it farther ahead and turns
// need another foot contact before the ball changes direction.
export function stepDribble(ball,player,dt){
 const speed=Math.hypot(player.vx,player.vz),distance=Math.hypot(ball.x-player.x,ball.z-player.z);
 if(distance>2.1)return false;
 ball.touchIn=Math.max(0,(ball.touchIn||0)-dt);
 if(ball.touchIn===0&&distance<1.25){
  const angle=player.angle,lead=speed>6?1.2:.65;
  const tx=player.x+Math.sin(angle)*lead,tz=player.z+Math.cos(angle)*lead;
  ball.vx=player.vx+(tx-ball.x)*4;ball.vz=player.vz+(tz-ball.z)*4;
  ball.touchIn=speed>6?.24:.16;
 }
 const drag=Math.exp(-(speed<.3?9:1.7)*dt);
 ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;ball.vx*=drag;ball.vz*=drag;
 return true;
}
