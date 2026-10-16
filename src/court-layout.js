export const GOAL_WIDTH=2.4;
export const BLOCK_WIDTH=.45,BLOCK_HEIGHT=.6,BLOCK_DEPTH=.4;
export const BLOCK_CENTERS=[-(GOAL_WIDTH+BLOCK_WIDTH)/2,(GOAL_WIDTH+BLOCK_WIDTH)/2];
export const GOAL_CLEAR_HEIGHT=1.55;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Goal width is the clear gap between the two blocks. There is no crossbar.
export function collideGoalBlocks(x,z,y,vx,vz,radius=.24){
 if(y-radius>BLOCK_HEIGHT)return {x,z,vx,vz,impact:0};
 let impact=0;
 for(const center of BLOCK_CENTERS){
  const qx=clamp(x,center-BLOCK_WIDTH/2,center+BLOCK_WIDTH/2),qz=clamp(z,-BLOCK_DEPTH/2,BLOCK_DEPTH/2);
  let dx=x-qx,dz=z-qz,distance=Math.hypot(dx,dz);if(distance>=radius)continue;
  if(distance<1e-8){const distances=[x-(center-BLOCK_WIDTH/2),center+BLOCK_WIDTH/2-x,z+BLOCK_DEPTH/2,BLOCK_DEPTH/2-z],face=distances.indexOf(Math.min(...distances));dx=face===0?-1:face===1?1:0;dz=face===2?-1:face===3?1:0;x+=dx*(distances[face]+radius);z+=dz*(distances[face]+radius)}
  else{dx/=distance;dz/=distance;x+=dx*(radius-distance);z+=dz*(radius-distance)}
  const velocity=vx*dx+vz*dz;if(velocity<0){impact=Math.max(impact,-velocity);vx-=1.65*velocity*dx;vz-=1.65*velocity*dz}
 }
 return {x,z,vx,vz,impact};
}
// Raised sideline camera, following the ball rather than orbiting the player.
export function broadcastView(ballX=0,ballZ=0,aspect=16/9){
 const portrait=clamp((1.3-aspect)/.8,0,1),x=clamp(ballX*.6,-6,6),z=clamp(ballZ*.22,-2,2);
 return {position:[x,12+6*portrait,z+18+5*portrait],lookAt:[x,.4,z-1],fov:50+14*portrait};
}
