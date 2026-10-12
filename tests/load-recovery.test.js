import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/load-recovery.js',import.meta.url),'utf8');
function setup(fetch){
 const listeners={},timers=[];
 const context=vm.createContext({window:{fetch,addEventListener(){}},location:{href:'https://example.com/',origin:'https://example.com'},document:{addEventListener:(name,fn)=>listeners[name]=fn},URL,AbortController,DOMException,Error,setTimeout:(fn,ms)=>{if(ms<10000)timers.push(fn);return fn;},clearTimeout:()=>{}});
 vm.runInContext(source,context);
 return {request:context.window.DragonNetwork.fetch,listeners,timers};
}
async function drain(s,promise){for(let i=0;i<20;i++){await Promise.resolve();s.timers.splice(0).forEach(fn=>fn());}return promise;}
test('GET recovers from network failure and gateway error',async()=>{
 let calls=0,cancelled=0;const s=setup(async()=>{calls++;if(calls===1)throw new TypeError('NetworkError');if(calls===2)return {status:503,body:{cancel:async()=>cancelled++}};return {status:200};});
 const result=await drain(s,s.request('/api/forum'));assert.equal(result.status,200);assert.equal(calls,3);assert.equal(cancelled,1);
});
test('persistent network failure stops after three requests with usable error',async()=>{
 let calls=0;const s=setup(async()=>{calls++;throw new TypeError('NetworkError');});
 await assert.rejects(drain(s,s.request('/api/forum')),/Check your connection/);assert.equal(calls,3);
});
test('POST and rejected authorization/rate limit responses are never retried',async()=>{
 let calls=0;const s=setup(async()=>{calls++;throw new TypeError('NetworkError');});
 await assert.rejects(s.request('/api/forum',{method:'POST',body:'{}'}));assert.equal(calls,1);
 for(const status of [401,403,404,429]){let n=0;const x=setup(async()=>{n++;return {status};});assert.equal((await x.request('/api/forum')).status,status);assert.equal(n,1);}
});
test('caller cancellation is respected without retries',async()=>{
 let calls=0;const s=setup(async()=>{calls++;return {status:200};});const controller=new AbortController();controller.abort();await assert.rejects(s.request('/api/forum',{signal:controller.signal}));assert.equal(calls,0);
});
test('failed CSS and image recover twice without changing stylesheet order',()=>{
 const s=setup(async()=>({status:200}));
 for(const node of [{tagName:'LINK',rel:'stylesheet',href:'https://example.com/style.css?v=1',isConnected:true},{tagName:'IMG',src:'https://example.com/banner.webp',isConnected:true}]){
  for(let i=0;i<3;i++){s.listeners.error({target:node});s.timers.splice(0).forEach(fn=>fn());}
  const url=new URL(node.href||node.src);assert.equal(url.searchParams.get('_load_retry'),'2');if(node.href)assert.equal(url.searchParams.get('v'),'1');
 }
});
test('every HTML entry loads recovery before styles and application scripts',()=>{
 const directory=new URL('../public/',import.meta.url);
 for(const entry of fs.readdirSync(directory,{recursive:true}).filter(x=>x.endsWith('.html'))){const html=fs.readFileSync(new URL(entry,directory),'utf8');const i=html.indexOf('/load-recovery.js');assert.ok(i>=0,entry);assert.ok(i<html.indexOf('rel="stylesheet"'),entry);}
});

test('community dependencies retry before consumers run, and manual retry resumes at failure', async()=>{
 const boot=fs.readFileSync(new URL('../public/forum/boot.js',import.meta.url),'utf8');
 const nodes=[],timers=[],error={textContent:''},root={dataset:{},setAttribute(){},removeAttribute(){},replaceChildren(node){this.retry=node;}};
 const context=vm.createContext({location:{pathname:'/'},document:{getElementById:id=>id==='forum-error'?error:root,createElement:tag=>({tagName:tag,remove(){}}),head:{append:node=>{if(node.tagName==='script')nodes.push(node);}}},setTimeout:fn=>timers.push(fn)});
 vm.runInContext(boot,context);
 const flush=async()=>{for(let i=0;i<10;i++){await Promise.resolve();timers.splice(0).forEach(fn=>fn());}};
 assert.match(nodes[0].src,/media/);nodes[0].onload();await flush();
 assert.match(nodes[1].src,/common/);nodes[1].onload();await flush();
 for(let i=2;i<5;i++){assert.match(nodes[i].src,/editor/);nodes[i].onerror();await flush();}
 assert.equal(nodes.length,5);assert.match(error.textContent,/Unable to load/);
 root.retry.onclick();await flush();assert.match(nodes[5].src,/editor/);
 nodes[5].onload();await flush();assert.match(nodes[6].src,/forum\.js/);
 nodes[6].onload();await flush();assert.equal(nodes.length,7);
});
