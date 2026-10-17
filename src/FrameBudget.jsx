import {useEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {createFrameBudget} from './frame-budget.js';

export default function FrameBudget({onDecline}){
 const budget=useRef(null);if(!budget.current)budget.current=createFrameBudget();
 useEffect(()=>{
  const reset=()=>budget.current.reset();document.addEventListener('visibilitychange',reset);window.addEventListener('focus',reset);
  return()=>{document.removeEventListener('visibilitychange',reset);window.removeEventListener('focus',reset)};
 },[]);
 useFrame((_,delta)=>{if(budget.current.sample(delta,!document.hidden&&document.hasFocus()))onDecline()});
 return null;
}
