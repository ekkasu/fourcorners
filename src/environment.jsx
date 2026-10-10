import React,{useMemo} from 'react';
import{Environment as SkyLight,Text,useTexture}from'@react-three/drei';
import*as THREE from'three';

const TEX='/textures/env/';
// Surfaces per arena. Every texture and the sky are CC0 from Poly Haven; see public/textures/env/README.md.
const THEMES={
 accra:{floor:'cracked_concrete',court:'#ffffff',ground:'#9a8b76',wall:'yellow_plaster',roof:true,tints:['#f2d27a','#86cbc4','#ec9a78','#f3efe2','#a9d686'],bands:['#2f6f8f','#b8453a','#2e7d4f'],signs:['CHOP BAR','PROVISIONS','BARBER','MOBILE MONEY','TAILOR','SPARE PARTS'],palms:true,poles:true,border:'wall'},
 kumasi:{floor:'cracked_concrete',court:'#f6f1ea',ground:'#93836f',wall:'worn_plaster_wall',roof:true,tints:['#e9c58f','#c9e0d6','#e3a07e','#efe6d4'],bands:['#7b3b2a','#2b5d7a','#355e3b'],signs:['KENTE CLOTH','PROVISIONS','CHOP BAR','PHONE REPAIRS'],palms:true,poles:true,border:'wall'},
 village:{floor:'red_laterite_soil_stones',court:'#ffffff',ground:'#b99880',wall:'clay_plaster',roof:true,tints:['#ecd0aa','#ddb98f','#f2e0c6'],bands:['#8a4b2d','#6b3a24'],signs:['PROVISIONS','CHOP BAR'],palms:true,poles:true,border:'logs'},
 school:{floor:'red_laterite_soil_stones',court:'#ffffff',ground:'#bf9f88',wall:'worn_plaster_wall',roof:true,tints:['#f1d98a','#ece5d2'],bands:['#6a3d8f','#b8453a'],signs:['CANTEEN','CLASS 4','LIBRARY','STAFF ROOM'],palms:true,poles:false,border:'wall'},
 london:{floor:'asphalt_02',court:'#c4cacc',ground:'#7f8486',wall:'brick_wall_02',roof:false,tints:['#d39a82','#b98572','#dcae96'],bands:['#2b2f33','#2f4a3a','#5a2730'],signs:['CORNER SHOP','CAFE','LAUNDRETTE','CHIPS'],palms:false,poles:false,border:'fence'}};

function useSurface(name,repeat,normal=false){
 const raw=useTexture(normal?{map:`${TEX}${name}_diff_1k.jpg`,normalMap:`${TEX}${name}_nor_gl_1k.jpg`}:{map:`${TEX}${name}_diff_1k.jpg`});
 return useMemo(()=>Object.fromEntries(Object.entries(raw).map(([key,source])=>{const t=source.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;if(key==='map')t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return[key,t]})),[raw,repeat]);
}

