import React,{useLayoutEffect,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {bindRenderLifecycle,ensureRenderColor} from './render-lifecycle.js';

// Keep the scene and its match state mounted; only GPU-only effects are rebuilt.
export default function RenderLifecycle({mode='always',children}){
 const get=useThree(state=>state.get),modeRef=useRef(mode),lifecycle=useRef(null);
 const [revision,setRevision]=useState(0);modeRef.current=mode;
 useLayoutEffect(()=>{
  const controller=bindRenderLifecycle({getState:get,getMode:()=>modeRef.current,onRestore:()=>setRevision(n=>n+1)});
  lifecycle.current=controller;return()=>{controller.dispose();lifecycle.current=null};
 },[get]);
 useLayoutEffect(()=>{lifecycle.current?.update()},[mode,revision]);
 useFrame(state=>ensureRenderColor(state),-100);
 return children?.(revision)||null;
}
