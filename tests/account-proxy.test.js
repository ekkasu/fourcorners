import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/[...path].js';
const env=(t,value)=>{const old=process.env.ACCOUNT_SERVER_URL;process.env.ACCOUNT_SERVER_URL=value;t.after(()=>{if(old===undefined)delete process.env.ACCOUNT_SERVER_URL;else process.env.ACCOUNT_SERVER_URL=old})};
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this},send(v){this.body=v;return this}});
test('account proxy forwards to Node backend and preserves private session cookies',async t=>{
 env(t,'https://backend.example/ws');
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(String(url),'https://backend.example/api/me');assert.equal(options.headers.cookie,'fc_session=test');assert.equal(options.headers.origin,'https://backend.example');return new Response('{"user":null}',{headers:{'content-type':'application/json','set-cookie':'fc_session=new; HttpOnly; Path=/'}})});
 const res=response();await handler({url:'/api/me',method:'GET',headers:{host:'game.example',origin:'https://game.example',cookie:'fc_session=test'}},res);
 assert.equal(res.code,200);assert.match(res.headers['Set-Cookie'],/HttpOnly/);assert.equal(res.headers['Cache-Control'],'no-store');
});
test('account proxy rejects a self-loop and foreign origins',async t=>{
 env(t,'https://game.example');
 let res=response();await handler({url:'/api/me',headers:{host:'game.example'}},res);assert.equal(res.code,503);
 res=response();await handler({url:'/api/login',headers:{host:'game.example',origin:'https://evil.example'}},res);assert.equal(res.code,403);
});
