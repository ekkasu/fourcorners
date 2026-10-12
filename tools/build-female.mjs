// Builds public/models/footballer-female.glb from the Mixamo "Shannon" character (assets-src/mixamo/Shannon.fbx,
// downloaded T-pose with skin). The FBX is about 52 MB and 145k vertices, too heavy for phones, so this script
// converts it to glTF, simplifies the meshes, and ships the textures as 1024 px WebP. Shirt, shorts, socks, boots,
// body and hair stay separate meshes so the game can colour each part of the kit. Run: node tools/build-female.mjs
import fs from 'fs';import path from 'path';import{fileURLToPath,pathToFileURL}from'url';import{resolveObjectURL}from'buffer';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SRC=path.join(root,'assets-src/mixamo/Shannon.fbx'),OUT=path.join(root,'public/models/footballer-female.glb');
const RATIO=+(process.env.RATIO||.18);

// Just enough browser API for three's FBXLoader and GLTFExporter to run in Node.
globalThis.self=globalThis;globalThis.window=globalThis;
globalThis.document={createElementNS:()=>({style:{},addEventListener(){},removeEventListener(){},getContext:()=>null}),createElement:()=>({getContext:()=>null})};
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.()})}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result='data:application/octet-stream;base64,'+Buffer.from(r).toString('base64');this.onloadend?.()})}};
const mod=p=>import(pathToFileURL(path.join(root,'node_modules/three',p)).href);
const THREE=await mod('build/three.module.js');
const{FBXLoader}=await mod('examples/jsm/loaders/FBXLoader.js');const{GLTFExporter}=await mod('examples/jsm/exporters/GLTFExporter.js');
// Embedded textures arrive as blob URLs; keep the URL so the image bytes can be read back.
THREE.TextureLoader.prototype.load=function(url){const t=new THREE.Texture();t.userData.url=url;return t};

const buf=fs.readFileSync(SRC);const fbx=new FBXLoader().parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');
fbx.animations=[];fbx.scale.setScalar(.01);fbx.name='FemaleFootballer';
const images={};
fbx.traverse(o=>{if(!o.isMesh)return;o.material=[].concat(o.material).map(m=>{const url=m.map?.userData.url;if(url&&!images[m.name])images[m.name]=url;
 const out=new THREE.MeshStandardMaterial({name:m.name,color:0xffffff,roughness:.8});return out})[0];o.name=o.name.replace(/^Ch38_/,'')});
for(const k of Object.keys(images)){const blob=resolveObjectURL(images[k]);images[k]=blob?Buffer.from(await blob.arrayBuffer()):null}
console.log('textures',Object.entries(images).map(([k,v])=>k+':'+(v?Math.round(v.length/1024)+'KB':'missing')).join(', '));

const glb=await new Promise((ok,fail)=>new GLTFExporter().parse(fbx,ok,fail,{binary:true}));
const tmp=OUT+'.tmp.glb';fs.writeFileSync(tmp,Buffer.from(glb));

// Simplify, attach textures and compress with glTF-Transform.
const{NodeIO}=await import(pathToFileURL(path.join(root,'node_modules/@gltf-transform/core/dist/index.modern.js')).href).catch(()=>import('@gltf-transform/core'));
const fn=await import('@gltf-transform/functions');const{MeshoptSimplifier}=await import('meshoptimizer');const{default:sharp}=await import('sharp');
const io=new NodeIO();const doc=await io.read(tmp);fs.unlinkSync(tmp);
await MeshoptSimplifier.ready;
// The source shirt has a "7" printed on the back; the game prints the player's own number, so it is covered with plain
// fabric copied from just beside it (fractions of the texture, measured from the image).
if(images.Ch38_body){const img=sharp(images.Ch38_body),{width:W,height:H}=await img.metadata(),box={left:Math.round(W*.525),top:Math.round(H*.70),width:Math.round(W*.06),height:Math.round(H*.115)};
 const patch=await sharp(images.Ch38_body).extract({...box,left:box.left-Math.round(W*.075)}).toBuffer();images.Ch38_body=await img.composite([{input:patch,left:box.left,top:box.top}]).png().toBuffer()}
// One texture per image, shared by every material that uses it. The exporter keeps three.js UVs (v up), so images are
// flipped vertically to match glTF's top-down convention.
const textures={};for(const mat of doc.getRoot().listMaterials()){const name=mat.getName(),img=images[name];if(!img)continue;
 if(!textures[name])textures[name]=doc.createTexture(name).setImage(await sharp(img).flip().resize(1024,1024,{fit:'inside'}).webp({quality:82}).toBuffer()).setMimeType('image/webp');
 mat.setBaseColorTexture(textures[name])}
// Skin under the clothes is removed: after simplifying, it would poke through the thinner shirt, shorts and socks.
await doc.transform(fn.weld());hideCoveredSkin(doc);
function hideCoveredSkin(doc){
 const nodes=doc.getRoot().listNodes().filter(n=>n.getMesh()),prim=n=>n.getMesh().listPrimitives()[0],body=nodes.find(n=>n.getName()==='Body');
 const CELL=7,grid=new Map(),key=(x,y,z)=>`${Math.floor(x/CELL)},${Math.floor(y/CELL)},${Math.floor(z/CELL)}`,a=[0,0,0];
 for(const n of nodes){if(!['Shirt','Shorts','Socks','Shoes'].includes(n.getName()))continue;const P=prim(n).getAttribute('POSITION');for(let i=0;i<P.getCount();i++){P.getElement(i,a);const k=key(...a);if(!grid.has(k))grid.set(k,[]);grid.get(k).push([...a])}}
 const p=prim(body),P=p.getAttribute('POSITION'),N=p.getAttribute('NORMAL'),idx=p.getIndices(),hidden=new Uint8Array(P.getCount()),b=[0,0,0],nrm=[0,0,0];
 for(let i=0;i<P.getCount();i++){P.getElement(i,b);N.getElement(i,nrm);const cx=Math.floor(b[0]/CELL),cy=Math.floor(b[1]/CELL),cz=Math.floor(b[2]/CELL);
  search:for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)for(const g of grid.get(`${cx+dx},${cy+dy},${cz+dz}`)||[]){const ox=g[0]-b[0],oy=g[1]-b[1],oz=g[2]-b[2];if(ox*ox+oy*oy+oz*oz<7*7&&ox*nrm[0]+oy*nrm[1]+oz*nrm[2]>0){hidden[i]=1;break search}}}
 const src=idx.getArray(),kept=[];for(let t=0;t<src.length;t+=3)if(!(hidden[src[t]]&&hidden[src[t+1]]&&hidden[src[t+2]]))kept.push(src[t],src[t+1],src[t+2]);
 console.log(`skin under clothes: removed ${(src.length-kept.length)/3} of ${src.length/3} body triangles`);idx.setArray(new Uint32Array(kept))}
// Textures go on first: prune drops UVs that no texture uses, and dedup would merge the untextured materials.
await doc.transform(fn.weld(),fn.simplify({simplifier:MeshoptSimplifier,ratio:RATIO,error:.004,lockBorder:true}),fn.prune(),fn.dedup());
await io.write(OUT,doc);
let verts=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())verts+=p.getAttribute('POSITION').getCount();
console.log(`${path.relative(root,OUT)}: ${Math.round(fs.statSync(OUT).size/1024)} KB, ${verts} vertices, meshes: ${doc.getRoot().listMeshes().map(m=>m.getName()).join(', ')}`);
