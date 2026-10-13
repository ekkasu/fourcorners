// Player progression: XP and levels, level unlocks, daily challenges and the arena tour. Saved on this device
// (localStorage 'fc_progress'). Pure functions; the UI lives in main.jsx.

// XP per match event. The subtotal is scaled by difficulty; daily challenges add a flat bonus on top.
export const XP={match:25,goal:50,knockout:75,tackle:15,skill:10,win:200,second:100,third:50,challenge:150};
export const DIFFICULTY_XP={easy:.75,normal:1,hard:1.5};
// XP needed to go from `level` to the next one: 250, 350, 450, ...
export const levelNeed=level=>250+100*(level-1);
export function levelInfo(xp){let level=1,into=Math.max(0,Math.floor(xp));while(into>=levelNeed(level)){into-=levelNeed(level);level++}return{level,into,need:levelNeed(level)}}

// Level needed for Locker items. Anything not listed is free from the start.
const UNLOCK_LEVELS={
 boots:{'#f4f4f4':2,'#ffcf1f':2,'#39ff6a':7,'#ff4fa3':7,'#2f7bff':7,'#ff6a1f':7},
 pattern:{hoops:3,sash:6,halves:11},
 celebration:{cel_fistpump:3,cel_rally:6,cel_backflip:9,cel_dance:12},
 jersey:{'#16181d':5,'#f4f4f4':10,'#ff7a1a':14}};
export function requiredLevel(kind,id){if(id==='default')return 1;if(kind==='shorts')return 4;if(kind==='socks')return 8;return UNLOCK_LEVELS[kind]?.[id]||1}
export const isLocked=(kind,id,level)=>requiredLevel(kind,id)>level;
// Everything that unlocks between two levels (used for the match-end "Unlocked" list).
export function unlocksBetween(from,to,options){const out=[];for(const[kind,list]of Object.entries(options))for(const[id,label]of list){const need=requiredLevel(kind,id);if(need>from&&need<=to)out.push({kind,id,label,need})}return out.sort((a,b)=>a.need-b.need)}

// Arena tour: each arena opens after a win on the one before it, or at a level.
export const ARENA_ORDER=['accra','kumasi','village','school','london'];
const ARENA_LEVELS=[1,3,5,7,9];
export function arenaRequirement(id){const i=ARENA_ORDER.indexOf(id);return i<=0?null:{previous:ARENA_ORDER[i-1],level:ARENA_LEVELS[i]}}
export function arenaUnlocked(id,progress){const req=arenaRequirement(id);if(!req)return true;return levelInfo(progress.xp).level>=req.level||(progress.arenaWins?.[req.previous]||0)>0}

// Daily challenges: three a day, picked from the pool by the date so they stay the same all day.
const POOL=[
 {id:'goals3',text:'Score 3 goals',stat:'goals',target:3},
 {id:'goals6',text:'Score 6 goals',stat:'goals',target:6},
 {id:'tackles5',text:'Win 5 tackles',stat:'tackles',target:5},
 {id:'skills4',text:'Pull off 4 skill moves',stat:'skills',target:4},
 {id:'ko1',text:'Knock out a rival',stat:'knockouts',target:1},
 {id:'ko3',text:'Knock out 3 rivals',stat:'knockouts',target:3},
 {id:'win1',text:'Win a match',stat:'wins',target:1},
 {id:'hardwin',text:'Win a match on Hard',stat:'hardWins',target:1},
 {id:'curl',text:'Score with a curled shot',stat:'curlGoals',target:1},
 {id:'ffa2',text:'Play 2 Free-for-All matches',stat:'ffaMatches',target:2},
 {id:'top2',text:'Finish top 2 in Free-for-All',stat:'ffaTop2',target:1}];
export const today=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function dailyFor(date){let h=2166136261;for(const c of date){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}const picked=[],stats=new Set();
 for(let n=0;picked.length<3&&n<50;n++){h=Math.imul(h^(h>>>13),2654435761)>>>0;const c=POOL[h%POOL.length];if(!stats.has(c.stat)){stats.add(c.stat);picked.push({...c,progress:0,done:false})}}return{date,challenges:picked}}
export function freshDaily(progress){const date=today();return progress.daily?.date===date?progress:{...progress,daily:dailyFor(date)}}

const KEY='fc_progress';
// First run: existing career stats count as starting XP, so long-time players keep their standing.
export function loadProgress(career){let p=null;try{p=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
 if(!p||typeof p.xp!=='number'){const c=career||{};p={xp:(c.matches||0)*XP.match+(c.goals||0)*XP.goal+(c.knockouts||0)*XP.knockout+(c.wins||0)*XP.win,arenaWins:{}}}
 return freshDaily({arenaWins:{},...p})}
export function saveProgress(p){try{localStorage.setItem(KEY,JSON.stringify(p))}catch{}}

// Applies a finished match. Returns the new progress and what to show on the results screen.
export function applyMatch(progress,summary,{difficulty='normal',arenaId,mode}){
 const p=freshDaily(progress),s=summary.stats||{},won=summary.result==='won',ffa=mode==='ffa',place=summary.place||4,lines=[];
 const add=(label,xp)=>{if(xp>0)lines.push([label,xp])};
 add('Match played',XP.match);add(`Goals ×${s.goals||0}`,(s.goals||0)*XP.goal);add(`Knockouts ×${s.knockouts||0}`,(s.knockouts||0)*XP.knockout);
 add(`Tackles ×${s.tackles||0}`,(s.tackles||0)*XP.tackle);add(`Skills ×${s.skills||0}`,(s.skills||0)*XP.skill);
 if(won)add(ffa?'1st place':'Win',XP.win);else if(ffa&&place===2)add('2nd place',XP.second);else if(ffa&&place===3)add('3rd place',XP.third);
 const scale=DIFFICULTY_XP[difficulty]||1,base=Math.round(lines.reduce((t,[,x])=>t+x,0)*scale);
 // Daily challenges count this match's numbers.
 const counts={goals:s.goals||0,tackles:s.tackles||0,skills:s.skills||0,knockouts:s.knockouts||0,curlGoals:s.curlGoals||0,wins:won?1:0,hardWins:won&&difficulty==='hard'?1:0,ffaMatches:ffa?1:0,ffaTop2:ffa&&place<=2?1:0};
 const completed=[];const challenges=p.daily.challenges.map(c=>{if(c.done)return c;const progress=Math.min(c.target,c.progress+(counts[c.stat]||0)),done=progress>=c.target;if(done)completed.push(c.text);return{...c,progress,done}});
 const bonus=completed.length*XP.challenge,before=levelInfo(p.xp),xp=p.xp+base+bonus,after=levelInfo(xp);
 const arenaWins={...p.arenaWins};if(won&&arenaId)arenaWins[arenaId]=(arenaWins[arenaId]||0)+1;
 const next={...p,xp,arenaWins,daily:{...p.daily,challenges}};
 const arenasUnlocked=ARENA_ORDER.filter(id=>!arenaUnlocked(id,p)&&arenaUnlocked(id,next));
 return{progress:next,award:{lines,scale,base,bonus,total:base+bonus,completed,before:{...before,xp:p.xp},after:{...after,xp},arenasUnlocked}}}
