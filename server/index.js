import {firebaseApi} from './firebase-api.js';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Local API and static server; production API routes run on Vercel.
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
const httpServer=createServer((req,res)=>{(async()=>{if(!await firebaseApi(req,res))await serveStatic(req,res)})().catch(()=>{if(!res.headersSent)res.writeHead(500);res.end()})});
httpServer.listen(PORT,()=>console.log(`Four Corners on http://localhost:${PORT} (Firebase API)`));
