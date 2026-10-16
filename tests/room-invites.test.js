import test from 'node:test';
import assert from 'node:assert/strict';
import {validRoomCode,roomCodeFromUrl,roomInviteUrl,roomCodeInput} from '../src/room-invites.js';
test('invite links carry the current room and work under deployment subpaths',()=>{
 const link=roomInviteUrl('https://game.example/play/?room=OLD123&other=private#menu','ab12cd');
 assert.equal(link,'https://game.example/play/?room=AB12CD');
 assert.equal(roomCodeFromUrl(link),'AB12CD');
 assert.equal(roomCodeFromUrl('http://localhost:4211/?room=ab12cd'),'AB12CD');
});
test('invalid invites never prefill or enable joining',()=>{
 for(const value of ['','abc','AB12CD7','<code>','ABC!12'])assert.equal(validRoomCode(value),'');
 for(const value of ['not a URL','https://game.example/','https://game.example/?room=%3Cscript%3E','https://game.example/?room=abc'])assert.equal(roomCodeFromUrl(value),'');
 assert.throws(()=>roomInviteUrl('https://game.example/','abc'),/Invalid room/);
});
test('players can type a code or paste a whole invite link',()=>{
 assert.equal(roomCodeInput('a b-12cd'),'AB12CD');assert.equal(roomCodeInput('ab1'),'AB1');
 assert.equal(roomCodeInput('https://game.example/?room=ZY12AB'),'ZY12AB');
});
