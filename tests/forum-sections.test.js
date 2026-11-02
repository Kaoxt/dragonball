import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sections=[{id:2,name:'TCG & Games'},{id:1,name:'Community'}];
const categories=[{id:1,name:'Gameplay',section_id:2,topic_count:2,reply_count:3},{id:2,name:'Introductions',section_id:1,topic_count:0,reply_count:0}];
async function render(hash,data={},admin=false){
 const handlers={},requests=[],nodes=new Map();
 const node=()=>({textContent:'',addEventListener(){},setAttribute(){},removeAttribute(){},querySelector(){return null;},querySelectorAll(){return [];},classList:{toggle(){}}});
 const root={...node(),dataset:{},innerHTML:'',closest:()=>({classList:{toggle(){}}}),addEventListener:(type,fn)=>handlers[type]=fn,insertAdjacentHTML(position,html){this.innerHTML+=html;}};
 const document={getElementById(id){if(id==='forum-content')return root;if(['forum-search-dialog','manage-topic-toggle','jump-to-reply','reply-form','moderate-topic','posting-settings','post-news'].includes(id))return null;if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},querySelectorAll:()=>[],addEventListener(){}};
 const location={hash,pathname:admin?'/forums/admin/':'/forums/',search:'?design=v2',href:'https://dragonballocg.com/'+(admin?'forums/admin/':'forums/')+'?design=v2'+hash,origin:'https://dragonballocg.com'};
 const context=vm.createContext({window:{addEventListener(){},DragonIssueMedia:{avatar:()=>''}},document,location,URL,URLSearchParams});
 for(const name of ['common','editor'])vm.runInContext(fs.readFileSync(new URL(`../public/forum/${name}.js`,import.meta.url),'utf8'),context);
 context.window.DragonForum.api=async q=>{requests.push(q);return {sections,categories,topics:[],stats:{members:0,topics:0,replies:0,posts:0},members:[],...data};};
 vm.runInContext(fs.readFileSync(new URL(`../public/forum/${admin?'admin':'forum'}.js`,import.meta.url),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(document.getElementById('forum-error').textContent,'');
 return {html:root.innerHTML,handlers,requests,location};
}
const breadcrumb=html=>html.match(/<nav class="forum-breadcrumbs"[^>]*>(.*?)<\/nav>/s)[1];
test('forum index groups forums by section order and escapes heading content',async()=>{
 const {html}=await render('');
 const groups=html.match(/<section class="issue-results forum-group".*?<\/section>/gs);
 assert.equal(groups.length,2);
 assert.match(groups[0],/TCG &amp; Games/);assert.match(groups[0],/Gameplay/);assert.doesNotMatch(groups[0],/Introductions/);
 assert.match(groups[1],/Introductions/);assert.doesNotMatch(groups[1],/Gameplay/);
 assert.match(html,/href="#section\/2"/);
});
test('section, forum and topic breadcrumbs resolve current parent names and stable links',async()=>{
 const section=await render('#section/2',{section:sections[0],categories:[categories[0]]});
 assert.equal(section.requests[0].view,'section');assert.equal(section.requests[0].id,'2');
 assert.match(breadcrumb(section.html),/href="\/forums\/".*Home.*aria-current="page">TCG &amp; Games/);
 const forum=await render('#list?category=1');
 assert.match(breadcrumb(forum.html),/href="#section\/2">TCG &amp; Games.*aria-current="page">Gameplay/);
 const topic={id:8,title:'A topic <title>',category_id:1,category_name:'Gameplay',member_id:'member',body:'A post',created_at:'2026-11-02',reply_count:0};
 const detail=await render('#topic/8',{topic,replies:[]});
 assert.match(breadcrumb(detail.html),/Home.*href="#section\/2">TCG &amp; Games.*href="#list\?category=1">Gameplay.*aria-current="page">A topic &lt;title&gt;/);
 assert.equal((breadcrumb(detail.html).match(/aria-hidden="true">&gt;<\/span>/g)||[]).length,3);
 const moved=await render('#topic/8',{topic,replies:[],categories:[{...categories[0],section_id:1},categories[1]]});
 assert.match(breadcrumb(moved.html),/href="#section\/1">Community/);
 assert.doesNotMatch(breadcrumb(moved.html),/TCG/);
});
test('breadcrumb navigation retains design selection and respects modified clicks',async()=>{
 const result=await render('#list?category=1');
 let prevented=false;
 const event={button:0,target:{closest:()=>({href:'https://dragonballocg.com/forums/',target:'',hasAttribute:()=>false})},preventDefault(){prevented=true;}};
 result.handlers.click(event);assert.equal(prevented,true);assert.equal(result.location.hash,'');assert.equal(result.location.search,'?design=v2');
 prevented=false;result.handlers.click({...event,ctrlKey:true});assert.equal(prevented,false);
});
test('admin exposes section creation, section editing, and forum assignment without losing old routes',async()=>{
 const sectionsPage=await render('#sections',{},true);
 assert.match(sectionsPage.html,/data-section="2"/);assert.match(sectionsPage.html,/>Add section<\/button>/);
 const forumsPage=await render('#categories',{},true);
 assert.match(forumsPage.html,/href="#sections"/);assert.match(forumsPage.html,/name="sectionId"/);
 assert.match(forumsPage.html,/<option value="2" selected>TCG &amp; Games/);assert.match(forumsPage.html,/>Save forum<\/button>/);
});
