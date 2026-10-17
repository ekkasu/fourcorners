export function createFrameBudget(){
 let seconds=0,frames=0,slow=0,warmup=5;
 const reset=()=>{seconds=0;frames=0;slow=0;warmup=2};
 return {reset,sample(delta,active=true){
  // Background throttling, restoring GPU resources and loading a frame are not
  // sustained gameplay performance. Never downgrade graphics for these pauses.
  if(!active||!Number.isFinite(delta)||delta<=0||delta>.25){reset();return false}
  if(warmup>0){warmup-=delta;return false}
  seconds+=delta;frames++;
  if(seconds<3)return false;
  slow=frames/seconds<26?slow+1:0;seconds=frames=0;
  if(slow<2)return false;
  slow=0;return true;
 }};
}
