import {firebaseServices} from './firebase-admin.js';
import {FirebaseStore} from './firebase-store.js';
import {roomRequest} from './firebase-rooms.js';
import {allowedOrigin} from './origin.js';
export async function firebaseApi(req,res){
 const route=new URL(req.url,'https://localhost').pathname;if(!route.startsWith('/api/'))return false;
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));return true};
 try{
  if(!allowedOrigin(req))return send(403,{error:'Request origin is not allowed.'});
  const {auth,db,realtime}=firebaseServices(),store=new FirebaseStore(db);
  let identity=null;const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if(bearer){try{identity=await auth.verifyIdToken(bearer,true)}catch{return send(401,{error:'Your sign-in expired. Please sign in again.'})}}
  if(req.method==='GET'){
   if(route==='/api/me')return send(200,{user:identity?await store.profile(identity.uid):null});
   if(route==='/api/leaderboard')return send(200,{players:await store.leaderboard()});
   if(route.startsWith('/api/players/'))return send(200,{user:await store.profile(route.slice(13))});
  }
  if(req.method!=='POST')return send(405,{error:'Method not allowed.'});
  if(!identity)return send(401,{error:'Sign in to continue.'});
  if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Use JSON.'});
  let body=req.body;
  if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return send(413,{error:'Request too large.'})}body=JSON.parse(raw||'{}')}
  else if(typeof body==='string')body=JSON.parse(body);
  if(!body||Array.isArray(body)||typeof body!=='object'||Buffer.byteLength(JSON.stringify(body))>4096)return send(400,{error:'Invalid request.'});
  if(!await store.rateLimit(identity.uid))return send(429,{error:'Too many requests. Try again in a minute.'});
  if(route.startsWith('/api/rooms/'))return send(200,await roomRequest(realtime,store,identity.uid,route.slice(11),body));
  if(identity.firebase?.sign_in_provider==='anonymous')return send(401,{error:'Sign in to save your profile.'});
  if(route==='/api/register')return send(200,{user:await store.register(identity.uid,body)});
  if(route==='/api/profile')return send(200,{user:await store.update(identity.uid,body)});
  if(route==='/api/matches/start')return send(200,{ticket:await store.beginSolo(identity.uid)});
  if(route==='/api/matches/finish')return send(200,{user:await store.finishSolo(identity.uid,body)});
  return send(404,{error:'Not found.'});
 }catch(e){if(e.message?.match(/username|player name|bio|Match session|Invalid match|setting up|Room/))return send(400,{error:e.message});console.error('Firebase API error:',e.code||e.name);return send(503,{error:'Account service is unavailable. Please try again.'})}
}
