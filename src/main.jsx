import React,{Suspense,useEffect,useMemo,useRef,useState} from 'react';import{createRoot}from'react-dom/client';import{Canvas,useFrame,useLoader}from'@react-three/fiber';import{Billboard,ContactShadows,OrbitControls,Text,useGLTF,useProgress}from'@react-three/drei';import{clone as cloneSkeleton}from'three/examples/jsm/utils/SkeletonUtils.js';import*as THREE from'three';import{EffectComposer,N8AO,ToneMapping,Vignette}from'@react-three/postprocessing';import{ToneMappingMode}from'postprocessing';import{ArenaEnvironment,AssetBoundary,forgetFailedAsset}from'./environment.jsx';import{crowd,music,sfx}from'./sound.js';import{applyMatch,arenaRequirement,arenaUnlocked,isLocked,levelInfo,loadProgress,requiredLevel,saveProgress,unlocksBetween}from'./progress.js';import './styles.css';
const MAPS=[{id:'accra',name:'Accra Street Court',type:'Urban',country:'Ghana',icon:'🏙️',color:'#b98a57'},{id:'kumasi',name:'Kumasi Block Court',type:'Urban',country:'Ghana',icon:'🏘️',color:'#af825c'},{id:'village',name:'Village Dust Court',type:'Rural',country:'Ghana',icon:'🌴',color:'#b77745'},{id:'school',name:'School Park Arena',type:'Rural',country:'Ghana',icon:'🏫',color:'#9c855d'},{id:'london',name:'East Legon Cage',type:'Urban',country:'United Kingdom',icon:'🌆',color:'#596866'}];const COLORS=['#c94c3c','#367ac9','#e8bd39','#21a66f'];const GOALS=[[0,-11],[11,0],[0,11],[-11,0]];
const PLAYER_MODELS={male:'/models/male-optimized2.glb',female:'/models/female-optimized2.glb'};
const FOOTBALLER_MODEL='/models/footballer-red.glb';
const FOOTBALLER_BLUE_MODEL='/models/footballer-blue.glb';
const FOOTBALLER_MODELS=[FOOTBALLER_MODEL,FOOTBALLER_BLUE_MODEL];
// Female footballer: the Mixamo "Shannon" character, converted by tools/build-female.mjs. Shirt, shorts, socks, boots,
// body and hair are separate meshes, so each part of the kit is coloured on its own.
const FEMALE_MODEL='/models/footballer-female.glb';
// Red and blue use their native kits. Any other color recolors the blue kit, whose hue is far from the skin and hair tones in the texture.
// The asset reuses its color texture as the emissive map, so both are swapped.
const NATIVE_KITS={'#d43a3a':FOOTBALLER_MODEL,'#e6534c':FOOTBALLER_MODEL,'#367ddc':FOOTBALLER_BLUE_MODEL,'#4b9bff':FOOTBALLER_BLUE_MODEL};
const footballerKit=(color,custom)=>!custom&&NATIVE_KITS[color]?{modelPath:NATIVE_KITS[color]}:{modelPath:FOOTBALLER_BLUE_MODEL,kit:color};
// Shorts, socks and boots chosen in the Locker. 'default' keeps the kit's own look.
const DEFAULT_OUTFIT={shorts:'default',socks:'default',boots:'default'};
const outfitCustom=o=>!!o&&(o.shorts!=='default'||o.socks!=='default'||o.boots!=='default');
const playerKit=(gender,jersey,outfit,back)=>gender==='Female'?{modelPath:FEMALE_MODEL,kit:jersey,outfit}:{...footballerKit(jersey,outfitCustom(outfit)||!!(back&&(back.name||back.number))),outfit};
// The Ghana kit keeps the blue texture as a mask and recolours it in the shader (see ghanaKit).
const RIVAL_KITS=['#e6534c','#f8cf51','#4b9bff'];
// Goal celebrations (Mixamo clips retargeted by tools/retarget-mixamo.mjs). Each rival has its own.
const CELEBRATIONS=[['celebrate','Victory'],['cel_backflip','Backflip'],['cel_fistpump','Fist pump'],['cel_rally','Rally the crowd'],['cel_dance','Running man']];
const RIVAL_CELEBRATIONS=['cel_fistpump','cel_rally','cel_dance'];
const KIT_BASE={h:218,s:.74,l:.47},kitTextures=new Map();
function hexToHsl(hex){const n=parseInt(hex.slice(1),16);return rgbToHsl((n>>16&255)/255,(n>>8&255)/255,(n&255)/255)}
function rgbToHsl(r,g,b){const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;if(!d)return{h:0,s:0,l};const s=d/(1-Math.abs(2*l-1));const h=max===r?60*(((g-b)/d)%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);return{h:(h+360)%360,s,l}}
function hslToRgb(h,s,l){const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,[r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return[(r+m)*255,(g+m)*255,(b+m)*255]}
// Skin tones for footballers. The source models have light peach skin (hue 20-40, lightness ~.72) and brown hair;
// skin is re-coloured to the chosen tone keeping its shading, and hair is darkened to black.
const SKIN_BASE_L=.72,PLAYER_SKIN='#6b4126',RIVAL_SKINS=['#53321f','#8a5634','#5e3a22'];
function kitTexture(base,color,skin){const key=base.uuid+(color||'')+(skin||'');if(kitTextures.has(key))return kitTextures.get(key);const img=base.image,canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),p=pixels.data;const t=color&&color!==GHANA&&hexToHsl(color);const tone=skin&&hexToHsl(skin);
 const w=canvas.width,cls=new Uint8Array(p.length/4);
 for(let i=0,n=0;i<p.length;i+=4,n++){const{h,s,l}=rgbToHsl(p[i]/255,p[i+1]/255,p[i+2]/255);
  if(t&&h>=195&&h<=250&&s>=.3&&l>=.1)cls[n]=1;
  else if(tone&&s>=.15&&((h>=12&&h<=45&&l>=.55)||(h>=5&&h<12&&l>=.68)))cls[n]=2;
  else if(tone&&s>=.15&&h>=8&&h<=45&&l>=.08&&l<.45)cls[n]=3}
 if(tone)for(let n=0;n<cls.length;n++){if(cls[n]!==2)continue;let hair=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const m=n+dy*w+dx;if(m>=0&&m<cls.length&&cls[m]===3)hair++}if(hair>=9)cls[n]=4}
 for(let i=0,n=0;i<p.length;i+=4,n++){if(!cls[n])continue;const{h,s,l}=rgbToHsl(p[i]/255,p[i+1]/255,p[i+2]/255);let out;
  if(cls[n]===1)out=hslToRgb(t.h,Math.min(1,s*t.s/KIT_BASE.s),Math.min(.95,l*t.l/KIT_BASE.l));
  else if(cls[n]===2)out=hslToRgb(tone.h,Math.min(1,tone.s*Math.min(1.3,s/.45)),Math.min(.9,tone.l*Math.pow(l/SKIN_BASE_L,.85)));
  else out=hslToRgb(cls[n]===4?20:h,cls[n]===4?.2:s*.3,cls[n]===4?Math.min(.12,l*.25):l*.45);
  p[i]=out[0];p[i+1]=out[1];p[i+2]=out[2]}
 ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.flipY=base.flipY;texture.colorSpace=base.colorSpace;texture.wrapS=base.wrapS;texture.wrapT=base.wrapT;kitTextures.set(key,texture);return texture}
// Mixamo moves retargeted onto the footballer rig by tools/retarget-mixamo.mjs (sources in assets-src/mixamo).
// Phones and tablets skip post-processing to keep the frame rate up.
const HIGH_QUALITY=typeof window!=='undefined'&&!window.matchMedia('(pointer: coarse)').matches;
const GHANA='ghana',GHANA_SWATCH='linear-gradient(#ce1126 0 33%,#fcd116 33% 66%,#006b3f 66%)';
const jerseyBackground=c=>c===GHANA?GHANA_SWATCH:c;
const GHANA_GLSL=`float starDist(vec2 p,float r){const float k=0.42;p.x=abs(p.x);vec2 k1=vec2(0.809016994,-0.587785252),k2=vec2(-k1.x,k1.y);p-=2.0*max(dot(k1,p),0.0)*k1;p-=2.0*max(dot(k2,p),0.0)*k2;p.x=abs(p.x);p.y-=r;vec2 ba=k*vec2(-k1.y,k1.x)-vec2(0.0,1.0);float h=clamp(dot(p,ba)/dot(ba,ba),0.0,r);return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);}
vec3 ghanaColor(vec3 p){vec3 red=vec3(.62,.006,.019),gold=vec3(.97,.64,.008),green=vec3(0.,.15,.05),black=vec3(.012);
 if(p.y<.5)return gold;if(p.y>1.04)return red;if(p.y>.86){if(p.z>.05&&starDist(vec2(p.x,p.y-.95),.09)<0.)return black;return gold;}return green;}
`;
const ghanaMaterials=new WeakMap();
function ghanaKit(source){if(ghanaMaterials.has(source))return ghanaMaterials.get(source);const m=source.clone();
 m.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vKitPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvKitPos=position;');
  shader.fragmentShader=`varying vec3 vKitPos;
float gKitMask;vec3 gKitColor;
${GHANA_GLSL}`+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
{vec3 c=sampledDiffuseColor.rgb;float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b));gKitMask=(c.b>c.r*1.6&&c.b>=c.g&&(mx-mn)>mx*.4)?1.:0.;gKitColor=ghanaColor(vKitPos)*clamp(mx/.3,.45,1.25);if(gKitMask>.5)diffuseColor.rgb=diffuse*gKitColor;}`)
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(gKitMask>.5)totalEmissiveRadiance=emissive*gKitColor;');
 };
 m.customProgramCacheKey=()=>'ghana-kit';ghanaMaterials.set(source,m);return m}
// Male footballer with custom shorts, socks or boots, or a printed name and number (the texture's own white "10" on the
// back is then recoloured as shirt). The blue kit texture is the mask: kit-blue texels below the knee are
// socks and above are the shirt; white texels between knee and waist are the shorts; dark texels at the feet are boots.
// Heights are in the model's bind pose (metres), measured from the asset.
const KIT_REGION={sockTop:.47,shortsLow:.44,shortsTop:.84,bootTop:.13};
const kitRegionMaterials=new Map(),linear=c=>new THREE.Color(c);
function kitRegions(source,kit,outfit,backPrint=false){const o={...DEFAULT_OUTFIT,...outfit},key=source.uuid+kit+o.shorts+o.socks+o.boots+backPrint;if(kitRegionMaterials.has(key))return kitRegionMaterials.get(key);const m=source.clone();
 const uniforms={uJersey:{value:linear(kit===GHANA?'#ffffff':kit)},uGhana:{value:kit===GHANA?1:0},uShorts:{value:linear(o.shorts==='default'?'#ffffff':o.shorts)},uShortsOn:{value:o.shorts==='default'?0:1},
  uSocks:{value:linear(o.socks==='default'?'#ffffff':o.socks)},uSocksOn:{value:o.socks==='default'?0:1},uBoots:{value:linear(o.boots==='default'?'#000000':o.boots)},uBootsOn:{value:o.boots==='default'?0:1},uBack:{value:backPrint?1:0}};
 const R=KIT_REGION,f=v=>v.toFixed(3);
 m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 vKitPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvKitPos=position;');
  shader.fragmentShader=`varying vec3 vKitPos;uniform vec3 uJersey,uShorts,uSocks,uBoots;uniform float uGhana,uShortsOn,uSocksOn,uBootsOn,uBack;
float gKitMask;vec3 gKitColor;
${GHANA_GLSL}`+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
{vec3 c=sampledDiffuseColor.rgb,p=vKitPos;float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b));gKitMask=0.;
 if(c.b>c.r*1.6&&c.b>=c.g&&(mx-mn)>mx*.4){vec3 base=uGhana>.5?ghanaColor(p):uJersey;if(uSocksOn>.5&&p.y<${f(R.sockTop)})base=uSocks;gKitColor=base*clamp(mx/.3,.45,1.25);gKitMask=1.;}

 else if(uBack>.5&&p.z<-.04&&p.y>.86&&p.y<1.3&&mn>.18&&(mx-mn)<.3&&c.b>=c.r){vec3 base=uGhana>.5?ghanaColor(p):uJersey;gKitColor=base*clamp(mx/.75,.45,1.15);gKitMask=1.;}
 else if(uShortsOn>.5&&p.y>${f(R.shortsLow)}&&p.y<${f(R.shortsTop)}&&mn>.45&&(mx-mn)<.12){gKitColor=uShorts*clamp(mx/.8,.5,1.15);gKitMask=1.;}
 else if(uBootsOn>.5&&p.y<${f(R.bootTop)}&&mx<.12){gKitColor=uBoots*(.35+mx*4.);gKitMask=1.;}
 if(gKitMask>.5)diffuseColor.rgb=diffuse*gKitColor;}`)
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(gKitMask>.5)totalEmissiveRadiance=emissive*gKitColor;');
 };
 m.customProgramCacheKey=()=>'kit-regions';kitRegionMaterials.set(key,m);return m}
