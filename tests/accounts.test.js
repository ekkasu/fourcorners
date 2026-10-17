import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {AccountStore,sessionToken} from '../server/accounts.js';
import {accountApi} from '../server/account-api.js';
const credentials=username=>({username,displayName:username.toUpperCase(),password:'a long test passphrase'});
const setup=async()=>{const store=new AccountStore(':memory:');const a=await store.signup(credentials('ama')),b=await store.signup(credentials('kojo'));return{store,a,b}};

test('accounts hash passwords, normalize usernames and expose no secrets',async t=>{
 const s=new AccountStore(':memory:');t.after(()=>s.close());
 const p=await s.signup(credentials('Ama'));
 assert.equal(p.username,'ama');assert.equal(p.rank,null);assert.equal(p.password,undefined);
 const stored=s.db.prepare('SELECT password FROM accounts').get().password;
 assert.notEqual(stored,credentials('').password);assert.ok(stored.includes(':'));
 assert.equal((await s.login(credentials('AMA'))).id,p.id);
 await assert.rejects(()=>s.signup(credentials('ama')),/unavailable/);
 await assert.rejects(()=>s.login({...credentials('ama'),password:'incorrect password'}),/incorrect/);
 await assert.rejects(()=>s.login(credentials('missing')),/incorrect/);
 await assert.rejects(()=>s.signup({...credentials('short'),password:'short'}),/12/);
 await assert.rejects(()=>s.signup(credentials('../bad')),/username/);
});
test('sessions expire, survive database reopen, and are revoked on sign-out',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'fc-account-')),file=path.join(dir,'accounts.sqlite');
 let s=new AccountStore(file);
 try{
  const p=await s.signup(credentials('ama')),token=s.session(p.id);
  assert.equal(s.db.prepare('SELECT token FROM sessions').get().token===token,false);
  s.close();s=new AccountStore(file);assert.equal(s.user(token).id,p.id);
  s.logout(token);assert.equal(s.user(token),null);
  const expired=s.session(p.id);s.db.prepare('UPDATE sessions SET expires=0').run();assert.equal(s.user(expired),null);
  assert.equal(s.user('forged'),null);
  assert.equal(sessionToken({headers:{cookie:`other=1; fc_session=${token}`}}),token);
 }finally{s.close();rmSync(dir,{recursive:true,force:true})}
});
test('profile updates only change public identity, never ranked statistics',async t=>{
 const {store:s,a}=await setup();t.after(()=>s.close());
 const edited=s.update(a.id,{displayName:'Street Ama',bio:'My home court',wins:999,points:999,id:'other'});
 assert.equal(edited.displayName,'Street Ama');assert.equal(edited.wins,0);assert.equal(edited.points,0);
 assert.throws(()=>s.update(a.id,{displayName:'',bio:''}),/player name/);
});
test('verified results are ranked once, persist totals and exclude guests or short matches',async t=>{
 const {store:s,a,b}=await setup();t.after(()=>s.close());
 const match={finished:true,elapsed:100,winner:'p1',players:[{id:'p1',accountId:a.id,goals:3,lives:3,connected:true},{id:'p2',accountId:b.id,goals:1,lives:0,connected:true}]};
 assert.equal(s.record('one',match),true);assert.equal(s.record('one',match),false);
 assert.equal(s.profile(a.id).points,3);assert.equal(s.profile(a.id).wins,1);assert.equal(s.profile(b.id).matches,1);
 assert.equal(s.leaderboard()[0].id,a.id);assert.equal(s.profile(b.id).rank,2);
 assert.equal(s.record('short',{...match,elapsed:10}),false);
 assert.equal(s.record('unfinished',{...match,finished:false}),false);
 assert.equal(s.record('guest',{...match,players:[match.players[0],{...match.players[1],accountId:null}]}),false);
 assert.equal(s.record('duplicate-account',{...match,players:[match.players[0],{...match.players[1],accountId:a.id}]}),false);
 s.record('draw',{...match,winner:null,players:match.players.map(p=>({...p,lives:1}))});
 assert.equal(s.profile(a.id).points,4);assert.equal(s.profile(b.id).points,1);assert.equal(s.profile(a.id).draws,1);
 assert.ok(s.leaderboard().every(p=>!('password'in p)));
});
async function request(api,route,{method='GET',body,cookie,origin='http://localhost',ip='test'}={}){
 const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);req.url='/api/'+route;req.method=method;req.headers={host:'localhost',origin,'content-type':'application/json',cookie};req.socket={remoteAddress:ip};
 const headers={};const res={setHeader(k,v){headers[k]=v},writeHead(status,h){this.status=status;Object.assign(headers,h)},end(data){this.body=data?JSON.parse(data):null}};
 await api(req,res);return {...res,headers};
}
test('account API rejects cross-origin changes, requires authentication and uses private cookies',async t=>{
 const s=new AccountStore(':memory:');t.after(()=>s.close());const api=accountApi(s);
 assert.equal((await request(api,'signup',{method:'POST',body:credentials('ama'),origin:'https://evil.example'})).status,403);
 assert.equal((await request(api,'profile',{method:'POST',body:{displayName:'Ama',bio:''}})).status,401);
 const result=await request(api,'signup',{method:'POST',body:credentials('ama')});assert.equal(result.status,200);
 const cookie=result.headers['Set-Cookie'];assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);
 assert.equal((await request(api,'me',{cookie})).body.user.username,'ama');
 assert.equal((await request(api,'profile',{method:'POST',cookie,body:{displayName:'Ama',bio:'Hello',points:100}})).body.user.points,0);
 await request(api,'logout',{method:'POST',cookie,body:{}});assert.equal((await request(api,'me',{cookie})).body.user,null);
 assert.equal((await request(api,'results',{method:'POST',body:{wins:100}})).status,404);
});
test('auth API limits repeated attempts',async t=>{
 const s=new AccountStore(':memory:');t.after(()=>s.close());const api=accountApi(s);
 for(let i=0;i<15;i++)await request(api,'unknown',{method:'POST',body:{}});
 assert.equal((await request(api,'signup',{method:'POST',body:credentials('ama')})).status,429);
});
