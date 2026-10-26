import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const source=fs.readFileSync(new URL('../public/load-recovery.js',import.meta.url),'utf8');
function setup(fetch,{assets=[],readyState='loading'}={}){
 const listeners={},windowListeners={},timers=[];
 const context=vm.createContext({window:{fetch,addEventListener:(name,fn)=>windowListeners[name]=fn},location:{href:'https://example.com/',origin:'https://example.com'},document:{readyState,querySelectorAll:selector=>assets.filter(node=>selector==='img'?node.tagName==='IMG':node.tagName==='LINK'),addEventListener:(name,fn)=>listeners[name]=fn},URL,AbortController,DOMException,Error,setTimeout:(fn,ms)=>{const timer=()=>fn();timer.delay=ms;timers.push(timer);return timer;},clearTimeout:timer=>{const i=timers.indexOf(timer);if(i>=0)timers.splice(i,1);}});
 vm.runInContext(source,context);
 const flush=(delay=2000)=>{const due=timers.filter(fn=>fn.delay<=delay);due.forEach(fn=>{timers.splice(timers.indexOf(fn),1);fn();});};
 return {request:context.window.DragonNetwork.fetch,listeners,windowListeners,timers,flush};
}
async function drain(s,promise){for(let i=0;i<20;i++){await Promise.resolve();s.flush();}return promise;}
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
  for(let i=0;i<3;i++){s.listeners.error({target:node});s.flush();}
  const url=new URL(node.href||node.src);assert.equal(url.searchParams.get('_load_retry'),'2');if(node.href)assert.equal(url.searchParams.get('v'),'1');
 }
});
test('missed stylesheet errors recover before images finish loading',()=>{
 const css={tagName:'LINK',rel:'stylesheet',href:'https://example.com/rules.css',isConnected:true,sheet:null};
 const image={tagName:'IMG',src:'https://example.com/card.webp',isConnected:true,complete:false,naturalWidth:0};
 const s=setup(async()=>({status:200}),{assets:[css,image]});
 s.listeners.DOMContentLoaded();s.flush();
 assert.match(css.href,/_load_retry=1/);assert.equal(image.src,'https://example.com/card.webp');
});
test('late recovery script scans immediately, including restored pages',()=>{
 const css={tagName:'LINK',rel:'stylesheet',href:'https://example.com/rules.css',isConnected:true,sheet:null};
 const s=setup(async()=>({status:200}),{assets:[css],readyState:'interactive'});
 s.flush();assert.match(css.href,/_load_retry=1/);
 s.windowListeners.pageshow();s.flush();assert.match(css.href,/_load_retry=2/);
});
test('watchdogs recover a stalled stylesheet even when DOM readiness is blocked',()=>{
 const css={tagName:'LINK',rel:'stylesheet',href:'https://example.com/rules.css',isConnected:true,sheet:null};
 const s=setup(async()=>({status:200}),{assets:[css]});
 s.flush(5000);s.flush();assert.match(css.href,/_load_retry=1/);
 s.flush(15000);s.flush();assert.match(css.href,/_load_retry=2/);
 s.windowListeners.load();s.flush();assert.match(css.href,/_load_retry=2/);
 assert.equal(s.timers.length,0);
});
test('duplicate signals do not consume retries and a late success prevents replacement',()=>{
 const css={tagName:'LINK',rel:'stylesheet',href:'https://example.com/rules.css?v=3',isConnected:true,sheet:null};
 const s=setup(async()=>({status:200}),{assets:[css]});
 s.listeners.error({target:css});s.listeners.DOMContentLoaded();s.windowListeners.load();
 assert.equal(s.timers.filter(fn=>fn.delay<5000).length,1);
 css.sheet={};s.flush();assert.equal(css.href,'https://example.com/rules.css?v=3');
 css.sheet=null;s.listeners.error({target:css});s.flush();assert.match(css.href,/_load_retry=1/);
 s.listeners.error({target:css});s.flush();assert.match(css.href,/_load_retry=2/);
});
test('successful, replaced, cross-origin and application-managed assets are left alone',()=>{
 const nodes=[
  {tagName:'LINK',rel:'stylesheet',href:'https://example.com/loaded.css',sheet:{}},
  {tagName:'LINK',rel:'stylesheet',href:'https://elsewhere.com/style.css'},
  {tagName:'IMG',src:'https://example.com/avatar.png',onerror:()=>{}},
  {tagName:'IMG',src:'https://example.com/card.png',srcset:'card-2x.png 2x'},
  {tagName:'IMG',src:'https://example.com/done.png',complete:true,naturalWidth:100}
 ];
 const s=setup(async()=>({status:200}));
 nodes.forEach(node=>s.listeners.error({target:{...node,isConnected:true}}));
 assert.equal(s.timers.filter(fn=>fn.delay<5000).length,0);
 const css={tagName:'LINK',rel:'stylesheet',href:'https://example.com/old.css',isConnected:true};
 s.listeners.error({target:css});css.href='https://example.com/new.css';s.flush();
 assert.equal(css.href,'https://example.com/new.css');
});
test('every HTML entry loads recovery before styles and application scripts',()=>{
 const directory=new URL('../public/',import.meta.url);
 for(const entry of fs.readdirSync(directory,{recursive:true}).filter(x=>x.endsWith('.html'))){const html=fs.readFileSync(new URL(entry,directory),'utf8');const i=html.indexOf('/load-recovery.js');assert.ok(i>=0,entry);assert.ok(i<html.indexOf('rel="stylesheet"'),entry);}
});
test('Rules fallback styles are authorized by the deployed content security policy',()=>{
 const html=fs.readFileSync(new URL('../public/rulebook/index.html',import.meta.url),'utf8');
 const headers=fs.readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
 const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
 assert.ok(styles.some(([tag])=>tag.includes('id="rulebook-critical"')));
 for(const [,css] of styles){const hash=createHash('sha256').update(css).digest('base64');assert.ok(headers.includes(`'sha256-${hash}'`),'Inline fallback must work under the production CSP');}
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
