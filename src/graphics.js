import {useEffect,useState} from 'react';
export const GRAPHICS={
 low:{dpr:.85,shadows:false,shadowSize:512,crowd:false,props:false,effects:false},
 balanced:{dpr:1.2,shadows:true,shadowSize:1024,crowd:true,props:true,effects:false},
 high:{dpr:1.5,shadows:true,shadowSize:2048,crowd:true,props:true,effects:true},
};
export function initialQuality({memory=8,cores=4,coarse=false,saveData=false}={}){
 if(coarse||saveData||memory<=4)return 'low';
 return !coarse&&memory>=8&&cores>=8?'high':'balanced';
}
export function lowerQuality(tier){return tier==='high'?'balanced':'low'}
export function useGraphics(){
 const [mobile,setMobile]=useState(()=>matchMedia('(pointer: coarse), (max-width: 700px)').matches);
 useEffect(()=>{const query=matchMedia('(pointer: coarse), (max-width: 700px)'),update=()=>setMobile(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 const [tier,setTier]=useState(()=>initialQuality({memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,coarse:mobile,saveData:navigator.connection?.saveData}));
 const [resolution,setResolution]=useState(1);
 const active=mobile?'low':tier;
 return {...GRAPHICS[active],dpr:GRAPHICS[active].dpr*resolution,mobile,animationFps:mobile?30:60,tier:active,decline:()=>{if(active==='low')setResolution(v=>Math.max(.75,v-.1));else setTier(lowerQuality)}};
}
export function usePageVisible(){const [visible,setVisible]=useState(()=>!document.hidden);useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);return visible}
