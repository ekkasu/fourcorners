import {defineConfig} from 'vite';
export default defineConfig({
 server:{port:5173,proxy:{'/api':{target:'http://localhost:3001'},'/ws':{target:'ws://localhost:3001',ws:true}}},
 build:{chunkSizeWarningLimit:900,rollupOptions:{output:{onlyExplicitManualChunks:true,manualChunks(id){
  if(/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'react';
  if(id.includes('/node_modules/three/'))return 'three';
  if(/node_modules\/@react-three\/(fiber|drei)\//.test(id))return 'r3f';
  if(/node_modules\/(postprocessing|n8ao|@react-three\/postprocessing)\//.test(id))return 'effects';
 }}}},
});
