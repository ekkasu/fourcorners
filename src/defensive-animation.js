import {AnimationClip,AnimationMixer,Quaternion,Vector3} from 'three';

export const STANDING_TACKLE_SECONDS=.44;
const smooth=t=>t*t*(3-2*t);
const pos=bone=>bone.getWorldPosition(new Vector3());
const rotation=bone=>bone.getWorldQuaternion(new Quaternion());

// Build short, grounded actions on each footballer's own skeleton. The imported
// tackle is a slide and the strike has a backswing; neither fits a standing poke.
export function defensiveClips(model,idle){
 if(!idle)return {};
 const rig=model.clone(true),bones=new Map();
 rig.traverse(b=>{if(b.isBone)bones.set(b.name,b)});
 const bone=name=>[...bones.values()].find(b=>b.name===name||b.name.endsWith(name));
 const hips=bone('Hips');
 const legs=['Left','Right'].map(side=>({upper:bone(side+'UpLeg'),lower:bone(side+'Leg'),foot:bone(side+'Foot')}));
 if(!hips||legs.some(l=>!l.upper||!l.lower||!l.foot))return {};
 const mixer=new AnimationMixer(rig);mixer.clipAction(idle).play();mixer.update(0);rig.updateMatrixWorld(true);
 const bases=[...bones.values()].map(b=>({b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 const feet=legs.map(l=>({p:pos(l.foot),q:rotation(l.foot)}));
 function aim(b,target,child){
  const origin=pos(b),from=pos(child).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
  const world=new Quaternion().setFromUnitVectors(from,to).multiply(rotation(b));
  b.quaternion.copy(rotation(b.parent).invert().multiply(world));rig.updateMatrixWorld(true);
 }
 function placeFoot(leg,target,footRotation){
  const h=pos(leg.upper),k=pos(leg.lower),f=pos(leg.foot),a=h.distanceTo(k),b=k.distanceTo(f);
  const direction=target.clone().sub(h),distance=Math.min(a+b-.0001,Math.max(Math.abs(a-b)+.0001,direction.length()));
  direction.normalize();
  const along=(a*a-b*b+distance*distance)/(2*distance);
  const bend=new Vector3(0,0,1).addScaledVector(direction,-direction.z).normalize();
  const knee=h.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
  aim(leg.upper,knee,leg.lower);aim(leg.lower,target,leg.foot);
  leg.foot.quaternion.copy(rotation(leg.foot.parent).invert().multiply(footRotation));rig.updateMatrixWorld(true);
 }
 function make(name,duration,pose){
  const tracks=idle.tracks.map(t=>({source:t,times:[],values:[]}));
  const count=Math.ceil(duration*30);
  for(let i=0;i<=count;i++){
   for(const {b,p,q,s}of bases){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(s)}
   rig.updateMatrixWorld(true);
   const t=i/count,shape=pose(t),hip=pos(hips);hip.y-=shape.lower;hip.z+=shape.lean||0;
   hips.position.copy(hips.parent.worldToLocal(hip));rig.updateMatrixWorld(true);
   for(let side=0;side<2;side++){
    const offset=shape.feet[side],target=feet[side].p.clone().add(new Vector3(...offset));
    placeFoot(legs[side],target,feet[side].q);
   }
   for(const track of tracks){
    const [name,property]=track.source.name.split('.'),b=bones.get(name);
    track.times.push(t*duration);
    track.values.push(...(b?b[property].toArray():track.source.createInterpolant().evaluate(0)));
   }
  }
  return new AnimationClip(name,duration,tracks.map(t=>new t.source.constructor(t.source.name,t.times,t.values)));
 }
 const standingTackle=make('standingTackle',STANDING_TACKLE_SECONDS,t=>{
  const reach=t<.3?smooth(t/.3):1-smooth((t-.3)/.7);
  return {lower:.075*reach,lean:.035*reach,feet:[[0,0,0],[0,.025*reach,.38*reach]]};
 });
 const stance=feet.map(f=>Math.sign(f.p.x)||1);
 const jockeyIdle=make('jockeyIdle',.6,()=>({lower:.065,feet:stance.map(sign=>[sign*.065,0,0])}));
 const result={standingTackle,jockeyIdle};
 for(const [name,x,z]of [['jockeyForward',0,1],['jockeyBack',0,-1],['jockeyLeft',-1,0],['jockeyRight',1,0]]){
  result[name]=make(name,.6,t=>({lower:.065,feet:stance.map((sign,side)=>{
   const phase=(t+side*.5)%1,planted=phase<.6;
   const stride=planted?.32-.64*phase/.6:-.32+.64*smooth((phase-.6)/.4);
   return [sign*.065+x*stride,planted?0:.075*Math.sin(Math.PI*(phase-.6)/.4),z*stride];
  })}));
 }
 mixer.stopAllAction();mixer.uncacheRoot(rig);
 return result;
}

export function jockeyAnimation(vx,vz,angle){
 if(Math.hypot(vx,vz)<.15)return 'jockeyIdle';
 const forward=vx*Math.sin(angle)+vz*Math.cos(angle),side=vx*Math.cos(angle)-vz*Math.sin(angle);
 return Math.abs(side)>Math.abs(forward)?side>0?'jockeyRight':'jockeyLeft':forward>0?'jockeyForward':'jockeyBack';
}
