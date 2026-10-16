import React,{Suspense,useEffect,useMemo,useRef} from 'react';
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

// Painted court art, drawn once into a canvas: each corner's zone in its colour, a Black Star centre circle, Adinkra
// symbols in the empty corners, paint splashes, then scuffed and worn where players run. Concrete and asphalt courts get
// full colour; dirt gets lime chalk; grass only white marking paint.
const ZONE_COLORS=['#e6534c','#4b9bff','#36df89','#f8cf51'],ZONE_SPOTS=[[0,-1],[1,0],[0,1],[-1,0]];
const MURALS={kumasi:{paint:'full',alpha:.78,splats:46},school:{paint:'full',alpha:.72,splats:70},london:{paint:'full',alpha:.82,splats:40},village:{paint:'chalk',alpha:.55,splats:0},accra:{paint:'chalk',alpha:.45,splats:0}};
function seeded(seed){let h=seed;return()=>{h=Math.imul(h^(h>>>15),2246822507)>>>0;h=Math.imul(h^(h>>>13),3266489909)>>>0;return((h^=h>>>16)>>>0)/4294967296}}
function paintMural(id,size){
 const cfg=MURALS[id]||MURALS.kumasi,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),m=size/24.5,X=x=>(x+12.25)*m,rnd=seeded(id.length*7919+size);
 const chalk=cfg.paint==='chalk',col=c=>chalk?'#f4f1e8':c,ink=chalk?'#f4f1e8':'#14161a';
 // Rough-edged blob: many overlapping circles.
 const blob=(x,z,radius,color,alpha,n=26)=>{ctx.fillStyle=color;ctx.globalAlpha=alpha;for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*radius*.75;ctx.beginPath();ctx.arc(X(x+Math.cos(a)*d),X(z+Math.sin(a)*d),radius*(.35+rnd()*.35)*m,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1};
 const ring=(x,z,radius,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width*m;ctx.beginPath();ctx.arc(X(x),X(z),radius*m,0,Math.PI*2);ctx.stroke()};
 // Corner zones: a painted half-disc in front of each goal, edged with a rim.
 ZONE_SPOTS.forEach(([ox,oz],i)=>{const gx=ox*12.25,gz=oz*12.25,start=Math.atan2(-oz,-ox)-Math.PI/2;ctx.save();ctx.beginPath();ctx.arc(X(gx),X(gz),4.3*m,start,start+Math.PI);ctx.closePath();ctx.clip();
  if(chalk){ctx.globalAlpha=.9;ctx.strokeStyle=col();ctx.lineWidth=.12*m;for(const rad of [4.15,3.55]){ctx.beginPath();ctx.arc(X(gx),X(gz),rad*m,start,start+Math.PI);ctx.stroke()}}
  else{ctx.globalAlpha=.85;ctx.fillStyle=ZONE_COLORS[i];ctx.beginPath();ctx.arc(X(gx),X(gz),4.3*m,start,start+Math.PI);ctx.fill();ctx.globalAlpha=.9;ring(gx,gz,4.05,.14,'#f4f1e8');ring(gx,gz,2.6,.5,'#00000022')}
  ctx.restore();ctx.globalAlpha=1});
 // Centre: the Black Star on gold, ringed red and green (in chalk, just the outlines).
 const star=(x,z,R,fill,stroke)=>{ctx.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=k%2?R*.42:R;ctx.lineTo(X(x+Math.cos(a)*rr),X(z+Math.sin(a)*rr))}ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.12*m;ctx.stroke()}};
 if(chalk){ring(0,0,2.4,.12,col());star(0,0,1.6,null,col())}
 else{ctx.globalAlpha=.95;ctx.fillStyle='#fcd116';ctx.beginPath();ctx.arc(X(0),X(0),2.95*m,0,Math.PI*2);ctx.fill();ring(0,0,2.95,.3,'#ce1126');ring(0,0,2.55,.3,'#006b3f');star(0,0,1.75,'#14161a');ctx.globalAlpha=1}
 // Adinkra symbols in the four empty corners of the court.
 const sym=[(x,z)=>{for(const rad of [1.2,.85,.5])ring(x,z,rad,.16,ink)}, // Adinkrahene: greatness
  (x,z)=>{ctx.strokeStyle=ink;ctx.lineWidth=.18*m;ctx.beginPath();for(let k=0;k<=6;k++)ctx.lineTo(X(x-1.1+k*.37),X(z+(k%2?-.55:.55)));ctx.stroke()}, // Nkyinkyim: resilience
  (x,z)=>{ctx.strokeStyle=ink;ctx.lineWidth=.16*m;for(const h of [1.1,.6])ctx.strokeRect(X(x-h),X(z-h),2*h*m,2*h*m);ctx.beginPath();ctx.moveTo(X(x-1.1),X(z));ctx.lineTo(X(x+1.1),X(z));ctx.moveTo(X(x),X(z-1.1));ctx.lineTo(X(x),X(z+1.1));ctx.stroke()}, // Eban: safety
  (x,z)=>{ctx.strokeStyle=ink;ctx.lineWidth=.16*m;ctx.beginPath();ctx.moveTo(X(x),X(z+1));ctx.bezierCurveTo(X(x-1.6),X(z-.1),X(x-.7),X(z-1.3),X(x),X(z-.45));ctx.bezierCurveTo(X(x+.7),X(z-1.3),X(x+1.6),X(z-.1),X(x),X(z+1));ctx.stroke();for(const sx of [-1,1]){ctx.beginPath();ctx.arc(X(x+sx*.42),X(z-.95),.22*m,0,Math.PI*1.5);ctx.stroke()}}]; // Sankofa: learn from the past
 [[-8.2,-8.2],[8.2,-8.2],[8.2,8.2],[-8.2,8.2]].forEach(([x,z],i)=>{if(!chalk)blob(x,z,1.9,['#fcd116','#4b9bff','#ce1126','#36df89'][(i+1)%4],.5,18);ctx.globalAlpha=chalk?.8:.9;sym[i](x,z);ctx.globalAlpha=1});
 // Splashes and drips.
 const palette=['#ce1126','#fcd116','#006b3f','#4b9bff','#ff7a1a','#a46ce8','#f4f1e8'];
 for(let i=0;i<cfg.splats;i++){const x=(rnd()-.5)*22,z=(rnd()-.5)*22;if(Math.hypot(x,z)<3.4)continue;const c=palette[Math.floor(rnd()*palette.length)];blob(x,z,.25+rnd()*.7,c,.7,8);for(let k=0;k<4;k++){const a=rnd()*Math.PI*2,d=.6+rnd()*1.1;blob(x+Math.cos(a)*d,z+Math.sin(a)*d,.06+rnd()*.12,c,.75,3)}}
 // Wear: scuffed patches where play is heaviest (centre and in front of goals), then fine grain everywhere.
 ctx.globalCompositeOperation='destination-out';
 const scuff=(x,z,spread,n)=>{for(let i=0;i<n;i++){ctx.globalAlpha=.08+rnd()*.25;ctx.beginPath();ctx.ellipse(X(x+(rnd()-.5)*spread),X(z+(rnd()-.5)*spread),(.1+rnd()*.5)*m,(.05+rnd()*.2)*m,rnd()*Math.PI,0,Math.PI*2);ctx.fill()}};
 scuff(0,0,7,260);ZONE_SPOTS.forEach(([ox,oz])=>scuff(ox*9.5,oz*9.5,5,180));scuff(0,0,24,420);
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 const img=ctx.getImageData(0,0,size,size),d=img.data,grain=seeded(size*31);for(let i=3;i<d.length;i+=4)if(d[i])d[i]=d[i]*(cfg.alpha*(.72+grain()*.28));ctx.putImageData(img,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture}
function CourtMural({id}){const texture=useMemo(()=>paintMural(id,typeof window!=='undefined'&&window.matchMedia('(pointer: coarse)').matches?1024:2048),[id]);useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,.009,0]} receiveShadow renderOrder={1}><planeGeometry args={[24.5,24.5]}/><meshStandardMaterial map={texture} transparent depthWrite={false} roughness={.9} polygonOffset polygonOffsetFactor={-1}/></mesh>}
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

