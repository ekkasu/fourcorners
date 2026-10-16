import {useEffect,useState} from 'react';
export const GRAPHICS={
 low:{dpr:.85,shadows:false,shadowSize:512,crowd:false,props:false,effects:false},
 balanced:{dpr:1.2,shadows:true,shadowSize:1024,crowd:true,props:true,effects:false},
 high:{dpr:1.5,shadows:true,shadowSize:2048,crowd:true,props:true,effects:true},
};
export function initialQuality({memory=8,cores=4,coarse=false,saveData=false}={}){
 if(saveData||memory<=4||cores<=4&&coarse)return 'low';
 return !coarse&&memory>=8&&cores>=8?'high':'balanced';
}
export function lowerQuality(tier){return tier==='high'?'balanced':'low'}
export function useGraphics(){
 const [tier,setTier]=useState(()=>initialQuality({memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,coarse:matchMedia('(pointer: coarse)').matches,saveData:navigator.connection?.saveData}));
 return {...GRAPHICS[tier],tier,decline:()=>setTier(lowerQuality)};
}
export function usePageVisible(){const [visible,setVisible]=useState(()=>!document.hidden);useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);return visible}
