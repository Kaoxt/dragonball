import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { database } from '../src/community/database.js';
import { authSchema } from '../src/community/auth.js';
import { hash } from '../src/community/session.js';
import { uploadSchema, uploadRequest, CHUNK_BYTES, MAX_FILE_BYTES, byteRange } from '../src/community/uploads.js';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const sql = new DatabaseSync(':memory:');
  const db = database({ sql: { exec: (query, ...values) => ({ toArray: () => sql.prepare(query).all(...values) }) }, transactionSync: fn => { sql.exec('SAVEPOINT tx'); try { const result = fn(); sql.exec('RELEASE tx'); return result; } catch (error) { sql.exec('ROLLBACK TO tx;RELEASE tx'); throw error; } } });
  authSchema(db); uploadSchema(db);
  for (const role of ['admin', 'member']) {
    db.prepare('INSERT INTO auth_accounts(id,username,password_hash,recovery_hash,role,created_at) VALUES(?,?,?,?,?,?)').bind(role,role,'unused','unused',role,'today').run();
    db.prepare('INSERT INTO auth_sessions(token_hash,user_id,password_version,expires_at,created_at) VALUES(?,?,1,?,?)').bind(hash((role === 'admin' ? 'a' : 'b').repeat(64)),role,Date.now()+3600000,Date.now()).run();
  }
  const objects = new Map(), multiparts = new Map();
  const bucket = {
    calls: 0,
    async createMultipartUpload(key, options) { this.calls++; const uploadId = randomUUID(); multiparts.set(uploadId,{ key,options,parts:new Map() }); return this.resumeMultipartUpload(key,uploadId); },
    resumeMultipartUpload(key,uploadId) { return {
      uploadId,
      async uploadPart(number,bytes) { const entry=multiparts.get(uploadId);if(!entry)throw Error('NoSuchUpload');const etag=digest(bytes);entry.parts.set(number,Buffer.from(bytes));return {partNumber:number,etag}; },
      // Production R2 omits custom metadata from complete(); head() returns it.
      async complete(parts) { const entry=multiparts.get(uploadId);if(!entry)throw Error('NoSuchUpload');const body=Buffer.concat(parts.map(p=>entry.parts.get(p.partNumber))); const object={size:body.length,httpEtag:'"'+digest(body)+'"',customMetadata:entry.options.customMetadata,body};objects.set(key,object);multiparts.delete(uploadId);return {size:object.size,httpEtag:object.httpEtag,customMetadata:{}}; },
      async abort() { if(!multiparts.delete(uploadId))throw Error('NoSuchUpload'); }
    }; },
    async head(key) { return objects.get(key) || null; },
    async get(key,options) {const object=objects.get(key);if(!object)return null;const b=options?.range?object.body.subarray(options.range.offset,options.range.offset+options.range.length):object.body;return {...object,body:new Blob([b]).stream()};},
    async delete(key) { objects.delete(key); }
  };
  const env={DB:db,UPLOADS:bucket};
  async function call(path='',{method='GET',data,bytes,role='admin',origin='https://dragon.test',headers={}}={}) {
    const request=new Request('https://dragon.test'+(path.startsWith('/api/')?path:'/api/admin/uploads'+path),{
      method,headers:{Origin:origin,...(role?{Cookie:`dragon_session=${(role==='admin'?'a':'b').repeat(64)}`} : {}),...(data!==undefined?{'Content-Type':'application/json'}:{}),...(bytes?{'Content-Type':'application/octet-stream','X-Content-SHA256':digest(bytes)}:{}),...headers},...(data!==undefined?{body:JSON.stringify(data)}:bytes?{body:bytes}:{})
    });
    return uploadRequest(request,env);
  }
  const begin=async(size=30,extra={})=>{const data={id:randomUUID(),name:'cards.zip',size,fingerprint:'f'.repeat(64),label:'Saiyan Saga',...extra};const response=await call('',{method:'POST',data});return {data,response,body:await response.json()};};
  return {env,db,bucket,objects,multiparts,call,begin};
}
const zip = size => {const bytes=Buffer.alloc(size,3);bytes.set([80,75,3,4]);return bytes;};
test('uploads require existing admin role and reject cross-origin writes',async()=>{
  const f=fixture();
  assert.equal((await f.call('',{role:null})).status,401);
  assert.equal((await f.call('',{role:'member'})).status,403);
  for(const method of ['POST','PUT','DELETE']) assert.equal((await f.call('',{method,origin:'https://evil.test',data:{}})).status,403);
  assert.equal(f.bucket.calls,0);
  delete f.env.UPLOADS;
  const status=await(await f.call()).json();assert.equal(status.storageReady,false);
  assert.equal((await f.begin()).response.status,503);
});
test('388 MB files use one resumable record and invalid sizes/types are rejected',async()=>{
  const f=fixture(),size=388*1024*1024;
  const {data,response,body}=await f.begin(size);assert.equal(response.status,201);assert.equal(body.chunkBytes,8*1024*1024);
  assert.equal(Math.ceil(size/body.chunkBytes),49);
  assert.equal((await f.call('',{method:'POST',data})).status,200);assert.equal(f.bucket.calls,1);
  assert.equal((await f.call('',{method:'POST',data:{...data,size:30}})).status,409);
  for(const extra of [{size:MAX_FILE_BYTES+1},{size:-1},{size:1.5},{name:'../cards.zip'},{name:'cards.html'},{name:'x\r\ny.zip'},{fingerprint:'bad'}]) assert.equal((await f.begin(30,extra)).response.status,400);
  assert.equal((await f.call('',{method:'POST',data:null})).status,400);
});
test('resume preserves checksums; partial, altered, and missing parts cannot complete',async()=>{
  const f=fixture(),{data}=await f.begin(CHUNK_BYTES+17),body=zip(CHUNK_BYTES);
  assert.equal((await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:body.subarray(0,12)})).status,400);
  assert.equal((await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:body,headers:{'X-Content-SHA256':'x'}})).status,400);
  assert.equal((await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:Buffer.alloc(CHUNK_BYTES)})).status,400);
  assert.equal((await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:body})).status,200);
  assert.equal((await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:body})).status,200);
  const resume=await(await f.call(`/${data.id}`)).json();assert.equal(resume.file.uploadedBytes,CHUNK_BYTES);assert.equal(resume.file.parts[0].checksum,digest(body));
  assert.equal((await f.call(`/${data.id}/complete`,{method:'POST'})).status,409);
  assert.equal((await f.call(`/${data.id}/share`,{method:'POST'})).status,409);
  const changed=Buffer.from(body);changed[100]=99;
  assert.equal((await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:changed})).status,409);
  assert.equal((await f.call(`/${data.id}/parts/3`,{method:'PUT',bytes:Buffer.alloc(17)})).status,400);
  assert.equal((await f.call(`/${data.id}/parts/2`,{method:'PUT',bytes:Buffer.alloc(17)})).status,200);
  assert.equal((await f.call(`/${data.id}/complete`,{method:'POST'})).status,200);
  assert.equal((await f.call(`/${data.id}/complete`,{method:'POST'})).status,200);
  assert.equal((await f.call(`/${data.id}/parts/2`,{method:'PUT',bytes:Buffer.alloc(17)})).status,409);
});
test('first completion verifies stored metadata and immediately enables sharing',async()=>{
  const f=fixture(),{data}=await f.begin();
  await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:zip(30)});
  const response=await f.call(`/${data.id}/complete`,{method:'POST'});
  assert.equal(response.status,200);
  assert.equal((await response.json()).file.status,'ready');
  assert.equal((await(await f.call()).json()).files[0].status,'ready');
  assert.equal((await f.call(`/${data.id}/share`,{method:'POST'})).status,200);
});
test('completion rejects missing objects, incorrect sizes, and incorrect transfer identities',async()=>{
  for(const alter of [()=>null,object=>({...object,size:29}),object=>({...object,customMetadata:{}}),object=>({...object,customMetadata:{transferId:randomUUID()}})]){
    const f=fixture(),{data}=await f.begin();
    await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:zip(30)});
    const head=f.bucket.head.bind(f.bucket);
    f.bucket.head=async key=>{const object=await head(key);return object?alter(object):null;};
    const response=await f.call(`/${data.id}/complete`,{method:'POST'});
    assert.equal(response.status,502);
    assert.equal((await response.json()).error,'Stored file verification failed.');
    assert.equal((await(await f.call()).json()).files[0].status,'uploading');
    assert.equal((await f.call(`/${data.id}/share`,{method:'POST'})).status,409);
    // Valid stored data remains recoverable without uploading any parts again.
    f.bucket.head=head;
    assert.equal((await f.call(`/${data.id}/complete`,{method:'POST'})).status,200);
  }
});
test('completion recovers if storage committed before the response was saved',async()=>{
  const f=fixture(),{data}=await f.begin();await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:zip(30)});
  const row=f.db.prepare('SELECT * FROM admin_uploads').first(),part=f.db.prepare('SELECT * FROM admin_upload_parts').first();
  await f.bucket.resumeMultipartUpload(row.object_key,row.multipart_id).complete([{partNumber:1,etag:part.etag}]);
  assert.equal((await f.call(`/${data.id}/complete`,{method:'POST'})).status,200);
});
test('shared downloads stream exact bytes, support ranges, revoke, and delete',async()=>{
  const f=fixture(),{data}=await f.begin();const bytes=zip(30);
  await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes});await f.call(`/${data.id}/complete`,{method:'POST'});
  const {url}=await(await f.call(`/${data.id}/share`,{method:'POST'})).json(),path=new URL(url).pathname;
  const r=await f.call(path,{role:null});assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);assert.match(r.headers.get('Content-Disposition'),/^attachment;/);assert.match(r.headers.get('Cache-Control'),/no-store/);
  const head=await f.call(path,{role:null,method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('Content-Length'),'30');
  const range=await f.call(path,{role:null,headers:{Range:'bytes=4-8'}});assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 4-8/30');assert.equal((await range.arrayBuffer()).byteLength,5);
  assert.equal((await f.call(path,{role:null,headers:{Range:'bytes=40-'}})).status,416);
  assert.equal((await f.call(path,{role:null,method:'POST'})).status,405);
  assert.equal((await f.call(path.replace(/\/[a-f0-9]{64}\//,'/'+ '0'.repeat(64)+'/'),{role:null})).status,404);
  const listed=await(await f.call()).json();assert.equal(listed.files[0].shared,true);assert.doesNotMatch(JSON.stringify(listed),/share_token|multipart_id|object_key/);
  await f.call(`/${data.id}/revoke`,{method:'POST'});assert.equal((await f.call(path,{role:null})).status,404);
  const next=await(await f.call(`/${data.id}/share`,{method:'POST'})).json();assert.notEqual(next.url,url);
  f.objects.set('published-card.webp',{size:10});
  assert.equal((await f.call(`/${data.id}`,{method:'DELETE'})).status,200);
  assert.equal((await f.call(new URL(next.url).pathname,{role:null})).status,404);assert.equal(f.objects.size,1);assert.ok(f.objects.has('published-card.webp'));
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM admin_upload_parts').first().n,0);
});
test('cancel aborts parts; expired uploads and quotas are enforced',async()=>{
  const f=fixture(),{data}=await f.begin();
  f.db.prepare('UPDATE admin_uploads SET created_at=?').bind(Date.now()-7*86400000).run();
  assert.equal((await f.call(`/${data.id}/parts/1`,{method:'PUT',bytes:zip(30)})).status,410);
  assert.equal((await(await f.call()).json()).files[0].status,'expired');
  assert.equal((await f.call(`/${data.id}`,{method:'DELETE'})).status,200);assert.equal(f.multiparts.size,0);
  for(let i=0;i<10;i++)assert.equal((await f.begin()).response.status,201);
  assert.equal((await f.begin()).response.status,409);
});
test('ranges handle suffixes and reject invalid values',()=>{
  assert.deepEqual(byteRange('bytes=-5',30),{offset:25,length:5});assert.deepEqual(byteRange('bytes=10-',30),{offset:10,length:20});assert.deepEqual(byteRange('bytes=0-99',30),{offset:0,length:30});
  for(const range of ['bytes=-0','bytes=9-8','bytes=30-','bytes=0-1,3-4','bytes=-','bytes=999999999999999999-'])assert.throws(()=>byteRange(range,30));
});
