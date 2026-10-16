import {createMatch,acceptInput,stepMatch,snapshot,disconnectPlayer} from './match.js';
import {WebSocketServer} from 'ws';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// One server for production: it serves the built game from dist/ and runs the multiplayer rooms on /ws.
// Locally, `npm run dev` serves the game and proxies /ws here.
const PORT=Number(process.env.PORT)||3001;
const DIST=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const TYPES={'.mp3':'audio/mpeg','.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.md':'text/plain; charset=utf-8','.ico':'image/x-icon'};
const COMPRESS=new Set(['.html','.js','.css','.json','.svg','.glb','.hdr','.md']);
const files=new Map();
async function load(file){if(files.has(file))return files.get(file);const body=await readFile(file),ext=path.extname(file),entry={body,gzip:COMPRESS.has(ext)?gzipSync(body,{level:9}):null,type:TYPES[ext]||'application/octet-stream'};files.set(file,entry);return entry}
async function serveStatic(req,res){
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/healthz'){res.writeHead(200,{'content-type':'text/plain'});return res.end('ok')}
 let file=path.join(DIST,decodeURIComponent(url.pathname));if(path.relative(DIST,file).startsWith('..')){res.writeHead(400);return res.end()}
 try{if((await stat(file)).isDirectory())file=path.join(file,'index.html')}catch{file=path.join(DIST,'index.html')}
 let entry;try{entry=await load(file)}catch{res.writeHead(404,{'content-type':'text/plain'});return res.end('Not found. Run npm run build first.')}
 const hashed=url.pathname.startsWith('/assets/'),headers={'content-type':entry.type,'cache-control':hashed?'public, max-age=31536000, immutable':file.endsWith('index.html')?'no-cache':'public, max-age=3600',vary:'accept-encoding'};
 const gzip=entry.gzip&&/\bgzip\b/.test(req.headers['accept-encoding']||'');if(gzip)headers['content-encoding']='gzip';res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:gzip?entry.gzip:entry.body);
}
const httpServer=createServer((req,res)=>{serveStatic(req,res).catch(()=>{res.writeHead(500);res.end()})});
const server=new WebSocketServer({server:httpServer,path:'/ws',maxPayload:4096});
const rooms=new Map();
const send=(ws,obj)=>{if(ws.readyState===1)ws.send(JSON.stringify(obj))};
const publish=(room)=>{for(const player of room.players)send(player.ws,{type:'room',code:room.code,players:room.players.map(p=>({id:p.id,name:p.name,ready:p.ready})),started:room.started,settings:room.match?.settings||room.settings,hostId:room.players[0]?.id})};
const code=()=>randomBytes(3).toString('hex').toUpperCase();
server.on('connection',ws=>{
 const id=randomBytes(8).toString('hex');let current=null;
 const leave=()=>{if(!current)return;const room=rooms.get(current);if(room){if(room.match)disconnectPlayer(room.match,id);room.players=room.players.filter(p=>p.id!==id);if(!room.players.length)rooms.delete(current);else publish(room)}current=null};
 send(ws,{type:'connected',id});
 let windowStart=Date.now(),messages=0;ws.on('message',data=>{if(Date.now()-windowStart>1000){windowStart=Date.now();messages=0}if(++messages>90)return;let m;try{m=JSON.parse(data.toString())}catch{return}if(!m||typeof m.type!=='string')return;
 if(m.type==='create'||m.type==='join'){
  let room;if(m.type==='create'){let c=code();while(rooms.has(c))c=code();room={code:c,players:[],started:false,settings:createMatch([],m.settings).settings};rooms.set(c,room)}else{room=rooms.get(String(m.code||'').toUpperCase());if(!room)return send(ws,{type:'error',message:'Room not found'});if(room.players.length>=4)return send(ws,{type:'error',message:'Room is full'});if(room.started)return send(ws,{type:'error',message:'Match already started'})}
  leave();current=room.code;room.players.push({id,ws,name:String(m.name||'Guest').slice(0,20),ready:false});publish(room)
 }else if(m.type==='ready'&&current){const room=rooms.get(current);const p=room?.players.find(p=>p.id===id);if(p&&!room.started){p.ready=m.ready===true;publish(room)}}
 else if(m.type==='configure'&&current){const room=rooms.get(current);if(room&&!room.started&&room.players[0]?.id===id){room.settings=createMatch([],m.settings).settings;for(const p of room.players)p.ready=false;publish(room)}}
 else if(m.type==='start'&&current){const room=rooms.get(current);if(room?.players[0]?.id!==id)return; if(room.players.length<2)return send(ws,{type:'error',message:'At least 2 players needed'});if(!room.players.every(p=>p.ready))return send(ws,{type:'error',message:'All players must be ready'});if(room.started)return;room.match=createMatch(room.players,room.settings);room.settings=room.match.settings;room.started=true;room.finishedAt=null;publish(room);for(const p of room.players)send(p.ws,{type:'matchStart',settings:room.settings,players:room.match.players.map(({id,name,side})=>({id,name,side}))});for(const p of room.players)send(p.ws,snapshot(room.match))}
 else if(m.type==='input'&&current){const room=rooms.get(current);if(room?.started&&room.match)acceptInput(room.match,id,m)}
 else if(m.type==='leave')leave();
 });ws.on('close',leave);ws.on('error',()=>{});ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true})
});
// Fixed simulation step with bounded catch-up; state is sent at 20 Hz.
let previous=performance.now(),accumulator=0,frames=0;
const ticker=setInterval(()=>{const now=performance.now();accumulator+=Math.min((now-previous)/1000,.2);previous=now;while(accumulator>=1/60){for(const room of rooms.values())if(room.started&&room.match)stepMatch(room.match);accumulator-=1/60;frames++;if(frames%3===0)for(const room of rooms.values())if(room.started&&room.match){const state=snapshot(room.match);for(const p of room.players)if(p.ws.bufferedAmount<65536)send(p.ws,state);if(room.match.finished){room.finishedAt??=Date.now();if(Date.now()-room.finishedAt>8000){room.started=false;room.match=null;for(const p of room.players)p.ready=false;publish(room)}}}}},1000/60);
const heartbeat=setInterval(()=>{for(const ws of server.clients){if(!ws.isAlive){ws.terminate();continue}ws.isAlive=false;ws.ping()}},15000);
httpServer.on('close',()=>{clearInterval(ticker);clearInterval(heartbeat)});
httpServer.listen(PORT,()=>console.log(`Four Corners server on http://localhost:${PORT} (rooms on /ws)`));
