import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scrypt as derive,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const scrypt=promisify(derive),digest=value=>createHash('sha256').update(value).digest('hex');
const PUBLIC='id, username, display_name AS displayName, bio, matches, wins, draws, goals, points, created_at AS joinedAt';
export class AccountStore{
 constructor(filename){
  if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(filename);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
   CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,display_name TEXT NOT NULL,bio TEXT NOT NULL DEFAULT '',password TEXT NOT NULL,created_at INTEGER NOT NULL,matches INTEGER NOT NULL DEFAULT 0,wins INTEGER NOT NULL DEFAULT 0,draws INTEGER NOT NULL DEFAULT 0,goals INTEGER NOT NULL DEFAULT 0,points INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS results(match_id TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS rankings ON accounts(points DESC,wins DESC,goals DESC);`);
 }
 profile(id){const p=this.db.prepare(`SELECT ${PUBLIC} FROM accounts WHERE id=?`).get(id);if(!p)return null;return {...p,rank:p.matches?this.db.prepare('SELECT COUNT(*)+1 AS rank FROM accounts WHERE matches>0 AND (points>? OR (points=? AND wins>?) OR (points=? AND wins=? AND goals>? ) OR (points=? AND wins=? AND goals=? AND username<?))').get(p.points,p.points,p.wins,p.points,p.wins,p.goals,p.points,p.wins,p.goals,p.username).rank:null}}
 async signup({username,displayName,password}={}){
  username=String(username||'').trim().toLowerCase();displayName=String(displayName||username).trim();
  if(!/^[a-z0-9_]{3,20}$/.test(username))throw new Error('Use 3–20 letters, numbers or underscores for your username.');
  if(!displayName||displayName.length>20)throw new Error('Player name must be 1–20 characters.');
  if(typeof password!=='string'||password.length<12||password.length>128)throw new Error('Use a password between 12 and 128 characters.');
  const salt=randomBytes(16).toString('hex'),hash=Buffer.from(await scrypt(password,salt,64)).toString('hex'),id=randomUUID();
  try{this.db.prepare('INSERT INTO accounts(id,username,display_name,password,created_at) VALUES(?,?,?,?,?)').run(id,username,displayName,`${salt}:${hash}`,Date.now())}catch(e){if(e.errcode===2067||e.code?.includes('CONSTRAINT'))throw new Error('That username is unavailable.');throw e}
  return this.profile(id);
 }
 async login({username,password}={}){
  const user=this.db.prepare('SELECT id,password FROM accounts WHERE username=?').get(String(username||'').trim().toLowerCase());
  const [salt,stored]=(user?.password||`${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  const hash=await scrypt(typeof password==='string'?password.slice(0,128):'',salt,64);
  if(typeof password!=='string'||password.length>128||!user||!timingSafeEqual(Buffer.from(stored,'hex'),hash))throw new Error('Username or password is incorrect.');
  return this.profile(user.id);
 }
 session(id){const token=randomBytes(32).toString('hex');this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),id,Date.now()+30*86400000);return token}
 user(token){if(!token)return null;const s=this.db.prepare('SELECT account_id FROM sessions WHERE token=? AND expires>?').get(digest(token),Date.now());return s?this.profile(s.account_id):null}
 logout(token){if(token)this.db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token))}
 update(id,{displayName,bio}={}){if(typeof displayName!=='string'||!displayName.trim()||displayName.trim().length>20||typeof bio!=='string'||bio.length>160)throw new Error('Use a player name up to 20 characters and a bio up to 160.');this.db.prepare('UPDATE accounts SET display_name=?,bio=? WHERE id=?').run(displayName.trim(),bio.trim(),id);return this.profile(id)}
 leaderboard(){return this.db.prepare(`SELECT ${PUBLIC} FROM accounts WHERE matches>0 ORDER BY points DESC,wins DESC,goals DESC,username ASC LIMIT 100`).all().map((p,i)=>({...p,rank:i+1}))}
 record(matchId,match){
  // Only this server calls record; there is deliberately no client score API.
  if(!match.finished||match.elapsed<30)return false;
  const entries=match.players.filter(p=>p.accountId);
  if(entries.length<1||new Set(entries.map(p=>p.accountId)).size!==entries.length)return false;
  this.db.exec('BEGIN IMMEDIATE');
  try{
   if(!this.db.prepare('INSERT OR IGNORE INTO results VALUES(?,?)').run(matchId,Date.now()).changes){this.db.exec('ROLLBACK');return false}
   const update=this.db.prepare('UPDATE accounts SET matches=matches+1,wins=wins+?,draws=draws+?,goals=goals+?,points=points+? WHERE id=?');
   for(const p of entries){const won=match.winner===p.id?1:0,draw=!match.winner&&p.connected&&p.lives>0?1:0;update.run(won,draw,p.goals,won*3+draw,p.accountId)}
   this.db.exec('COMMIT');return true;
  }catch(e){this.db.exec('ROLLBACK');throw e}
 }
 beginSolo(id){const token=randomBytes(24).toString('hex');this.solo??=new Map();const now=Date.now();for(const[k,v]of this.solo)if(now-v.started>3600000)this.solo.delete(k);if(this.solo.size>10000)throw new Error('Please try again later.');this.solo.set(token,{id,started:now});return token}
 finishSolo(id,{ticket,result}={}){
  const entry=this.solo?.get(ticket);
  if(!entry||entry.id!==id)throw new Error('Match session expired. Start a new match.');
  if(!result||!['won','lost'].includes(result.result)||!['ffa','training'].includes(result.mode)||!Number.isFinite(result.time)||result.time<1||result.time>(Date.now()-entry.started)/1000+5||!Number.isInteger(result.stats?.goals)||result.stats.goals<0||result.stats.goals>100)throw new Error('Invalid match result.');
  const match={finished:true,elapsed:Math.max(30,result.time),winner:result.result==='won'?'solo-player':'ai',players:[{id:'solo-player',accountId:id,goals:result.stats.goals,lives:result.result==='won'?1:0,connected:true}]};
  const saved=this.record('solo:'+ticket,match);this.solo.delete(ticket);return saved;
 }
 close(){this.db.close()}
}
export const sessionToken=req=>{const raw=(req.headers.cookie||'').split(';').map(p=>p.trim()).find(p=>p.startsWith('fc_session='));return raw?.slice(11)||null};
