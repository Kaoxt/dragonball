import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import assert from 'node:assert/strict';
await build({entryPoints:['src/worker.js'],outfile:'.wrangler/dragon-community-worker.mjs',bundle:true,format:'esm',platform:'neutral',external:['cloudflare:workers','node:*']});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:'.wrangler/dragon-community-worker.mjs',compatibilityDate:'2026-10-07',compatibilityFlags:['nodejs_compat'],cf:false,durableObjects:{ROOMS:{className:'GameRoom',useSQLite:true},COMMUNITY:{className:'Community',useSQLite:true}}}));
try{
 let cookie='';const call=async(path,data)=>{const r=await mf.dispatchFetch('http://localhost'+path,{method:data?'POST':'GET',headers:{Origin:'http://localhost','Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'runtime-test'},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();return {status:r.status,body};};
 let r=await call('/api/forum?view=categories');assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.categories.length,4);
 r=await call('/api/auth/register',{username:'runtime_player',password:'Runtime private password 123!'});assert.equal(r.status,201,JSON.stringify(r));
 r=await call('/api/auth/session');assert.equal(r.body.user.username,'runtime_player');
 r=await call('/api/forum',{action:'topic',categoryId:1,title:'Runtime storage test',body:'A temporary test in an isolated local database.'});assert.equal(r.status,201,JSON.stringify(r));const id=r.body.id;
 r=await call('/api/forum?view=topic&id='+id);assert.equal(r.body.topic.title,'Runtime storage test');
 r=await call('/api/forum',{action:'reply',id,body:'Temporary reply.'});assert.equal(r.status,201,JSON.stringify(r));
 r=await call('/api/auth/logout',{});assert.equal(r.status,200);r=await call('/api/auth/session');assert.equal(r.body.user,null);
 r=await call('/api/auth/login',{username:'runtime_player',password:'Runtime private password 123!'});assert.equal(r.status,200,JSON.stringify(r));
 console.log('Actual Workers runtime: SQLite forum, registration, session cookies, scrypt login, topic, reply, and logout all passed.');
}finally{await mf.dispose();}
