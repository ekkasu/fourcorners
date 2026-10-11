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
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.md':'text/plain; charset=utf-8','.ico':'image/x-icon'};
const COMPRESS=new Set(['.html','.js','.css','.json','.svg','.glb','.hdr','.md']);
const files=new Map();
async function load(file){if(files.has(file))return files.get(file);const body=await readFile(file),ext=path.extname(file),entry={body,gzip:COMPRESS.has(ext)?gzipSync(body,{level:9}):null,type:TYPES[ext]||'application/octet-stream'};files.set(file,entry);return entry}
async function serveStatic(req,res){
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/healthz'){res.writeHead(200,{'content-type':'text/plain'});return res.end('ok')}
 let file=path.join(DIST,decodeURIComponent(url.pathname));if(!file.startsWith(DIST)){res.writeHead(400);return res.end()}
 try{if((await stat(file)).isDirectory())file=path.join(file,'index.html')}catch{file=path.join(DIST,'index.html')}
 let entry;try{entry=await load(file)}catch{res.writeHead(404,{'content-type':'text/plain'});return res.end('Not found. Run npm run build first.')}
 const hashed=url.pathname.startsWith('/assets/'),headers={'content-type':entry.type,'cache-control':hashed?'public, max-age=31536000, immutable':file.endsWith('index.html')?'no-cache':'public, max-age=3600',vary:'accept-encoding'};
 const gzip=entry.gzip&&/\bgzip\b/.test(req.headers['accept-encoding']||'');if(gzip)headers['content-encoding']='gzip';res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:gzip?entry.gzip:entry.body);
}
const httpServer=createServer((req,res)=>{serveStatic(req,res).catch(()=>{res.writeHead(500);res.end()})});
const server=new WebSocketServer({server:httpServer,path:'/ws'});
const rooms=new Map();
const send=(ws,obj)=>{if(ws.readyState===1)ws.send(JSON.stringify(obj))};
const publish=(room)=>{for(const player of room.players)send(player.ws,{type:'room',code:room.code,players:room.players.map(p=>({id:p.id,name:p.name,ready:p.ready})),started:room.started,hostId:room.players[0]?.id})};
const code=()=>randomBytes(3).toString('hex').toUpperCase();
server.on('connection',ws=>{
 const id=randomBytes(8).toString('hex');let current=null;
 const leave=()=>{if(!current)return;const room=rooms.get(current);if(room){room.players=room.players.filter(p=>p.id!==id);if(!room.players.length)rooms.delete(current);else publish(room)}current=null};
 send(ws,{type:'connected',id});
 ws.on('message',data=>{let m;try{m=JSON.parse(data.toString())}catch{return}if(!m||typeof m.type!=='string')return;
 if(m.type==='create'||m.type==='join'){
  leave();let room;if(m.type==='create'){let c=code();while(rooms.has(c))c=code();room={code:c,players:[],started:false};rooms.set(c,room)}else{room=rooms.get(String(m.code||'').toUpperCase());if(!room)return send(ws,{type:'error',message:'Room not found'});if(room.players.length>=4)return send(ws,{type:'error',message:'Room is full'});if(room.started)return send(ws,{type:'error',message:'Match already started'})}
  current=room.code;room.players.push({id,ws,name:String(m.name||'Guest').slice(0,20),ready:false});publish(room)
 }else if(m.type==='ready'&&current){const room=rooms.get(current);const p=room?.players.find(p=>p.id===id);if(p){p.ready=!!m.ready;publish(room)}}
 else if(m.type==='start'&&current){const room=rooms.get(current);if(room?.players[0]?.id!==id)return; if(room.players.length<2)return send(ws,{type:'error',message:'At least 2 players needed'});if(!room.players.every(p=>p.ready))return send(ws,{type:'error',message:'All players must be ready'});room.started=true;publish(room);for(const p of room.players)send(p.ws,{type:'matchStart',players:room.players.map(q=>({id:q.id,name:q.name}))})}
 else if(m.type==='position'&&current){const room=rooms.get(current);if(!room?.started)return;const x=Number(m.x),z=Number(m.z);if(!Number.isFinite(x)||!Number.isFinite(z))return;for(const p of room.players)if(p.id!==id)send(p.ws,{type:'position',id,x:Math.max(-12,Math.min(12,x)),z:Math.max(-12,Math.min(12,z))})}
 else if(m.type==='leave')leave();
 });ws.on('close',leave)
});
httpServer.listen(PORT,()=>console.log(`Four Corners server on http://localhost:${PORT} (rooms on /ws)`));
