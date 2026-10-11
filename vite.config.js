import {defineConfig} from 'vite';
export default defineConfig({
 server:{port:5173,proxy:{'/ws':{target:'ws://localhost:3001',ws:true}}},
 // Split the big libraries into their own files so browsers cache them across game updates.
 build:{chunkSizeWarningLimit:900,rollupOptions:{output:{manualChunks:{three:['three'],r3f:['@react-three/fiber','@react-three/drei'],effects:['postprocessing','@react-three/postprocessing']}}}},
});
