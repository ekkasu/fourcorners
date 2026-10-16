// Keep the wall strip reachable, including the diagonal distance in court corners.
export const PLAYER_LIMIT=11.55,BALL_LIMIT=11.85;
export const GOAL_WIDTH=2.4;
// Standard football: about 22 cm in diameter beside the 1.8 m players.
export const BALL_RADIUS=.11;
export const BLOCK_WIDTH=.45,BLOCK_HEIGHT=.6,BLOCK_DEPTH=.4;
export const BLOCK_CENTERS=[-(GOAL_WIDTH+BLOCK_WIDTH)/2,(GOAL_WIDTH+BLOCK_WIDTH)/2];
export const GOAL_CLEAR_HEIGHT=1.55;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Goal width is the clear gap between the two blocks. There is no crossbar.
export function collideGoalBlocks(x,z,y,vx,vz,radius=BALL_RADIUS){
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
export function broadcastView(ballX=0,ballZ=0,aspect=16/9,playerX=ballX,playerZ=ballZ,mobile=false){
 const portrait=clamp((1.3-aspect)/.8,0,1),x=clamp((ballX+playerX)*.5,-9.5,9.5),z=clamp((ballZ+playerZ)*.5,-9,9),height=(mobile?6:8.5)+6*portrait,distance=(mobile?8.5:12.5)+5*portrait,fov=(mobile?48:46)+14*portrait,tangent=Math.tan(fov*Math.PI/360);
 // Fit both the ball and the controlled player with room for heads and the HUD.
 let zoom=1;
 for(let attempt=0;attempt<40;attempt++){
  const cy=height*zoom,cz=z+distance*zoom,dy=cy-.4,dz=cz-(z-1),length=Math.hypot(dy,dz),sin=dy/length,cos=dz/length;
  let fits=true;
  for(const [px,pz]of [[ballX,ballZ],[playerX,playerZ]])for(const py of [0,2.4]){
   const depth=(cy-py)*sin+(cz-pz)*cos,up=(py-cy)*cos-(pz-cz)*sin;
   if(depth<=0||Math.abs((px-x)/(depth*tangent*aspect))>.82||Math.abs(up/(depth*tangent))>.82)fits=false;
  }
  if(fits)break;zoom+=.1;
 }
 return {position:[x,height*zoom,z+distance*zoom],lookAt:[x,.4,z-1],fov};
}

// Rounded physical corners let the ball roll along the wall instead of wedging
// between two independent collision planes. No timers, respawns or touch resets.
export const CORNER_RADIUS=1.4;
export function confineBall(x,z,vx=0,vz=0,restitution=.6){
 let boundedX=clamp(x,-BALL_LIMIT,BALL_LIMIT),boundedZ=clamp(z,-BALL_LIMIT,BALL_LIMIT);
 const center=BALL_LIMIT-CORNER_RADIUS;
 if(Math.abs(boundedX)>center&&Math.abs(boundedZ)>center){
  const cx=Math.sign(boundedX)*center,cz=Math.sign(boundedZ)*center,dx=boundedX-cx,dz=boundedZ-cz,distance=Math.hypot(dx,dz);
  if(distance>=CORNER_RADIUS){const nx=dx/distance,nz=dz/distance;boundedX=cx+nx*CORNER_RADIUS;boundedZ=cz+nz*CORNER_RADIUS;const outward=vx*nx+vz*nz;if(outward>0){vx-=(1+restitution)*outward*nx;vz-=(1+restitution)*outward*nz}}
 }else{
  if(x!==boundedX&&vx*Math.sign(x)>0)vx*=-restitution;
  if(z!==boundedZ&&vz*Math.sign(z)>0)vz*=-restitution;
 }
 return {x:boundedX,z:boundedZ,vx,vz};
}
