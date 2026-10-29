import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const imagePath='/api/forum/images/12345678-1234-4234-abcd-1234567890ab';
const image=`![1000032892](${imagePath})`;

async function news(body){
 const imageNode={parent:null};
 const container=()=>({child:null,querySelector(){return this.child;},append(node){if(node.parent)node.parent.child=null;this.child=node;node.parent=this;}});
 const cover=container(),slot=container();cover.append(imageNode);
 const preview={hidden:false},full={hidden:true,querySelector:()=>slot},label={textContent:'Show more'},attributes={};
 const article={querySelector:selector=>({'.news-full':full,'[data-summary]':preview,'.news-preview-image':cover})[selector]};
 const button={closest:()=>article,querySelector:()=>label,setAttribute:(name,value)=>attributes[name]=value};
 const handlers={};
 const root={dataset:{news:'true'},innerHTML:'',addEventListener(type,fn){handlers[type]=fn;},setAttribute(){},removeAttribute(){},querySelectorAll:selector=>selector==='[data-expand]'?[button]:[]};
 const error={textContent:''};
 const context=vm.createContext({window:{addEventListener(){}},document:{getElementById:id=>id==='forum-content'?root:id==='forum-error'?error:null,addEventListener(){},body:{classList:{toggle(){}}}},location:{hash:'',pathname:'/',search:'?design=v2',href:'https://dragonballocg.com/?design=v2',origin:'https://dragonballocg.com'},URL,URLSearchParams});
 for(const name of ['common','editor'])vm.runInContext(fs.readFileSync(new URL(`../public/forum/${name}.js`,import.meta.url),'utf8'),context);
 context.window.DragonForum.api=async()=>({page:1,hasMore:false,articles:[{id:1,title:'Build Your Next Deck',body,created_at:'2026-10-08T12:00:00Z',member_id:'author',author:'Kaoxt',reply_count:0,category_id:4}]});
 vm.runInContext(fs.readFileSync(new URL('../public/forum/forum.js',import.meta.url),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(error.textContent,'');
 const summary=root.innerHTML.split('<div class="news-preview" data-summary>')[1].split('<div class="forum-rich news-full"')[0];
 return {html:root.innerHTML,summary,preview,full,button,label,attributes,cover,slot,imageNode,handlers,location:context.location};
}

test('collapsed News shows the uploaded lead image and readable copy instead of its filename',async()=>{
 const result=await news(image+'\n\nBrowse the card collection.\n\nMore details.');
 assert.match(result.summary,/<div class="forum-rich news-preview-image"><a class="forum-post-image"/);
 assert.ok(result.summary.includes(`src="${imagePath}"`));
 assert.match(result.summary,/<p class="release-summary">Browse the card collection\. More details\.<\/p>/);
 assert.ok(!result.summary.includes('1000032892…'));
 assert.equal(result.preview.hidden,false);
 assert.equal(result.full.hidden,true);
 result.button.onclick();
 assert.equal(result.preview.hidden,true);
 assert.equal(result.full.hidden,false);
 assert.equal(result.attributes['aria-expanded'],'true');
 assert.equal(result.label.textContent,'Show less');
 assert.equal(result.slot.child,result.imageNode);
 assert.equal(result.cover.child,null);
 result.button.onclick();
 assert.equal(result.preview.hidden,false);
 assert.equal(result.full.hidden,true);
 assert.equal(result.attributes['aria-expanded'],'false');
 assert.equal(result.cover.child,result.imageNode);
 assert.equal(result.slot.child,null);
});

test('image-only and multiple-image News show one safe cover without an empty summary',async()=>{
 const result=await news(image+'\n\n'+image.replace('1000032892','Second image'));
 assert.equal((result.summary.match(/<img /g)||[]).length,1);
 assert.ok(!result.summary.includes('release-summary'));
 assert.equal((result.html.match(/<img /g)||[]).length,2); // One node per image, with a slot for the cover.
 assert.match(result.html,/data-news-image-slot/);
});

test('text-only News keeps its excerpt and later images can serve as the cover',async()=>{
 assert.equal((await news('First paragraph.\n\nSecond paragraph.')).summary,'<p class="release-summary">First paragraph. Second paragraph.</p></div>');
 const result=await news('First paragraph.\n\n'+image);
 assert.ok(result.summary.includes(`src="${imagePath}"`));
 assert.match(result.summary,/<p class="release-summary">First paragraph\.<\/p>/);
});

test('News previews continue across paragraphs while keeping large post excerpts bounded',async()=>{
 const result=await news('Short intro.\n\n'+'More detail about building your deck. '.repeat(40));
 const text=result.summary.match(/<p class="release-summary">([^<]*)<\/p>/)[1];
 assert.ok(text.startsWith('Short intro. More detail about building your deck.'));
 assert.ok(text.length<=641);
 assert.ok(text.endsWith('…'));
 assert.ok(!text.includes('\n'));
});

test('News previews do not promote escaped, code, or unsafe image markup to images',async()=>{
 for(const body of ['`'+image+'`','```\n'+image+'\n```','\\'+image,'![x](javascript:alert(1))','![x](https://example.com/image.jpg)','<img src=x onerror=alert(1)>']){
  const {summary}=await news(body);
  assert.ok(!summary.includes('<img '),body);
 }
 const {summary}=await news(image.replace('1000032892','<script>bad</script>'));
 assert.ok(summary.includes('alt="&lt;script&gt;bad&lt;/script&gt;"'));
 assert.ok(!summary.includes('<script>'));
});


test('Back and category links route in-page while preserving the selected design',async()=>{
 const result=await news('First paragraph.');
 result.location.hash='#topic/5';result.location.href+='\u0023topic/5';
 const click=(href,extra={})=>{
  let prevented=false;
  const link={href,target:'',hasAttribute:()=>false};
  result.handlers.click({button:0,target:{closest:()=>link},preventDefault(){prevented=true;},...extra});
  return prevented;
 };
 assert.equal(click('https://dragonballocg.com/'),true);
 assert.equal(result.location.hash,'');
 assert.equal(click('https://dragonballocg.com/#topic/8'),true);
 assert.equal(result.location.hash,'#topic/8');
 assert.equal(click('https://dragonballocg.com/',{ctrlKey:true}),false);
 assert.equal(click('https://dragonballocg.com/forums/'),false);
 assert.equal(click('https://dragonballocg.com/?page=2'),false);
 assert.equal(click('https://example.com/'),false);
});

function cachedApi(respond=async()=>({ok:true,json:async()=>({items:[1]})})){
 const calls=[],events={};let now=1000;
 const context=vm.createContext({window:{addEventListener:(name,fn)=>events[name]=fn},URLSearchParams,structuredClone,AbortSignal,Date:class extends Date{static now(){return now;}},fetch:(url,options)=>{calls.push({url,options});return respond(url,options);}});
 vm.runInContext(fs.readFileSync(new URL('../public/forum/common.js',import.meta.url),'utf8'),context);
 return {api:context.window.DragonForum.api,calls,events,advance(ms){now+=ms;}};
}
const reuse={reuse:true};

test('route reads reuse cloned results briefly and expire without changing HTTP cache policy',async()=>{
 const {api,calls,advance}=cachedApi();
 const first=await api({view:'topic',id:5},undefined,reuse);first.items.push(2);
 const second=await api({id:5,view:'topic'},undefined,reuse);
 assert.deepEqual(second,{items:[1]});second.items.push(3);
 assert.deepEqual(await api({view:'topic',id:5},undefined,reuse),{items:[1]});
 assert.equal(calls.length,1);assert.equal(calls[0].options.cache,'no-store');
 advance(15001);await api({view:'topic',id:5},undefined,reuse);assert.equal(calls.length,2);
 await api({view:'topic',id:5});assert.equal(calls.length,3);
});

test('route cache clears on writes and authentication changes and excludes private inbox views',async()=>{
 const {api,calls,events}=cachedApi();
 const read=()=>api({view:'categories'},undefined,reuse);
 await read();await api({}, {action:'reply'});await read();assert.equal(calls.length,3);
 events['dragon:auth-signed-out']();await read();assert.equal(calls.length,4);
 events['dragon:auth-signed-in']();await read();assert.equal(calls.length,5);
 await api({view:'messages'},undefined,reuse);await api({view:'messages'},undefined,reuse);assert.equal(calls.length,7);
});

test('concurrent route reads share one request but not mutable results',async()=>{
 let resolve;const {api,calls}=cachedApi(()=>new Promise(r=>resolve=r));
 const a=api({view:'news'},undefined,reuse),b=api({view:'news'},undefined,reuse);
 resolve({ok:true,json:async()=>({items:[1]})});
 const [one,two]=await Promise.all([a,b]);one.items.push(2);
 assert.deepEqual(two,{items:[1]});assert.equal(calls.length,1);
});

test('failed reads and reads invalidated during a write are never retained',async()=>{
 let fail=true,finishWrite;
 const {api,calls}=cachedApi(async(url,options)=>{
  if(options.method==='POST')return new Promise(resolve=>finishWrite=()=>resolve({ok:true,json:async()=>({ok:true})}));
  return {ok:!fail,json:async()=>fail?{error:'Temporary failure'}:{items:[1]}};
 });
 const read=()=>api({view:'categories'},undefined,reuse);
 await assert.rejects(read(),/Temporary failure/);fail=false;await read();assert.equal(calls.length,2);
 const write=api({}, {action:'reply'});await read();finishWrite();await write;await read();
 assert.equal(calls.length,5);
});

test('a route read started before sign-out cannot repopulate the cache afterwards',async()=>{
 let resolve;const {api,calls,events}=cachedApi(()=>new Promise(r=>resolve=r));
 const first=api({view:'categories'},undefined,reuse);
 events['dragon:auth-signed-out']();resolve({ok:true,json:async()=>({items:[1]})});await first;
 const next=api({view:'categories'},undefined,reuse);assert.equal(calls.length,2);
 resolve({ok:true,json:async()=>({items:[2]})});await next;
});
