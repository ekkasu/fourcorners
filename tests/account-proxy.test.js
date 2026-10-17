import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{apiRequestUrl} from '../api/handler.js';
const response=()=>({headers:{},writeHead(code,headers){this.code=code;this.headers=headers},end(body){this.body=JSON.parse(body)}});
test('Vercel account handler rejects foreign origins before reading credentials',async()=>{
 const res=response();await handler({url:'/api/profile',headers:{host:'game.example',origin:'https://evil.example'}},res);
 assert.equal(res.code,403);assert.equal(res.headers['cache-control'],'no-store');
});

test('Vercel rewrite preserves nested room, match and public profile API routes',()=>{
 assert.equal(apiRequestUrl({url:'/api/handler?__route=rooms%2Fcreate'}),'/api/rooms/create');
 assert.equal(apiRequestUrl({url:'/api/handler',query:{__route:'matches/finish'}}),'/api/matches/finish');
 assert.equal(apiRequestUrl({url:'/api/players/uid-a'}),'/api/players/uid-a');
});
