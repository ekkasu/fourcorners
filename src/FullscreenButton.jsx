import React,{useEffect,useState} from 'react';
import {fullscreenElement,toggleFullscreen} from './fullscreen.js';
import './fullscreen.css';

export default function FullscreenButton({compact=false,className=''}){
 const [active,setActive]=useState(()=>!!fullscreenElement(document)),[error,setError]=useState('');
 useEffect(()=>{
  const update=()=>{setActive(!!fullscreenElement(document));setError('')};
  document.addEventListener('fullscreenchange',update);document.addEventListener('webkitfullscreenchange',update);
  return()=>{document.removeEventListener('fullscreenchange',update);document.removeEventListener('webkitfullscreenchange',update)};
 },[]);
 const label=active?'Exit fullscreen':'Enter fullscreen';
 return <span className="fullscreen-control"><button className={`fullscreen-button ${compact?'compact':''} ${className}`} aria-label={label} title={label} aria-pressed={active} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation()}} onClick={async()=>{try{await toggleFullscreen(document);setError('')}catch(e){setError(e.message||'Unable to enter fullscreen. Try opening the game in your browser.')}}}><i aria-hidden="true">{active?'⊡':'⛶'}</i><span>{active?'EXIT FULLSCREEN':'FULLSCREEN'}</span></button>{error&&<span className="fullscreen-error" role="status">{error}</span>}</span>;
}
