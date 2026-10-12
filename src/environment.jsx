import React,{Suspense,useMemo} from 'react';
import{useLoader}from'@react-three/fiber';
import{Environment as SkyLight,Text,useGLTF,useTexture}from'@react-three/drei';
import*as THREE from'three';

const TEX='/textures/env/';
// Surfaces per arena. Every texture and the sky are CC0 from Poly Haven; see public/textures/env/README.md.
const THEMES={
 accra:{floor:'cracked_concrete',courtFloor:'leafy_grass',court:'#4b8a36',grass:true,ground:'#9a8b76',wall:'clay_plaster',paint:true,roof:true,tints:['#f6d77e','#9ad3c9','#f0a483','#f5efe3','#bfe0a0'],bands:['#2f6f8f','#b8453a','#2e7d4f'],signs:['CHOP BAR','PROVISIONS','BARBER','MOBILE MONEY','TAILOR','SPARE PARTS'],palms:true,poles:true,border:'wall'},
 kumasi:{floor:'cracked_concrete',court:'#f6f1ea',ground:'#93836f',wall:'clay_plaster',paint:true,roof:true,tints:['#f6e3c4','#dcebe5','#f1cdb8','#f7f1e6'],bands:['#7b3b2a','#2b5d7a','#355e3b'],signs:['KENTE CLOTH','PROVISIONS','CHOP BAR','PHONE REPAIRS'],palms:true,poles:true,border:'wall'},
 village:{floor:'red_laterite_soil_stones',court:'#ffffff',ground:'#b99880',wall:'clay_plaster',roof:true,tints:['#ecd0aa','#ddb98f','#f2e0c6'],bands:['#8a4b2d','#6b3a24'],signs:['PROVISIONS','CHOP BAR'],palms:true,poles:true,border:'logs'},
 school:{floor:'red_laterite_soil_stones',court:'#ffffff',ground:'#bf9f88',wall:'clay_plaster',paint:true,roof:true,tints:['#f1d98a','#ece5d2'],bands:['#6a3d8f','#b8453a'],signs:['CANTEEN','CLASS 4','LIBRARY','STAFF ROOM'],palms:true,poles:false,border:'wall'},
 london:{floor:'asphalt_02',court:'#c4cacc',ground:'#7f8486',wall:'brick_wall_02',roof:false,tints:['#d39a82','#b98572','#dcae96'],bands:['#2b2f33','#2f4a3a','#5a2730'],signs:['CORNER SHOP','CAFE','LAUNDRETTE','CHIPS'],palms:false,poles:false,border:'fence'}};

// Painted walls keep the plaster texture's grain but drop its colour, so the paint tint shows true.
const paintedCache=new Map();
function paintDetail(source,{base=236,contrast=2.2}={}){if(paintedCache.has(source.uuid))return paintedCache.get(source.uuid);const img=source.image,canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const px=ctx.getImageData(0,0,canvas.width,canvas.height),p=px.data;let mean=0;for(let i=0;i<p.length;i+=4)mean+=(p[i]*.3+p[i+1]*.59+p[i+2]*.11);mean/=p.length/4;for(let i=0;i<p.length;i+=4){const l=(p[i]*.3+p[i+1]*.59+p[i+2]*.11),v=Math.max(0,Math.min(255,base+(l-mean)*contrast));p[i]=p[i+1]=p[i+2]=v}ctx.putImageData(px,0,0);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;paintedCache.set(source.uuid,t);return t}
function useSurface(name,repeat,normal=false,painted=false){
 const raw=useTexture(normal?{map:`${TEX}${name}_diff_1k.webp`,normalMap:`${TEX}${name}_nor_gl_1k.webp`}:{map:`${TEX}${name}_diff_1k.webp`});
 return useMemo(()=>Object.fromEntries(Object.entries(raw).map(([key,source])=>{const t=(painted&&key==='map'?paintDetail(source,painted===true?undefined:painted):source).clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;if(key==='map')t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return[key,t]})),[raw,repeat,painted]);
}

