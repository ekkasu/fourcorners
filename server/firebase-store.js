import {randomBytes,createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const blank=(id,username,displayName)=>({id,username,displayName,bio:'',matches:0,wins:0,draws:0,goals:0,points:0,ranked:false,joinedAt:Date.now()});
export const validateIdentity=({username,displayName,bio=''},signup=false)=>{
 if(signup&&!/^[a-z0-9_]{3,20}$/.test(username||''))throw new Error('Use 3–20 letters, numbers or underscores for your username.');
 if(typeof displayName!=='string'||!displayName.trim()||displayName.trim().length>20||typeof bio!=='string'||bio.length>160)throw new Error('Use a player name up to 20 characters and a bio up to 160.');
 return {displayName:displayName.trim(),bio:bio.trim()};
};
export class FirebaseStore{
 constructor(db){this.db=db}
 async profile(id){
  const doc=await this.db.collection('players').doc(id).get();if(!doc.exists)return null;const p=doc.data();let rank=null;
  if(p.matches){const base=this.db.collection('players').where('ranked','==',true);const counts=await Promise.all([
   base.where('points','>',p.points).count().get(),
   base.where('points','==',p.points).where('wins','>',p.wins).count().get(),
   base.where('points','==',p.points).where('wins','==',p.wins).where('goals','>',p.goals).count().get(),
   base.where('points','==',p.points).where('wins','==',p.wins).where('goals','==',p.goals).where('username','<',p.username).count().get()
  ]);rank=1+counts.reduce((n,c)=>n+c.data().count,0)}
  const {ranked,...publicProfile}=p;return {...publicProfile,rank}
 }
 async register(uid,body){const username=String(body.username||'').trim().toLowerCase(),identity=validateIdentity({...body,username},true);const player=this.db.collection('players').doc(uid),name=this.db.collection('usernames').doc(username);
  await this.db.runTransaction(async tx=>{const [existing,taken]=await Promise.all([tx.get(player),tx.get(name)]);if(existing.exists)return;if(taken.exists)throw new Error('That username is unavailable.');tx.create(name,{uid});tx.create(player,{...blank(uid,username,identity.displayName),bio:identity.bio})});return this.profile(uid)
 }
 async update(uid,body){const identity=validateIdentity(body);const ref=this.db.collection('players').doc(uid);await ref.update(identity);return this.profile(uid)}
 async leaderboard(){const docs=await this.db.collection('players').where('ranked','==',true).orderBy('points','desc').orderBy('wins','desc').orderBy('goals','desc').orderBy('username','asc').limit(100).get();return docs.docs.map((d,i)=>{const {ranked,...profile}=d.data();return {...profile,rank:i+1}})}
 async beginSolo(uid){const ticket=randomBytes(24).toString('hex');await this.db.collection('matchTickets').doc(hash(ticket)).create({uid,started:Date.now(),expires:Date.now()+3600000});return ticket}
 async finishSolo(uid,{ticket,result}={}){
  if(typeof ticket!=='string'||!/^[a-f0-9]{48}$/.test(ticket))throw new Error('Match session expired. Start a new match.');
  const ref=this.db.collection('matchTickets').doc(hash(ticket)),player=this.db.collection('players').doc(uid);
  await this.db.runTransaction(async tx=>{const [t,p]=await Promise.all([tx.get(ref),tx.get(player)]);const entry=t.data();if(!entry||entry.uid!==uid||entry.expires<Date.now())throw new Error('Match session expired. Start a new match.');
   if(entry.used)return;
   if(!p.exists)throw new Error('Finish setting up your player profile.');
   if(!result||!['won','lost'].includes(result.result)||!['ffa','training'].includes(result.mode)||!Number.isFinite(result.time)||result.time<1||result.time>(Date.now()-entry.started)/1000+5||!Number.isInteger(result.stats?.goals)||result.stats.goals<0||result.stats.goals>100)throw new Error('Invalid match result.');
   const old=p.data(),won=result.result==='won'?1:0;
   tx.update(player,{ranked:true,matches:old.matches+1,wins:old.wins+won,goals:old.goals+result.stats.goals,points:old.points+won*3});tx.update(ref,{used:true});
  });return this.profile(uid)
 }
 async record(matchId,match){
  if(!match.finished||match.elapsed<30)return false;const entries=match.players.filter(p=>p.accountId);if(!entries.length||new Set(entries.map(p=>p.accountId)).size!==entries.length)return false;
  return this.db.runTransaction(async tx=>{const ref=this.db.collection('matchResults').doc(hash(matchId)),saved=await tx.get(ref);if(saved.exists)return false;
   const docs=await Promise.all(entries.map(p=>tx.get(this.db.collection('players').doc(p.accountId))));
   docs.forEach((doc,i)=>{if(!doc.exists)return;const p=entries[i],old=doc.data(),won=match.winner===p.id?1:0,draw=!match.winner&&p.connected&&p.lives>0?1:0;tx.update(doc.ref,{ranked:true,matches:old.matches+1,wins:old.wins+won,draws:old.draws+draw,goals:old.goals+p.goals,points:old.points+won*3+draw})});tx.create(ref,{createdAt:Date.now()});return true;
  })
 }
 async rateLimit(key,max=30){const ref=this.db.collection('apiLimits').doc(hash(key+Math.floor(Date.now()/60000)));return this.db.runTransaction(async tx=>{const doc=await tx.get(ref),n=(doc.data()?.count||0)+1;if(n>max)return false;tx.set(ref,{count:n,expires:Date.now()+120000});return true})}
}
