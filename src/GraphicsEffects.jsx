import React from 'react';
import {BrightnessContrast,EffectComposer,HueSaturation,N8AO,SMAA,ToneMapping,Vignette} from '@react-three/postprocessing';
import {ToneMappingMode} from 'postprocessing';
export default function GraphicsEffects(){return <EffectComposer multisampling={0}><N8AO halfRes aoRadius={1.4} intensity={2.4} distanceFalloff={1.2}/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><HueSaturation saturation={.14}/><BrightnessContrast brightness={.02} contrast={.05}/><SMAA/><Vignette offset={.35} darkness={.3}/></EffectComposer>}
