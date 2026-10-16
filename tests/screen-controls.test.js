import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleFullscreen,fullscreenElement} from '../src/fullscreen.js';
import {consumeReplaySkip} from '../src/replay-controls.js';

test('fullscreen enters and exits using the correct document receiver',async()=>{
 const doc={fullscreenElement:null,documentElement:{async requestFullscreen(){assert.equal(this,doc.documentElement);doc.fullscreenElement=this}},async exitFullscreen(){assert.equal(this,doc);doc.fullscreenElement=null}};
 await toggleFullscreen(doc);assert.equal(fullscreenElement(doc),doc.documentElement);
 await toggleFullscreen(doc);assert.equal(fullscreenElement(doc),undefined);
});
test('prefixed fullscreen is supported and unsupported requests fail clearly',async()=>{
 const doc={documentElement:{async webkitRequestFullscreen(){doc.webkitFullscreenElement=this}},async webkitExitFullscreen(){doc.webkitFullscreenElement=null}};
 await toggleFullscreen(doc);assert.equal(fullscreenElement(doc),doc.documentElement);
 await toggleFullscreen(doc);assert.equal(fullscreenElement(doc),null);
 await assert.rejects(toggleFullscreen({documentElement:{}}),/unavailable/);
});
test('a rejected fullscreen request remains an error rather than a false success',async()=>{
 const doc={documentElement:{requestFullscreen(){return Promise.reject(new Error('Permission denied'))}}};
 await assert.rejects(toggleFullscreen(doc),/Permission denied/);assert.equal(fullscreenElement(doc),undefined);
});
test('replay button skips once without firing a shot',()=>{
 const c={skipReplay:true,shootAt:10};
 assert.equal(consumeReplaySkip(c,true,10),true);
 assert.equal(c.shootAt,10);assert.equal(c.skipReplay,false);
 assert.equal(consumeReplaySkip(c,true,10),false);
});
test('late replay clicks are discarded and the shoot shortcut still works',()=>{
 const c={skipReplay:true,shootAt:10};
 assert.equal(consumeReplaySkip(c,false,10),false);
 assert.equal(consumeReplaySkip(c,true,10),false);
 c.shootAt=11;assert.equal(consumeReplaySkip(c,true,10),true);
});
