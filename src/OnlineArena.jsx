import FrameBudget from './FrameBudget.jsx';
import BlockGoal from './BlockGoal.jsx';
import {broadcastView,BALL_RADIUS} from './court-layout.js';
import * as THREE from 'three';
import React,{Suspense,useRef} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Billboard,Text} from '@react-three/drei';
import {ArenaEnvironment} from './environment.jsx';
import {useGraphics,usePageVisible,renderDpr} from './graphics.js';
const COLORS=['#f2cd48','#df5044','#438ee7','#43b983'];
const PATCHES=Array.from({length:12},(_,i)=>{const y=1-(i+.5)/6,r=Math.sqrt(1-y*y),a=i*2.399963229728653,v=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);return {position:v.clone().multiplyScalar(BALL_RADIUS*1.006).toArray(),quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),v)}});
const GOALS=[[0,-11],[11,0],[0,11],[-11,0]];
function OnlineWorld({arena,network,commands,clientId,Player,roster,graphics}){
 const groups=useRef({}),ball=useRef();
 useFrame(({camera,clock,size},delta)=>{
  const s=network.current;if(!s)return;const blend=1-Math.exp(-18*Math.min(delta,.1));
  for(const p of s.players){const g=groups.current[p.id];if(!g)continue;g.visible=p.connected&&p.lives>0;g.position.x+=(p.x-g.position.x)*blend;g.position.z+=(p.z-g.position.z)*blend;g.rotation.y=p.angle;Object.assign(g.userData,{clock:clock.elapsedTime,velocityX:p.vx,velocityZ:p.vz,dribbling:s.ball.owner===p.id});if(p.id===clientId){commands.current.hasBall=s.ball.owner===clientId;commands.current.stamina=p.stamina;commands.current.timeLeft=s.timeLeft}}
  if(ball.current){ball.current.position.x+=(s.ball.x-ball.current.position.x)*blend;ball.current.position.z+=(s.ball.z-ball.current.position.z)*blend;ball.current.position.y+=(s.ball.y-ball.current.position.y)*blend;ball.current.rotation.x+=s.ball.vz*delta;ball.current.rotation.z-=s.ball.vx*delta}
  const me=s.players.find(p=>p.id===clientId);const view=broadcastView(s.ball.x,s.ball.z,size.width/size.height,me?.x,me?.z,graphics.mobile);camera.position.x+=(view.position[0]-camera.position.x)*blend;camera.position.y+=(view.position[1]-camera.position.y)*blend;camera.position.z+=(view.position[2]-camera.position.z)*blend;camera.lookAt(...view.lookAt);if(Math.abs(camera.fov-view.fov)>.01){camera.fov=view.fov;camera.updateProjectionMatrix()}
 });
 return <><color attach="background" args={['#c9dbe6']}/><fog attach="fog" args={['#e6e1d6',42,120]}/><ambientLight intensity={.2}/><hemisphereLight args={['#dcefff','#b08a62',.75]}/><directionalLight position={[16,27,10]} color="#ffe6bd" intensity={4.3} castShadow={graphics.shadows} shadow-mapSize={[graphics.shadowSize,graphics.shadowSize]} shadow-bias={-.0004} shadow-normalBias={.03} shadow-radius={4} shadow-camera-left={-29} shadow-camera-right={29} shadow-camera-top={29} shadow-camera-bottom={-29}/><Suspense fallback={null}><ArenaEnvironment arena={arena} detailed={graphics.props}/></Suspense>
 {GOALS.map(([x,z],side)=><group key={side} position={[x,0,z]} rotation={[0,side%2?Math.PI/2:0,0]}><BlockGoal active={roster.some(p=>p.side===side)}/></group>)}
 {roster.map((p,i)=><group key={p.id} ref={g=>{groups.current[p.id]=g}}><Suspense fallback={null}><Player label="" kit={COLORS[i]} modelPath="/models/footballer-blue.glb" animationFps={graphics.animationFps} animated/></Suspense><Billboard position={[0,2.4,0]}><Text fontSize={.23} color={p.id===clientId?'#ffe58b':'#ffffff'} anchorX="center" outlineWidth={.03} outlineColor="#171b19">{p.id===clientId?'YOU · ':''}{p.name}</Text></Billboard></group>)}
 <group ref={ball} position={[0,BALL_RADIUS,0]}><mesh castShadow><sphereGeometry args={[BALL_RADIUS,20,16]}/><meshStandardMaterial color="#f5f1e7" roughness={.6}/></mesh>{PATCHES.map((p,i)=><mesh key={i} position={p.position} quaternion={p.quaternion}><circleGeometry args={[BALL_RADIUS*.35,5]}/><meshStandardMaterial color="#202b32" roughness={.6}/></mesh>)}</group>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.02,0]}><ringGeometry args={[3.2,3.24,48]}/><meshBasicMaterial color="#eee1c2"/></mesh>
 </>
}
export default function OnlineArena(props){const graphics=useGraphics(),visible=usePageVisible();return <Canvas fallback={<div className="scene-error">This device needs WebGL to play.</div>} frameloop={visible?'always':'never'} shadows={graphics.shadows} dpr={renderDpr(devicePixelRatio,graphics.dpr)} camera={{position:[0,12,18],fov:50}} gl={{antialias:true,powerPreference:'high-performance'}}><FrameBudget onDecline={graphics.decline}/><OnlineWorld {...props} graphics={graphics}/></Canvas>}
