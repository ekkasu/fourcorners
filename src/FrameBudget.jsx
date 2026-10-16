import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';

// Shared by offline and online matches. Ignore loading and background pauses;
// sustained slow rendering reduces detail, then resolution on the lowest tier.
export default function FrameBudget({onDecline}){
 const sample=useRef({seconds:0,frames:0,slow:0,warmup:3});
 useFrame((_,delta)=>{
  const s=sample.current;
  if(document.hidden||delta>1)return;
  if(s.warmup>0){s.warmup-=delta;return}
  s.seconds+=delta;s.frames++;
  if(s.seconds>=3){
   s.slow=s.frames/s.seconds<38?s.slow+1:0;
   s.frames=0;s.seconds=0;
   if(s.slow>=2){s.slow=0;onDecline()}
  }
 });
 return null;
}