function Building({position,rotation,width,height,tint,band,sign,wallTex,roofTex}){
 const d=3.4,front=d/2+.02,windowY=Math.max(1.55,height*.5),floors=height>3.4?[windowY,height*.8]:[windowY];
 return <group position={position} rotation={[0,rotation,0]}>
  <mesh position={[0,height/2,0]} castShadow receiveShadow><boxGeometry args={[width,height,d]}/><meshStandardMaterial {...wallTex} color={tint} roughness={.95} normalScale={[.6,.6]}/></mesh>
  <mesh position={[0,.45,front-.01]}><planeGeometry args={[width,.9]}/><meshStandardMaterial color={band} roughness={.9}/></mesh>
  <mesh position={[0,.95,front]}><planeGeometry args={[.9,1.9]}/><meshStandardMaterial color="#5a3b28" roughness={.8}/></mesh>
  {floors.flatMap((y,f)=>[-1,1].map(side=>{const x=side*width*.3;return <group key={f+'w'+side} position={[x,y,front]}>
   <mesh position={[0,0,-.005]}><planeGeometry args={[.82,1]}/><meshStandardMaterial color="#efe8da"/></mesh>
   <mesh><planeGeometry args={[.66,.84]}/><meshStandardMaterial color="#1f2d33" roughness={.15} metalness={.4}/></mesh>
   {[-1,1].map(s=><mesh key={s} position={[s*.52,0,.04]} rotation={[0,s*.5,0]}><planeGeometry args={[.36,.86]}/><meshStandardMaterial color={band} side={THREE.DoubleSide}/></mesh>)}
  </group>}))}
  {roofTex?<mesh position={[0,height+.22,.1]} rotation={[.12,0,0]} castShadow receiveShadow><boxGeometry args={[width+.5,.07,d+.7]}/><meshStandardMaterial {...roofTex} color="#c9c1b4" roughness={.7} metalness={.35}/></mesh>
   :<mesh position={[0,height+.15,0]} castShadow><boxGeometry args={[width+.12,.3,d+.12]}/><meshStandardMaterial color="#4f4039" roughness={1}/></mesh>}
  {sign&&<group position={[0,Math.min(height-.45,2.35),front+.04]}><mesh><boxGeometry args={[Math.min(width*.75,3.6),.46,.06]}/><meshStandardMaterial color={band}/></mesh><Text position={[0,0,.04]} fontSize={.24} color="#fff8e8" anchorX="center" anchorY="middle" maxWidth={Math.min(width*.75,3.6)-.2}>{sign}</Text></group>}
 </group>
}

