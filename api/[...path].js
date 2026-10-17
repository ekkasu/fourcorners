// Vercel serves the game statically; forward accounts to the same Node server
// that owns multiplayer results. Cookies remain on the game's public origin.
export default async function handler(req,res){
 const configured=process.env.ACCOUNT_SERVER_URL||process.env.VITE_ROOM_SERVER_URL;
 if(!configured)return res.status(503).json({error:'Account backend is not configured. Set ACCOUNT_SERVER_URL on the hosting service.'});
 try{
  const origin=req.headers.origin;
  if(origin&&new URL(origin).host!==req.headers.host)return res.status(403).json({error:'Request origin is not allowed.'});
  const backend=new URL(configured.replace(/^ws/,'http'));backend.pathname='/';backend.search='';backend.hash='';
  if(backend.host===req.headers.host)return res.status(503).json({error:'Account backend must point to the Node server, not the game website.'});
  if(backend.protocol!=='https:'&&backend.hostname!=='localhost')return res.status(503).json({error:'Account backend requires HTTPS.'});
  const incoming=new URL(req.url,'https://'+req.headers.host);
  if(!/^\/api\/[a-z0-9/_-]+$/i.test(incoming.pathname))return res.status(400).json({error:'Invalid API path.'});
  const headers={'content-type':'application/json',origin:backend.origin};
  if(req.headers.cookie)headers.cookie=req.headers.cookie;
  const method=req.method||'GET';
  const body=['GET','HEAD'].includes(method)?undefined:typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(body&&Buffer.byteLength(body)>4096)return res.status(413).json({error:'Request too large.'});
  const response=await fetch(new URL(incoming.pathname,backend),{method,headers,body,redirect:'error',signal:AbortSignal.timeout(55000)});
  const cookie=response.headers.get('set-cookie');if(cookie)res.setHeader('Set-Cookie',cookie);
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
  if(!response.headers.get('content-type')?.includes('application/json'))return res.status(502).json({error:'The account backend is unavailable or needs updating.'});
  res.status(response.status).send(await response.text());
 }catch{return res.status(502).json({error:'Could not reach the account server. Please try again shortly.'})}
}
