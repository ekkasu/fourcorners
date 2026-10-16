import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Bone,AnimationMixer,AnimationClip,VectorKeyframeTrack} from 'three';
import {athleticRig} from '../src/player-proportions.js';

test('adult proportions do not accumulate or change skeleton joint positions',()=>{
 const model=new Group(),head=new Bone(),foot=new Bone(),spine=new Bone();
 head.name='Head';foot.name='LeftFoot';spine.name='Spine';
 head.position.set(0,1.3,0);foot.position.set(.15,.13,0);model.add(head,foot,spine);
 const rig=athleticRig(model);
 for(let i=0;i<300;i++){
  rig.restore();rig.apply();
  assert.equal(head.scale.x,.53);assert.equal(foot.scale.x,.85);assert.equal(spine.scale.x,1);
 }
 assert.deepEqual(head.position.toArray(),[0,1.3,0]);assert.deepEqual(foot.position.toArray(),[.15,.13,0]);
 rig.restore();assert.equal(head.scale.x,1);assert.equal(foot.scale.x,1);
});

test('animation scale tracks remain stable across clip changes',()=>{
 const model=new Group(),head=new Bone();head.name='Head';model.add(head);
 const rig=athleticRig(model),mixer=new AnimationMixer(model);
 const idle=new AnimationClip('idle',1,[new VectorKeyframeTrack('Head.scale',[0,1],[1,1,1,1,1,1])]);
 const run=new AnimationClip('run',1,[new VectorKeyframeTrack('Head.scale',[0,1],[1,1,1,1,1,1])]);
 const a=mixer.clipAction(idle).play();
 for(let i=0;i<180;i++){
  rig.restore();
  if(i===60){a.fadeOut(.2);mixer.clipAction(run).reset().fadeIn(.2).play()}
  mixer.update(1/30);rig.apply();assert.ok(Math.abs(head.scale.x-.53)<1e-6);
 }
});
