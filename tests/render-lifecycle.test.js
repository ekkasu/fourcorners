import test from 'node:test';
import assert from 'node:assert/strict';
import {ACESFilmicToneMapping,NoToneMapping,LinearSRGBColorSpace,SRGBColorSpace,Scene,DirectionalLight,Texture} from 'three';
import {bindRenderLifecycle,ensureRenderColor} from '../src/render-lifecycle.js';
import {createFrameBudget} from '../src/frame-budget.js';

function fixture(mode='always'){
 const page=new EventTarget(),windowTarget=new EventTarget(),canvas=new EventTarget();page.hidden=false;
 const scene=new Scene(),light=new DirectionalLight();scene.add(light);scene.environment=new Texture();
 let redraws=0,rebuilds=0,resets=0;
 const state={frameloop:mode,clock:{elapsedTime:42},internal:{priority:0},scene,
  gl:{domElement:canvas,toneMapping:ACESFilmicToneMapping,toneMappingExposure:1,outputColorSpace:SRGBColorSpace,shadowMap:{needsUpdate:false},resetState(){resets++},setRenderTarget(target){assert.equal(target,null)}},
  setFrameloop(value){state.frameloop=value;state.clock.elapsedTime=0},invalidate(){redraws++}};
 const lifecycle=bindRenderLifecycle({getState:()=>state,getMode:()=>mode,onRestore:()=>rebuilds++,page,windowTarget});
 return {state,scene,light,page,windowTarget,canvas,lifecycle,stats:()=>({redraws,rebuilds,resets}),setMode(value){mode=value;lifecycle.update()},visibility(hidden){page.hidden=hidden;page.dispatchEvent(new Event('visibilitychange'))}};
}

test('app switches suspend rendering but preserve elapsed game time',()=>{
 const f=fixture();
 for(let i=0;i<5;i++){
  f.state.clock.elapsedTime=42+i;f.visibility(true);
  assert.equal(f.state.frameloop,'never');assert.equal(f.state.clock.elapsedTime,42+i);
  f.visibility(false);assert.equal(f.state.frameloop,'always');assert.equal(f.state.clock.elapsedTime,42+i);
 }
 assert.equal(f.stats().rebuilds,0,'ordinary app switches do not restart the scene or rebuild GPU effects');f.lifecycle.dispose();
});
test('returning repairs color output, tone mapping and shadow updates',()=>{
 const f=fixture('demand');f.visibility(true);
 Object.assign(f.state.gl,{toneMapping:NoToneMapping,toneMappingExposure:.3,outputColorSpace:LinearSRGBColorSpace});
 f.state.gl.shadowMap.needsUpdate=false;f.light.shadow.needsUpdate=false;
 f.visibility(false);
 assert.equal(f.state.gl.toneMapping,ACESFilmicToneMapping);assert.equal(f.state.gl.outputColorSpace,SRGBColorSpace);assert.equal(f.state.gl.toneMappingExposure,1);
 assert.equal(f.light.shadow.needsUpdate,true);assert.equal(f.state.gl.shadowMap.needsUpdate,true);assert.equal(f.state.frameloop,'demand');assert.equal(f.stats().redraws,2);f.lifecycle.dispose();
});
test('only one tone mapper is enabled when postprocessing is mounted or removed',()=>{
 const f=fixture();f.state.internal.priority=1;ensureRenderColor(f.state);assert.equal(f.state.gl.toneMapping,NoToneMapping);
 f.visibility(true);f.visibility(false);assert.equal(f.state.gl.toneMapping,NoToneMapping);
 f.state.internal.priority=0;ensureRenderColor(f.state);assert.equal(f.state.gl.toneMapping,ACESFilmicToneMapping);f.lifecycle.dispose();
});
test('GPU restoration rebuilds cached lighting and redraws demand previews without remounting scene',()=>{
 const f=fixture('demand'),scene=f.scene,version=f.scene.environment.version;
 let disposed=0;f.light.shadow.map={dispose(){disposed++}};f.light.shadow.mapPass={dispose(){disposed++}};
 const lost=new Event('webglcontextlost',{cancelable:true});f.canvas.dispatchEvent(lost);
 assert.equal(lost.defaultPrevented,true);assert.equal(f.state.frameloop,'never');
 f.canvas.dispatchEvent(new Event('webglcontextrestored'));
 assert.equal(f.state.frameloop,'demand');assert.equal(f.state.clock.elapsedTime,42);assert.equal(f.scene,scene);
 assert.equal(f.stats().rebuilds,1);assert.equal(disposed,2);assert.equal(f.light.shadow.map,null);assert.ok(f.scene.environment.version>version);assert.equal(f.stats().redraws,2);f.lifecycle.dispose();
});
test('context restoration while hidden waits for return and uses the current screen mode',()=>{
 const f=fixture();f.visibility(true);f.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
 f.setMode('demand');f.canvas.dispatchEvent(new Event('webglcontextrestored'));assert.equal(f.state.frameloop,'never');
 f.windowTarget.dispatchEvent(new Event('focus'));assert.equal(f.state.frameloop,'never');
 f.visibility(false);assert.equal(f.state.frameloop,'demand');f.lifecycle.dispose();
});
test('focus and restored browser pages redraw; cleanup removes all recovery listeners',()=>{
 const f=fixture();f.windowTarget.dispatchEvent(new Event('focus'));f.windowTarget.dispatchEvent(new Event('pageshow'));
 assert.equal(f.stats().redraws,3);f.lifecycle.dispose();f.visibility(true);f.windowTarget.dispatchEvent(new Event('focus'));f.canvas.dispatchEvent(new Event('webglcontextrestored'));
 assert.equal(f.stats().redraws,3);assert.equal(f.stats().rebuilds,0);assert.equal(f.state.frameloop,'always');
});
test('background throttling and resume stalls cannot lower graphics quality',()=>{
 const b=createFrameBudget();let declined=0;
 for(let i=0;i<400;i++)declined+=b.sample(1/60);
 for(let i=0;i<300;i++)declined+=b.sample(.1,false);
 declined+=b.sample(2);for(let i=0;i<40;i++)declined+=b.sample(.05);
 for(let i=0;i<600;i++)declined+=b.sample(1/60);
 assert.equal(declined,0);
});
test('sustained low gameplay FPS still lowers quality after warmup',()=>{
 const b=createFrameBudget();let declined=0;
 for(let i=0;i<250;i++)declined+=b.sample(.05);
 assert.equal(declined,1);
 b.reset();for(let i=0;i<30;i++)assert.equal(b.sample(.05),false);
});
