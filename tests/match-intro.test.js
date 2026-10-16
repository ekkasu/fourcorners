import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatchIntro} from '../src/match-intro.js';
const clip=()=>({plays:0,pauses:0,play(){this.plays++;return Promise.resolve()},pause(){this.pauses++}});
test('the supplied intro pauses match start until the clip ends',()=>{
 const audio=clip(),states=[],intro=createMatchIntro({createAudio:()=>audio,onActive:v=>states.push(v)});
 intro.play();assert.equal(audio.plays,1);assert.equal(states.at(-1),true);
 audio.onended();assert.equal(states.at(-1),false);assert.equal(audio.pauses,1);
 assert.equal(audio.onended,null);
});
test('muted starts skip audio and exiting stops an unfinished clip',()=>{
 const audio=clip(),states=[],intro=createMatchIntro({createAudio:()=>audio,onActive:v=>states.push(v)});
 intro.play(true);assert.equal(audio.plays,0);assert.equal(states.at(-1),false);
 intro.play();intro.setMuted(true);assert.equal(audio.muted,true);
 intro.stop();assert.equal(audio.pauses,1);assert.equal(states.at(-1),false);
});
test('blocked playback and load failures never block gameplay',async()=>{
 const states=[],audio=clip();audio.play=()=>Promise.reject(new Error('blocked'));
 const intro=createMatchIntro({createAudio:()=>audio,onActive:v=>states.push(v)});
 intro.play();await Promise.resolve();await Promise.resolve();assert.equal(states.at(-1),false);
 audio.play=()=>Promise.resolve();intro.play();audio.onerror();assert.equal(states.at(-1),false);
});
test('an old rejected play request cannot cancel a newer intro',async()=>{
 let reject;const old=clip(),next=clip(),states=[];old.play=()=>new Promise((_,r)=>{reject=r});
 const clips=[old,next],intro=createMatchIntro({createAudio:()=>clips.shift(),onActive:v=>states.push(v)});
 intro.play();intro.play();reject(new Error('cancelled'));await Promise.resolve();await Promise.resolve();
 assert.equal(states.at(-1),true);assert.equal(next.pauses,0);intro.stop();
});
