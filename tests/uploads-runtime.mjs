// Isolated local Workers + SQLite + R2 integration. No production accounts or data.
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const hash = value => createHash('sha256').update(value).digest('hex');
await build({entryPoints:['src/worker.js'],outfile:'.wrangler/uploads-runtime.mjs',bundle:true,format:'esm',platform:'neutral',external:['cloudflare:workers','node:*']});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:'.wrangler/uploads-runtime.mjs',compatibilityDate:'2026-10-07',compatibilityFlags:['nodejs_compat'],cf:false,r2Buckets:['UPLOADS'],bindings:{OWNER_SETUP_HASH:hash('isolated-upload-test')},durableObjects:{ROOMS:{className:'GameRoom',useSQLite:true},COMMUNITY:{className:'Community',useSQLite:true}}}));
try{
 let cookie='';
 const call=async(path,{method='GET',data,bytes,headers={},anonymous=false}={})=>{const r=await mf.dispatchFetch('http://localhost'+path,{method,headers:{Origin:'http://localhost',Cookie:anonymous?'':cookie,...(data?{'Content-Type':'application/json'}:{}),...(bytes?{'Content-Type':'application/octet-stream','X-Content-SHA256':hash(bytes)}:{}),...headers},...(data?{body:JSON.stringify(data)}:bytes?{body:bytes}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
 assert.equal((await call('/api/admin/uploads')).status,401);
 assert.equal((await call('/api/auth/register',{method:'POST',data:{username:'upload_runtime_admin',password:'Isolated runtime test password'}})).status,201);
 assert.equal((await call('/api/admin/uploads')).status,403);
 assert.equal((await call('/api/auth/claim-owner',{method:'POST',data:{code:'isolated-upload-test'}})).status,200);
 const id=randomUUID(),size=388*1024*1024,chunk=8*1024*1024;
 const start=await call('/api/admin/uploads',{method:'POST',data:{id,name:'large-card-batch.zip',size,fingerprint:'f'.repeat(64),label:'388 MB runtime verification'}});assert.equal(start.status,201,await start.clone().text());
 for(let offset=0,n=1;offset<size;offset+=chunk,n++){
   const bytes=Buffer.alloc(Math.min(chunk,size-offset),n%256);if(n===1)bytes.set([80,75,3,4]);
   const response=await call(`/api/admin/uploads/${id}/parts/${n}`,{method:'PUT',bytes});assert.equal(response.status,200,await response.text());
   if(n===4){const saved=await(await call(`/api/admin/uploads/${id}`)).json();assert.equal(saved.file.parts.length,4);console.log('Resume checkpoint verified after 32 MB.');}
 }
 const complete=await call(`/api/admin/uploads/${id}/complete`,{method:'POST'});assert.equal(complete.status,200,await complete.text());
 const shared=await(await call(`/api/admin/uploads/${id}/share`,{method:'POST'})).json();const path=new URL(shared.url).pathname;
 const head=await call(path,{method:'HEAD',anonymous:true});assert.equal(head.status,200);assert.equal(Number(head.headers.get('Content-Length')),size);
 const range=await call(path,{anonymous:true,headers:{Range:`bytes=${size-10}-${size-1}`}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,10);
 assert.equal((await call(`/api/admin/uploads/${id}/revoke`,{method:'POST'})).status,200);assert.equal((await call(path,{anonymous:true})).status,404);
 const deletion=await call(`/api/admin/uploads/${id}`,{method:'DELETE'});assert.equal(deletion.status,200,await deletion.text());
 assert.equal((await(await call('/api/admin/uploads')).json()).files.length,0);
 console.log('PASS: 388 MB / 49 parts, saved progress, complete, HEAD/range download, revoke, delete; actual Workers/R2/SQLite runtime.');
}finally{await mf.dispose();}
