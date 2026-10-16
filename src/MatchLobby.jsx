import FullscreenButton from './FullscreenButton.jsx';
import React from 'react';
import './match-lobby.css';
const MODES=[['Free-for-All','01','LAST CORNER STANDING','Three AI rivals. Three minutes. Defend your goal and eliminate the rest.'],['Training','02','FIND YOUR TOUCH','No clock. No pressure. Practise against three AI rivals.'],['Private Room','03','BRING YOUR CREW','Create a room, share the code and play a live match with friends.'],['Duo Battle','04','BETTER TOGETHER','Two against two. Team battles are coming soon.']];
function Choice({label,value,onChange,options}){return <div className="ml-setting"><span>{label}</span><div role="radiogroup" aria-label={label}>{options.map(([id,text])=><button key={id} role="radio" aria-checked={value===id} onClick={()=>onChange(id)}>{text}</button>)}</div></div>}
export default function MatchLobby({mode,setMode,arena,name,level,lives,setLives,difficulty,setDifficulty,oneTouch,setOneTouch,camMode,setCamMode,locked,lockText,onBack,onArena,onStart,onHowTo}){
 const current=MODES.find(m=>m[0]===mode)||MODES[0],local=mode==='Free-for-All'||mode==='Training';
 return <section className="match-lobby" aria-label="Match lobby">
  <div className="ml-backdrop" aria-hidden="true"/>
  <header className="ml-top"><button onClick={onBack} aria-label="Go back to previous screen">‹ <span>BACK</span></button><span className="ml-brand">FOUR<span>CORNERS</span></span><div className="ml-top-actions"><FullscreenButton/><span className="ml-player">{name} <b>LV {level}</b></span></div></header>
  <div className="ml-layout">
   <aside className="ml-mode-list"><p className="ml-kicker">PLAY YOUR WAY</p><h1>MATCH<br/>SETUP</h1><nav aria-label="Game mode">{MODES.map(([title,num,tag])=><button key={title} onClick={()=>setMode(title)} aria-pressed={mode===title}><small>{num}</small><span><strong>{title}</strong><em>{title==='Duo Battle'?'COMING SOON':tag}</em></span><i aria-hidden="true">{mode===title?'◆':'›'}</i></button>)}</nav></aside>
   <div className="ml-center"><span className="ml-kicker">{current[2]}</span><h2>{mode==='Free-for-All'?<>DEFEND YOUR CORNER.<br/><span>OWN THE STREET.</span></>:mode==='Training'?<>EVERY LEGEND<br/><span>STARTS HERE.</span></>:mode==='Private Room'?<>YOUR COURT.<br/><span>YOUR CREW.</span></>:<>TWO SIDES.<br/><span>ONE VICTORY.</span></>}</h2><p>{current[3]}</p><div className="ml-match-tags"><span>{mode==='Free-for-All'?'03:00 MATCH':mode==='Training'?'FREE PRACTICE':mode==='Private Room'?'ONLINE MATCH':'COMING SOON'}</span><span>{local?'YOU + 3 RIVALS':'2–4 PLAYERS'}</span></div></div>
   <aside className="ml-options"><div className="ml-options-heading"><span className="ml-kicker">{local?'MATCH RULES':'MATCH INFO'}</span><span>⚑</span></div>
    <button className="ml-arena" onClick={onArena}><span><small>SELECTED COURT</small><strong>{arena.name}</strong><em>{locked?'LOCKED · '+lockText:arena.type+' · '+arena.country}</em></span><b>›</b></button>
    {local?<>
     <Choice label="GOALS TO ELIMINATE" value={lives} onChange={setLives} options={[1,2,3,5].map(n=>[n,n])}/>
     <Choice label="RIVAL DIFFICULTY" value={difficulty} onChange={setDifficulty} options={['easy','normal','hard'].map(id=>[id,id])}/>
     <div className="ml-setting"><span>STREET RULES</span><button className="ml-toggle" aria-pressed={oneTouch} onClick={()=>setOneTouch(!oneTouch)}><span>One-touch football</span><b>{oneTouch?'ON':'OFF'}</b></button><p>{oneTouch?'After you play the ball, wait for another player to touch it before playing again.':'Keep possession and dribble freely.'}</p></div>
     <Choice label="CAMERA VIEW" value={camMode} onChange={setCamMode} options={[['close','Close'],['broadcast','Sideline'],['overhead','Overhead']]}/>
    </>:<p className="ml-info">{mode==='Private Room'?'Invite friends using a six-character room code. The next screen lets you create or join a room.':'Duo Battle is still in development. Choose Free-for-All or Training to get on the court.'}</p>}
    <div className="ml-ready"><i/>{mode==='Duo Battle'?'IN DEVELOPMENT':locked&&local?'SELECT AN UNLOCKED COURT':local?'READY TO HIT THE COURT':'GET YOUR FRIENDS TOGETHER'}</div>
    <button className="ml-kickoff" disabled={mode==='Duo Battle'||(local&&locked)} onClick={onStart}>{mode==='Training'?'START TRAINING':mode==='Private Room'?'ENTER LOBBY':mode==='Duo Battle'?'COMING SOON':'KICK OFF'}<span>→</span></button>
    <button className="ml-howto" onClick={onHowTo}>ⓘ HOW TO PLAY</button>
   </aside>
  </div>
  <footer className="ml-bottom"><span>GHANAIAN ROOTS. GLOBAL GAME.</span><span>FOUR GOALS <i/> ONE CHAMPION</span></footer>
 </section>
}
