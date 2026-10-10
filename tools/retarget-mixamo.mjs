// Retargets Mixamo FBX animations (assets-src/mixamo) onto the 24-joint vibeassets footballer rig and writes
// public/models/footballer-moves.json, which the game loads at runtime. Run: node tools/retarget-mixamo.mjs
//
// Method: each footballer bone is first turned so it points the same way as the matching Mixamo bone in the
// Mixamo rest pose. Every frame, the Mixamo bone's world-space rotation away from its rest pose is then applied
// to that aligned footballer bone. Hip travel is removed so clips play in place; hip bounce is kept, scaled to
// the footballer's hip height.
import fs from 'fs';import path from 'path';import{fileURLToPath,pathToFileURL}from'url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mod=p=>import(pathToFileURL(path.join(root,'node_modules/three',p)).href);
const THREE=await mod('build/three.module.js');
const{FBXLoader}=await mod('examples/jsm/loaders/FBXLoader.js');const{GLTFLoader}=await mod('examples/jsm/loaders/GLTFLoader.js');

const CLIPS=[
 {file:'Offensive Idle.fbx',name:'idle',fps:10},
 {file:'Dribble.fbx',name:'dribble',fps:30},
 {file:'Strike Foward Jog.fbx',name:'strike',fps:30,contact:true},
 {file:'Soccer Penalty Kick.fbx',name:'penalty',fps:30,contact:true},
 {file:'Soccer Tackle.fbx',name:'tackle',fps:30},
 {file:'Victory.fbx',name:'celebrate',fps:20,maxSeconds:2.6},
];
// Footballer bone -> Mixamo bone, plus the child used to measure each bone's direction.
const MAP={Hips:'Hips',Spine02:'Spine',Spine01:'Spine1',Spine:'Spine2',neck:'Neck',Head:'Head'};
for(const side of ['Left','Right'])for(const b of ['Shoulder','Arm','ForeArm','Hand','UpLeg','Leg','Foot','ToeBase'])MAP[side+b]=side+b;
const DIRECTION_CHILD={Spine02:'Spine01',Spine01:'Spine',Spine:'neck',neck:'Head'};
for(const side of ['Left','Right'])Object.assign(DIRECTION_CHILD,{[side+'Shoulder']:side+'Arm',[side+'Arm']:side+'ForeArm',[side+'ForeArm']:side+'Hand',[side+'UpLeg']:side+'Leg',[side+'Leg']:side+'Foot',[side+'Foot']:side+'ToeBase'});

function loadFootballer(){
 // The texture is dropped so GLTFLoader can run without a DOM image decoder; only the skeleton is needed.
 const buf=fs.readFileSync(path.join(root,'public/models/footballer-blue.glb')),len=buf.readUInt32LE(12),json=JSON.parse(buf.slice(20,20+len).toString());
 delete json.images;delete json.textures;delete json.samplers;json.materials.forEach(m=>{delete m.pbrMetallicRoughness.baseColorTexture;delete m.emissiveTexture});
 let js=Buffer.from(JSON.stringify(json));while(js.length%4)js=Buffer.concat([js,Buffer.from(' ')]);const bin=buf.slice(20+len),header=Buffer.alloc(20);
 header.writeUInt32LE(0x46546C67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+js.length+bin.length,8);header.writeUInt32LE(js.length,12);header.writeUInt32LE(0x4E4F534A,16);
 const glb=Buffer.concat([header,js,bin]);return new Promise((res,rej)=>new GLTFLoader().parse(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'',g=>res(g.scene),rej));
}
const target=await loadFootballer();target.updateMatrixWorld(true);
const tBones={};target.traverse(o=>{if(o.isBone)tBones[o.name]=o});
const order=[];target.traverse(o=>{if(o.isBone&&MAP[o.name])order.push(o.name)});
const wq=o=>o.getWorldQuaternion(new THREE.Quaternion()),wp=o=>o.getWorldPosition(new THREE.Vector3());
const tRest={};for(const n of order)tRest[n]={quat:wq(tBones[n]),local:tBones[n].quaternion.clone()};
const tHipsRest=wp(tBones.Hips),tHipsLocal=tBones.Hips.position.clone();

