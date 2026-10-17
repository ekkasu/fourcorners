import FullscreenButton from './FullscreenButton.jsx';
import React, {useEffect, useRef, useState} from 'react';
import {sfx} from './sound.js';
import './front-door.css';

const ITEMS = [
 ['play', 'Play', 'Four corners. Three rivals. Be the last player standing.'],
 ['training', 'Training', 'Find your rhythm. Practise your touch against three AI rivals.'],
 ['lobby', 'Private Room', 'Create a room, invite your friends and defend your corner together.'],
 ['arenas', 'Arenas', 'From Accra to Kumasi. Find your home court.'],
 ['locker', 'Player Locker', 'Your colours. Your number. Your street legend.'],
 ['profile', 'Player Profile', 'Sign in, save your identity and track your multiplayer record.'],
 ['leaderboard', 'Leaderboard', 'See the top players and earn your place on the street.'],
 ['howto', 'How to Play', 'Learn to move, strike, tackle and defend your corner.'],
 ['settings', 'Settings', 'Set the sound and music for your next match.'],
];

function Wordmark(){return <div className="fc-brand"><h1>FOUR<span>CORNERS</span></h1><p><i/> STREET FOOTBALL <i/></p></div>}

export default function FrontDoor({entered, onEnter, onNavigate, onHowTo, name, level, stats, arena, muted, musicOn, onMute, onMusic, user=null, onAuth}){
 const [selected,setSelected]=useState(0),[settings,setSettings]=useState(false);
 const buttons=useRef([]),start=useRef(),settingsClose=useRef();
 const begin=()=>{sfx.unlock();onEnter()};
 const activate=id=>{if(id==='settings')setSettings(true);else if(id==='howto')onHowTo();else onNavigate(id)};
 useEffect(()=>{if(!entered)start.current?.focus();else buttons.current[0]?.focus()},[entered]);
 useEffect(()=>{if(settings)settingsClose.current?.focus()},[settings]);
 function closeSettings(){setSettings(false);buttons.current[ITEMS.findIndex(([id])=>id==='settings')]?.focus()}
 useEffect(()=>{
  function key(e){
   if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||document.querySelector('.tutorial')||e.target.closest?.('.fullscreen-button, .fc-auth-actions'))return;
   if(!entered){if(e.key.length===1||e.key==='Enter'){e.preventDefault();begin()}return}
   if(settings){if(e.key==='Escape'){e.preventDefault();closeSettings()}return}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();const next=(selected+(e.key==='ArrowDown'?1:-1)+ITEMS.length)%ITEMS.length;
    setSelected(next);buttons.current[next]?.focus();
   }
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[entered,selected,settings,onEnter]);
 return <section className={'front-door '+(entered?'fc-menu':'fc-launch')} aria-label={entered?'Four Corners main menu':'Four Corners title screen'}>
  <div className="fc-cover" aria-hidden="true"/><div className="fc-vignette" aria-hidden="true"/>
  <div className="fc-dust" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--x':`${(i*19+7)%100}%`,'--delay':`${-i*1.7}s`,'--time':`${7+i%5}s`}}/>)}</div>
  {!entered?<>
   <div className="fc-launch-brand"><Wordmark/><span className="fc-origin">BORN IN GHANA · PLAYED EVERYWHERE</span></div>
   <div className="fc-start-block"><button ref={start} className="fc-start" onClick={begin}><i/>PRESS START<i/></button><p>PRESS <kbd>ENTER</kbd> OR ANY KEY · TAP TO BEGIN</p>{onAuth&&<div className="fc-launch-auth"><span>SAVE YOUR RECORD. CLIMB THE LEADERBOARD.</span><div className="fc-auth-actions"><button onClick={()=>onAuth('signin')}>SIGN IN</button><button className="fc-auth-create" onClick={()=>onAuth('signup')}>CREATE ACCOUNT</button></div><small>Or press Start to play as a guest</small></div>}</div>
   <div className="fc-launch-fullscreen"><FullscreenButton/></div><div className="fc-sound-hint">♫ &nbsp; BEST WITH SOUND ON</div>
  </>:<>
   <div className="fc-menu-body"><Wordmark/><div className="fc-menu-kicker">OWN YOUR CORNER</div>
    <nav className="fc-main-menu" aria-label="Main menu">{ITEMS.map(([id,label],i)=><button ref={el=>buttons.current[i]=el} key={id} className={selected===i?'is-selected':''} onFocus={()=>setSelected(i)} onPointerEnter={e=>{setSelected(i);e.currentTarget.focus({preventScroll:true})}} onClick={()=>activate(id)}><span className="fc-menu-marker" aria-hidden="true">◆</span><span>{id==='profile'&&!user?'Sign In / Sign Up':label}</span></button>)}</nav>
    <p className="fc-menu-description" aria-live="polite">{ITEMS[selected][2]}</p>
   </div>
   {user?<button className="fc-profile" onClick={()=>onNavigate('profile')} aria-label={`Open ${name}'s player profile`}><span className="fc-profile-icon">{String(level).padStart(2,'0')}</span><span><strong>{name}</strong><small>LEVEL {level} · {stats.wins} WINS</small></span><b aria-hidden="true">↗</b></button>:<div className="fc-guest-entry"><span>PLAYING AS A GUEST</span><div className="fc-auth-actions"><button onClick={()=>onAuth?.('signin')}>SIGN IN</button><button className="fc-auth-create" onClick={()=>onAuth?.('signup')}>CREATE ACCOUNT</button></div></div>}

   <div className="fc-menu-fullscreen"><FullscreenButton/></div><div className="fc-court-note"><span>YOUR HOME GROUND</span><strong>{arena.name}</strong><small>GHANA · STREET FOOTBALL</small></div>
   <footer className="fc-menu-footer"><span><kbd>↑</kbd><kbd>↓</kbd> MOVE <kbd>ENTER</kbd> SELECT</span><span>FOUR GOALS. ONE CHAMPION.</span><div className="fc-footer-actions"><button onClick={onMute} aria-label={muted?'Unmute sounds':'Mute sounds'}>{muted?'SOUND OFF':'♫ SOUND ON'}</button></div></footer>
  </>}
  {settings&&<div className="fc-settings-shade" onClick={e=>{if(e.target===e.currentTarget)closeSettings()}}><section className="fc-settings" role="dialog" aria-modal="true" aria-labelledby="fc-settings-title" onKeyDown={e=>{if(e.key==='Tab'){const controls=[...e.currentTarget.querySelectorAll('button')];if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus()}}}}><span className="fc-menu-kicker">MAKE IT YOUR GAME</span><h2 id="fc-settings-title">Settings</h2><button ref={settingsClose} className="fc-settings-close" aria-label="Close settings" onClick={closeSettings}>×</button><button className="fc-setting" aria-pressed={!muted} onClick={onMute}><span>Sound effects</span><b>{muted?'OFF':'ON'}</b></button><button className="fc-setting" aria-pressed={musicOn} onClick={onMusic}><span>Match music</span><b>{musicOn?'ON':'OFF'}</b></button><p>Match rules, difficulty and camera are available in Play.</p><button className="btn" onClick={closeSettings}>BACK TO MENU</button></section></div>}
 </section>
}
