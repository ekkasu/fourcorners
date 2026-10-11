// Shrinks shipped assets: environment textures JPEG -> WebP, and the casual character GLBs via glTF-Transform.
// clay_plaster and leafy_grass keep high quality: their fine grain is reused for painted walls and grass.
// The footballer GLBs are left untouched: the Ghana kit shader and tools/retarget-mixamo.mjs rely on their
// uncompressed, unquantized vertex data. Run: node tools/optimize-assets.mjs
import fs from 'fs';import path from 'path';import{execFileSync}from'child_process';import{fileURLToPath}from'url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const{default:sharp}=await import('sharp');
const kb=f=>Math.round(fs.statSync(f).size/1024);

const texDir=path.join(root,'public/textures/env');let before=0,after=0;
for(const file of fs.readdirSync(texDir).filter(f=>f.endsWith('.jpg'))){
 const src=path.join(texDir,file),out=src.replace(/\.jpg$/,'.webp'),normal=file.includes('_nor_'),grain=/^(clay_plaster|leafy_grass)_diff/.test(file);
 await sharp(src).webp({quality:grain?94:normal?88:80,smartSubsample:grain,effort:5}).toFile(out);before+=kb(src);after+=kb(out);fs.unlinkSync(src);
 console.log(file.padEnd(40),kb(out)+' KB');
}
console.log(`textures: ${before} KB -> ${after} KB`);

for(const name of ['male-optimized2','female-optimized2']){
 const glb=path.join(root,'public/models',name+'.glb'),tmp=glb+'.tmp.glb',was=kb(glb);
 execFileSync(process.execPath,[path.join(root,'node_modules/@gltf-transform/cli/bin/cli.js'),'optimize',glb,tmp,'--texture-compress','webp','--texture-size','1024','--simplify','false'],{stdio:'ignore'});
 fs.renameSync(tmp,glb);console.log(`${name}.glb: ${was} KB -> ${kb(glb)} KB`);
}