function StreetEnvironment({arena,detailed=true}){
 const theme=THEMES[arena.id]||THEMES.accra;
 const court=useSurface(theme.courtFloor||theme.floor,6,detailed,theme.grass?GRASS_GRAIN:false),ground=useSurface(theme.floor,40),wall=useSurface(theme.wall,2.2,detailed,!!theme.paint),roof=useSurface('rusty_corrugated_iron',2,detailed);
 const buildings=useMemo(()=>{let n=0;const make=(x,z,rotation,width,height,i)=>({key:n,position:[x,0,z],rotation,width,height,tint:theme.tints[n%theme.tints.length],band:theme.bands[n%theme.bands.length],sign:n++%2===0?theme.signs[(n>>1)%theme.signs.length]:null});const low=theme.roof&&arena.type==='Rural';const list=[];
  for(let i=0;i<9;i++){const z=-26+i*6.5;list.push(make(-22-(i%2)*2,z,Math.PI/2,4+(i%3),low?2.6:3.2+(i%3)*.65),make(22+(i%2)*2,z,-Math.PI/2,4+(i%3),low?2.6:3+(i%3)*.75))}
  [-25,-18,-11,11,18,25].forEach((x,i)=>list.push(make(x,-27,0,5,low?2.6:3.4+(i%2)*.8)));[-25,-16,16,25].forEach(x=>list.push(make(x,27,Math.PI,6,low?2.6:3)));return list},[arena.id,arena.type]);
 return <>
  {detailed&&<SkyLight files={TEX+'sky_1k.hdr'} background environmentIntensity={1.1}/>}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial {...ground} color={theme.ground} roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[24.5,24.5]}/><meshStandardMaterial {...court} color={theme.court} roughness={.95} normalScale={[.8,.8]}/></mesh>
  {theme.grass&&MOW_STRIPES.map((x,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[x,.006,0]} receiveShadow><planeGeometry args={[24.5/8,24.5]}/><meshStandardMaterial color="#0b2a0b" transparent opacity={.2} depthWrite={false}/></mesh>)}
  <CourtMural id={arena.id}/>
  <CourtBorder type={theme.border} wallTex={wall}/>
  {buildings.filter((_,i)=>detailed||i%2===0).map(({key,...b})=><Building key={key} {...b} wallTex={wall} roofTex={theme.roof?roof:null}/>)}
  {theme.palms?[[-17,-16,0],[17,-15,2],[-17.5,9,4],[17,11,1],[-15,22,3],[15.5,23,5]].map(([x,z,t],i)=><Palm key={i} position={[x,0,z]} height={5+(i%3)*.6} turn={t}/>)
   :[[-17,5],[17,5]].map(([x,z],i)=><group key={i} position={[x,0,z]}><mesh position={[0,1.2,0]}><cylinderGeometry args={[.17,.25,2.4,9]}/><meshStandardMaterial color="#594636"/></mesh><mesh position={[0,3,0]} castShadow><sphereGeometry args={[2,12,10]}/><meshStandardMaterial color="#3a633c"/></mesh><mesh position={[.6,3.9,.3]} castShadow><sphereGeometry args={[1.3,12,10]}/><meshStandardMaterial color="#44733f"/></mesh></group>)}
  {theme.poles&&<><PowerLine x={-15.5}/><PowerLine x={15.5}/></>}
  {(detailed?(PROP_SETS[arena.id]||STREET):[]).map(([name,x,z,rotation,stack],i)=><AssetBoundary key={name+i}><Suspense fallback={null}><Prop name={name} position={[x,0,z]} rotation={rotation} stack={stack}/></Suspense></AssetBoundary>)}
  {arena.id!=='london'&&[[-15,-15,Math.PI/4,'#2f8f6a','WATER · SNACKS'],[15,-15,-Math.PI/4,'#c9522f','TOP UP HERE']].map(([x,z,r,c,l])=><Kiosk key={l} position={[x,0,z]} rotation={r} color={c} label={l}/>)}
 </>
}