function Kiosk({position,rotation,color,label}){return <group position={position} rotation={[0,rotation,0]}>
 <mesh position={[0,1.15,0]} castShadow receiveShadow><boxGeometry args={[2.4,2.3,2]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>
 <mesh position={[0,1.25,1.01]}><planeGeometry args={[1.8,.9]}/><meshStandardMaterial color="#2a211b"/></mesh>
 <mesh position={[0,.78,1.18]}><boxGeometry args={[1.9,.06,.4]}/><meshStandardMaterial color="#8a6a4a"/></mesh>
 <mesh position={[0,2.42,.25]} rotation={[.18,0,0]} castShadow><boxGeometry args={[2.8,.06,2.7]}/><meshStandardMaterial color="#d7d0c4" roughness={.6} metalness={.3}/></mesh>
 <Text position={[0,1.95,1.02]} fontSize={.2} color="#fff8e8" anchorX="center">{label}</Text>
</group>}

const LEAF=(()=>{const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(1.1,.32,2.5,0);s.quadraticCurveTo(1.1,-.32,0,0);const g=new THREE.ShapeGeometry(s,6);g.rotateX(-Math.PI/2);return g})();
function Palm({position,height=5.5,lean=.12,turn=0}){const top=[Math.sin(lean)*height,Math.cos(lean)*height,0];return <group position={position} rotation={[0,turn,0]}>
 <mesh position={[top[0]/2,top[1]/2,0]} rotation={[0,0,-lean]} castShadow><cylinderGeometry args={[.13,.24,height,8]}/><meshStandardMaterial color="#8a6a4a" roughness={1}/></mesh>
 <group position={top}>{Array.from({length:8},(_,i)=><group key={i} rotation={[0,i*Math.PI/4+.2,0]}><mesh geometry={LEAF} rotation={[0,0,-.42-(i%2)*.18]} castShadow><meshStandardMaterial color={i%2?'#3f7a35':'#4f8d3c'} side={THREE.DoubleSide} roughness={.9}/></mesh></group>)}
  {[0,1,2].map(i=><mesh key={i} position={[Math.cos(i*2.1)*.2,-.18,Math.sin(i*2.1)*.2]}><sphereGeometry args={[.13,8,6]}/><meshStandardMaterial color="#5b4a2a"/></mesh>)}</group>
</group>}

// Wooden power poles with sagging cables along both sides of the street.
function PowerLine({x}){const zs=[-26,-17,-8,1,10,19,28];const cable=useMemo(()=>{const points=[];for(let i=0;i<zs.length-1;i++)for(const offset of [-.5,.5])for(let k=0;k<12;k++){const t=k/12,u=(k+1)/12,y=v=>6.2-Math.sin(v*Math.PI)*.55;points.push(new THREE.Vector3(x+offset,y(t),zs[i]+(zs[i+1]-zs[i])*t),new THREE.Vector3(x+offset,y(u),zs[i]+(zs[i+1]-zs[i])*u))}return new THREE.BufferGeometry().setFromPoints(points)},[x]);
 return <>{zs.map(z=><group key={z} position={[x,0,z]}><mesh position={[0,3.2,0]} castShadow><cylinderGeometry args={[.08,.11,6.4,7]}/><meshStandardMaterial color="#6b5138" roughness={1}/></mesh><mesh position={[0,6.2,0]}><boxGeometry args={[1.25,.08,.08]}/><meshStandardMaterial color="#5a4330"/></mesh></group>)}
  <lineSegments geometry={cable}><lineBasicMaterial color="#1d1d1d"/></lineSegments></>}

// Real props: CC0 Poly Haven models compressed to public/models/props (see that folder's README).
const PROP=name=>`/models/props/${name}.glb`;
// A failed download (a network blip, a file the CDN could not serve) used to unmount the whole app. Loaders cache the
// failure, so it is cleared before trying again; the URL is taken from three's "Could not load <url>: ..." message.
export function forgetFailedAsset(error){const url=/Could not load (.+?):/.exec(error?.message||'')?.[1];if(!url)return;try{useGLTF.clear(url)}catch{}for(const loader of [THREE.TextureLoader,THREE.FileLoader])try{useLoader.clear(loader,url)}catch{}}
// Decoration (each arena prop, the arena itself, the crowd, effects): play continues without it, and it is fetched again
// in the background with growing gaps. Each prop has its own boundary, so one failure hides only that prop.
export class AssetBoundary extends React.Component{
 state={failed:false,attempt:0};
 static getDerivedStateFromError(){return{failed:true}}
 componentDidCatch(error){console.warn('Asset failed to load, retrying:',error?.message);forgetFailedAsset(error);if(this.state.attempt<8)this.timer=setTimeout(()=>this.setState(v=>({failed:false,attempt:v.attempt+1})),Math.min(30000,2000*2**this.state.attempt))}
 componentWillUnmount(){clearTimeout(this.timer)}
 render(){return this.state.failed?null:<React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>}}
function Prop({name,position,rotation=0,stack=1}){
 const{scene}=useGLTF(PROP(name));
 const copies=useMemo(()=>{const base=scene.clone(true);base.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(base),height=box.max.y-box.min.y;
  return Array.from({length:stack},(_,i)=>{const c=i?base.clone(true):base;c.position.y=-box.min.y+i*height;c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return c})},[scene,stack]);
 return <group position={position} rotation={[0,rotation,0]}>{copies.map((c,i)=><primitive key={i} object={c}/>)}</group>
}
// Thin wire looks like a dark haze when alpha-blended; render it as a cut-out instead.
const wireMaterials=new WeakMap();
// The glTF ships the wire colour as a JPEG, so its opacity comes from a separate CC0 map with the same tiling.
function wireMaterial(source,opacity){if(!wireMaterials.has(source)){const m=source.clone(),alpha=opacity.clone(),map=source.map;if(map){alpha.wrapS=alpha.wrapT=THREE.RepeatWrapping;alpha.repeat.copy(map.repeat);alpha.offset.copy(map.offset);alpha.rotation=map.rotation;alpha.center.copy(map.center);alpha.channel=map.channel}alpha.needsUpdate=true;m.alphaMap=alpha;m.transparent=false;m.alphaTest=.4;m.alphaToCoverage=true;m.depthWrite=true;wireMaterials.set(source,m)}return wireMaterials.get(source)}
// The London cage: the chain-link model tiled along each side, stretched to fit. The near (south) side is low so it doesn't block the camera.
function ChainLinkFence(){
 const{scene}=useGLTF(PROP('modular_chainlink_fence')),opacity=useTexture('/models/props/chainlink_wire_opacity.png');
 const panels=useMemo(()=>{const base=scene.clone(true);base.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(base),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const alongX=size.x>=size.z,length=alongX?size.x:size.z,e=12.35,run=24.7,out=[];
  for(const [side,h] of [['n',3.2],['s',1.3],['w',3.2],['e',3.2]]){const n=Math.max(1,Math.round(run/length)),stretch=run/(n*length);
   for(let k=0;k<n;k++){const t=-run/2+(k+.5)*run/n,c=base.clone(true),pivot=new THREE.Group(),holder=new THREE.Group();
    c.position.set(-center.x,-box.min.y,-center.z);c.traverse(o=>{if(o.isMesh){o.castShadow=true;if(/wire/.test(o.material.name))o.material=wireMaterial(o.material,opacity)}});pivot.add(c);if(!alongX)pivot.rotation.y=Math.PI/2;holder.add(pivot);holder.scale.set(stretch,h/size.y,1);
    if(side==='n')holder.position.set(t,0,-e);else if(side==='s')holder.position.set(t,0,e);else{holder.position.set(side==='w'?-e:e,0,t);holder.rotation.y=Math.PI/2}
    out.push(holder)}}
  return out},[scene,opacity]);
 return <>{panels.map((p,i)=><primitive key={i} object={p}/>)}</>
}
// [model, x, z, rotation, stack]
const STREET=[['plastic_monobloc_chair_01',-12.8,-16.3,2.5],['plastic_monobloc_chair_01',-12.1,-15.3,3],['plastic_crate_01',-16.9,-13.1,.2,3],['plastic_jerrycan',-16.3,-17.1,.4],['plastic_jerrycan',-15.7,-17.4,1.2],
 ['plastic_monobloc_chair_01',12.8,-16.3,-2.5],['plastic_monobloc_chair_01',12.1,-15.3,-3],['plastic_crate_01',16.9,-13.2,-.3,2],['Barrel_01',16.7,-17.1,0],
 ['Barrel_01',-19,-5,0],['Barrel_01',-18.4,-4.1,.6],['old_tyre',-17.7,4.6,1.2],['old_tyre',-17.9,5.5,.3],['painted_wooden_bench',-18.4,-10.5,Math.PI/2],['trashbag',-19.3,15,0],['trashbag',-18.7,15.7,1.4],
 ['painted_wooden_bench',18.4,-5.5,-Math.PI/2],['Barrel_01',19,6.4,0],['Barrel_01',18.4,7.3,.8],['plastic_monobloc_chair_01',17.6,3.6,-1.7],['plastic_monobloc_chair_01',17.7,2.4,-1.4],['power_box_01',19.6,-1.6,-Math.PI/2],
 ['painted_wooden_bench',-4,-16.8,0],['painted_wooden_bench',4,-16.8,0],['old_tyre',10.2,-17,.4],['plastic_crate_01',-10.4,-17,.1,2],['trashbag',-12.6,15.8,.5]];
const GRASS=[[-9,-13.1],[-3,-13.2],[5,-13],[10,-13.2],[13.1,-9],[13.2,4],[-13.1,-3],[-13.2,8],[6,13.1],[-6,13.2],[-18.6,0],[18.8,-12],[-19,10],[18.6,14]].map(([x,z],i)=>['grass_medium_01',x,z,i*1.3]);
const VILLAGE=[...GRASS,['Barrel_01',-18.6,-6,0],['plastic_jerrycan',-18,-5.2,.7],['plastic_jerrycan',-18.3,-4.5,2],['old_tyre',17.8,5,.4],['plastic_monobloc_chair_01',-12.8,-16.3,2.5],['plastic_monobloc_chair_01',12.8,-16.3,-2.5],['painted_wooden_bench',0,-16.8,0],['plastic_crate_01',16.9,-13.2,-.3,2],['trashbag',18.7,15.4,1]];
const SCHOOL=[...GRASS.slice(0,10),...Array.from({length:9},(_,i)=>['plastic_monobloc_chair_01',-4.8+i*1.2,-16.6,0]),['painted_wooden_bench',-18.4,-6,Math.PI/2],['painted_wooden_bench',18.4,6,-Math.PI/2],['Barrel_01',18.6,-10,0],['plastic_crate_01',-16.9,-13.1,.2,2]];
const LONDON=[...[-15,-5,5,15].flatMap(z=>[['street_lamp_01',-15.4,z,Math.PI/2],['street_lamp_01',15.4,z,-Math.PI/2]]),['metal_trash_can',-13.8,-12.5,0],['metal_trash_can',13.8,12.6,1],['metal_trash_can',-13.7,12.7,2],['utility_box_01',19.3,-8,-Math.PI/2],['utility_box_01',-19.3,6,Math.PI/2],['trashbag',-19.4,-12,0],['trashbag',-18.9,-12.6,1.1]];
const PROP_SETS={accra:STREET,kumasi:STREET,village:VILLAGE,school:SCHOOL,london:LONDON};

// The court border the ball bounces off. The near (south) fence is lower so it doesn't block the camera.
function CourtBorder({type,wallTex}){const e=12.35,sides=[[0,-e,25],[0,e,25],[-e,0,25,true],[e,0,25,true]];
 if(type==='logs')return <>{sides.map(([x,z,l,turn],i)=><mesh key={i} position={[x,.16,z]} rotation={turn?[Math.PI/2,0,0]:[0,0,Math.PI/2]} castShadow receiveShadow><cylinderGeometry args={[.16,.18,l,8]}/><meshStandardMaterial color="#7a5a3c" roughness={1}/></mesh>)}</>;
 const h=type==='fence'?.4:.62;
 return <>{sides.map(([x,z,l,turn],i)=><mesh key={i} position={[x,h/2,z]} castShadow receiveShadow><boxGeometry args={turn?[.25,h,l]:[l,h,.25]}/><meshStandardMaterial {...wallTex} color={type==='fence'?'#8f8f8f':'#efe6d6'} roughness={.95}/></mesh>)}
  {type==='fence'&&<AssetBoundary><Suspense fallback={null}><ChainLinkFence/></Suspense></AssetBoundary>}
 </>}

// Grass courts get mowing stripes: every other strip slightly darker.
// Grass keeps more of the texture's grain than painted walls do.
const GRASS_GRAIN={base:205,contrast:3.4};
const MOW_STRIPES=[0,2,4,6].map(i=>-24.5/2+(i+.5)*24.5/8);

export function ArenaEnvironment({arena}){
 const theme=THEMES[arena.id]||THEMES.accra;
 const court=useSurface(theme.courtFloor||theme.floor,6,true,theme.grass?GRASS_GRAIN:false),ground=useSurface(theme.floor,40),wall=useSurface(theme.wall,2.2,true,!!theme.paint),roof=useSurface('rusty_corrugated_iron',2,true);
 const buildings=useMemo(()=>{let n=0;const make=(x,z,rotation,width,height,i)=>({key:n,position:[x,0,z],rotation,width,height,tint:theme.tints[n%theme.tints.length],band:theme.bands[n%theme.bands.length],sign:n++%2===0?theme.signs[(n>>1)%theme.signs.length]:null});const low=theme.roof&&arena.type==='Rural';const list=[];
  for(let i=0;i<9;i++){const z=-26+i*6.5;list.push(make(-22-(i%2)*2,z,Math.PI/2,4+(i%3),low?2.6:3.2+(i%3)*.65),make(22+(i%2)*2,z,-Math.PI/2,4+(i%3),low?2.6:3+(i%3)*.75))}
  [-25,-18,-11,11,18,25].forEach((x,i)=>list.push(make(x,-27,0,5,low?2.6:3.4+(i%2)*.8)));[-25,-16,16,25].forEach(x=>list.push(make(x,27,Math.PI,6,low?2.6:3)));return list},[arena.id,arena.type]);
 return <>
  <SkyLight files={TEX+'sky_1k.hdr'} background environmentIntensity={.9}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial {...ground} color={theme.ground} roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[24.5,24.5]}/><meshStandardMaterial {...court} color={theme.court} roughness={.95} normalScale={[.8,.8]}/></mesh>
  {theme.grass&&MOW_STRIPES.map((x,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[x,.006,0]} receiveShadow><planeGeometry args={[24.5/8,24.5]}/><meshStandardMaterial color="#0b2a0b" transparent opacity={.2} depthWrite={false}/></mesh>)}
  <CourtBorder type={theme.border} wallTex={wall}/>
  {buildings.map(({key,...b})=><Building key={key} {...b} wallTex={wall} roofTex={theme.roof?roof:null}/>)}
  {theme.palms?[[-17,-16,0],[17,-15,2],[-17.5,9,4],[17,11,1],[-15,22,3],[15.5,23,5]].map(([x,z,t],i)=><Palm key={i} position={[x,0,z]} height={5+(i%3)*.6} turn={t}/>)
   :[[-17,5],[17,5]].map(([x,z],i)=><group key={i} position={[x,0,z]}><mesh position={[0,1.2,0]}><cylinderGeometry args={[.17,.25,2.4,9]}/><meshStandardMaterial color="#594636"/></mesh><mesh position={[0,3,0]} castShadow><sphereGeometry args={[2,12,10]}/><meshStandardMaterial color="#3a633c"/></mesh><mesh position={[.6,3.9,.3]} castShadow><sphereGeometry args={[1.3,12,10]}/><meshStandardMaterial color="#44733f"/></mesh></group>)}
  {theme.poles&&<><PowerLine x={-15.5}/><PowerLine x={15.5}/></>}
  {(PROP_SETS[arena.id]||STREET).map(([name,x,z,rotation,stack],i)=><AssetBoundary key={name+i}><Suspense fallback={null}><Prop name={name} position={[x,0,z]} rotation={rotation} stack={stack}/></Suspense></AssetBoundary>)}
  {arena.id!=='london'&&[[-15,-15,Math.PI/4,'#2f8f6a','WATER · SNACKS'],[15,-15,-Math.PI/4,'#c9522f','TOP UP HERE']].map(([x,z,r,c,l])=><Kiosk key={l} position={[x,0,z]} rotation={r} color={c} label={l}/>)}
 </>
}
