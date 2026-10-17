// Fast direction changes and firm braking keep close defending controllable.
export function steerPlayer(player,x,z,speed,dt){
 const length=Math.hypot(x,z),scale=1/Math.max(1,length);
 const tx=x*scale*speed,tz=z*scale*speed;
 const turning=player.vx*tx+player.vz*tz<0||Math.abs(player.vx*tz-player.vz*tx)>speed;
 const response=1-Math.exp(-(length<.001?42:turning?36:18)*dt);
 player.vx+=(tx-player.vx)*response;player.vz+=(tz-player.vz)*response;
 if(length<.001&&Math.hypot(player.vx,player.vz)<.04)player.vx=player.vz=0;
}
export function joystickInput(x,z){
 const distance=Math.min(1,Math.hypot(x,z));
 if(distance<=.1)return{x:0,z:0};
 const amount=Math.pow((distance-.1)/.9,1.25),length=Math.hypot(x,z);
 return{x:x/length*amount,z:z/length*amount};
}