function Building({position,rotation,width,height,tint,band,sign,wallMap,roofMap}){
 const d=3.4,front=d/2+.02,windowY=Math.max(1.55,height*.5),floors=height>3.4?[windowY,height*.8]:[windowY];
 return <group position={position} rotation={[0,rotation,0]}>
  <mesh position={[0,height/2,0]} castShadow receiveShadow><boxGeometry args={[width,height,d]}/><meshStandardMaterial map={wallMap} color={tint} roughness={.95}/></mesh>
  <mesh position={[0,.45,front-.01]}><planeGeometry args={[width,.9]}/><meshStandardMaterial color={band} roughness={.9}/></mesh>
  <mesh position={[0,.95,front]}><planeGeometry args={[.9,1.9]}/><meshStandardMaterial color="#5a3b28" roughness={.8}/></mesh>
  {floors.flatMap((y,f)=>[-1,1].map(side=>{const x=side*width*.3;return <group key={f+'w'+side} position={[x,y,front]}>
   <mesh position={[0,0,-.005]}><planeGeometry args={[.82,1]}/><meshStandardMaterial color="#efe8da"/></mesh>
   <mesh><planeGeometry args={[.66,.84]}/><meshStandardMaterial color="#1f2d33" roughness={.15} metalness={.4}/></mesh>
   {[-1,1].map(s=><mesh key={s} position={[s*.52,0,.04]} rotation={[0,s*.5,0]}><planeGeometry args={[.36,.86]}/><meshStandardMaterial color={band} side={THREE.DoubleSide}/></mesh>)}
  </group>}))}
  {roofMap?<mesh position={[0,height+.22,.1]} rotation={[.12,0,0]} castShadow><boxGeometry args={[width+.5,.07,d+.7]}/><meshStandardMaterial map={roofMap} color="#c9c1b4" roughness={.7} metalness={.35}/></mesh>
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

function Lamp({position}){return <group position={position}><mesh position={[0,2.2,0]}><cylinderGeometry args={[.06,.09,4.4,8]}/><meshStandardMaterial color="#2b3236" metalness={.5} roughness={.5}/></mesh><mesh position={[0,4.45,0]}><boxGeometry args={[.36,.22,.36]}/><meshStandardMaterial color="#f5e9c6" emissive="#f5e1a0" emissiveIntensity={.4}/></mesh></group>}

const CHAIN_LINK=(()=>{const points=[],line=(a,b)=>points.push(new THREE.Vector3(...a),new THREE.Vector3(...b)),e=12.35;
 for(const [side,h] of [[-1,3.2],[1,1.2]]){for(let x=-e;x<=e+.001;x+=.3)line([x,.4,side*e],[x,h,side*e]);for(let y=.4;y<=h+.001;y+=.3)line([-e,y,side*e],[e,y,side*e])}
 for(const side of [-1,1]){for(let z=-e;z<=e+.001;z+=.3)line([side*e,.4,z],[side*e,3.2,z]);for(let y=.4;y<=3.2+.001;y+=.3)line([side*e,y,-e],[side*e,y,e])}
 return new THREE.BufferGeometry().setFromPoints(points)})();

// The court border the ball bounces off. The near (south) fence is lower so it doesn't block the camera.
function CourtBorder({type,wallMap}){const e=12.35,sides=[[0,-e,25],[0,e,25],[-e,0,25,true],[e,0,25,true]];
 if(type==='logs')return <>{sides.map(([x,z,l,turn],i)=><mesh key={i} position={[x,.16,z]} rotation={turn?[Math.PI/2,0,0]:[0,0,Math.PI/2]} castShadow receiveShadow><cylinderGeometry args={[.16,.18,l,8]}/><meshStandardMaterial color="#7a5a3c" roughness={1}/></mesh>)}</>;
 const h=type==='fence'?.4:.62;
 return <>{sides.map(([x,z,l,turn],i)=><mesh key={i} position={[x,h/2,z]} castShadow receiveShadow><boxGeometry args={turn?[.25,h,l]:[l,h,.25]}/><meshStandardMaterial map={wallMap} color={type==='fence'?'#8f8f8f':'#efe6d6'} roughness={.95}/></mesh>)}
  {type==='fence'&&<><lineSegments geometry={CHAIN_LINK}><lineBasicMaterial color="#7d878a" transparent opacity={.55}/></lineSegments>
   {[-e,-6,0,6,e].flatMap(a=>[[a,-e,3.2],[a,e,1.2],[-e,a,3.2],[e,a,3.2]]).map(([x,z,ph],i)=><mesh key={i} position={[x,ph/2,z]}><cylinderGeometry args={[.05,.05,ph,6]}/><meshStandardMaterial color="#24352c" metalness={.4}/></mesh>)}</>}
 </>}

export function ArenaEnvironment({arena}){
 const theme=THEMES[arena.id]||THEMES.accra;
 const court=useSurface(theme.floor,6,true),ground=useSurface(theme.floor,40),wall=useSurface(theme.wall,1).map,roof=useSurface('rusty_corrugated_iron',2).map;
 const buildings=useMemo(()=>{let n=0;const make=(x,z,rotation,width,height,i)=>({key:n,position:[x,0,z],rotation,width,height,tint:theme.tints[n%theme.tints.length],band:theme.bands[n%theme.bands.length],sign:n++%2===0?theme.signs[(n>>1)%theme.signs.length]:null});const low=theme.roof&&arena.type==='Rural';const list=[];
  for(let i=0;i<9;i++){const z=-26+i*6.5;list.push(make(-22-(i%2)*2,z,Math.PI/2,4+(i%3),low?2.6:3.2+(i%3)*.65),make(22+(i%2)*2,z,-Math.PI/2,4+(i%3),low?2.6:3+(i%3)*.75))}
  [-25,-18,-11,11,18,25].forEach((x,i)=>list.push(make(x,-27,0,5,low?2.6:3.4+(i%2)*.8)));[-25,-16,16,25].forEach(x=>list.push(make(x,27,Math.PI,6,low?2.6:3)));return list},[arena.id,arena.type]);
 return <>
  <SkyLight files={TEX+'sky_1k.hdr'} background environmentIntensity={.65}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial {...ground} color={theme.ground} roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[24.5,24.5]}/><meshStandardMaterial {...court} color={theme.court} roughness={.95} normalScale={[.8,.8]}/></mesh>
  <CourtBorder type={theme.border} wallMap={wall}/>
  {buildings.map(({key,...b})=><Building key={key} {...b} wallMap={wall} roofMap={theme.roof?roof:null}/>)}
  {theme.palms?[[-17,-16,0],[17,-15,2],[-17.5,9,4],[17,11,1],[-15,22,3],[15.5,23,5]].map(([x,z,t],i)=><Palm key={i} position={[x,0,z]} height={5+(i%3)*.6} turn={t}/>)
   :[[-17,5],[17,5]].map(([x,z],i)=><group key={i} position={[x,0,z]}><mesh position={[0,1.2,0]}><cylinderGeometry args={[.17,.25,2.4,9]}/><meshStandardMaterial color="#594636"/></mesh><mesh position={[0,3,0]} castShadow><sphereGeometry args={[2,12,10]}/><meshStandardMaterial color="#3a633c"/></mesh><mesh position={[.6,3.9,.3]} castShadow><sphereGeometry args={[1.3,12,10]}/><meshStandardMaterial color="#44733f"/></mesh></group>)}
  {theme.poles&&<><PowerLine x={-15.5}/><PowerLine x={15.5}/></>}
  {arena.id==='london'?[-15,-5,5,15].flatMap(z=>[<Lamp key={'l'+z} position={[-15,0,z]}/>,<Lamp key={'r'+z} position={[15,0,z]}/>])
   :[[-15,-15,Math.PI/4,'#2f8f6a','WATER · SNACKS'],[15,-15,-Math.PI/4,'#c9522f','TOP UP HERE']].map(([x,z,r,c,l])=><Kiosk key={l} position={[x,0,z]} rotation={r} color={c} label={l}/>)}
 </>
}