// Reference: unfinished sandcrete house in Adenta New-Legon, Ghana.
// https://ghanaproperty.org/africa/ghana/greater-accra-region/property/3-bedroom-uncompleted-house-for-sale-at-adenta-new-legon-1
// Photos inform the architecture only; no third-party photographs are shipped.
function sandcreteTexture(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d'),random=seeded(42791);
 ctx.fillStyle='#b2afa4';ctx.fillRect(0,0,512,256);
 for(let row=0;row<4;row++)for(let col=-1;col<4;col++){
  const x=col*171+(row%2)*85.5,y=row*64,tone=136+Math.floor(random()*30);
  ctx.fillStyle=`rgb(${tone},${tone-1},${tone-7})`;ctx.fillRect(x+2,y+2,167,60);
  for(let n=0;n<350;n++){const v=Math.floor(random()*80)+90;ctx.fillStyle=`rgba(${v},${v},${v-5},.18)`;ctx.fillRect(x+random()*168,y+random()*61,1+random()*3,1+random()*2)}
  ctx.strokeStyle='#65665a44';ctx.lineWidth=1;ctx.strokeRect(x+3,y+3,165,58);
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}
function Masonry({map,position,width,height,depth=.3}){
 const tiled=useMemo(()=>{const t=map.clone();t.repeat.set(width/2.4,height/1.2);return t},[map,width,height]);useEffect(()=>()=>tiled.dispose(),[tiled]);
 return <mesh position={position} castShadow receiveShadow><boxGeometry args={[width,height,depth]}/><meshStandardMaterial map={tiled} color="#e0dfd4" roughness={1}/></mesh>
}
function UnfinishedBay({map,position,rotation=0,door=false,partial=false}){
 const width=8,height=3.25,opening=door?1.7:2.6,sill=door?0:1.05,top=2.5,jamb=(width-opening)/2;
 return <group position={position} rotation={[0,rotation,0]}>
  {partial?<Masonry map={map} position={[0,.75,0]} width={width} height={1.5}/>:<>
   {[-1,1].map(side=><Masonry key={side} map={map} position={[side*(opening/2+jamb/2),height/2,0]} width={jamb} height={height}/>)}
   {sill>0&&<Masonry map={map} position={[0,sill/2,0]} width={opening} height={sill}/>}
   <Masonry map={map} position={[0,(top+height)/2,0]} width={opening} height={height-top}/>
   <mesh position={[0,top+.1,0]} castShadow><boxGeometry args={[opening+.35,.2,.38]}/><meshStandardMaterial color="#bcb9aa" roughness={1}/></mesh>
  </>}
 </group>
}
function SiteRubble({detailed}){
 const stones=useRef(),grass=useRef();
 useEffect(()=>{const random=seeded(9917),dummy=new THREE.Object3D();for(let i=0;i<80;i++){const side=i%2?1:-1;dummy.position.set(side*(19.2+random()*4),.06+random()*.08,-21+random()*40);dummy.rotation.set(random(),random()*6,random());dummy.scale.set(.12+random()*.35,.08+random()*.2,.15+random()*.35);dummy.updateMatrix();stones.current?.setMatrixAt(i,dummy.matrix)}if(stones.current)stones.current.instanceMatrix.needsUpdate=true;for(let i=0;i<40;i++){dummy.position.set((i%2?1:-1)*(22+random()*5),.18,-24+random()*45);dummy.rotation.set(0,random()*6,0);dummy.scale.set(.3+random()*.5,.3+random()*.5,.3+random()*.5);dummy.updateMatrix();grass.current?.setMatrixAt(i,dummy.matrix)}if(grass.current)grass.current.instanceMatrix.needsUpdate=true},[detailed]);
 if(!detailed)return null;return <><instancedMesh ref={stones} args={[null,null,80]}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#8e8e80" roughness={1}/></instancedMesh><instancedMesh ref={grass} args={[null,null,40]}><coneGeometry args={[.45,1,4]}/><meshStandardMaterial color="#78844c" roughness={1}/></instancedMesh></>
}
function UncompletedBuilding({detailed}){
 const slab=useSurface('clay_plaster',11,detailed,true),earth=useSurface('red_laterite_soil_stones',35),concrete=useSurface('clay_plaster',2.5,detailed,true),roof=useSurface('rusty_corrugated_iron',2,detailed);
 const masonry=useMemo(sandcreteTexture,[]);useEffect(()=>()=>masonry.dispose(),[masonry]);
 const columns=useMemo(()=>[-18,18].flatMap(x=>[-18,-10,-2,6,14,18].map(z=>[x,z])).concat([-16,-8,0,8,16].map(x=>[x,-18])),[]);
 const blocks=useMemo(()=>{const result=[];for(const[cx,cz]of[[-15,-15],[15,16]])for(let row=0;row<3;row++)for(let k=0;k<5-row;k++)result.push([cx+(k-2)*.8+(row%2)*.4,.2+row*.4,cz]);return result},[]);
 return <>
  {detailed&&<SkyLight files={TEX+'sky_1k.hdr'} background environmentIntensity={.9}/>}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.3,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial {...earth} color="#ad9879" roughness={1}/></mesh>
  <mesh position={[0,-.15,0]} receiveShadow><boxGeometry args={[38,.3,42]}/><meshStandardMaterial {...slab} color="#8d8f82" roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.008,0]} receiveShadow><planeGeometry args={[24.5,24.5]}/><meshStandardMaterial {...slab} color="#6b6e64" roughness={1}/></mesh>
  <CourtBorder type="wall" wallTex={concrete}/>
  {/* Unframed window and door openings, staggered blockwork and concrete lintels. */}
  {[-12,-4,4,12].map((x,i)=><UnfinishedBay key={x} map={masonry} position={[x,0,-18]} door={i===1}/>)}
  {[-18,18].flatMap((x,side)=>[-14,-6,2,10].map((z,i)=><UnfinishedBay key={x+','+z} map={masonry} position={[x,0,z]} rotation={Math.PI/2} door={i===2} partial={i===3||(!detailed&&i===2)}/>))}
  {/* Roofless rooms beyond the playing area: this reads as a house shell, not a warehouse frame. */}
  <Masonry map={masonry} position={[0,1.4,-25]} width={36} height={2.8}/>
  {[-16,-8,0,8,16].map(x=><group key={x} position={[x,0,-21.5]} rotation={[0,Math.PI/2,0]}><Masonry map={masonry} position={[0,1.2,0]} width={7} height={2.4}/></group>)}
  {columns.map(([x,z],i)=><group key={i} position={[x,0,z]}><mesh position={[0,1.7,0]} castShadow receiveShadow><boxGeometry args={[.45,3.4,.45]}/><meshStandardMaterial {...concrete} color="#b7b5a6" roughness={1}/></mesh>{detailed&&[-.13,.13].flatMap(dx=>[-.13,.13].map(dz=><mesh key={dx+','+dz} position={[dx,3.85,dz]}><cylinderGeometry args={[.018,.018,.95,4]}/><meshStandardMaterial color="#765039" roughness={1}/></mesh>))}</group>)}
  <mesh position={[0,3.3,-18]} castShadow><boxGeometry args={[36,.3,.45]}/><meshStandardMaterial {...concrete} color="#b4b1a2" roughness={1}/></mesh>
  {[-18,18].map(x=><mesh key={x} position={[x,3.3,-5]} castShadow><boxGeometry args={[.45,.3,26]}/><meshStandardMaterial {...concrete} color="#b4b1a2" roughness={1}/></mesh>)}
  {/* Timber props and leftover formwork, as seen in the Adenta reference. */}
  {detailed&&[-4,4,12].map(x=><group key={x} position={[x,0,-17.8]}><mesh position={[.6,1.25,0]} rotation={[0,0,.04]} castShadow><boxGeometry args={[.12,2.5,.12]}/><meshStandardMaterial color="#9e8054" roughness={1}/></mesh><mesh position={[-1.4,1.4,-.05]} rotation={[0,0,-.3]}><boxGeometry args={[.16,2.9,.12]}/><meshStandardMaterial color="#9b7f55" roughness={1}/></mesh></group>)}
  {detailed&&blocks.map((position,i)=><group key={i} position={position}><mesh castShadow receiveShadow><boxGeometry args={[.75,.37,.42]}/><meshStandardMaterial color={i%3?'#a29f91':'#b5b1a1'} roughness={1}/></mesh>{[-.18,.18].map(x=><mesh key={x} position={[x,.187,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.18,.25]}/><meshBasicMaterial color="#57584e"/></mesh>)}</group>)}
  {[-1,1].map(side=><mesh key={side} position={[side*21,.5,9]} receiveShadow><coneGeometry args={[2.1,1.2,12]}/><meshStandardMaterial color="#c3aa7e" roughness={1}/></mesh>)}
  <SiteRubble detailed={detailed}/>
  {detailed&&[-25,-10,10,25].map((x,i)=><Building key={x} position={[x,0,-36]} rotation={0} width={7} height={3+i%2*.4} tint={['#c2baa0','#d6c593','#c5c8b4','#d5b9a1'][i]} band="#77765b" wallTex={concrete} roofTex={roof}/>)}
 </>
}
export function ArenaEnvironment({arena,detailed=true}){return arena.id==='uncompleted'?<UncompletedBuilding detailed={detailed}/>:<StreetEnvironment arena={arena} detailed={detailed}/>}
