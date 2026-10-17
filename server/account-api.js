import {sessionToken} from './accounts.js';
export function allowedOrigin(req){
 try{return !req.headers.origin||new URL(req.headers.origin).host===req.headers.host||req.headers.origin===process.env.PUBLIC_ORIGIN}catch{return false}
}
export function accountApi(store){
 const limits=new Map();
 return async function(req,res){
  const pathname=new URL(req.url,'http://localhost').pathname;if(!pathname.startsWith('/api/'))return false;
  const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));return true};
  try{
   if(!allowedOrigin(req))return send(403,{error:'Request origin is not allowed.'});
   const token=sessionToken(req),user=store.user(token);
   if(req.method==='GET'){
    if(pathname==='/api/me')return send(200,{user});
    if(pathname==='/api/leaderboard')return send(200,{players:store.leaderboard()});
    if(pathname.startsWith('/api/players/')){const profile=store.profile(pathname.slice(13));return send(profile?200:404,profile?{user:profile}:{error:'Player not found.'})}
   }
   if(req.method!=='POST')return send(405,{error:'Method not allowed.'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Use JSON.'});
   const key=req.socket.remoteAddress||'local',now=Date.now();let limit=limits.get(key);
   if(!limit||now>limit.until){limit={count:0,until:now+60000};limits.set(key,limit)}
   if(limits.size>10000)for(const[k,v]of limits)if(v.until<now)limits.delete(k);
   if(++limit.count>15)return send(429,{error:'Too many attempts. Try again in a minute.'});
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return send(413,{error:'Request too large.'})}
   let body;try{body=JSON.parse(raw)}catch{return send(400,{error:'Invalid request.'})}
   if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'Invalid request.'});
   if(pathname==='/api/login'){
    const accountKey='account:'+String(body.username||'').trim().toLowerCase();let attempts=limits.get(accountKey);
    if(!attempts||now>attempts.until){attempts={count:0,until:now+60000};limits.set(accountKey,attempts)}
    if(++attempts.count>10)return send(429,{error:'Too many sign-in attempts. Try again in a minute.'});
   }
   const cookie=value=>{const secure=process.env.NODE_ENV==='production'||process.env.COOKIE_SECURE==='true'||req.socket.encrypted;res.setHeader('Set-Cookie',`fc_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${value?30*86400:0}${secure?'; Secure':''}`)};
   if(pathname==='/api/signup'||pathname==='/api/login'){
    const profile=await store[pathname==='/api/signup'?'signup':'login'](body);store.logout(token);cookie(store.session(profile.id));return send(200,{user:profile});
   }
   if(pathname==='/api/logout'){store.logout(token);cookie('');return send(200,{user:null})}
   if(pathname==='/api/profile'){if(!user)return send(401,{error:'Sign in to edit your profile.'});return send(200,{user:store.update(user.id,body)})}
   return send(404,{error:'Not found.'});
  }catch(e){if(e.message?.match(/username|password|Player name|player name|bio/))return send(400,{error:e.message});console.error('Account request failed:',e.code||e.name);return send(500,{error:'Could not complete the request. Please try again.'})}
 };
}
