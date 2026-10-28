import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const imagePath='/api/forum/images/12345678-1234-4234-abcd-1234567890ab';
const image=`![1000032892](${imagePath})`;

async function news(body){
 const preview={hidden:false},full={hidden:true},label={textContent:'Show more'},attributes={};
 const article={querySelector:selector=>selector==='.news-full'?full:preview};
 const button={closest:()=>article,querySelector:()=>label,setAttribute:(name,value)=>attributes[name]=value};
 const root={dataset:{news:'true'},innerHTML:'',addEventListener(){},setAttribute(){},removeAttribute(){},querySelectorAll:selector=>selector==='[data-expand]'?[button]:[]};
 const error={textContent:''};
 const context=vm.createContext({window:{addEventListener(){}},document:{getElementById:id=>id==='forum-content'?root:id==='forum-error'?error:null,addEventListener(){},body:{classList:{toggle(){}}}},location:{hash:'',pathname:'/',origin:'https://dragonballocg.com'},URL,URLSearchParams});
 for(const name of ['common','editor'])vm.runInContext(fs.readFileSync(new URL(`../public/forum/${name}.js`,import.meta.url),'utf8'),context);
 context.window.DragonForum.api=async()=>({page:1,hasMore:false,articles:[{id:1,title:'Build Your Next Deck',body,created_at:'2026-10-08T12:00:00Z',member_id:'author',author:'Kaoxt',reply_count:0,category_id:4}]});
 vm.runInContext(fs.readFileSync(new URL('../public/forum/forum.js',import.meta.url),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(error.textContent,'');
 const summary=root.innerHTML.split('<div class="news-preview" data-summary>')[1].split('<div class="forum-rich news-full"')[0];
 return {html:root.innerHTML,summary,preview,full,button,label,attributes};
}

test('collapsed News shows the uploaded lead image and readable copy instead of its filename',async()=>{
 const result=await news(image+'\n\nBrowse the card collection.\n\nMore details.');
 assert.match(result.summary,/<div class="forum-rich news-preview-image"><a class="forum-post-image"/);
 assert.ok(result.summary.includes(`src="${imagePath}"`));
 assert.match(result.summary,/<p class="release-summary">Browse the card collection\.<\/p>/);
 assert.ok(!result.summary.includes('1000032892…'));
 assert.equal(result.preview.hidden,false);
 assert.equal(result.full.hidden,true);
 result.button.onclick();
 assert.equal(result.preview.hidden,true);
 assert.equal(result.full.hidden,false);
 assert.equal(result.attributes['aria-expanded'],'true');
 assert.equal(result.label.textContent,'Show less');
 result.button.onclick();
 assert.equal(result.preview.hidden,false);
 assert.equal(result.full.hidden,true);
 assert.equal(result.attributes['aria-expanded'],'false');
});

test('image-only and multiple-image News show one safe cover without an empty summary',async()=>{
 const result=await news(image+'\n\n'+image.replace('1000032892','Second image'));
 assert.equal((result.summary.match(/<img /g)||[]).length,1);
 assert.ok(!result.summary.includes('release-summary'));
 assert.equal((result.html.match(/<img /g)||[]).length,3); // Cover plus both images in the hidden full post.
});

test('text-only News keeps its excerpt and later images can serve as the cover',async()=>{
 assert.equal((await news('First paragraph.\n\nSecond paragraph.')).summary,'<p class="release-summary">First paragraph.</p></div>');
 const result=await news('First paragraph.\n\n'+image);
 assert.ok(result.summary.includes(`src="${imagePath}"`));
 assert.match(result.summary,/<p class="release-summary">First paragraph\.<\/p>/);
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