const out={clips:[],events:{}};
for(const spec of CLIPS){
 const b=fs.readFileSync(path.join(root,'assets-src/mixamo',spec.file));const src=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const sBones={};src.traverse(o=>{if(o.isBone)sBones[o.name.replace('mixamorig','')]=o});src.updateMatrixWorld(true);
 // Source rest pose = the FBX scene graph before the clip is applied.
 const sRest={};for(const n of order)sRest[n]=wq(sBones[MAP[n]]);const sHipsRest=wp(sBones.Hips);
 // Rotation that turns each footballer bone to point like the Mixamo bone at rest. Leaf bones reuse their parent's.
 const align={};for(const n of order){const child=DIRECTION_CHILD[n];if(child){const td=wp(tBones[child]).sub(wp(tBones[n])).normalize(),sd=wp(sBones[MAP[child]]).sub(wp(sBones[MAP[n]])).normalize();align[n]=new THREE.Quaternion().setFromUnitVectors(td,sd)}else align[n]=align[tBones[n].parent?.name]?.clone()||new THREE.Quaternion()}
 const alignedRest={};for(const n of order)alignedRest[n]=align[n].clone().multiply(tRest[n].quat);
 const sRestInv={};for(const n of order)sRestInv[n]=sRest[n].clone().invert();
 const hipsRatio=tHipsRest.y/sHipsRest.y;
 const clip=src.animations[0],mixer=new THREE.AnimationMixer(src);mixer.clipAction(clip).play();
 const duration=Math.min(clip.duration,spec.maxSeconds??Infinity),frames=Math.max(2,Math.round(duration*spec.fps)+1),times=[],tracks=Object.fromEntries(order.map(n=>[n,[]])),hips=[];
 const feet={LeftFoot:[],RightFoot:[]};
 for(let f=0;f<frames;f++){
  const t=Math.min(duration,f/spec.fps);times.push(+t.toFixed(4));mixer.setTime(t);src.updateMatrixWorld(true);
  for(const n of order){
   const bone=tBones[n],desired=wq(sBones[MAP[n]]).multiply(sRestInv[n]).multiply(alignedRest[n]);
   const parentWorld=wq(bone.parent);bone.quaternion.copy(parentWorld.invert().multiply(desired));bone.updateMatrixWorld(true);
   tracks[n].push(...bone.quaternion.toArray().map(v=>+v.toFixed(3)));
  }
  const lift=(wp(sBones.Hips).y-sHipsRest.y)*hipsRatio,hipsWorld=tHipsRest.clone();hipsWorld.y+=lift;
  const local=tBones.Hips.parent.worldToLocal(hipsWorld.clone());hips.push(+local.x.toFixed(3),+local.y.toFixed(3),+local.z.toFixed(3));
  for(const foot of ['LeftFoot','RightFoot'])feet[foot].push(wp(sBones[foot]));
 }
 for(const n of order)tBones[n].quaternion.copy(tRest[n].local);tBones.Hips.position.copy(tHipsLocal);target.updateMatrixWorld(true);
 const kf=[...order.map(n=>new THREE.QuaternionKeyframeTrack(`${n}.quaternion`,times,tracks[n])),new THREE.VectorKeyframeTrack('Hips.position',times,hips)];
 out.clips.push(THREE.AnimationClip.toJSON(new THREE.AnimationClip(spec.name,duration,kf)));
 if(spec.contact){
  // Contact = the frame where a foot moves forward fastest relative to the hips (root travel removed).
  let best={speed:0};for(const foot of ['LeftFoot','RightFoot'])for(let f=1;f<frames;f++){const a=feet[foot][f-1],c=feet[foot][f],hz=0;const speed=(c.z-a.z)*spec.fps/100;if(speed>best.speed)best={speed,time:times[f],foot}}
  out.events[spec.name]={contact:best.time,foot:best.foot};
 }
 console.log(spec.name.padEnd(9),duration.toFixed(2)+'s',frames+' frames',spec.contact?`contact ${out.events[spec.name].contact}s ${out.events[spec.name].foot}`:'');
}
const file=path.join(root,'public/models/footballer-moves.json');fs.writeFileSync(file,JSON.stringify(out));
console.log('wrote',path.relative(root,file),(fs.statSync(file).size/1024).toFixed(0)+' KB');
