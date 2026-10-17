import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationClip,AnimationMixer,Bone,Group,Matrix4,Vector3} from 'three';
import {defensiveClips,jockeyAnimation} from '../src/defensive-animation.js';

// Load the shipped bone hierarchy without textures or a browser/WebGL runtime.
function rig(name){
 const buffer=fs.readFileSync(new URL('../public/models/'+name+'.glb',import.meta.url));
 const data=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
 const joints=new Set(data.skins.flatMap(s=>s.joints));
 const nodes=data.nodes.map((n,i)=>{const o=joints.has(i)?new Bone():new Group();o.name=!joints.has(i)&&data.nodes.some((b,j)=>joints.has(j)&&b.name===n.name)?n.name+'_node':n.name;
  if(n.matrix)new Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);
  else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}return o;
 });
 data.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
 const root=new Group();data.scenes[data.scene||0].nodes.forEach(i=>root.add(nodes[i]));
 const used=new Set();root.traverse(o=>{const original=o.name;let n=1;while(o.name&&used.has(o.name))o.name=original+'_'+n++;if(o.name)used.add(o.name)});
 const suffix=name==='footballer-blue'?'':name==='footballer-red'?'-red':'-female';
 const moves=JSON.parse(fs.readFileSync(new URL('../public/models/footballer-moves'+suffix+'.json',import.meta.url)));
 return {root,idle:AnimationClip.parse(moves.clips.find(c=>c.name==='idle'))};
}
test('standing challenges keep the support foot planted and the reaching boot low on every rig',()=>{
 for(const name of ['footballer-blue','footballer-red','footballer-female']){
  const {root,idle}=rig(name),clips=defensiveClips(root,idle);
  assert.ok(clips.standingTackle);const mixer=new AnimationMixer(root),action=mixer.clipAction(clips.standingTackle);action.play();
  const bones=[];root.traverse(b=>{if(b.isBone)bones.push(b)});
  const left=bones.find(b=>b.name.endsWith('LeftFoot')),right=bones.find(b=>b.name.endsWith('RightFoot'));
  mixer.setTime(0);root.updateMatrixWorld(true);const planted=left.getWorldPosition(new Vector3()),start=right.getWorldPosition(new Vector3());
  let forward=0;
  for(let i=1;i<13;i++){
   mixer.setTime(i*.44/13);root.updateMatrixWorld(true);
   const foot=right.getWorldPosition(new Vector3());
   assert.ok(left.getWorldPosition(new Vector3()).distanceTo(planted)<.015,`${name} support foot stays planted: ${left.getWorldPosition(new Vector3()).distanceTo(planted)} at ${i}`);
   assert.ok(foot.y<start.y+.08,`${name} tackle must not look like a high kick`);
   assert.ok(foot.z>=start.z-.02,`${name} no shooting backswing`);forward=Math.max(forward,foot.z-start.z);
  }
  assert.ok(forward>.2,`${name} shows a distinct forward poke`);
 }
});
test('jockey direction follows local foot travel instead of playing a forward run backwards',()=>{
 assert.equal(jockeyAnimation(0,0,0),'jockeyIdle');
 assert.equal(jockeyAnimation(0,-2,0),'jockeyBack');
 assert.equal(jockeyAnimation(2,0,0),'jockeyRight');
 assert.equal(jockeyAnimation(-2,0,0),'jockeyLeft');
 assert.equal(jockeyAnimation(2,0,Math.PI/2),'jockeyForward');
});
