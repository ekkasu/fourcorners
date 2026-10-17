import {useEffect,useState} from 'react';
export const GRAPHICS={
 low:{dpr:1,shadows:false,shadowSize:512,crowd:false,props:false,effects:false,antialias:true},
 balanced:{dpr:1.5,shadows:true,shadowSize:1024,crowd:true,props:true,effects:false,antialias:true},
 high:{dpr:1.75,shadows:true,shadowSize:2048,crowd:true,props:true,effects:true,antialias:true},
};
export function initialQuality({memory=8,cores=4,coarse=false,saveData=false}={}){
 if(saveData||memory<=2)return 'low';
 if(coarse)return 'balanced';
 if(memory<=4)return 'low';
 return memory>=8&&cores>=8?'high':'balanced';
}
export function lowerQuality(tier){return tier==='high'?'balanced':'low'}
export function graphicsPreset(tier,mobile=false){return {...GRAPHICS[tier],...(mobile?{crowd:false,effects:false,shadowSize:Math.min(1024,GRAPHICS[tier].shadowSize)}:{})}}
export function useGraphics(){
 const [mobile,setMobile]=useState(()=>matchMedia('(pointer: coarse), (max-width: 700px)').matches);
 useEffect(()=>{const query=matchMedia('(pointer: coarse), (max-width: 700px)'),update=()=>setMobile(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 const [tier,setTier]=useState(()=>initialQuality({memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,coarse:mobile,saveData:navigator.connection?.saveData}));
 return {...graphicsPreset(tier,mobile),mobile,animationFps:mobile?30:60,tier,decline:()=>setTier(lowerQuality)};
}
export function usePageVisible(){const [visible,setVisible]=useState(()=>!document.hidden);useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);return visible}
