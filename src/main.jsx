import React,{Suspense,useState} from 'react';
import {createRoot} from 'react-dom/client';
import FrontDoor from './FrontDoor.jsx';
import './styles.css';
import './responsive.css';
const GameApp=React.lazy(()=>import('./GameApp.jsx'));
class BootBoundary extends React.Component{
 state={failed:false};static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="boot-loading" role="alert"><strong>CONNECTION INTERRUPTED</strong><p>Reload to finish loading the game.</p><button className="btn" onClick={()=>location.reload()}>RETRY</button></div>:this.props.children}
}
function Boot(){const [started,setStarted]=useState(false);return <BootBoundary>{started?<Suspense fallback={<div className="boot-loading" role="status"><strong>ENTERING THE STREET</strong><span className="boot-spinner"/><p>Preparing your game…</p></div>}><GameApp/></Suspense>:<FrontDoor entered={false} onEnter={()=>setStarted(true)}/>}</BootBoundary>}
createRoot(document.getElementById('root')).render(<Boot/>);
