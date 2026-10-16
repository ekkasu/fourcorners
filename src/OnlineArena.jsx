import FrameBudget from './FrameBudget.jsx';
import BlockGoal from './BlockGoal.jsx';
import {broadcastView} from './court-layout.js';
import React,{Suspense,useRef} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Billboard,Text} from '@react-three/drei';
import {ArenaEnvironment} from './environment.jsx';
import {useGraphics,usePageVisible} from './graphics.js';
const COLORS=['#f2cd48','#df5044','#438ee7','#43b983'];
const GOALS=[[0,-11],[11,0],[0,11],[-11,0]];
function OnlineWorld({arena,network,commands,clientId,Player,roster,graphics}){
 const groups=useRef({}),ball=useRef();
 useFrame(({camera,clock,size},delta)=>{
  const s=network.current;if(!s)return;const blend=1-Math.exp(-18*Math.min(delta,.1));
  for(const p of s.players){const g=groups.current[p.id];if(!g)continue;g.visible=p.connected&&p.lives>0;g.position.x+=(p.x-g.position.x)*blend;g.position.z+=(p.z-g.position.z)*blend;g.rotation.y=p.angle;Object.assign(g.userData,{clock:clock.elapsedTime,velocityX:p.vx,velocityZ:p.vz,dribbling:s.ball.owner===p.id});if(p.id===clientId){commands.current.hasBall=s.ball.owner===clientId;commands.current.stamina=p.stamina;commands.current.timeLeft=s.timeLeft}}
  if(ball.current){ball.current.position.x+=(s.ball.x-ball.current.position.x)*blend;ball.current.position.z+=(s.ball.z-ball.current.position.z)*blend;ball.current.position.y+=(s.ball.y-ball.current.position.y)*blend;ball.current.rotation.x+=s.ball.vz*delta;ball.current.rotation.z-=s.ball.vx*delta}
  const me=s.players.find(p=>p.id===clientId);const view=broadcastView(s.ball.x,s.ball.z,size.width/size.height,me?.x,me?.z,graphics.mobile);camera.position.x+=(view.position[0]-camera.position.x)*blend;camera.position.y+=(view.position[1]-camera.position.y)*blend;camera.position.z+=(view.position[2]-camera.position.z)*blend;camera.lookAt(...view.lookAt);if(Math.abs(camera.fov-view.fov)>.01){camera.fov=view.fov;camera.updateProjectionMatrix()}
 });
 return <><color attach="background" args={['#c9dbe6']}/><ambientLight intensity={.7}/><hemisphereLight args={['#dcefff','#a98c65',1]}/><directionalLight position={[16,27,10]} intensity={3} castShadow={graphics.shadows} shadow-mapSize={[graphics.shadowSize,graphics.shadowSize]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25}/><Suspense fallback={null}><ArenaEnvironment arena={arena} detailed={graphics.props}/></Suspense>
 {GOALS.map(([x,z],side)=><group key={side} position={[x,0,z]} rotation={[0,side%2?Math.PI/2:0,0]}><BlockGoal active={roster.some(p=>p.side===side)}/></group>)}
 {roster.map((p,i)=><group key={p.id} ref={g=>{groups.current[p.id]=g}}><Suspense fallback={null}><Player label="" kit={COLORS[i]} modelPath="/models/footballer-blue.glb" animationFps={graphics.animationFps} animated/></Suspense><Billboard position={[0,2.4,0]}><Text fontSize={.23} color={p.id===clientId?'#ffe58b':'#ffffff'} anchorX="center" outlineWidth={.03} outlineColor="#171b19">{p.id===clientId?'YOU · ':''}{p.name}</Text></Billboard></group>)}
 <mesh ref={ball} position={[0,.24,0]} castShadow><sphereGeometry args={[.24,16,12]}/><meshStandardMaterial color="#fff6da" roughness={.65} wireframe={false}/></mesh>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.02,0]}><ringGeometry args={[3.2,3.24,48]}/><meshBasicMaterial color="#eee1c2"/></mesh>
 </>
}
export default function OnlineArena(props){const graphics=useGraphics(),visible=usePageVisible();return <Canvas fallback={<div className="scene-error">This device needs WebGL to play.</div>} frameloop={visible?'always':'never'} shadows={graphics.shadows} dpr={Math.min(devicePixelRatio||1,graphics.dpr)} camera={{position:[0,12,18],fov:50}} gl={{antialias:false,powerPreference:'high-performance'}}><FrameBudget onDecline={graphics.decline}/><OnlineWorld {...props} graphics={graphics}/></Canvas>}