// Female footballer: each kit part is its own mesh with a white (shirt, shorts, socks) or black (boots) texture.
// Socks match the shirt unless chosen; the Ghana shirt is red, gold with the black star, and green (heights in cm).
const FEMALE_GHANA={red:132,gold:118,star:125};
function tintedBoots(m,color){m.onBeforeCompile=shader=>{shader.uniforms.uBoots={value:linear(color)};shader.fragmentShader='uniform vec3 uBoots;\n'+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n{float l=max(sampledDiffuseColor.r,max(sampledDiffuseColor.g,sampledDiffuseColor.b));diffuseColor.rgb=diffuse*uBoots*clamp(.3+l*3.,.3,1.2);}')};m.customProgramCacheKey=()=>'boots-tint';return m}
function femaleGhanaShirt(m){const G=FEMALE_GHANA;m.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vKitPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvKitPos=position;');
  shader.fragmentShader='varying vec3 vKitPos;\nfloat gKitMask;vec3 gKitColor;\n'+GHANA_GLSL+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
{vec3 p=vKitPos;float sh=clamp(max(sampledDiffuseColor.r,max(sampledDiffuseColor.g,sampledDiffuseColor.b))/.8,.4,1.1);
 vec3 col=p.y>${G.red}.?vec3(.62,.006,.019):p.y>${G.gold}.?((p.z>4.&&starDist(vec2(p.x,p.y-${G.star}.),6.)<0.)?vec3(.012):vec3(.97,.64,.008)):vec3(0.,.15,.05);diffuseColor.rgb=diffuse*col*sh;}`)};
 m.customProgramCacheKey=()=>'ghana-shirt-female';return m}
// Her skin is a pale, low-saturation tone (lightness about .52), unlike the cartoon footballers, so it has its own recolour.
// Only the Body mesh uses the result, so clothing areas of the shared texture do not matter; eye whites and dark brows are kept.
function femaleSkinTexture(base,skin){const key=base.uuid+'f'+skin;if(kitTextures.has(key))return kitTextures.get(key);const img=base.image,canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),p=pixels.data,tone=hexToHsl(skin);
 for(let i=0;i<p.length;i+=4){const{h,s,l}=rgbToHsl(p[i]/255,p[i+1]/255,p[i+2]/255);if(l<.14||l>.78||s<.05||(h>40&&h<330))continue;
  const out=hslToRgb(tone.h,Math.min(1,tone.s*THREE.MathUtils.clamp(s/.15,.8,1.4)),Math.min(.85,tone.l*Math.pow(l/.52,.9)));p[i]=out[0];p[i+1]=out[1];p[i+2]=out[2]}
 ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.flipY=base.flipY;texture.colorSpace=base.colorSpace;texture.wrapS=base.wrapS;texture.wrapT=base.wrapT;kitTextures.set(key,texture);return texture}
function dressFemale(mesh,kit,outfit,tone){const o={...DEFAULT_OUTFIT,...outfit},src=mesh.material,m=src.clone();m.roughness=.8;m.metalness=0;
 switch(mesh.name){
  case 'Hair':case 'Eyelashes':m.alphaTest=.5;m.side=THREE.DoubleSide;break;
  case 'Body':if(tone&&src.map)m.map=femaleSkinTexture(src.map,tone);break;
  case 'Shirt':if(kit===GHANA)return femaleGhanaShirt(m);m.color.set(kit);break;
  case 'Shorts':if(o.shorts!=='default')m.color.set(o.shorts);break;
  case 'Socks':m.color.set(o.socks!=='default'?o.socks:kit===GHANA?'#fcd116':kit);break;
  case 'Shoes':if(o.boots!=='default')return tintedBoots(m,o.boots);break}
 return m}
// Name and number on the back of the player's shirt: a canvas texture on a curved strip that follows the chest bone.
const BACK_PRINT={female:{bone:'mixamorig5Spine1',center:[0,1.24,-.126],radius:.24,size:[.24,.29]},male:{bone:'Spine01',center:[0,1.04,-.122],radius:.24,size:[.28,.31]}};
const backTextures=new Map();
function backPrintTexture(name,number,dark){const key=name+'|'+number+'|'+dark;if(backTextures.has(key))return backTextures.get(key);const canvas=document.createElement('canvas');canvas.width=256;canvas.height=296;const ctx=canvas.getContext('2d');
 ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='round';const fill=dark?'#111418':'#ffffff',stroke=dark?'#ffffffaa':'#111418cc';
 const text=(t,size,y,max)=>{let px=size;ctx.font=`800 ${px}px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif`;while(ctx.measureText(t).width>max&&px>14){px-=2;ctx.font=`800 ${px}px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif`}ctx.lineWidth=Math.max(3,px*.09);ctx.strokeStyle=stroke;ctx.strokeText(t,128,y);ctx.fillStyle=fill;ctx.fillText(t,128,y)};
 if(name)text(name.toUpperCase(),46,52,210);if(number)text(String(number),190,number&&name?262:220,240);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;backTextures.set(key,texture);return texture}
function addBackPrint(model,female,back,kit){if(!back||(!back.name&&!back.number))return;const spec=BACK_PRINT[female?'female':'male'],bone=model.getObjectByName(spec.bone);if(!bone)return;
 const kitColor=kit&&kit!==GHANA?new THREE.Color(kit):null,dark=!!kitColor&&(kitColor.r*.2126+kitColor.g*.7152+kitColor.b*.0722)>.45;
 const[w,h]=spec.size,R=spec.radius,a=w/R/2,geometry=new THREE.CylinderGeometry(R,R,h,18,1,true,Math.PI-a,a*2);
 const material=new THREE.MeshStandardMaterial({map:backPrintTexture(back.name,back.number,dark),transparent:true,alphaTest:.25,depthWrite:false,roughness:.8,polygonOffset:true,polygonOffsetFactor:-2});
 const strip=new THREE.Mesh(geometry,material);strip.name='BackPrint';strip.position.set(spec.center[0],spec.center[1],spec.center[2]+R);model.updateMatrixWorld(true);bone.attach(strip)}
const litMaterials=new WeakMap();
function litFootballer(material){if(!litMaterials.has(material)){const m=material.clone();m.emissiveIntensity=.22;m.roughness=.75;if('specularIntensity' in m)m.specularIntensity=.35;litMaterials.set(material,m)}return litMaterials.get(material)}
// The red and blue footballers have different bone rest rotations, so each uses clips retargeted to its own skeleton.
const MOVES_URL={'/models/footballer-red.glb':'/models/footballer-moves-red.json','/models/footballer-blue.glb':'/models/footballer-moves.json',[FEMALE_MODEL]:'/models/footballer-moves-female.json'};
const movesUrlFor=model=>MOVES_URL[model]||'/models/footballer-moves.json';const parsedMoves=new Map();
function footballerMoves(url,text){if(!parsedMoves.has(url)){const data=JSON.parse(text);parsedMoves.set(url,{clips:data.clips.map(c=>THREE.AnimationClip.parse(c)),events:data.events})}return parsedMoves.get(url)}
// Ball contact happens KICK_LEAD seconds after the shot button is released, so each kick clip starts that long before its contact frame.
const KICK_LEAD=.18;
function oneShotWindow(name,events){if(name==='tackle')return{start:.25,length:.7};const contact=events[name]?.contact??.3;return{start:Math.max(0,contact-KICK_LEAD),length:KICK_LEAD+.5}}
function RiggedPlayer({position=[0,0,0],animated=false,label='YOU',gender='male',modelPath,kit,skin=PLAYER_SKIN,outfit,back,celebration='celebrate'}){
 const root=useRef(),mixer=useRef(),current=useRef(''),currentClip=useRef('');const selectedModel=modelPath||PLAYER_MODELS[String(gender).toLowerCase()==='female'?'female':'male'];const {scene,animations}=useGLTF(selectedModel);
 const female=selectedModel===FEMALE_MODEL,footballer=female||FOOTBALLER_MODELS.includes(selectedModel),movesUrl=movesUrlFor(selectedModel),moves=footballerMoves(movesUrl,useLoader(THREE.FileLoader,movesUrl));
 const outfitKey=outfit?outfit.shorts+outfit.socks+outfit.boots:'',backKey=back?back.name+'|'+back.number:'';
 const model=useMemo(()=>{const copy=cloneSkeleton(scene),hasBack=!!back&&(!!back.name||!!back.number),regions=!female&&footballer&&(outfitCustom(outfit)||hasBack);copy.traverse(object=>{if(!object.isMesh)return;object.castShadow=true;object.frustumCulled=false;const tone=footballer?skin:null;
  if(female){object.material=dressFemale(object,kit,outfit,tone);object.receiveShadow=true;return}
  if((kit||tone)&&object.material.map){const source=object.material.map;object.material=object.material.clone();object.material.map=kitTexture(source,regions?GHANA:kit,tone);if(object.material.emissiveMap===source)object.material.emissiveMap=object.material.map}if(footballer){object.material=litFootballer(object.material);if(regions)object.material=kitRegions(object.material,kit,outfit,hasBack);else if(kit===GHANA)object.material=ghanaKit(object.material);object.receiveShadow=true}});
  if(footballer)addBackPrint(copy,female,back,kit);return copy},[scene,kit,footballer,female,skin,outfitKey,backKey]);
 const clips=useMemo(()=>{const all=footballer?[...animations,...moves.clips]:animations,find=n=>all.find(c=>c.name.toLowerCase()===n);const walk=find('walk'),run=find('run'),nativeIdle=find('idle');const still=nativeIdle?null:walk.tracks.map(track=>{const value=Array.from(track.createInterpolant().evaluate(0));return new track.constructor(track.name,[0,1],[...value,...value])});
  return {idle:nativeIdle||new THREE.AnimationClip('idle',1,still),walk,jog:run,run,dribble:find('dribble'),strike:find('strike'),penalty:find('penalty'),tackle:find('tackle'),celebrate:find(celebration)||find('celebrate')}},[animations,footballer,moves,celebration]);
 useEffect(()=>{mixer.current=new THREE.AnimationMixer(model);current.current=currentClip.current='';return()=>{mixer.current?.stopAllAction();mixer.current?.uncacheRoot(model);mixer.current=null}},[model]);
 useFrame((_,dt)=>{if(!mixer.current||!root.current)return;const data=root.current.parent?.userData||{},clock=data.clock,speed=animated?Math.hypot(data.velocityX||0,data.velocityZ||0):0;
  let next,key,once=null;
  if(footballer&&clock!==undefined&&clock<(data.celebrateUntil??-1)){next='celebrate';key=next+celebration+data.celebrateUntil}
  else if(footballer&&clock!==undefined&&clips[data.kickType]&&(once=oneShotWindow(data.kickType,moves.events))&&clock-data.kickAt<once.length){next=data.kickType;key=next+data.kickAt}
  else{once=null;next=key=footballer?(speed>6.1?'run':speed>.35?(data.dribbling&&clips.dribble?'dribble':'walk'):'idle'):(speed>6.1?'run':speed>3?'jog':speed>.35?'walk':'idle')}
  if(key!==current.current){const previous=currentClip.current&&mixer.current.existingAction(clips[currentClip.current]),action=mixer.current.clipAction(clips[next]),fade=once?.08:.18;
   action.reset();action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,Infinity);action.clampWhenFinished=!!once;action.time=once?once.start+Math.max(0,clock-data.kickAt):0;action.fadeIn(fade).play();if(previous&&previous!==action)previous.fadeOut(fade);current.current=key;currentClip.current=next}
  mixer.current.existingAction(clips[next])?.setEffectiveTimeScale(next==='walk'?(footballer?Math.max(.7,speed/5):Math.max(.65,speed/3)):next==='jog'?Math.max(.75,speed/5):next==='run'?Math.max(.8,speed/7):next==='dribble'?THREE.MathUtils.clamp(speed/2.8,.8,2):1);
  mixer.current.update(Math.min(dt,.05)*(data.timeScale??1))});
 return <group ref={root} position={position}><primitive object={model} scale={footballer&&!female?1:female?1.01:1.2}/>{label&&<Billboard position={[0,2.55,0]}><Text fontSize={.27} color="white" anchorX="center" outlineWidth={.022} outlineColor="#141414">{label}</Text></Billboard>}</group>
}
Object.values(MOVES_URL).forEach(url=>useLoader.preload(THREE.FileLoader,url));
// Fans in their corner's colours around the court. Each pose is baked once into a static mesh (CPU skinning) and drawn with
// one InstancedMesh per corner and pose, so the whole crowd costs a handful of draw calls.
const FAN_IDLE_PHASE=.533,FAN_SKINS={0:'#5e3a22',1:'#45291a',2:'#6b4126',3:'#8a5634'};
function bakePose(scene,clip,time){
 const copy=cloneSkeleton(scene);let mesh;copy.traverse(o=>{if(o.isSkinnedMesh)mesh=o});
 const mixer=new THREE.AnimationMixer(copy);mixer.clipAction(clip).play();mixer.setTime(time);copy.updateMatrixWorld(true);
 const src=mesh.geometry,pos=src.attributes.position,out=new Float32Array(pos.count*3),v=new THREE.Vector3();
 for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);mesh.applyBoneTransform(i,v).applyMatrix4(mesh.matrixWorld);out[i*3]=v.x;out[i*3+1]=v.y;out[i*3+2]=v.z}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(out,3));g.setAttribute('uv',src.attributes.uv);g.setIndex(src.index);g.computeVertexNormals();mixer.uncacheRoot(copy);return g;
}
// The moment in a clip where both hands are highest: used as the cheering pose.
function handsUpTime(scene,clip){
 const copy=cloneSkeleton(scene),mixer=new THREE.AnimationMixer(copy),left=copy.getObjectByName('LeftHand'),right=copy.getObjectByName('RightHand'),v=new THREE.Vector3();mixer.clipAction(clip).play();
 let best=0,top=-Infinity;for(let t=0;t<=clip.duration;t+=.1){mixer.setTime(t);copy.updateMatrixWorld(true);const h=Math.min(left.getWorldPosition(v).y,right.getWorldPosition(v).y);if(h>top){top=h;best=t}}mixer.uncacheRoot(copy);return best;
}
const FAN_SPOTS=(()=>{const spots=[],row=(n,place)=>{for(let k=0;k<n;k++)spots.push(place(-8+16*k/(n-1)+(Math.random()-.5)*.6))};
 row(7,a=>({side:0,x:a,z:-14,ry:0}));row(7,a=>({side:1,x:14,z:a,ry:-Math.PI/2}));row(7,a=>({side:3,x:-14,z:a,ry:Math.PI/2}));
 [-10.5,-8.2,8.2,10.5].forEach(x=>spots.push({side:2,x,z:14,ry:Math.PI}));
 return spots.map((spot,i)=>({...spot,phase:i*1.7,scale:.92+(i*37%13)/100}))})();
function Crowd({jersey,state}){
 const red=useGLTF(FOOTBALLER_MODEL),blue=useGLTF(FOOTBALLER_BLUE_MODEL),redMoves=footballerMoves(movesUrlFor(FOOTBALLER_MODEL),useLoader(THREE.FileLoader,movesUrlFor(FOOTBALLER_MODEL))),blueMoves=footballerMoves(movesUrlFor(FOOTBALLER_BLUE_MODEL),useLoader(THREE.FileLoader,movesUrlFor(FOOTBALLER_BLUE_MODEL)));
 const sides=useMemo(()=>{const colors={0:'#e6534c',1:'#4b9bff',2:jersey,3:'#f8cf51'},poses={};
  const posesFor=gltf=>poses[gltf.scene.uuid]??=(()=>{const walk=gltf.animations.find(c=>c.name.toLowerCase()==='walk');return{idle:bakePose(gltf.scene,walk,walk.duration*FAN_IDLE_PHASE),cheer:(()=>{const celebrate=(gltf===red?redMoves:blueMoves).clips.find(c=>c.name==='celebrate');return bakePose(gltf.scene,celebrate,handsUpTime(gltf.scene,celebrate))})()}})();
  return [0,1,2,3].map(side=>{const{modelPath,kit}=footballerKit(colors[side]),gltf=modelPath===FOOTBALLER_MODEL?red:blue;let material;gltf.scene.traverse(o=>{if(o.isMesh&&!material)material=o.material});
   {const base=material;material=base.clone();material.map=kitTexture(base.map,kit,FAN_SKINS[side]);if(base.emissiveMap===base.map)material.emissiveMap=material.map}material=litFootballer(material);if(colors[side]===GHANA)material=ghanaKit(material);
   return{side,spots:FAN_SPOTS.filter(spot=>spot.side===side),material,...posesFor(gltf)}})},[red,blue,redMoves,blueMoves,jersey]);
 const meshes=useRef({}),dummy=useMemo(()=>new THREE.Object3D(),[]);
 useFrame(({clock})=>{const t=clock.elapsedTime,s=state.current;
  for(const{side,spots}of sides){const cheering=s?.cheer?.side===side&&(s.now??t)<s.cheer.until;
   for(const pose of ['idle','cheer']){const mesh=meshes.current[side+pose];if(!mesh)continue;const shown=(pose==='cheer')===cheering;
    spots.forEach((spot,k)=>{dummy.position.set(spot.x,cheering?Math.abs(Math.sin(t*7+spot.phase))*.35:0,spot.z);dummy.rotation.set(0,spot.ry+(cheering?0:Math.sin(t*.5+spot.phase)*.18),0);dummy.scale.setScalar(shown?spot.scale:0);dummy.updateMatrix();mesh.setMatrixAt(k,dummy.matrix)});
    mesh.instanceMatrix.needsUpdate=true}}});
 return <>{sides.flatMap(({side,spots,material,idle,cheer})=>[['idle',idle],['cheer',cheer]].map(([pose,geometry])=><instancedMesh key={side+pose} ref={m=>{meshes.current[side+pose]=m}} args={[geometry,material,spots.length]} frustumCulled={false}/>))}</>
}
Object.values(PLAYER_MODELS).concat(FOOTBALLER_MODELS).forEach(useGLTF.preload);
const RIVAL_HOMES=[[0,-6],[-6,0],[6,0]],RIVAL_GOALS=[0,3,1];
const freshRivals=()=>RIVAL_HOMES.map(([x,z])=>({x,z,vx:0,vz:0,cool:1,target:2}));
const LIVES_OPTIONS=[1,2,3,5];
const PLAYER_START=[0,6],DROP_HEIGHT=5;
const dropBall=()=>({bx:(Math.random()-.5)*.6,bz:(Math.random()-.5)*.6,by:DROP_HEIGHT,bvx:(Math.random()-.5)*1.2,bvz:(Math.random()-.5)*1.2,bvy:0,attached:false,rc:-1,kickoff:true,last:null});
// Free-for-All: a 3-minute clock. Two corners left = final showdown (next goal wins). At full time the most lives wins;
// tied leaders go to golden goal (everyone on one life until a single corner remains).
const MATCH_SECONDS=180;
function fullTime(s,onEvent){const alive=[0,1,2,3].filter(g=>s.alive[g]),top=Math.max(...alive.map(g=>s.lives[g])),leaders=alive.filter(g=>s.lives[g]===top);
 if(leaders.length===1){const w=leaders[0];s.over=w===2?{result:'won',reason:'time'}:{result:'lost',reason:'time',by:RIVAL_GOALS.indexOf(w)};s.pause=1.5;sfx.goal();onEvent?.('fulltime')}
 else{s.golden=true;alive.forEach(g=>{s.lives[g]=1});onEvent?.('golden')}}
function matchSummary(s){const alive=[0,1,2,3].filter(g=>s.alive[g]),o=s.over;const place=o.result==='won'?1:o.reason==='time'?1+alive.filter(g=>g!==2&&s.lives[g]>s.lives[2]).length:alive.length+1;return{...o,place,mode:s.mode,time:s.elapsed,stats:{...s.stats}}}
const freshState=(lives=1,mode='training')=>({mode,timeLeft:mode==='ffa'?MATCH_SECONDS:null,golden:false,showdown:false,elapsed:0,order:[],stats:{goals:0,shots:0,tackles:0,knockouts:0,curlGoals:0},lives:[lives,lives,lives,lives],x:PLAYER_START[0],z:PLAYER_START[1],vx:0,vz:0,...dropBall(),alive:[true,true,true,true],rivals:freshRivals(),lock:0,rot:Math.PI,bAng:Math.PI,touch:0,pause:0,rc:-1,stealCool:0,slide:0,stamina:1,tired:false,curve:0,skillCool:0,skillHeld:false,feint:null,boost:0,tackleCool:0,seenPress:0,cancelShot:0,tape:[],replay:null,ripples:{},shake:0});
function resetPlay(s){Object.assign(s,{cutCam:!!s.replay,replay:null,tape:[],x:PLAYER_START[0],z:PLAYER_START[1],vx:0,vz:0,...dropBall(),rivals:freshRivals(),rot:Math.PI,bAng:Math.PI,lock:0,pendingShot:null,slide:0,stamina:1,tired:false,curve:0,feint:null,boost:0})}
// Shots charge while shoot is held. Timestamps keep quick taps from being lost between frames.
// Sprint stamina drains in about 3 s of sprinting; once empty you are winded until it recovers to 35%.
const SKILL_COOLDOWN=1.1,FEINT_SECONDS=.28,BOOST_SECONDS=.7;
// Goal moments. Goals you score or concede (and knockouts) replay in slow motion after a short live celebration.
const REPLAY_BEFORE=1.4,REPLAY_AFTER=.4,REPLAY_RATE=.5,REPLAY_DELAY=1.5;
const REDUCED_MOTION=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const REPLAY_Q=new THREE.Quaternion();
function snapshot(s,ball){return{t:s.now,x:s.x,z:s.z,vx:s.vx,vz:s.vz,rot:s.rot,kickAt:s.kickAt,kickType:s.kickType,attached:s.attached,bx:s.bx,by:s.by,bz:s.bz,q:ball?ball.quaternion.toArray():[0,0,0,1],rc:s.rc,alive:[...s.alive],
 rivals:s.rivals.map(r=>({x:r.x,z:r.z,vx:r.vx,vz:r.vz,kickAt:r.kickAt,kickType:r.kickType}))}}
// Camera shake in radians; skipped for players who asked their device to reduce motion.
function shake(s,amount){if(!REDUCED_MOTION)s.shake=Math.max(s.shake||0,amount)}
function ooh(s,strength){if(s.now>(s.oohUntil||0)){s.oohUntil=s.now+2;crowd.ooh(strength)}}
// Dust and grass bursts are queued by the game loop and drawn by GroundFx.
const fxQueue=[];
function burst(x,z,n,kind,dx=0,dz=0){if(fxQueue.length<40)fxQueue.push({x,z,n,kind,dx,dz})}
// Player bodies, as upright cylinders the loose ball bounces off.
const BODY_R=.35,BODY_HEIGHT=1.7,KICKER_GRACE=.3;
const STAMINA_DRAIN=.32,STAMINA_REGEN=.22,BALL_R=.24,POST_R=.08,CURVE_POWER=1.1;
// Gentle aim assist: shots within 25° of a live goal are pulled halfway toward its centre.
function aimAssist(s,aim){let best=aim,gap=.44;for(const g of [0,1,3]){if(!s.alive[g])continue;const[gx,gz]=GOALS[g],toward=Math.atan2(gx-s.bx,gz-s.bz),diff=Math.atan2(Math.sin(toward-aim),Math.cos(toward-aim));if(Math.abs(diff)<gap){gap=Math.abs(diff);best=aim+diff*.5}}return best}
const SHOT_CHARGE_MS=900,SLIDE_SECONDS=.4,SLIDE_SPEED=8.5,TACKLE_COOLDOWN=1;
function setCommand(c,action,value){sfx.unlock();if(action==='shoot'){if(value&&!c.shoot)c.shootAt=performance.now();if(!value&&c.shoot)c.shootRelease=performance.now()}c[action]=value}
// Offline rival AI. Each rival guards its own goal and the nearest one goes for the ball. A rival that wins the ball
// dribbles toward an opponent's goal (usually yours) and shoots from range. s.rc is the index of the rival carrying the ball, or -1.
// Rival tuning per difficulty. Speeds are m/s (you walk at 5 and sprint at 8); chances are 0..1; ranges are metres.
const DIFFICULTY={
 easy:{label:'Easy',carry:3.6,press:4,rush:5.6,guard:3,pressRange:2.2,tackleWin:.35,save:.25,shootRange:6,aim:3.6,recover:1.8},
 normal:{label:'Normal',carry:4.6,press:4.8,rush:6.6,guard:3.6,pressRange:3.5,tackleWin:.55,save:.45,shootRange:7.5,aim:2.8,recover:1.4},
 hard:{label:'Hard',carry:5.4,press:5.6,rush:7.2,guard:4,pressRange:5,tackleWin:.7,save:.6,shootRange:9,aim:2,recover:1}};
// Each rival has a style that scales the difficulty tuning. guardDist scales how far it stands off its goal.
const RIVAL_STYLES=[
 {name:'PRESSER',pressRange:1.7,press:1.1,tackleWin:1.15,save:.85},
 {name:'WALL',pressRange:.6,save:1.35,carry:.9,guardDist:.55},
 {name:'SNIPER',shootRange:1.4,aim:.65,tackleWin:.8,press:.95}];
const styledLevel=(L,i)=>{const st=RIVAL_STYLES[i],out={...L,guardDist:st.guardDist||1};for(const k of Object.keys(st))if(typeof st[k]==='number'&&k in L)out[k]=L[k]*st[k];out.save=Math.min(.9,out.save);out.tackleWin=Math.min(.92,out.tackleWin);return out};
function pickTarget(s,i){const r=s.rivals[i],alive=[0,1,2,3].filter(g=>s.alive[g]),top=Math.max(...alive.map(g=>s.lives[g])),low=Math.min(...alive.map(g=>s.lives[g]));let best=2,score=Infinity;for(let g=0;g<4;g++){if(g===RIVAL_GOALS[i]||!s.alive[g])continue;const[gx,gz]=GOALS[g],v=Math.hypot(gx-r.x,gz-r.z)-(g===2?4:0)-(s.lives[g]===top&&top>low?3:0);if(v<score){score=v;best=g}}return best}
function stepRivals(s,d){const L0=s.level||DIFFICULTY.normal,levels=[0,1,2].map(i=>styledLevel(L0,i));
 s.stealCool-=d;
 if(s.rc>=0&&s.stealCool<=0&&Math.hypot(s.bx-s.x,s.bz-s.z)<.85){s.rivals[s.rc].cool=1.2;s.rc=-1;s.attached=true;s.bAng=Math.atan2(s.bx-s.x,s.bz-s.z);s.last='player';s.stealCool=.8;sfx.tackle()}
 const ballSpeed=Math.hypot(s.bvx,s.bvz),loose=!s.attached&&s.rc<0;let chaser=-1,best=Infinity;
 s.rivals.forEach((r,i)=>{if(!s.alive[RIVAL_GOALS[i]]||s.rc===i)return;const dist=Math.hypot(s.bx-r.x,s.bz-r.z);if(dist<best){best=dist;chaser=i}});
 s.rivals.forEach((r,i)=>{
  const g=RIVAL_GOALS[i],[gx,gz]=GOALS[g],alive=s.alive[g],L=levels[i];r.cool-=d;let tx=r.x,tz=r.z,speed=0;
  // Fooled by a step-over: the rival keeps lunging the wrong way and stumbles to a stop.
  if(alive&&s.rc!==i&&r.fooledUntil>s.now){r.x=THREE.MathUtils.clamp(r.x+r.vx*d,-10.5,10.5);r.z=THREE.MathUtils.clamp(r.z+r.vz*d,-10.5,10.5);r.vx*=Math.exp(-3*d);r.vz*=Math.exp(-3*d);return}
  if(!alive&&s.rc===i)s.rc=-1;
  if(alive&&s.rc===i){if(!s.alive[r.target])r.target=pickTarget(s,i);const[ax,az]=GOALS[r.target];tx=ax*.82;tz=az*.82;speed=L.carry;
   const px=s.x-r.x,pz=s.z-r.z,pd=Math.hypot(px,pz);if(pd>0&&pd<2.6){const side=px*(tz-r.z)-pz*(tx-r.x)>0?-1:1;tx-=pz/pd*side*2.5;tz+=px/pd*side*2.5}}
  else if(alive){const toGoal=Math.hypot(s.bx-gx,s.bz-gz)||1,threat=toGoal<6.5;
   if(threat||(s.kickoff&&loose)||(i===chaser&&best<(loose?10:L.pressRange))){tx=s.bx;tz=s.bz;speed=threat&&toGoal<4.5?L.rush:L.press}
   else{const k=Math.min(3*L.guardDist,toGoal*.45);tx=gx+(s.bx-gx)/toGoal*k;tz=gz+(s.bz-gz)/toGoal*k;speed=L.guard}}
  const dx=tx-r.x,dz=tz-r.z,dist=Math.hypot(dx,dz),want=dist>.25?Math.min(speed,dist*3):0;
  r.vx=THREE.MathUtils.damp(r.vx,dist?dx/dist*want:0,6,d);r.vz=THREE.MathUtils.damp(r.vz,dist?dz/dist*want:0,6,d);
  r.x=THREE.MathUtils.clamp(r.x+r.vx*d,-10.5,10.5);r.z=THREE.MathUtils.clamp(r.z+r.vz*d,-10.5,10.5);
  for(const o of [s,...s.rivals]){if(o===r||(o!==s&&!s.alive[RIVAL_GOALS[s.rivals.indexOf(o)]]))continue;const ox=r.x-o.x,oz=r.z-o.z,od=Math.hypot(ox,oz);if(od>0&&od<.9){r.x+=ox/od*(.9-od);r.z+=oz/od*(.9-od)}}
  if(s.rc===i){const[ax,az]=GOALS[r.target],heading=Math.hypot(r.vx,r.vz)>.3?Math.atan2(r.vx,r.vz):Math.atan2(ax-r.x,az-r.z);s.bx=r.x+Math.sin(heading)*.65;s.bz=r.z+Math.cos(heading)*.65;s.by=s.bvx=s.bvz=s.bvy=0;
   if(r.cool<=0&&Math.hypot(ax-s.bx,az-s.bz)<L.shootRange){const miss=(Math.random()-.5)*L.aim,aimX=ax+(az?miss:0),aimZ=az+(ax?miss:0),ux=aimX-s.bx,uz=aimZ-s.bz,u=Math.hypot(ux,uz),power=12+Math.random()*4;
    s.rc=-1;s.ignore={who:i,until:s.now+KICKER_GRACE};s.bvx=ux/u*power;s.bvz=uz/u*power;s.bvy=.8+Math.random()*1.6;s.curve=(Math.random()-.5)*.8;s.last=i;s.lock=.25;r.cool=1.2;r.kickAt=s.now-KICK_LEAD;r.kickType='strike';sfx.kick(.7);burst(s.bx,s.bz,7,'kick',ux/u,uz/u)}
   return}
  if(!alive||r.cool>0||s.by>1.9||Math.hypot(s.bx-r.x,s.bz-r.z)>.75)return;
  // Hard shot not saved: it has already deflected off this rival's body in the ball physics.
  if(loose&&ballSpeed>7&&Math.random()>L.save){r.cool=.5;return}
  const take=loose?ballSpeed<=7&&s.by<.5:Math.random()<L.tackleWin;
  if(take){if(!loose){sfx.tackle();r.kickAt=s.now;r.kickType='tackle'}if(s.rc>=0)s.rivals[s.rc].cool=1;s.attached=false;s.rc=i;r.target=pickTarget(s,i);s.last=i;s.lock=.6;s.stealCool=.9;r.cool=.5;return}
  const cx=s.bx-gx,cz=s.bz-gz,c=Math.hypot(cx,cz)||1,spread=(Math.random()-.5)*.9,ux=cx/c-cz/c*spread,uz=cz/c+cx/c*spread,u=Math.hypot(ux,uz);
  r.kickAt=s.now-KICK_LEAD;r.kickType='strike';if(!loose)sfx.tackle();else sfx.save();if(s.rc>=0)s.rivals[s.rc].cool=1;s.attached=false;s.rc=-1;burst(s.bx,s.bz,5,'kick',ux/u,uz/u);s.bvx=ux/u*9;s.bvz=uz/u*9;s.bvy=2.5;s.lock=.6;s.last=i;s.ignore={who:i,until:s.now+KICKER_GRACE};r.cool=L.recover;
 });
}
const BALL_PATCHES=(()=>{const g=new THREE.IcosahedronGeometry(1,0),p=g.attributes.position,seen=new Map(),out=[];for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).normalize(),key=v.toArray().map(n=>n.toFixed(3)).join();if(seen.has(key))continue;seen.set(key,1);out.push({position:v.clone().multiplyScalar(.2405).toArray(),quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),v)})}g.dispose();return out})();
const ROLL_AXIS=new THREE.Vector3(),ROLL_STEP=new THREE.Quaternion();
const GOAL_WIDTH=2.4,GOAL_HEIGHT=1.55,GOAL_DEPTH=.9;
const GOAL_NET_GEOMETRY=(()=>{const points=[],w=GOAL_WIDTH/2,h=GOAL_HEIGHT,d=GOAL_DEPTH,step=.2;const line=(a,b)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),n=Math.max(1,Math.ceil(A.distanceTo(B)/.1));for(let k=0;k<n;k++)points.push(A.clone().lerp(B,k/n),A.clone().lerp(B,(k+1)/n))};
 for(let x=-w;x<=w+.001;x+=step){line([x,0,d],[x,h,d]);line([x,h,0],[x,h,d])}
 for(let y=0;y<=h+.001;y+=step)line([-w,y,d],[w,y,d]);
 for(const side of [-w,w]){for(let y=0;y<=h+.001;y+=step)line([side,y,0],[side,y,d]);for(let z=0;z<=d+.001;z+=step)line([side,0,z],[side,h,z])}
 for(let z=0;z<=d+.001;z+=step)line([-w,h,z],[w,h,z]);
 return new THREE.BufferGeometry().setFromPoints(points)})();
// The back of the net bulges where the ball hits and wobbles back. The frame edges stay pinned.
const sat=v=>Math.min(1,Math.max(0,v));
function Goal({i,active=true,lives=1,maxLives=1,state}){
 const net=useMemo(()=>GOAL_NET_GEOMETRY.clone(),[]),base=useMemo(()=>net.attributes.position.array.slice(),[net]),dirty=useRef(false);
 useFrame(()=>{const s=state?.current,rp=s?.ripples?.[i],pos=net.attributes.position,arr=pos.array,age=rp?s.now-rp.at:9;
  if(age<0||age>1.8){if(dirty.current){arr.set(base);pos.needsUpdate=true;dirty.current=false}return}
  const w=GOAL_WIDTH/2,amp=rp.amp*Math.exp(-age*3)*Math.cos(age*14);
  for(let k=0;k<arr.length;k+=3){const x=base[k],y=base[k+1],z=base[k+2],pin=sat((w-Math.abs(x))/.45)*sat(y/.3)*sat((GOAL_HEIGHT-y)/.35)*sat(z/GOAL_DEPTH*1.3);
   arr[k+2]=pin>0?z+amp*pin*Math.exp(-((x-rp.x)**2+(y-rp.y)**2)/.5):z}
  pos.needsUpdate=true;dirty.current=true});
 const [x,z]=GOALS[i];const label=['NORTH · RED','EAST · BLUE','SOUTH · YOUR GOAL','WEST · GOLD'][i];
 const colors=['#e6534c','#4b9bff','#36df89','#f8cf51'];
 return <group position={[x,0,z]} rotation={[0,[Math.PI,Math.PI/2,0,-Math.PI/2][i],0]}>
  {[-GOAL_WIDTH/2,GOAL_WIDTH/2].map((offset,n)=><mesh key={n} position={[offset,GOAL_HEIGHT/2,0]} castShadow receiveShadow><cylinderGeometry args={[.075,.085,GOAL_HEIGHT,10]}/><meshStandardMaterial color="#8b542e" roughness={.85}/></mesh>)}
  <mesh position={[0,GOAL_HEIGHT,0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.075,.075,GOAL_WIDTH+.13,10]}/><meshStandardMaterial color="#a66d3c" roughness={.8}/></mesh>
  {[-GOAL_WIDTH/2,GOAL_WIDTH/2].map((offset,n)=><mesh key={'rail'+n} position={[offset,GOAL_HEIGHT,GOAL_DEPTH/2]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.04,.04,GOAL_DEPTH,8]}/><meshStandardMaterial color="#79502d" roughness={.9}/></mesh>)}
  <lineSegments geometry={net}><lineBasicMaterial color="#f4eee2" transparent opacity={.7} depthWrite={false}/></lineSegments>
  <Billboard position={[0,2.03,0]}><Text fontSize={.3} color="white" outlineWidth={.035} outlineColor="#161b18" anchorX="center">{maxLives>1?`${label}  ${'●'.repeat(Math.max(0,lives))}${'○'.repeat(maxLives-Math.max(0,lives))}`:label}</Text></Billboard>
  {active&&<mesh position={[0,.018,-.55]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.55,.59,40,1,0,Math.PI]}/><meshBasicMaterial color={colors[i]} side={THREE.DoubleSide} transparent opacity={.65}/></mesh>}
 </group>
}
// Dust puffs and grass flecks drawn as soft points. Each arena surface has its own colours.
const SURFACE_FX={accra:{grass:true,dust:'#8f8366',bits:['#4c8a2c','#6aa83f','#3a6b25','#7cb84e']},kumasi:{dust:'#c2bcb0',bits:['#8d877c','#a39d92']},
 village:{dust:'#b4673f',bits:['#7d3f22','#94502c']},school:{dust:'#b8714a',bits:['#7d4528','#985532']},london:{dust:'#8e9395',bits:['#4f5456','#686d6f']}};
const FX_MAX=360,FX_SIZE=new THREE.Vector2();
const FX_VERTEX='attribute vec3 aColor;attribute float aLife;attribute float aSize;attribute float aKind;uniform float uScale;varying vec3 vColor;varying float vLife;varying float vKind;void main(){vColor=aColor;vLife=aLife;vKind=aKind;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aLife>0.?aSize*(aKind<.5?1.+(1.-aLife)*1.7:1.)*uScale/max(.1,-mv.z):0.;}';
const FX_FRAGMENT='varying vec3 vColor;varying float vLife;varying float vKind;void main(){float r=length(gl_PointCoord-.5);if(r>.5||vLife<=0.)discard;float a=vKind<.5?smoothstep(.5,.08,r)*vLife*.5:min(1.,vLife*3.);gl_FragColor=vec4(vColor,a);\n#include <colorspace_fragment>\n}';
function GroundFx({surface}){
 const fx=SURFACE_FX[surface]||SURFACE_FX.kumasi;
 const sim=useMemo(()=>({pos:new Float32Array(FX_MAX*3),vel:new Float32Array(FX_MAX*3),col:new Float32Array(FX_MAX*3),life:new Float32Array(FX_MAX),span:new Float32Array(FX_MAX),size:new Float32Array(FX_MAX),kind:new Float32Array(FX_MAX),next:0}),[]);
 const geometry=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(sim.pos,3));g.setAttribute('aColor',new THREE.BufferAttribute(sim.col,3));g.setAttribute('aLife',new THREE.BufferAttribute(new Float32Array(FX_MAX),1));g.setAttribute('aSize',new THREE.BufferAttribute(sim.size,1));g.setAttribute('aKind',new THREE.BufferAttribute(sim.kind,1));return g},[sim]);
 const material=useMemo(()=>new THREE.ShaderMaterial({vertexShader:FX_VERTEX,fragmentShader:FX_FRAGMENT,uniforms:{uScale:{value:500}},transparent:true,depthWrite:false}),[]);
 const colors=useMemo(()=>({dust:new THREE.Color(fx.dust),bits:fx.bits.map(c=>new THREE.Color(c))}),[fx]);
 useEffect(()=>{fxQueue.length=0;sim.life.fill(0)},[surface,sim]);
 useFrame(({gl,camera},delta)=>{const d=Math.min(delta,.05),rnd=(a,b)=>a+Math.random()*(b-a);
  const spawn=(x,y,z,vx,vy,vz,kind,color,size,span)=>{const p=sim.next;sim.next=(p+1)%FX_MAX;sim.pos.set([x,y,z],p*3);sim.vel.set([vx,vy,vz],p*3);sim.col.set([color.r,color.g,color.b],p*3);sim.kind[p]=kind;sim.size[p]=size;sim.life[p]=sim.span[p]=span};
  for(const e of fxQueue.splice(0)){const along=e.kind==='kick'?1.6:e.kind==='slide'?2.2:0;
   for(let n=0;n<e.n;n++){const a=Math.random()*Math.PI*2,out=rnd(.4,1.4),bit=colors.bits[Math.floor(Math.random()*colors.bits.length)];
    const hx=Math.cos(a)*out+e.dx*along*rnd(.3,1),hz=Math.sin(a)*out+e.dz*along*rnd(.3,1);
    if(fx.grass&&e.kind!=='step')spawn(e.x+rnd(-.15,.15),.05,e.z+rnd(-.15,.15),hx,rnd(1.8,e.kind==='slide'?3:4.2),hz,1,bit,rnd(.045,.075),rnd(.7,1.1));
    else if(e.kind!=='step'&&n%2)spawn(e.x+rnd(-.12,.12),.04,e.z+rnd(-.12,.12),hx*.8,rnd(1.2,2.8),hz*.8,1,bit,rnd(.03,.05),rnd(.5,.8));
    if(!fx.grass||n%3===0)spawn(e.x+rnd(-.2,.2),.12,e.z+rnd(-.2,.2),hx*.45,rnd(.2,.7),hz*.45,0,colors.dust,e.kind==='step'?rnd(.18,.26):rnd(.28,.42),e.kind==='step'?rnd(.35,.5):rnd(.6,1))}}
  const life=geometry.attributes.aLife.array;let alive=false;
  for(let p=0;p<FX_MAX;p++){if(sim.life[p]<=0){life[p]=0;continue}alive=true;sim.life[p]-=d;const i=p*3,v=sim.vel,q=sim.pos;
   if(sim.kind[p]>.5){v[i+1]-=9.8*d;q[i]+=v[i]*d;q[i+1]+=v[i+1]*d;q[i+2]+=v[i+2]*d;if(q[i+1]<.02){q[i+1]=.02;v[i]*=.5;v[i+1]=0;v[i+2]*=.5}}
   else{const k=Math.exp(-2.6*d);v[i]*=k;v[i+2]*=k;v[i+1]=v[i+1]*k+.18*d;q[i]+=v[i]*d;q[i+1]+=v[i+1]*d;q[i+2]+=v[i+2]*d}
   life[p]=Math.max(0,sim.life[p]/sim.span[p])}
  if(alive||sim.wasAlive){for(const n of ['position','aColor','aLife','aSize','aKind'])geometry.attributes[n].needsUpdate=true}sim.wasAlive=alive;
  gl.getDrawingBufferSize(FX_SIZE);material.uniforms.uScale.value=FX_SIZE.y/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2))});
 return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2}/>
}
function Scene({arena,playing=false,paused=false,skin,mode='training',onEvent,commands,onlinePlayers=[],shooting,onGoal,onGameOver,round,difficulty='normal',lives=1,jersey,gender,outfit,back,celebration}){const player=useRef(),ball=useRef(),rivals=useRef([]);const state=useRef(freshState(lives,mode));const camTarget=useRef(new THREE.Vector3());useEffect(()=>{state.current=freshState(lives,mode)},[arena,round,difficulty,lives,mode]);useFrame(({camera,size,clock},delta)=>{if(playing&&paused)return;state.current.now=clock.elapsedTime;if(!playing){rivals.current.forEach((g,i)=>{if(!g)return;g.position.set(RIVAL_HOMES[i][0],0,RIVAL_HOMES[i][1]);g.rotation.y=0;g.userData.velocityX=g.userData.velocityZ=0;g.userData.clock=undefined;g.visible=true});if(player.current)player.current.userData.clock=undefined;return}const d=Math.min(delta,.05),s=state.current,c=commands.current;s.level=DIFFICULTY[difficulty]||DIFFICULTY.normal;const frozen=s.pause>0||!!s.over;if(frozen)c.shootRelease=0;if(s.pause>0){s.pause-=d;if(s.pause<=0){if(s.over)onGameOver?.(matchSummary(s));else{resetPlay(s);if(s.pendingEvent){if(s.pendingEvent==='showdown')crowd.chant(.2);onEvent?.(s.pendingEvent);s.pendingEvent=null}}}}if(!frozen){s.elapsed+=d;if(s.timeLeft!==null&&!s.golden){s.timeLeft=Math.max(0,s.timeLeft-d);if(s.timeLeft===0)fullTime(s,onEvent)}}c.timeLeft=s.timeLeft;c.golden=s.golden;const dx=frozen?0:(c.right?1:0)-(c.left?1:0)+(c.stickX||0),dz=frozen?0:(c.down?1:0)-(c.up?1:0)+(c.stickY||0),len=Math.max(1,Math.hypot(dx,dz)),speed=s.boost>0?9:c.sprint&&!s.tired&&Math.hypot(dx,dz)>.1?8:5;if(speed>5){s.stamina=Math.max(0,s.stamina-d*STAMINA_DRAIN);if(s.stamina<=0)s.tired=true}else{s.stamina=Math.min(1,s.stamina+d*STAMINA_REGEN);if(s.tired&&s.stamina>=.35)s.tired=false}c.stamina=s.stamina;c.tired=s.tired;s.vx=THREE.MathUtils.damp(s.vx,dx/len*speed,10,d);s.vz=THREE.MathUtils.damp(s.vz,dz/len*speed,10,d);s.tackleCool-=d;s.skillCool-=d;if(s.boost>0)s.boost-=d;
// SKILL: with the ball, a step-over feint (fools rivals within 3 m), or a knock-on past them when sprinting.
if(c.skill&&!s.skillHeld&&s.attached&&!frozen&&s.skillCool<=0){s.skillCool=SKILL_COOLDOWN;sfx.skill();
 const fx=Math.sin(s.rot),fz=Math.cos(s.rot),rx=-Math.cos(s.rot),rz=Math.sin(s.rot);
 if(c.sprint&&!s.tired&&Math.hypot(s.vx,s.vz)>5.5){s.attached=false;s.knockOn=true;burst(s.bx,s.bz,4,'kick',fx,fz);s.ignore={who:'player',until:s.now+KICKER_GRACE};s.bvx=fx*10;s.bvz=fz*10;s.bvy=.4;s.lock=.3;s.last='player';s.boost=BOOST_SECONDS;s.stamina=Math.max(0,s.stamina-.1);s.stats.skills=(s.stats.skills||0)+1}
 else{const steer=(c.right?1:0)-(c.left?1:0)+(c.stickX||0),lateral=steer*rx+((c.down?1:0)-(c.up?1:0)+(c.stickY||0))*rz,dir=Math.abs(lateral)>.2?Math.sign(lateral):(s.feintSide=-(s.feintSide||1));
  s.feint={t:FEINT_SECONDS,x:rx*dir,z:rz*dir};s.stats.skills=(s.stats.skills||0)+1;
  s.rivals.forEach((rv,i)=>{if(!s.alive[RIVAL_GOALS[i]]||s.rc===i||Math.hypot(rv.x-s.x,rv.z-s.z)>3)return;rv.fooledUntil=s.now+.75;rv.vx=-rx*dir*4.5+fx*1.5;rv.vz=-rz*dir*4.5+fz*1.5;rv.cool=Math.max(rv.cool,.75)})}}
s.skillHeld=!!c.skill;
if(s.feint){s.feint.t-=d;s.vx=s.feint.x*7+Math.sin(s.rot)*2;s.vz=s.feint.z*7+Math.cos(s.rot)*2;if(s.feint.t<=0)s.feint=null}if(c.shootAt&&c.shootAt!==s.seenPress){s.seenPress=c.shootAt;if(!s.attached&&!frozen&&s.tackleCool<=0){s.slide=SLIDE_SECONDS;s.tackleCool=TACKLE_COOLDOWN;s.cancelShot=c.tackleShootAt=c.shootAt;s.kickAt=s.now;s.kickType='tackle';sfx.tackle();burst(s.x,s.z,7,'slide',Math.sin(s.rot),Math.cos(s.rot))}}if(s.slide>0){s.slide-=d;if(Math.random()<.45)burst(s.x,s.z,1,'slide',Math.sin(s.rot),Math.cos(s.rot));s.vx=Math.sin(s.rot)*SLIDE_SPEED;s.vz=Math.cos(s.rot)*SLIDE_SPEED;if(!s.attached&&s.by<.6&&Math.hypot(s.bx-s.x,s.bz-s.z)<1.15){if(s.rc>=0){s.rivals[s.rc].cool=1.3;s.rc=-1}s.attached=true;s.bAng=s.rot;s.last='player';s.slide=0;s.stats.tackles++;s.stealCool=.8;sfx.save();shake(s,.006)}}c.hasBall=s.attached;if(s.attached||s.rc>=0){s.kickoff=false;s.curve=0;s.knockOn=false}s.x=THREE.MathUtils.clamp(s.x+s.vx*d,-10.5,10.5);s.z=THREE.MathUtils.clamp(s.z+s.vz*d,-10.5,10.5);if(!s.feint&&Math.hypot(s.vx,s.vz)>.2)s.rot=Math.atan2(s.vx,s.vz);if(player.current){player.current.visible=s.alive[2];player.current.position.set(s.x,0,s.z);player.current.userData.velocityX=s.vx;player.current.userData.velocityZ=s.vz;player.current.rotation.y=s.rot;Object.assign(player.current.userData,{clock:s.now,kickAt:s.kickAt,kickType:s.kickType,dribbling:s.attached,celebrateUntil:s.celebrateUntil})}if(c.shootRelease){const q=s.attached&&!s.pendingShot&&c.shootAt!==s.cancelShot?THREE.MathUtils.clamp((c.shootRelease-c.shootAt)/SHOT_CHARGE_MS,0,1):-1;c.shootRelease=0;if(q>=0){const aim=aimAssist(s,c.aimAngle??s.rot),lateral=s.vx*Math.cos(aim)-s.vz*Math.sin(aim),curve=((c.curveLeft?1:0)-(c.curveRight?1:0))*CURVE_POWER+THREE.MathUtils.clamp(lateral/5,-1,1)*.6;s.rot=aim;s.pendingShot={q,at:s.now+KICK_LEAD,aim,curve};s.kickAt=s.now;s.kickType=Math.hypot(s.vx,s.vz)>1?'strike':'penalty'}c.aimAngle=undefined}if(s.pendingShot&&!s.attached)s.pendingShot=null;if(s.pendingShot&&s.now>=s.pendingShot.at){const{q,aim,curve}=s.pendingShot;s.pendingShot=null;s.attached=false;const speed=9+11*q;s.bvx=Math.sin(aim)*speed;s.bvz=Math.cos(aim)*speed;s.curve=curve;s.bvy=.6+5.2*q*q;s.last='player';s.stats.shots++;s.ignore={who:'player',until:s.now+KICKER_GRACE};sfx.kick(.4+.6*q);burst(s.bx,s.bz,Math.round(4+9*q),'kick',Math.sin(aim),Math.cos(aim));if(q>.6)shake(s,.005+.012*(q-.6)/.4);shooting?.()}if(s.attached){const run=Math.hypot(s.vx,s.vz),turn=((s.rot-s.bAng+Math.PI*3)%(Math.PI*2))-Math.PI;s.bAng+=turn*(1-Math.exp(-12*d));s.touch+=run*d*1.6;const reach=.62+(run>1?.28*Math.abs(Math.sin(s.touch)):0);s.bx=s.x+Math.sin(s.bAng)*reach;s.bz=s.z+Math.cos(s.bAng)*reach;s.by=0;s.bvy=0}else if(!frozen&&s.rc<0){if(s.curve){const t=s.curve*d*(s.by>0?1:.5),ct=Math.cos(t),st=Math.sin(t),vx=s.bvx;s.bvx=vx*ct+s.bvz*st;s.bvz=s.bvz*ct-vx*st;s.curve*=Math.exp(-1.2*d);if(Math.abs(s.curve)<.02||Math.hypot(s.bvx,s.bvz)<2)s.curve=0}s.bx+=s.bvx*d;s.bz+=s.bvz*d;s.by+=s.bvy*d;s.bvy-=9.8*d;if(s.by<=0){s.by=0;if(s.bvy<-1.5){sfx.bounce(-s.bvy/6);if(s.bvy<-3)burst(s.bx,s.bz,Math.min(8,Math.round(-s.bvy)),'bounce');s.bvy*=-.45}else s.bvy=0}const drag=Math.exp((s.by>0?-.1:-.7)*d);s.bvx*=drag;s.bvz*=drag;
// Players are solid: a loose ball below head height bounces off any body still on the court, except the kicker for a
// moment after the kick. A slow ball reaching you is left alone so you can collect it.
{const bodies=[];if(s.alive[2])bodies.push(['player',s.x,s.z]);s.rivals.forEach((rv,k)=>{if(s.alive[RIVAL_GOALS[k]])bodies.push([k,rv.x,rv.z])});
 for(const[who,px,pz]of bodies){if(s.ignore&&s.ignore.who===who&&s.now<s.ignore.until)continue;if(s.by+BALL_R>BODY_HEIGHT)continue;if(who==='player'&&Math.hypot(s.bvx,s.bvz)<4&&!s.knockOn)continue;
  const ox=s.bx-px,oz=s.bz-pz,dist=Math.hypot(ox,oz),reach=BODY_R+BALL_R;if(dist>=reach||dist<1e-4)continue;const nx=ox/dist,nz=oz/dist,vn=s.bvx*nx+s.bvz*nz;
  s.bx=px+nx*reach;s.bz=pz+nz*reach;if(vn<0){s.bvx-=1.35*vn*nx;s.bvz-=1.35*vn*nz;s.curve=0;if(-vn>3)sfx.bounce(Math.min(1,-vn/12))}}}
s.lock-=d;if(s.lock<=0&&s.by<.5&&Math.hypot(s.bx-s.x,s.bz-s.z)<.85&&(Math.hypot(s.bvx,s.bvz)<4||s.knockOn)){s.attached=true;s.bAng=Math.atan2(s.bx-s.x,s.bz-s.z);s.last='player'}// Goal frames: posts and crossbar rebound the ball, nets catch it. A goal needs the whole ball over the line, between the posts and under the bar.
for(let i=0;i<4;i++){const[gx,gz]=GOALS[i],ox=gx/11,oz=gz/11,W=GOAL_WIDTH/2,rx=s.bx-gx,rz=s.bz-gz;let lz=rx*ox+rz*oz,lx=-rx*oz+rz*ox;if(lz<-1.5||lz>GOAL_DEPTH+1||Math.abs(lx)>W+1.5)continue;
 let vOut=s.bvx*ox+s.bvz*oz,vSide=-s.bvx*oz+s.bvz*ox,hit=0;const reach=POST_R+BALL_R;
 if(s.by+BALL_R<GOAL_HEIGHT+BALL_R)for(const px of [-W,W]){const dx=lx-px,dist=Math.hypot(dx,lz);if(dist<reach&&dist>1e-4){const nx=dx/dist,nz=lz/dist;lx=px+nx*reach;lz=nz*reach;const vn=vSide*nx+vOut*nz;if(vn<0){vSide-=1.6*vn*nx;vOut-=1.6*vn*nz;hit=Math.max(hit,-vn)}}}
 if(Math.abs(lx)<W){const dy=s.by+BALL_R-GOAL_HEIGHT,dist=Math.hypot(lz,dy);if(dist<reach&&dist>1e-4){const nz=lz/dist,ny=dy/dist;lz=nz*reach;s.by=GOAL_HEIGHT+ny*reach-BALL_R;const vn=vOut*nz+s.bvy*ny;if(vn<0){vOut-=1.6*vn*nz;s.bvy-=1.6*vn*ny;hit=Math.max(hit,-vn)}}}
 const cy=s.by+BALL_R;
 if(lz>0&&lz<GOAL_DEPTH+BALL_R&&cy<GOAL_HEIGHT+BALL_R){
  if(Math.abs(lx)>W-BALL_R&&Math.abs(lx)<W+BALL_R&&cy<GOAL_HEIGHT){const side=Math.sign(lx),inside=Math.abs(lx)<W;lx=side*(inside?W-BALL_R:W+BALL_R);if(inside?vSide*side>0:vSide*side<0)vSide*=-.25}
  if(Math.abs(lx)<W){if(lz>GOAL_DEPTH-BALL_R&&cy<GOAL_HEIGHT){lz=GOAL_DEPTH-BALL_R;if(vOut>0)vOut*=-.2}
   if(lz>reach){if(s.bvy>0&&cy>GOAL_HEIGHT-BALL_R&&cy<GOAL_HEIGHT){s.by=GOAL_HEIGHT-2*BALL_R;s.bvy*=-.2}else if(s.bvy<=0&&cy>=GOAL_HEIGHT&&cy<GOAL_HEIGHT+BALL_R){s.by=GOAL_HEIGHT;s.bvy=-s.bvy*.25;vOut*=.6;vSide*=.6}}}}
 s.bx=gx+lz*ox-lx*oz;s.bz=gz+lz*oz+lx*ox;s.bvx=vOut*ox-vSide*oz;s.bvz=vOut*oz+vSide*ox;if(hit>2){sfx.post(Math.min(1,hit/12));shake(s,Math.min(.02,hit*.0016));if(hit>4)ooh(s,Math.min(1,hit/10))}
 else if(s.alive[i]&&lz>0&&lz<.5&&vOut>6&&s.last!==null&&s.last!==(i===2?'player':RIVAL_GOALS.indexOf(i))&&((Math.abs(lx)>W+BALL_R&&Math.abs(lx)<W+1.2&&s.by+BALL_R<GOAL_HEIGHT+.3)||(Math.abs(lx)<W+.4&&s.by>GOAL_HEIGHT&&s.by<GOAL_HEIGHT+.9)))ooh(s,.7);
 if(s.alive[i]&&lz>BALL_R&&Math.abs(lx)<W-BALL_R*.5&&s.by+BALL_R<GOAL_HEIGHT){const owner=i===2?'player':RIVAL_GOALS.indexOf(i),scored=s.last!==null&&s.last!==owner;if(scored){s.lives[i]--;const out=s.lives[i]<=0;if(s.last==='player'){s.stats.goals++;if(Math.abs(s.curve||0)>.25)s.stats.curlGoals++;if(out)s.stats.knockouts++}if(out){s.alive[i]=false;s.order.push(i);const left=[0,1,2,3].filter(g=>s.alive[g]);if(i===2)s.over={result:'lost',by:s.last};else if(left.length===1&&left[0]===2)s.over={result:'won'};else if(s.mode==='ffa'&&left.length===2&&!s.showdown){s.showdown=true;left.forEach(g=>{s.lives[g]=1});s.pendingEvent='showdown'}}{const tb=Math.max(0,GOAL_DEPTH-BALL_R-lz)/Math.max(vOut,1),hx=THREE.MathUtils.clamp(lx+vSide*tb,-W+.3,W-.3),hy=THREE.MathUtils.clamp(s.by+BALL_R+s.bvy*tb,.3,GOAL_HEIGHT-.3),hitAt=s.now+Math.min(tb,.15),depth=GOAL_DEPTH-BALL_R,
   speed=Math.hypot(vOut,vSide,s.bvy),ripple={x:-hx,y:hy,amp:Math.min(.42,.1+speed*.018)},hit={x:gx+depth*ox-hx*oz,z:gz+depth*oz+hx*ox};s.goalHit=hit;s.ripples[i]={...ripple,at:hitAt};shake(s,Math.min(.022,.006+speed*.0009));
   s.replay=null;if(s.last==='player'||i===2||out){const tape=s.tape||[],now=s.now,cross=snapshot(s,ball.current),from=Math.max(tape.length?tape[0].t:now,now-REPLAY_BEFORE);
    tape.push(cross,{...cross,t:hitAt+.001,bx:hit.x,bz:hit.z,by:hy-BALL_R},{...cross,t:now+REPLAY_AFTER,bx:hit.x,bz:hit.z,by:0});
    s.replay={goal:i,tape,from,to:now+REPLAY_AFTER,hitAt,ripple,start:now+REPLAY_DELAY,skipFrom:c.shootAt,side:Math.sign((-tape[0].bx*oz+tape[0].bz*ox)-(-gx*oz+gz*ox))||1,pause:REPLAY_DELAY+(now+REPLAY_AFTER-from)/REPLAY_RATE+.1}}}
  onGoal?.(i,s.last,s.lives[i]);sfx.goal();crowd.cheer();if(s.last==='player'||out)crowd.chant(1.1);s.cheer={side:s.last==='player'?2:RIVAL_GOALS[s.last],until:s.now+2.2};if(s.last==='player')s.celebrateUntil=s.now+2.2;else if(s.rivals[s.last])s.rivals[s.last].celebrateUntil=s.now+1.6}else sfx.save();s.pause=scored?(s.replay?s.replay.pause:1.6):.7;{const gh=scored&&s.goalHit;s.bx=gh?gh.x:gx*1.05;s.bz=gh?gh.z:gz*1.05}s.by=0;s.bvx=s.bvz=s.bvy=0;break}}if(Math.abs(s.bx)>11.95){s.bx=Math.sign(s.bx)*11.95;sfx.bounce(Math.abs(s.bvx)/10);s.bvx*=-.6}if(Math.abs(s.bz)>11.95){s.bz=Math.sign(s.bz)*11.95;sfx.bounce(Math.abs(s.bvz)/10);s.bvz*=-.6}}if(frozen)s.rivals.forEach(r=>{r.vx=r.vz=0});else if(!onlinePlayers.length)stepRivals(s,d);s.rivals.forEach((r,i)=>{const g=rivals.current[i];if(!g)return;g.visible=s.alive[RIVAL_GOALS[i]];g.position.set(r.x,0,r.z);g.userData.velocityX=r.vx;g.userData.velocityZ=r.vz;Object.assign(g.userData,{clock:s.now,kickAt:r.kickAt,kickType:r.kickType,dribbling:s.rc===i,celebrateUntil:r.celebrateUntil});g.rotation.y=Math.hypot(r.vx,r.vz)>.2?Math.atan2(r.vx,r.vz):Math.atan2(s.bx-r.x,s.bz-r.z)});if(ball.current){ball.current.position.set(s.bx,.24+s.by,s.bz);const rollX=s.attached?s.vx:s.bvx,rollZ=s.attached?s.vz:s.bvz;const roll=Math.hypot(rollX,rollZ);if(roll>.01){ROLL_AXIS.set(rollZ,0,-rollX).normalize();ROLL_STEP.setFromAxisAngle(ROLL_AXIS,roll*d/.24);ball.current.quaternion.premultiply(ROLL_STEP)}}// Narrow (portrait) screens get a higher, wider camera so the east and west goals stay in view.
const portrait=THREE.MathUtils.clamp((1.3-size.width/size.height)/.8,0,1),fov=66+28*portrait;if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix()}const target=new THREE.Vector3(s.x*.55*(1-portrait),5.6+12*portrait,s.z+10.5+portrait+(c.sprint?2:0));camera.position.lerp(target,s.cutCam?1:1-Math.exp(-3.5*d));camTarget.current.lerp(new THREE.Vector3(s.x*.75*(1-portrait),1.0,s.z-3.8+5*portrait),s.cutCam?1:1-Math.exp(-5*d));s.cutCam=false;camera.lookAt(camTarget.current);
// Live play is taped (the last couple of seconds) so a goal can be replayed.
if(s.pause<=0&&!s.over){const tape=s.tape||(s.tape=[]);tape.push(snapshot(s,ball.current));while(tape.length>2&&tape[0].t<s.now-REPLAY_BEFORE-.2)tape.shift();
 s.dustT=(s.dustT||0)+d;if(s.dustT>.15){s.dustT=0;if(s.alive[2]&&Math.hypot(s.vx,s.vz)>6.5)burst(s.x,s.z,1,'step');s.rivals.forEach((rv,k)=>{if(s.alive[RIVAL_GOALS[k]]&&Math.hypot(rv.vx,rv.vz)>6)burst(rv.x,rv.z,1,'step')})}}
const rp=s.replay,replaying=!!(rp&&s.pause>0&&s.now>=rp.start);c.replay=replaying;
[player.current,...rivals.current].forEach(g=>{if(g)g.userData.timeScale=replaying?REPLAY_RATE:1});
if(replaying){if(c.shootAt!==rp.skipFrom){s.pause=.001;c.tackleShootAt=s.cancelShot=c.shootAt}
 const first=!rp.shown;rp.shown=true;const t=Math.min(rp.to,rp.from+(s.now-rp.start)*REPLAY_RATE),tape=rp.tape;let k=1;while(k<tape.length-1&&tape[k].t<t)k++;
 const a=tape[k-1],b=tape[k],f=b.t>a.t?THREE.MathUtils.clamp((t-a.t)/(b.t-a.t),0,1):1,L=(p,q)=>p+(q-p)*f;
 if(!rp.rippled&&t>=rp.hitAt){rp.rippled=true;s.ripples[rp.goal]={...rp.ripple,at:s.now};shake(s,.012)}
 const pose=(g,x,z,vx,vz,rot,kickAt,kickType,dribbling,visible)=>{if(!g)return;g.visible=visible;g.position.set(x,0,z);g.rotation.y=rot;Object.assign(g.userData,{velocityX:vx,velocityZ:vz,clock:t,kickAt,kickType,dribbling,celebrateUntil:-1})};
 const bx=L(a.bx,b.bx),bz=L(a.bz,b.bz);
 pose(player.current,L(a.x,b.x),L(a.z,b.z),b.vx,b.vz,a.rot+(((b.rot-a.rot+Math.PI*3)%(Math.PI*2))-Math.PI)*f,b.kickAt,b.kickType,b.attached,b.alive[2]);
 rivals.current.forEach((g,i)=>{const ra=a.rivals[i],rb=b.rivals[i];if(!g||!ra||!rb)return;const x=L(ra.x,rb.x),z=L(ra.z,rb.z);pose(g,x,z,rb.vx,rb.vz,Math.hypot(rb.vx,rb.vz)>.2?Math.atan2(rb.vx,rb.vz):Math.atan2(bx-x,bz-z),rb.kickAt,rb.kickType,b.rc===i,b.alive[RIVAL_GOALS[i]])});
 if(ball.current){ball.current.position.set(bx,.24+L(a.by,b.by),bz);ball.current.quaternion.fromArray(a.q).slerp(REPLAY_Q.fromArray(b.q),f)}
 // A TV-style angle from beside the goal, on the far side from where the attack came, slowly pushing in.
 const[gx,gz]=GOALS[rp.goal],ox=gx/11,oz=gz/11,push=Math.min(1.5,(s.now-rp.start)*.35);
 camera.position.set(gx-ox*(3.4+push*.4)+oz*rp.side*(6.2-push),2.3-push*.25,gz-oz*(3.4+push*.4)-ox*rp.side*(6.2-push));
 if(Math.abs(camera.fov-50)>.01){camera.fov=50;camera.updateProjectionMatrix()}
 const look=new THREE.Vector3(bx*.7+gx*.3,.7,bz*.7+gz*.3);if(first)camTarget.current.copy(look);else camTarget.current.lerp(look,1-Math.exp(-6*d));camera.lookAt(camTarget.current)}
if(s.shake>.0004){const w=s.now*40;camera.rotateZ(Math.sin(w)*s.shake);camera.rotateX(Math.sin(w*1.37+1)*s.shake*.8);camera.rotateY(Math.sin(w*.83+2)*s.shake*.6);s.shake*=Math.exp(-7*d)}});return <><color attach="background" args={['#b9c9d3']}/><fog attach="fog" args={['#cdd6da',38,110]}/><ambientLight intensity={.22}/><hemisphereLight args={['#cfe2ff','#7a5c45',.45]}/><directionalLight position={[14,22,9]} color="#fff0d8" intensity={3.6} castShadow shadow-mapSize={[2048,2048]} shadow-bias={-.0004} shadow-normalBias={.03} shadow-radius={4} shadow-camera-left={-29} shadow-camera-right={29} shadow-camera-top={29} shadow-camera-bottom={-29}/><AssetBoundary><Suspense fallback={null}><ArenaEnvironment arena={arena}/></Suspense></AssetBoundary><AssetBoundary><Suspense fallback={null}><Crowd jersey={jersey} state={state}/></Suspense></AssetBoundary>{playing&&<AssetBoundary><GroundFx surface={arena.id}/></AssetBoundary>}<lineSegments position={[0,.025,0]}><edgesGeometry args={[new THREE.BoxGeometry(24,.01,24)]}/><lineBasicMaterial color="#f4efe6"/></lineSegments><mesh rotation={[-Math.PI/2,0,0]} position={[0,.045,0]}><ringGeometry args={[3.2,3.25,72]}/><meshBasicMaterial color="#eedcbe" side={THREE.DoubleSide}/></mesh>{GOALS.map((g,i)=><Goal key={i} i={i} state={state} active={state.current.alive[i]} lives={state.current.lives[i]} maxLives={lives}/>)}{playing?<group ref={player}><RiggedPlayer gender={gender} skin={skin} {...playerKit(gender,jersey,outfit,back)} back={back} celebration={celebration} animated/></group>:<RiggedPlayer position={[0,0,PLAYER_START[1]]} gender={gender} skin={skin} {...playerKit(gender,jersey,outfit,back)} back={back}/>} {RIVAL_HOMES.map(([x,z],i)=><group key={i} ref={el=>{rivals.current[i]=el}} position={[x,0,z]}><RiggedPlayer {...footballerKit(RIVAL_KITS[i])} skin={RIVAL_SKINS[i]} celebration={RIVAL_CELEBRATIONS[i]} label={`RIVAL ${i+1} · ${RIVAL_STYLES[i].name}`} animated/></group>)}{onlinePlayers.slice(0,3).map(p=><RiggedPlayer key={p.id} position={[p.x||0,0,p.z||0]} gender="male" label={p.name}/>)}<group ref={ball} position={[0,.24,0]}><mesh castShadow><sphereGeometry args={[.24,24,20]}/><meshStandardMaterial color="#f5f1e7" roughness={.6}/></mesh>{BALL_PATCHES.map((p,i)=><mesh key={i} position={p.position} quaternion={p.quaternion}><circleGeometry args={[.085,5]}/><meshStandardMaterial color="#202b32" roughness={.6}/></mesh>)}</group>{!playing&&<OrbitControls enablePan={false} target={[0,0,0]} maxPolarAngle={1.35} minDistance={8} maxDistance={32}/>}</>}
// Essentials (players, their moves): a message with Try again in place of the 3D view.
class SceneBoundary extends React.Component{
 state={error:null,attempt:0};
 static getDerivedStateFromError(error){return{error}}
 componentDidCatch(error){console.error(error)}
 retry=()=>{forgetFailedAsset(this.state.error);this.setState(v=>({error:null,attempt:v.attempt+1}))};
 render(){if(!this.state.error)return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  return <div className="scene-error" role="alert"><strong>Couldn't load the game</strong><p>Check your connection, then try again.</p><div className="button-row"><button className="btn small" onClick={this.retry}>Try again</button>{this.state.attempt>0&&<button className="btn small alt" onClick={()=>location.reload()}>Reload page</button>}</div></div>}}
function Arena3D({arena,playing=false,paused=false,skin,mode,onEvent,highQuality=HIGH_QUALITY,commands,onlinePlayers,shooting,onGoal,onGameOver,round,difficulty,lives,jersey,gender,outfit,back,celebration}){return <SceneBoundary><Canvas shadows="soft" camera={{position:[0,8.5,17],fov:66}} dpr={[1,1.7]} gl={{antialias:true}}><Scene arena={arena} playing={playing} paused={paused} skin={skin} mode={mode} onEvent={onEvent} commands={commands} onlinePlayers={onlinePlayers} shooting={shooting} onGoal={onGoal} onGameOver={onGameOver} round={round} difficulty={difficulty} lives={lives} jersey={jersey} gender={gender} outfit={outfit} back={back} celebration={celebration}/>{highQuality&&<EffectComposer multisampling={4}><N8AO halfRes aoRadius={1.4} intensity={2.4} distanceFalloff={1.2}/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Vignette offset={.32} darkness={.42}/></EffectComposer>}</Canvas></SceneBoundary>}
// Phone and tablet controls drawn over the court: a drag joystick on the left, SHOOT (hold to power) and SPRINT on the right.
const JOYSTICK_RADIUS=48;
function enterLandscape(){const el=document.documentElement,request=el.requestFullscreen||el.webkitRequestFullscreen;if(!request)return;Promise.resolve(request.call(el)).then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{})}
function exitLandscape(){try{screen.orientation?.unlock?.()}catch{}if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
function usePortrait(){const query='(orientation: portrait)';const [portrait,setPortrait]=useState(()=>window.matchMedia(query).matches);useEffect(()=>{const m=window.matchMedia(query),on=()=>setPortrait(m.matches);m.addEventListener('change',on);window.addEventListener('resize',on);window.addEventListener('orientationchange',on);return()=>{m.removeEventListener('change',on);window.removeEventListener('resize',on);window.removeEventListener('orientationchange',on)}},[]);return portrait}
const capture=e=>{try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}};
function useTouchLayout(){const query='(pointer: coarse), (max-width: 700px)';const [touch,setTouch]=useState(()=>window.matchMedia(query).matches);useEffect(()=>{const m=window.matchMedia(query),on=()=>setTouch(m.matches);m.addEventListener('change',on);window.addEventListener('resize',on);return()=>{m.removeEventListener('change',on);window.removeEventListener('resize',on)}},[]);return touch}
function TouchControls({commands}){
 const knob=useRef(null),pointer=useRef(null),shootButton=useRef(null);useEffect(()=>{let id;const tick=()=>{const b=shootButton.current,label=commands.current.hasBall===false?'TACKLE':'SHOOT';if(b&&b.textContent!==label){b.textContent=label;b.classList.toggle('tackle',label==='TACKLE')}id=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(id)},[]);
 const move=(e,base)=>{const rect=base.getBoundingClientRect();let x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2);const d=Math.hypot(x,y);if(d>JOYSTICK_RADIUS){x*=JOYSTICK_RADIUS/d;y*=JOYSTICK_RADIUS/d}knob.current.style.transform=`translate(${x}px,${y}px)`;commands.current.stickX=x/JOYSTICK_RADIUS;commands.current.stickY=y/JOYSTICK_RADIUS};
 const end=()=>{pointer.current=null;knob.current.style.transform='';commands.current.stickX=commands.current.stickY=0};
 const swipe=useRef(null);
 // Swiping across SHOOT aims the shot in the swipe direction (screen up = north), independent of running direction.
 const shootControls={onPointerDown:e=>{e.preventDefault();capture(e);swipe.current={x:e.clientX,y:e.clientY};setCommand(commands.current,'shoot',true)},onPointerUp:e=>{const start=swipe.current;swipe.current=null;if(start){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>28)commands.current.aimAngle=Math.atan2(dx,dy)}setCommand(commands.current,'shoot',false)},onPointerCancel:()=>{swipe.current=null;setCommand(commands.current,'shoot',false)},onContextMenu:e=>e.preventDefault()};
 const hold=action=>({onPointerDown:e=>{e.preventDefault();capture(e);setCommand(commands.current,action,true)},onPointerUp:()=>setCommand(commands.current,action,false),onPointerCancel:()=>setCommand(commands.current,action,false),onContextMenu:e=>e.preventDefault()});
 useEffect(()=>()=>{const c=commands.current;c.stickX=c.stickY=0},[]);
 return <div className="touch-controls">
  <div className="joystick" aria-label="Move" onPointerDown={e=>{e.preventDefault();sfx.unlock();pointer.current=e.pointerId;capture(e);move(e,e.currentTarget)}} onPointerMove={e=>{if(pointer.current===e.pointerId)move(e,e.currentTarget)}} onPointerUp={end} onPointerCancel={end}><i ref={knob}/></div>
  <div className="touch-buttons"><button className="touch-btn skill" aria-label="Skill move" {...hold('skill')}>SKILL</button><button className="touch-btn sprint" aria-label="Sprint" {...hold('sprint')}>SPRINT</button><button ref={shootButton} className="touch-btn shoot" aria-label="Shoot with the ball (swipe to aim), tackle without it" {...shootControls}>SHOOT</button></div>
 </div>
}
// Plays the chosen celebration once whenever previewKey changes.
function CelebrationPreview({target,previewKey}){const start=useRef(false);useEffect(()=>{if(previewKey)start.current=true},[previewKey]);
 useFrame(({clock})=>{const g=target.current;if(!g)return;g.userData.clock=clock.elapsedTime;if(start.current){g.userData.celebrateUntil=clock.elapsedTime+2.6;start.current=false}});return null}
function PlayerShowcase({jersey,gender,skin,interactive=false,outfit,back,celebration,previewKey=0}){
 const kit=playerKit(gender,jersey,outfit,back),pose=useRef();
 return <SceneBoundary><Canvas className="hero-player-canvas" shadows camera={{position:[0,1.05,3.4],fov:34}} dpr={[1,1.7]} gl={{alpha:true,antialias:true}} onCreated={({camera})=>camera.lookAt(0,.92,0)}>
  <ambientLight intensity={1.1}/><directionalLight position={[2,4,3]} intensity={2}/>
  <Suspense fallback={null}><group ref={pose} rotation={[0,interactive?0:-.35,0]}><RiggedPlayer label="" gender={gender} skin={skin} {...kit} back={back} celebration={celebration}/></group></Suspense>{interactive&&<CelebrationPreview target={pose} previewKey={previewKey}/>}
  {interactive&&<><ContactShadows position={[0,0,0]} opacity={.55} scale={3.2} blur={2.4} far={1.6}/><OrbitControls target={[0,.92,0]} enablePan={false} enableZoom={false} minPolarAngle={Math.PI/2.15} maxPolarAngle={Math.PI/2.15} autoRotate autoRotateSpeed={.9}/></>}
 </Canvas></SceneBoundary>
}
// Locker options. Skin tones apply to the footballer model.
const SKIN_TONES=[['#45291a','Deep'],['#53321f','Ebony'],['#5e3a22','Mahogany'],['#6b4126','Rich brown'],['#8a5634','Warm brown'],['#a8713f','Caramel']];
const SHORTS_COLORS=[['default','White'],['#16181d','Black'],['#fcd116','Gold'],['#006b3f','Green'],['#ce1126','Red'],['#1d3f8f','Navy']];
const SOCKS_COLORS=[['default','Match kit'],['#f4f4f4','White'],['#16181d','Black'],['#fcd116','Gold'],['#006b3f','Green'],['#ce1126','Red']];
const BOOTS_COLORS=[['default','Black'],['#f4f4f4','White'],['#ffcf1f','Gold'],['#39ff6a','Neon'],['#ff4fa3','Pink'],['#2f7bff','Blue'],['#ff6a1f','Orange']];
const JERSEYS=[[GHANA,'Ghana Black Stars'],['#29bf7b','Green'],['#d43a3a','Red'],['#367ddc','Blue'],['#efc33b','Gold'],['#a46ce8','Purple'],['#16181d','Midnight'],['#f4f4f4','Clean white'],['#ff7a1a','Sunset orange']];
const rankFor=wins=>wins>=6?'Champion of the Streets':wins>=3?'Corner Captain':wins>=1?'Street Baller':'Rookie';
const loadSetting=(key,fallback,valid)=>{try{const v=localStorage.getItem(key);return v!==null&&valid(v)?v:fallback}catch{return fallback}};
// Locker options by kind, for unlock checks and the match-end "Unlocked" list.
const unlockOptions=()=>({jersey:JERSEYS,shorts:SHORTS_COLORS,socks:SOCKS_COLORS,boots:BOOTS_COLORS,celebration:CELEBRATIONS});
function unlockLabels(from,to){const list=unlocksBetween(from,to,unlockOptions()),out=[];
 for(const kind of ['shorts','socks'])if(list.some(u=>u.kind===kind))out.push(`All ${kind} colours`);
 for(const u of list)if(u.kind!=='shorts'&&u.kind!=='socks')out.push({jersey:`${u.label} kit`,boots:`${u.label} boots`,celebration:`${u.label} celebration`}[u.kind]);return out}
const arenaLockText=id=>{const req=arenaRequirement(id);if(!req)return '';return `Win at ${MAPS.find(m=>m.id===req.previous)?.name} or reach level ${req.level}`};
// Results-screen XP summary: the bar fills from where it was (or from empty after a level-up).
function XpPanel({award}){const{before,after}=award,levelled=after.level>before.level,from=levelled?0:before.into/before.need*100,to=after.into/after.need*100;
 return <div className="xp-panel"><div className="xp-head"><strong>+{award.total} XP</strong>{award.scale!==1&&<small>{award.scale>1?'Hard':'Easy'} ×{award.scale}</small>}<span className={'xp-level'+(levelled?' up':'')}>{levelled?`LEVEL UP! · LEVEL ${after.level}`:`LEVEL ${after.level}`}</span></div>
  <div className="xp-bar"><i style={{'--from':from+'%','--to':to+'%'}}/></div><small className="xp-count">{after.into} / {after.need} XP to level {after.level+1}</small>
  <div className="xp-lines">{award.lines.map(([k,v])=><span key={k}>{k} <b>+{v}</b></span>)}{award.completed.map(c=><span key={c} className="done">✅ {c} <b>+150</b></span>)}
   {award.unlocks.map(u=><span key={u} className="unlock">🔓 {u}</span>)}{award.arenasUnlocked.map(id=><span key={id} className="unlock">🔓 {MAPS.find(m=>m.id===id)?.name}</span>)}</div></div>}
const EMPTY_STATS={matches:0,goals:0,knockouts:0,wins:0};
// Multiplayer room server. Same origin by default (npm start / Render); on static hosts such as Vercel set
// VITE_ROOM_SERVER_URL (e.g. wss://your-room-server.onrender.com/ws) at build time.
const ROOM_SERVER_URL=import.meta.env.VITE_ROOM_SERVER_URL;
const ordinal=n=>n+(['th','st','nd','rd'][n%100>10&&n%100<14?0:n%10]||'th');
const formatClock=t=>t===null?'':`${Math.floor(Math.ceil(t)/60)}:${String(Math.ceil(t)%60).padStart(2,'0')}`;
function Tutorial({touch,onClose}){
 const [step,setStep]=useState(0);
 const steps=[['🏃','Move',touch?'Drag the joystick to run. Hold SPRINT for a burst, but watch your stamina bar.':'Run with WASD or the arrow keys. Hold Shift to sprint, but watch your stamina bar.'],
  ['🪄','Beat your rival',touch?'With the ball, tap SKILL to step over a defender and leave them stumbling. Tap it while sprinting to knock the ball past them.':'With the ball, press F to step over a defender and leave them stumbling. Press it while sprinting to knock the ball past them.'],
  ['🦶','Win the ball',touch?'At kick-off the ball drops in the middle. Run onto it, or tap TACKLE to slide in and take it from a rival.':'At kick-off the ball drops in the middle. Run onto it, or press Space without the ball to slide-tackle a rival.'],
  ['⚽','Shoot',touch?'Hold SHOOT to power up and release to shoot. Swipe across SHOOT to aim anywhere.':'Hold Space to power up and release to shoot. Hold Q or E as you shoot to curve it.'],
  ['🛡️','Survive','Defend your goal at the bottom. Every goal you concede costs a life; lose them all and you are out. Knock out the other three corners to win.']];
 const [icon,title,text]=steps[step],last=step===steps.length-1;
 return <div className="tutorial" role="dialog" aria-modal="true" aria-label="How to play"><div className="tutorial-card">
  <div className="tutorial-step">{step+1} / {steps.length}</div><div className="tutorial-icon" aria-hidden="true">{icon}</div><h2>{title}</h2><p>{text}</p>
  <div className="tutorial-dots" aria-hidden="true">{steps.map((_,i)=><i key={i} className={i===step?'on':''}/>)}</div>
  <div className="button-row">{step>0&&<button className="btn alt" onClick={()=>setStep(step-1)}>Back</button>}<button className="btn" autoFocus onClick={()=>last?onClose():setStep(step+1)}>{last?"LET'S PLAY":'NEXT'}</button></div>
  {!last&&<button className="tutorial-skip" onClick={onClose}>Skip</button>}
 </div></div>
}
// Shown over the court while models and textures download. It lingers briefly so it does not flicker between files.
const LOADING_TIPS=['Hold shoot longer for a harder, higher shot.','Shoot while running across goal to curl the ball.','Sprint in short bursts: a winded player is easy to catch.','Shoot without the ball to slide-tackle.','Two corners left? Next goal wins.'];
function LoadingOverlay({place}){
 const{active,progress}=useProgress(),[visible,setVisible]=useState(true),[tip]=useState(()=>LOADING_TIPS[Math.floor(Math.random()*LOADING_TIPS.length)]);
 useEffect(()=>{if(active){setVisible(true);return}const t=setTimeout(()=>setVisible(false),350);return()=>clearTimeout(t)},[active]);
 if(!visible)return null;
 return <div className="loading-overlay" role="status" aria-live="polite"><div className="loading-ball" aria-hidden="true">⚽</div><strong>Loading {place}</strong><div className="loading-bar"><i style={{width:Math.round(progress)+'%'}}/></div><small>{Math.round(progress)}%</small><p>{tip}</p></div>
}
function App(){const [tab,setTab]=useState('home'),[mode,setMode]=useState('Free-for-All'),[filter,setFilter]=useState('All'),[arenaId,setArenaId]=useState('accra'),[name,setName]=useState(localStorage.getItem('fc_name')||'StreetLegend'),[gender,setGender]=useState(()=>loadSetting('fc_gender','Male',v=>v==='Male'||v==='Female')),[jersey,setJersey]=useState(()=>loadSetting('fc_jersey',GHANA,v=>JERSEYS.some(([c])=>c===v))),[skin,setSkin]=useState(()=>loadSetting('fc_skin',PLAYER_SKIN,v=>SKIN_TONES.some(([c])=>c===v))),[shorts,setShorts]=useState(()=>loadSetting('fc_shorts','default',v=>SHORTS_COLORS.some(([c])=>c===v))),[socks,setSocks]=useState(()=>loadSetting('fc_socks','default',v=>SOCKS_COLORS.some(([c])=>c===v))),[boots,setBoots]=useState(()=>loadSetting('fc_boots','default',v=>BOOTS_COLORS.some(([c])=>c===v))),[shirtNumber,setShirtNumber]=useState(()=>loadSetting('fc_number','10',v=>/^\d{0,2}$/.test(v))),[celebration,setCelebration]=useState(()=>loadSetting('fc_celebration','celebrate',v=>CELEBRATIONS.some(([c])=>c===v))),[previewKey,setPreviewKey]=useState(0),[progress,setProgress]=useState(()=>loadProgress((()=>{try{return JSON.parse(localStorage.getItem('fc_stats')||'{}')}catch{return{}}})())),[confirmReset,setConfirmReset]=useState(false),[status,setStatus]=useState(''),[room,setRoom]=useState(null),[roomCode,setRoomCode]=useState(''),[ready,setReady]=useState(false),[connected,setConnected]=useState(false),[clientId,setClientId]=useState(null),[playing,setPlaying]=useState(false),[gameMode,setGameMode]=useState('training'),[tutorial,setTutorial]=useState(false),[stats,setStats]=useState(()=>{try{return{...EMPTY_STATS,...JSON.parse(localStorage.getItem('fc_stats')||'{}')}}catch{return EMPTY_STATS}}),portrait=usePortrait(),[lives,setLives]=useState(()=>{try{const v=+localStorage.getItem('fc_lives');return LIVES_OPTIONS.includes(v)?v:3}catch{return 3}}),[myLives,setMyLives]=useState(3),[difficulty,setDifficulty]=useState(()=>{try{const v=localStorage.getItem('fc_difficulty');return DIFFICULTY[v]?v:'normal'}catch{return 'normal'}}),touchLayout=useTouchLayout(),[goalFlash,setGoalFlash]=useState(null),[muted,setMuted]=useState(sfx.isMuted()),[musicOn,setMusicOn]=useState(music.isOn()),[goals,setGoals]=useState([]),[knockedOut,setKnockedOut]=useState([]),[gameOver,setGameOver]=useState(null),[round,setRound]=useState(0),[mic,setMic]=useState(false),[remotePlayers,setRemotePlayers]=useState([]);const socket=useRef(null),commands=useRef({}),keys=useRef({}),playerPos=useRef({x:0,z:3});const arena=MAPS.find(a=>a.id===arenaId)||MAPS[0];useEffect(()=>{try{localStorage.setItem('fc_stats',JSON.stringify(stats))}catch{}},[stats]);useEffect(()=>{if(!confirmReset)return;const t=setTimeout(()=>setConfirmReset(false),4000);return()=>clearTimeout(t)},[confirmReset]);useEffect(()=>{try{localStorage.setItem('fc_gender',gender);localStorage.setItem('fc_jersey',jersey);localStorage.setItem('fc_skin',skin);localStorage.setItem('fc_shorts',shorts);localStorage.setItem('fc_socks',socks);localStorage.setItem('fc_boots',boots);localStorage.setItem('fc_number',shirtNumber);localStorage.setItem('fc_celebration',celebration)}catch{}},[gender,jersey,skin,shorts,socks,boots,shirtNumber,celebration]);
useEffect(()=>saveProgress(progress),[progress]);const levelNow=levelInfo(progress.xp),level=levelNow.level,arenaLocked=!arenaUnlocked(arenaId,progress);
// Anything picked before it was locked (or edited by hand) falls back to the free default.
useEffect(()=>{if(isLocked('jersey',jersey,level))setJersey(GHANA);if(isLocked('shorts',shorts,level))setShorts('default');if(isLocked('socks',socks,level))setSocks('default');if(isLocked('boots',boots,level))setBoots('default');if(isLocked('celebration',celebration,level))setCelebration('celebrate')},[level,jersey,shorts,socks,boots,celebration]);
const outfit=useMemo(()=>({shorts,socks,boots}),[shorts,socks,boots]),back=useMemo(()=>({name:(name||'').trim().slice(0,12),number:shirtNumber}),[name,shirtNumber]);const bump=(key,n=1)=>setStats(v=>({...v,[key]:v[key]+n}));const cycleArena=step=>{const i=MAPS.findIndex(m=>m.id===arenaId);setArenaId(MAPS[(i+step+MAPS.length)%MAPS.length].id)};useEffect(()=>{try{localStorage.setItem('fc_difficulty',difficulty)}catch{}},[difficulty]);useEffect(()=>{try{localStorage.setItem('fc_lives',lives)}catch{}setMyLives(lives)},[lives,round]);const chargeRef=useRef(null),staminaRef=useRef(null),clockRef=useRef(null),replayRef=useRef(null);const closeTutorial=()=>{setTutorial(false);try{localStorage.setItem('fc_tutorial_done','1')}catch{}};useEffect(()=>{if(playing&&!gameOver){music.start();crowd.start()}else{music.stop();crowd.stop()}},[playing,gameOver]);useEffect(()=>{if(!playing)return;let id;const tick=()=>{const el=chargeRef.current,c=commands.current;if(el){const q=c.shoot&&c.shootAt&&c.hasBall&&c.shootAt!==c.tackleShootAt?Math.min(1,(performance.now()-c.shootAt)/SHOT_CHARGE_MS):0;el.style.opacity=q?1:0;el.firstChild.style.width=q*100+'%'}const clock=clockRef.current;if(replayRef.current)replayRef.current.classList.toggle('on',!!c.replay);if(clock){clock.textContent=c.golden?'GOLDEN GOAL':formatClock(c.timeLeft??null);clock.classList.toggle('urgent',!c.golden&&c.timeLeft!=null&&c.timeLeft<=30)}const bar=staminaRef.current;if(bar){const st=c.stamina??1;bar.style.opacity=st<.99?1:0;bar.firstChild.style.width=st*100+'%';bar.classList.toggle('tired',!!c.tired)}id=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(id)},[playing]);useEffect(()=>{localStorage.setItem('fc_name',name)},[name]);useEffect(()=>{function keydown(e){if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const map={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',Shift:'sprint',' ':'shoot',q:'curveLeft',Q:'curveLeft',e:'curveRight',E:'curveRight',f:'skill',F:'skill'};if(map[e.key]){e.preventDefault();setCommand(commands.current,map[e.key],true)}}function keyup(e){const map={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',Shift:'sprint',' ':'shoot',q:'curveLeft',Q:'curveLeft',e:'curveRight',E:'curveRight',f:'skill',F:'skill'};if(map[e.key])setCommand(commands.current,map[e.key],false)}window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup)}},[]);
function connect(){if(socket.current?.readyState===1)return socket.current;const scheme=location.protocol==='https:'?'wss':'ws';const ws=new WebSocket(ROOM_SERVER_URL||`${scheme}://${location.host}/ws`);socket.current=ws;ws.onopen=()=>{setConnected(true);setStatus('Connected to room server')};ws.onclose=()=>{setConnected(false);setStatus('Room server disconnected; run npm run server')};ws.onerror=()=>setStatus('Could not connect to room server. Start npm run server.');ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='connected')setClientId(m.id);if(m.type==='room'){setRoom(m);setTab('lobby')}if(m.type==='error')setStatus(m.message);if(m.type==='matchStart'){setPlaying(true);setTab('game');setStatus('Online room started (movement sync preview)')}if(m.type==='position')setRemotePlayers(p=>[...p.filter(x=>x.id!==m.id),{id:m.id,x:m.x,z:m.z,name:'Online player'}])};return ws}const send=(m)=>{if(socket.current?.readyState===1)socket.current.send(JSON.stringify(m));else setStatus('Not connected to room server')};function roomAction(type){const ws=connect();if(ws.readyState===1)send({type,name,code:roomCode});else ws.addEventListener('open',()=>ws.send(JSON.stringify({type,name,code:roomCode})),{once:true})}function practice(nextMode='training'){if(!arenaUnlocked(arenaId,progress)){setTab('arenas');return}bump('matches');setGameMode(nextMode);try{if(!localStorage.getItem('fc_tutorial_done'))setTutorial(true)}catch{}setPlaying(true);setRemotePlayers([]);setGoals([]);setKnockedOut([]);setGameOver(null);setRound(n=>n+1);setTab('game');setStatus(nextMode==='ffa'?'Free-for-All · 3 minutes · last corner standing wins':'Training mode · move with WASD/arrows or touch controls')}const [online]=useState(false);useEffect(()=>{if(!playing||!room?.started)return;const interval=setInterval(()=>{send({type:'position',...playerPos.current})},100);return()=>clearInterval(interval)},[playing,room?.started]);const phoneGame=playing&&touchLayout,waitingToRotate=phoneGame&&portrait,matchPaused=waitingToRotate||(playing&&tutorial);
 return <div className={'app'+(phoneGame?' phone-game':'')}>{waitingToRotate&&<div className="rotate-prompt" role="alert"><div className="rotate-phone" aria-hidden="true">📱</div><h2>TURN YOUR PHONE SIDEWAYS</h2><p>Four Corners plays in landscape. The match is paused until you rotate.</p><button className="btn alt small" onClick={()=>{exitLandscape();setPlaying(false);setTab('modes')}}>EXIT TRAINING</button></div>}<header className="header"><div className="logo">FOUR<span>CORNERS</span><div style={{fontSize:10,color:'#9eac9e',letterSpacing:'.2em'}}>STREET FOOTBALL</div></div><nav className="nav">{[['home','HOME'],['modes','PLAY'],['arenas','ARENAS'],['locker','LOCKER'],['lobby','MULTIPLAYER']].map(([id,label])=><button className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}>{label}</button>)}</nav><button className="account" onClick={()=>setTab('locker')} aria-label={`Player ${name}, open locker`}><span>{name}</span><i className="level-chip">LV {level}</i></button></header><main className="main">{tab==='home'&&<div className="landing">
  <section className="hero-card" aria-label="Four Corners">
    <div className="hero-card-bg" aria-hidden="true"/><div className="hero-number" aria-hidden="true">04</div>
    <div className="hero-left">
      <div className="landing-pill"><span className="pulse"/> BORN IN GHANA · BUILT FOR THE WORLD</div>
      <h1 className="hero-title">Four<br/>Corners</h1>
      <div className="hero-chips"><span className="hero-chip">⚽ Street football</span><span className="hero-chip">👥 2–4 players</span></div>
      <p className="hero-tagline">Four goals. Four rivals. One champion. Own your corner and be the last one standing.</p>
      <div className="hero-arena-card"><div><small>ARENA</small><strong>{arena.name}</strong></div><span>{arenaLocked?`🔒 ${arenaLockText(arenaId)}`:`${arena.type} · ${arena.country}`}</span><div className="hero-arrows"><button aria-label="Previous arena" onClick={()=>cycleArena(-1)}>‹</button><button aria-label="Next arena" onClick={()=>cycleArena(1)}>›</button></div></div>
    </div>
    <div className="hero-player"><PlayerShowcase jersey={jersey} gender={gender} skin={skin} outfit={outfit} back={back} celebration={celebration}/></div>
    <div className="hero-right">
      <div className="hero-stats"><span className="hero-stats-tab">Your stats</span><div className="hero-stats-grid">{[['MATCHES',stats.matches],['GOALS',stats.goals],['KOs',stats.knockouts],['WINS',stats.wins]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>
       <div className="hero-level"><div><small>LEVEL</small><strong>{level}</strong></div><div className="xp-bar"><i style={{'--from':levelNow.into/levelNow.need*100+'%','--to':levelNow.into/levelNow.need*100+'%'}}/></div><small>{levelNow.into} / {levelNow.need} XP</small></div></div>
      <div className="daily" aria-label="Daily challenges"><span className="hero-stats-tab">Daily challenges</span>{progress.daily.challenges.map(c=><div key={c.id} className={'daily-item'+(c.done?' done':'')}><span>{c.done?'✅':'⬜'} {c.text}</span><small>{c.done?'+150 XP':`${c.progress} / ${c.target}`}</small></div>)}</div>
      <dl className="hero-info">{[['PLAYER',name],['JERSEY',jersey===GHANA?<span><span className="swatch" style={{background:GHANA_SWATCH}}/> Ghana</span>:<span className="swatch" style={{background:jersey}} aria-label={'Colour '+jersey}/>],['DIFFICULTY',DIFFICULTY[difficulty].label],['KNOCKOUT AT',`${lives} goal${lives===1?'':'s'}`],['MODE','Training']].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </div>
    <div className="hero-cta"><button className="btn btn-gold" onClick={()=>setTab('modes')}>⚽ PLAY NOW</button><button className="btn btn-dark" onClick={()=>setTab('locker')}>CUSTOMIZE</button></div>
  </section>
  <div className="landing-section-heading"><div><div className="eyebrow">YOUR GAME. YOUR RULES.</div><h2>CHOOSE YOUR NEXT MOVE</h2></div><span className="landing-section-note">EXPLORE THE WORLD OF FOUR CORNERS ↘</span></div>
  <section className="landing-feature-grid">
    {[{title:'CREATE YOUR LEGEND',sub:'Personalize your player',img:'character',go:'locker',tag:'01 / PLAYER'},{title:'PICK YOUR ARENA',sub:'Rural & urban courts',img:'arenas',go:'arenas',tag:'02 / LOCATIONS'},{title:'CHALLENGE FRIENDS',sub:'Private 2–4 player rooms',img:'lobby',go:'lobby',tag:'03 / MULTIPLAYER'}].map(c=><button className="feature-tile" key={c.title} onClick={()=>setTab(c.go)}><img src={'/art/ui-'+c.img+'.jpg'} alt={c.title}/><div className="feature-gradient"/><span className="feature-index">{c.tag}</span><div className="feature-copy"><h3>{c.title}</h3><p>{c.sub}</p></div><span className="feature-arrow">↗</span></button>)}
  </section>
  <div className="landing-section-heading arena-heading"><div><div className="eyebrow">FROM OUR STREETS TO YOUR SCREEN</div><h2>EXPLORE THE ARENAS</h2></div><button className="text-link" onClick={()=>setTab('arenas')}>VIEW ALL ARENAS →</button></div>
  <section className="landing-arena-grid">{[{id:'accra',title:'ACCRA STREET COURT',label:'URBAN · GHANA',img:'accra'},{id:'kumasi',title:'KUMASI BLOCK COURT',label:'URBAN · GHANA',img:'kumasi'},{id:'village',title:'VILLAGE DUST COURT',label:'RURAL · GHANA',img:'village'},{id:'school',title:'SCHOOL PARK ARENA',label:'RURAL · GHANA',img:'school'}].map(a=><button className="arena-tile" key={a.title} onClick={()=>{setArenaId(a.id);setTab('arenas')}}><img src={'/art/'+a.img+'.jpg'} alt={a.title}/><div className="arena-caption"><strong>{a.title}</strong><small>{a.label}</small></div></button>)}</section>
  <section className="landing-banner"><div><span className="eyebrow">READY TO TAKE YOUR CORNER?</span><h2>THE STREET IS CALLING.</h2><p>Start with training or create a private room with your friends.</p></div><button className="btn btn-gold" onClick={()=>setTab('modes')}>ENTER THE GAME →</button></section>
  <p className="prototype-disclaimer">CONCEPT ART & DEVELOPMENT PROTOTYPE — the 3D game, matchmaking, voice chat and animation are still under development.</p>
</div>}
{tab==='modes'&&<><div className="eyebrow">YOUR MATCH YOUR RULES</div><h2>CHOOSE A GAME MODE</h2><p className="muted">Start in the training court or organize a multiplayer room.</p><div className="cards">{[['Free-for-All','⚽','Every player protects their own goal. Temporary alliances allowed.'],['Duo Battle','🤝','Two teams of two — the last team standing wins.'],['Private Room','🔐','Invite friends with a six-character room code.'],['Training','🎯','Practice running, dribbling and shooting.']].map(([title,icon,desc])=><button key={title} className={'card '+(mode===title?'selected':'')} style={{textAlign:'left',color:'white'}} onClick={()=>setMode(title)}><div className="symbol">{icon}</div><h3>{title}</h3><p>{desc}</p></button>)}</div>{(mode==='Training'||mode==='Free-for-All')&&<div className="difficulty"><div className="label">Goals to knock out a player</div><div className="pills" role="radiogroup" aria-label="Goals to knock out a player">{LIVES_OPTIONS.map(n=><button key={n} role="radio" aria-checked={lives===n} className={'pill '+(lives===n?'active':'')} onClick={()=>setLives(n)}>{n}</button>)}</div><p className="muted">{lives===1?'Sudden death: one goal against you and you are out.':`Every player, you and each rival, is out after conceding ${lives} goals.`}</p></div>}{(mode==='Training'||mode==='Free-for-All')&&<div className="difficulty"><div className="label">Rival difficulty</div><div className="pills" role="radiogroup" aria-label="Rival difficulty">{Object.entries(DIFFICULTY).map(([id,level])=><button key={id} role="radio" aria-checked={difficulty===id} className={'pill '+(difficulty===id?'active':'')} onClick={()=>setDifficulty(id)}>{level.label}</button>)}</div><p className="muted">{difficulty==='easy'?'Slower rivals who rarely win tackles. Good for learning the controls.':difficulty==='hard'?'Fast, aggressive rivals who press early, save more and shoot from range.':'Balanced rivals who defend, press when close and attack your goal.'}</p></div>}{arenaLocked&&(mode==='Training'||mode==='Free-for-All')&&<p className="muted lock-note">🔒 {arena.name} is locked: {arenaLockText(arenaId)}. Pick another arena on the Arenas tab.</p>}<div className="button-row"><button className="btn" disabled={mode==='Duo Battle'||(arenaLocked&&(mode==='Training'||mode==='Free-for-All'))} onClick={()=>{if(mode==='Private Room')return setTab('lobby');if(mode==='Duo Battle')return;if(touchLayout)enterLandscape();practice(mode==='Free-for-All'?'ffa':'training')}}>{{Training:'ENTER TRAINING →','Free-for-All':'START MATCH →','Duo Battle':'COMING SOON','Private Room':'CONTINUE TO LOBBY →'}[mode]}</button><button className="btn alt" onClick={()=>setTutorial(true)}>HOW TO PLAY</button></div>{!playing&&tutorial&&<Tutorial touch={touchLayout} onClose={closeTutorial}/>}</>}
{tab==='arenas'&&<><div className="eyebrow">RURAL · URBAN · WORLDWIDE</div><h2>SELECT YOUR ARENA</h2><div className="pills">{['All','Rural','Urban'].map(t=><button className={'pill '+(filter===t?'active':'')} key={t} onClick={()=>setFilter(t)}>{t}</button>)}</div><div className="cards">{MAPS.filter(m=>filter==='All'||filter===m.type).map(m=><button className={'card '+(arenaId===m.id?'selected':'')} key={m.id} onClick={()=>setArenaId(m.id)} style={{color:'white',textAlign:'left'}}><div className="symbol">{m.icon}</div><h3>{m.name}</h3><p>{m.country} · {m.type}</p><small style={{color:'#d5ff68'}}>{arenaId===m.id?'✓ SELECTED':'SELECT ARENA'}</small>{!arenaUnlocked(m.id,progress)&&<small className="lock-note">🔒 {arenaLockText(m.id)}</small>}</button>)}</div><div className="panel" style={{height:350,padding:0,overflow:'hidden',position:'relative'}}><Arena3D arena={arena} commands={commands}/></div><div className="button-row"><button className="btn" disabled={arenaLocked} onClick={()=>practice()}>{arenaLocked?'🔒 LOCKED':'TRY THIS ARENA →'}</button>{arenaLocked&&<p className="muted lock-note">{arenaLockText(arenaId)} to play here.</p>}</div></>}
{tab==='locker'&&<section className="locker" aria-label="Player locker">
  <div className="locker-stage">
    <div className="locker-spot" aria-hidden="true"/><div className="hero-number locker-number" aria-hidden="true">{shirtNumber||'10'}</div>
    <div className="locker-player"><PlayerShowcase jersey={jersey} gender={gender} skin={skin} outfit={outfit} back={back} celebration={celebration} previewKey={previewKey} interactive/></div>
    <div className="locker-plate"><small>Level {level} · {rankFor(stats.wins)}</small><strong>{name||'Player'}</strong><span>{JERSEYS.find(([c])=>c===jersey)?.[1]} · Ghana</span></div>
    <p className="locker-hint">Drag to spin your player</p>
  </div>
  <div className="locker-panels">
    <div className="eyebrow">MAKE YOUR MARK</div><h2>PLAYER LOCKER</h2>
    <div className="locker-panel"><h3>Identity</h3><label className="label" htmlFor="player-name">Display name</label><input id="player-name" className="input" maxLength={20} value={name} onChange={e=>setName(e.target.value)} placeholder="Your street name"/>
      <div className="label">Character</div><div className="pills">{['Male','Female'].map(g=><button key={g} className={'pill '+(gender===g?'active':'')} aria-pressed={gender===g} onClick={()=>setGender(g)}>{g}</button>)}</div></div>
    <div className="locker-panel"><h3>Skin tone</h3><div className="swatches" role="radiogroup" aria-label="Skin tone">{SKIN_TONES.map(([c,label])=><button key={c} role="radio" aria-checked={skin===c} className={'swatch-btn'+(skin===c?' active':'')} onClick={()=>setSkin(c)}><span style={{background:c}}/><small>{label}</small></button>)}</div></div>
    <div className="locker-panel"><h3>Kit</h3><div className="swatches" role="radiogroup" aria-label="Kit">{JERSEYS.map(([c,label])=>{const locked=isLocked('jersey',c,level);return <button key={c} role="radio" aria-checked={jersey===c} disabled={locked} title={locked?`Unlocks at level ${requiredLevel('jersey',c)}`:label} className={'swatch-btn'+(jersey===c?' active':'')+(locked?' locked':'')} onClick={()=>setJersey(c)}><span style={{background:jerseyBackground(c)}}>{c===GHANA?'★':locked?'🔒':''}</span><small>{locked?`Lv ${requiredLevel('jersey',c)}`:label}</small></button>})}</div></div>
    <div className="locker-panel"><h3>Shorts, socks and boots</h3>{[['Shorts',SHORTS_COLORS,shorts,setShorts,c=>c==='default'?'#ffffff':c],['Socks',SOCKS_COLORS,socks,setSocks,c=>c==='default'?jerseyBackground(jersey==='ghana'?'#fcd116':jersey):c],['Boots',BOOTS_COLORS,boots,setBoots,c=>c==='default'?'#16181d':c]].map(([part,options,value,set,swatch])=><React.Fragment key={part}><div className="label">{part}</div><div className="swatches small" role="radiogroup" aria-label={part}>{options.map(([c,label])=>{const kind=part.toLowerCase(),locked=isLocked(kind,c,level);return <button key={c} role="radio" aria-checked={value===c} disabled={locked} title={locked?`Unlocks at level ${requiredLevel(kind,c)}`:label} className={'swatch-btn'+(value===c?' active':'')+(locked?' locked':'')} onClick={()=>set(c)}><span style={{background:swatch(c)}}>{locked?'🔒':''}</span><small>{locked?`Lv ${requiredLevel(kind,c)}`:label}</small></button>})}</div></React.Fragment>)}</div>
    <div className="locker-panel"><h3>Shirt</h3><label className="label" htmlFor="shirt-number">Number on the back</label><input id="shirt-number" className="input" inputMode="numeric" maxLength={2} value={shirtNumber} onChange={e=>setShirtNumber(e.target.value.replace(/\D/g,'').slice(0,2))} placeholder="10"/><p className="muted locker-note">Your display name is printed above the number.</p></div>
    <div className="locker-panel"><h3>Goal celebration</h3><div className="pills">{CELEBRATIONS.map(([id,label])=>{const locked=isLocked('celebration',id,level);return <button key={id} disabled={locked} className={'pill '+(celebration===id?'active':'')+(locked?' locked':'')} aria-pressed={celebration===id} onClick={()=>{setCelebration(id);setPreviewKey(k=>k+1)}}>{locked?`🔒 ${label} · Lv ${requiredLevel('celebration',id)}`:label}</button>})}</div><p className="muted locker-note">Tap one to see it.</p></div>
    <div className="locker-panel"><h3>Career</h3><div className="locker-stats">{[['Matches',stats.matches],['Goals',stats.goals],['KOs',stats.knockouts],['Wins',stats.wins],['Win rate',stats.matches?Math.round(stats.wins/stats.matches*100)+'%':'—']].map(([k,v])=><div key={k}><strong>{v}</strong><small>{k}</small></div>)}</div>
      <button className={'btn small '+(confirmReset?'btn-danger':'alt')} onClick={()=>{if(!confirmReset)return setConfirmReset(true);setStats(EMPTY_STATS);setConfirmReset(false)}}>{confirmReset?'Tap again to reset stats':'Reset stats'}</button></div>
    <p className="muted">Your choices are saved on this device.</p>
  </div>
</section>}
{tab==='lobby'&&<><div className="eyebrow">PLAY WITH FRIENDS</div><h2>MULTIPLAYER LOBBY</h2><p className="muted">Start the included room server to create or join rooms. The server currently syncs lobby state and basic movement, not complete competitive match physics.</p><div className="columns"><div className="panel"><h3>CREATE A ROOM</h3><p className="muted">Invite up to three friends.</p><button className="btn" onClick={()=>roomAction('create')}>CREATE ROOM</button><h3 style={{marginTop:30}}>JOIN A ROOM</h3><label className="label">Six-character room code</label><input className="input" value={roomCode} maxLength={6} onChange={e=>setRoomCode(e.target.value.toUpperCase())} placeholder="AB12CD"/><button className="btn alt" onClick={()=>roomAction('join')}>JOIN ROOM</button></div><div className="panel"><h3>ROOM {room?.code||'—'}</h3><div className="smallprint">{connected?'● Server connected':'○ Server not connected'}</div>{room?.players.map(p=><div className="room-player" key={p.id}><span>⚽ {p.name} {p.id===room.hostId?'👑':''}</span><span>{p.ready?'READY':'WAITING'}</span></div>)}{!room&&<p className="muted">Create or join a room to see players here.</p>}<div className="button-row"><button className="btn alt small" disabled={!room} onClick={()=>{setReady(v=>!v);send({type:'ready',ready:!ready})}}>{ready?'UNREADY':'READY UP'}</button><button className="btn small" disabled={!room||room.hostId!==clientId} onClick={()=>send({type:'start'})}>START MATCH</button></div></div></div><p className="notice">{status}</p></>}
{tab==='game'&&<><div className="eyebrow">{room?.started?'ONLINE ROOM PREVIEW':`${gameMode==='ffa'?'FREE-FOR-ALL':'OFFLINE TRAINING'} · ${DIFFICULTY[difficulty].label.toUpperCase()}`}</div><h2>{arena.name.toUpperCase()}</h2><div className={'court'+(touchLayout?' touch':'')}><Arena3D arena={arena} playing={playing} paused={matchPaused} skin={skin} mode={gameMode} onEvent={e=>{setGoalFlash({special:e,t:Date.now()});if(e==='showdown'||e==='golden')setMyLives(1)}} commands={commands} onlinePlayers={remotePlayers} jersey={jersey} gender={gender} outfit={outfit} back={back} celebration={celebration} round={round} difficulty={difficulty} lives={lives} onGameOver={result=>{if(result.result==='won')bump('wins');const{progress:next,award}=applyMatch(progress,result,{difficulty,arenaId,mode:result.mode});award.unlocks=unlockLabels(award.before.level,award.after.level);setProgress(next);setGameOver({...result,award})}} onGoal={(i,scorer,left)=>{if(scorer==='player'){setGoals(g=>[...g,i]);bump('goals');if(left<=0)bump('knockouts')}if(left<=0)setKnockedOut(k=>[...k,i]);if(i===2)setMyLives(left);setGoalFlash({i,scorer,left,t:Date.now()})}}/>{goalFlash?.special&&<div key={goalFlash.t} className="goal-banner special"><b>{{showdown:'FINAL SHOWDOWN',golden:'GOLDEN GOAL',fulltime:'FULL TIME'}[goalFlash.special]}</b><span>{{showdown:'TWO CORNERS LEFT · NEXT GOAL WINS',golden:'SCORES LEVEL · NEXT GOAL KNOCKS OUT',fulltime:'THE WHISTLE HAS GONE'}[goalFlash.special]}</span></div>}{goalFlash&&!goalFlash.special&&<div key={goalFlash.t} className={'goal-banner'+(goalFlash.i===2?' against':'')}><b>{goalFlash.scorer==='player'?'GOAL!':goalFlash.i===2?'CONCEDED':goalFlash.left<=0?'KNOCKOUT':'RIVAL GOAL'}</b><span>{(()=>{const corner=['NORTH','EAST','SOUTH','WEST'][goalFlash.i],left=goalFlash.left,lifeText=`${left} ${left===1?'LIFE':'LIVES'} LEFT`;if(goalFlash.scorer==='player')return left<=0?`${corner} CORNER KNOCKED OUT`:`${corner} CORNER · ${lifeText}`;if(goalFlash.i===2)return left<=0?`RIVAL ${goalFlash.scorer+1} SCORED ON YOU`:`RIVAL ${goalFlash.scorer+1} SCORED · YOU HAVE ${lifeText}`;return left<=0?`RIVAL ${goalFlash.scorer+1} KNOCKED OUT THE ${corner} CORNER`:`RIVAL ${goalFlash.scorer+1} SCORED ON ${corner} · ${lifeText}`})()}</span></div>}{playing&&<LoadingOverlay place={arena.name}/>}{playing&&<div className="replay-tag" ref={replayRef} aria-hidden="true"><b><i/>REPLAY</b><small>{touchLayout?'TAP SHOOT TO SKIP':'PRESS SPACE TO SKIP'}</small></div>}<div className="charge" ref={chargeRef}><i/></div><div className="stamina" ref={staminaRef} aria-hidden="true"><i/></div>{playing&&touchLayout&&!gameOver&&!tutorial&&<TouchControls commands={commands}/>}{gameOver&&<div className={'game-over '+gameOver.result}>
  {gameOver.mode==='ffa'&&<div className="place-badge">{ordinal(gameOver.place)} PLACE</div>}
  <h2>{gameOver.result==='won'?'CHAMPION!':gameOver.reason==='time'?'FULL TIME':"YOU'RE OUT"}</h2>
  <p>{gameOver.result==='won'?(gameOver.reason==='time'?'You had the most lives at full time.':'Last corner standing. You knocked out every rival.'):gameOver.reason==='time'?`RIVAL ${gameOver.by+1} had the most lives at full time.`:`RIVAL ${gameOver.by+1} scored on your corner.`}</p>
  {gameOver.stats&&<div className="result-stats">{[['Goals',gameOver.stats.goals],['Shots',gameOver.stats.shots],['Tackles won',gameOver.stats.tackles],['Skills',gameOver.stats.skills||0],['Time',formatClock(gameOver.time)]].map(([k,v])=><div key={k}><strong>{v}</strong><small>{k}</small></div>)}</div>}
  {gameOver.award&&<XpPanel award={gameOver.award}/>}
  <div className="button-row"><button className="btn" onClick={()=>{bump('matches');setGoals([]);setKnockedOut([]);setGoalFlash(null);setGameOver(null);setRound(n=>n+1)}}>PLAY AGAIN</button><button className="btn alt" onClick={()=>{exitLandscape();setPlaying(false);setGameOver(null);setTab('modes')}}>EXIT</button></div></div>}
  {playing&&tutorial&&<Tutorial touch={touchLayout} onClose={closeTutorial}/>}<div className="hud">{gameMode==='ffa'&&<span className="match-clock" ref={clockRef} aria-label="Match clock">3:00</span>}<span>⚽ {lives>1||knockedOut.length||goals.length?`${'❤'.repeat(Math.max(0,myLives))} · SCORED ${goals.length} · RIVALS LEFT ${3-knockedOut.filter(i=>i!==2).length}`:'DEFEND SOUTH · ATTACK N/E/W'}</span><span>{touchLayout?'DRAG TO MOVE · HOLD SHOOT TO POWER, SWIPE TO AIM · SKILL TO BEAT A DEFENDER':'WASD / ARROWS · HOLD SPACE TO SHOOT · Q / E CURVE · F SKILL · SPACE WITHOUT THE BALL TO TACKLE'}</span><span>🎤 VOICE: NOT CONNECTED</span></div></div><div className="controls"><button className="btn alt small" aria-label={muted?'Unmute sounds':'Mute sounds'} onClick={()=>setMuted(sfx.toggle())}>{muted?'🔇':'🔊'}</button><button className={'btn alt small'+(musicOn?'':' off')} aria-label={musicOn?'Turn music off':'Turn music on'} aria-pressed={musicOn} onClick={()=>setMusicOn(music.toggle())}>🎵</button><button className="btn small" onClick={()=>{exitLandscape();setPlaying(false);setTab('modes')}}>EXIT TRAINING</button></div><p className="notice">{status}</p><p className="smallprint">Prototype: camera, moving player, ball strikes and goal triggers are functional demonstrations. Physics, opponent AI, final showdown, skill moves, fair server validation and voice chat require further implementation.</p></>}
</main><footer className="footer">FOUR CORNERS: STREET FOOTBALL · GHANAIAN ROOTS, GLOBAL AMBITION · DEVELOPMENT PROTOTYPE</footer></div>}
createRoot(document.getElementById('root')).render(<App/>);
