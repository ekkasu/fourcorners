import {useEffect,useRef,useState} from 'react';
import {createMatchIntro} from './match-intro.js';
export function useMatchIntro(muted){
 const [active,setActive]=useState(false),controller=useRef(null);
 if(!controller.current)controller.current=createMatchIntro({onActive:setActive});
 useEffect(()=>{controller.current.setMuted(muted)},[muted]);
 useEffect(()=>()=>controller.current.stop(),[]);
 return {active,play:()=>controller.current.play(muted),stop:()=>controller.current.stop()};
}
