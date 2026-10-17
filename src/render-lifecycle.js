import {ACESFilmicToneMapping,NoToneMapping,SRGBColorSpace} from 'three';

// Exactly one stage performs tone mapping: the composer when mounted, otherwise
// the renderer. Keep this invariant through quality changes and GPU restoration.
export function ensureRenderColor(state){
 const {gl,internal}=state,tone=internal.priority>0?NoToneMapping:ACESFilmicToneMapping;
 if(gl.toneMapping!==tone)gl.toneMapping=tone;
 if(gl.outputColorSpace!==SRGBColorSpace)gl.outputColorSpace=SRGBColorSpace;
 if(gl.toneMappingExposure!==1)gl.toneMappingExposure=1;
}
export function refreshLighting(state,{contextRestored=false}={}){
 const {gl,scene}=state;
 gl.resetState();gl.setRenderTarget(null);
 ensureRenderColor(state);
 gl.shadowMap.needsUpdate=true;
 scene.traverse(object=>{
  if(!object.isLight||!object.shadow)return;
  // Cached shadow targets contain no usable pixels after the GPU releases them.
  if(contextRestored){object.shadow.map?.dispose();object.shadow.map=null;object.shadow.mapPass?.dispose();object.shadow.mapPass=null}
  object.shadow.needsUpdate=true;
 });
 if(contextRestored){
  for(const texture of new Set([scene.environment,scene.background]))if(texture?.isTexture&&!texture.isRenderTargetTexture)texture.needsUpdate=true;
 }
}

export function bindRenderLifecycle({getState,getMode=()=> 'always',onRestore=()=>{},page=document,windowTarget=window}){
 const canvas=getState().gl.domElement;let lost=false;
 const setLoop=mode=>{
  const s=getState();if(s.frameloop===mode)return;
  // R3F resets elapsedTime in setFrameloop. Retain match/animation time across
  // suspension so possession, replays and kick animations do not jump backwards.
  const elapsed=s.clock.elapsedTime;s.setFrameloop(mode);s.clock.elapsedTime=elapsed;
 };
 const resume=()=>{
  if(page.hidden||lost){setLoop('never');return}
  setLoop(getMode());
  refreshLighting(getState());getState().invalidate(2);
 };
 const contextLost=event=>{event.preventDefault();lost=true;setLoop('never')};
 const contextRestored=()=>{
  lost=false;refreshLighting(getState(),{contextRestored:true});onRestore();resume();
 };
 const listeners=[[page,'visibilitychange',resume],[windowTarget,'focus',resume],[windowTarget,'pageshow',resume],[canvas,'webglcontextlost',contextLost],[canvas,'webglcontextrestored',contextRestored]];
 for(const [target,event,handler] of listeners)target.addEventListener(event,handler);
 resume();
 return {update:resume,dispose(){for(const [target,event,handler]of listeners)target.removeEventListener(event,handler)}};
}
