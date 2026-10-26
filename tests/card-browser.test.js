import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {catalog} from '../public/cards/catalog.js';
import {cardPath,setPath,catalogRoute,catalogSets} from '../public/cards/card-links.js';

// Run the real browser module against a small DOM/history adapter, without a browser process.
const source=readFileSync(new URL('../public/cards/cards.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
const html=readFileSync(new URL('../public/cards/index.html',import.meta.url),'utf8');
function browser(path='/cards/') {
  class Element {
    constructor(tag='div'){this.tagName=tag;this.children=[];this.options=[];this.value='';this.open=false;this.events={};}
    add(option){this.options.push(option);}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    setAttribute(name,value){this[name]=value;}
    addEventListener(name,fn){this.events[name]=fn;}
    showModal(){this.open=true;} close(){this.open=false;}
    focus(){this.focused=true;} select(){this.selected=true;} scrollIntoView(){}
  }
  const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()]));
  for(const key of ['set','type','style'])elements[key].options=[{value:''}];
  elements.sort.options=[{value:'name'},{value:'number'}];elements.sort.value='name';
  elements.filters.reset=()=>{for(const key of ['query','set','type','style'])elements[key].value='';};
  const events={},location={origin:'https://dragonballocg.com',assign(value){this.assigned=value;}};
  const setLocation=path=>{const url=new URL(path,location.origin);location.pathname=url.pathname;location.search=url.search;};
  setLocation(path);
  const window={addEventListener:(name,fn)=>events[name]=fn};
  const entries=[{path,state:null}];let position=0,removed=0,copied='';
  const move=()=>{setLocation(entries[position].path);events.popstate?.();};
  const history={get state(){return entries[position].state;},
    pushState(state,unused,path){entries.splice(position+1);entries.push({path,state});position++;setLocation(path);},
    replaceState(state,unused,path){entries[position]={path,state};setLocation(path);},
    back(){if(position){position--;move();}},forward(){if(position<entries.length-1){position++;move();}}};
  const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag),title:''};
  const context=vm.createContext({catalog,cardPath,setPath,catalogRoute,catalogSets,document,window,location,history,URL,
    Option:class{constructor(text,value){this.text=text;this.value=value;}},
    localStorage:{removeItem(){removed++;}},navigator:{clipboard:{writeText:async value=>{copied=value;}}}});
  vm.runInContext(source,context);
  return {elements,location,history,events,document,removed:()=>removed,copied:()=>copied,
    click:element=>element.onclick({button:0,preventDefault(){}})};
}

const grid=b=>b.elements['card-grid'].children;
const pageLink=(b,n)=>b.elements['pagination-top'].children.find(el=>el['aria-label']===`Page ${n}`);

test('Cards opens all sets directly with 60 cards and no set directory',()=>{
 const b=browser();
 assert.equal(grid(b).length,60);
 assert.equal(b.elements['set-directory'],undefined);
 assert.equal(b.elements.set.value,'');
 assert.equal(b.elements['pagination-top'].hidden,false);
 assert.equal(b.elements['pagination-bottom'].hidden,false);
 assert.equal(b.elements['results-count'].textContent,`Showing 1–60 of ${catalog.length} cards`);
 assert.equal(b.removed(),1);
});

test('every page contains its 60-card slice without omissions or duplicates',()=>{
 const expected=[...catalog].sort((a,b)=>a.name.localeCompare(b.name)).map(cardPath),seen=[];
 const b=browser();
 for(let n=1;n<=Math.ceil(catalog.length/60);n++){
  if(n>1)b.click(pageLink(b,n));
  assert.deepEqual(grid(b).map(c=>c.href),expected.slice((n-1)*60,n*60));
  assert.equal(pageLink(b,n)['aria-current'],'page');
  seen.push(...grid(b).map(c=>c.href));
 }
 assert.deepEqual(seen,expected);
 assert.equal(b.elements['pagination-top'].children.at(-1)['aria-disabled'],'true');
 b.history.back();assert.equal(b.location.search,`?page=${Math.ceil(catalog.length/60)-1}`);
 b.history.forward();assert.equal(b.location.search,`?page=${Math.ceil(catalog.length/60)}`);
});

test('page and filter URLs survive refresh and invalid pages are corrected',()=>{
 const b=browser('/cards/?page=2');const expected=grid(b).map(c=>c.href);
 b.events.pageshow();assert.deepEqual(grid(b).map(c=>c.href),expected);
 assert.deepEqual(grid(browser('/cards/?page=2')).map(c=>c.href),expected);
 for(const page of ['0','-2','NaN','1.5','Infinity','9007199254740992']){
  const invalid=browser('/cards/?page='+page);assert.equal(invalid.location.search,'');assert.equal(grid(invalid).length,60);
 }
 const last=browser('/cards/?page=999');assert.equal(last.location.search,`?page=${Math.ceil(catalog.length/60)}`);
 const filtered=browser('/cards/saiyan-saga/?query=goku&type=Main+Personality&sort=name&page=2');
 assert.equal(filtered.elements.query.value,'goku');assert.equal(filtered.elements.type.value,'Main Personality');
 assert.ok(grid(filtered).every(c=>c.children[1].textContent.toLowerCase().includes('goku')));
});

test('search, type, style, sort and Reset return to page one; empty results hide pagination',()=>{
 for(const key of ['query','type','style','sort']){
  const b=browser('/cards/?page=3'),el=b.elements;
  el[key].value={query:'goku',type:'Physical Combat',style:'Orange',sort:'number'}[key];
  (key==='query'?el[key].oninput:el[key].onchange)();
  assert.ok(!b.location.search.includes('page='));assert.ok(grid(b).length<=60);
 }
 const b=browser('/cards/?page=3'),el=b.elements;
 el.query.value='no-such-card-ever';el.query.oninput();
 assert.equal(grid(b).length,0);assert.equal(el['no-results'].hidden,false);assert.equal(el['pagination-top'].hidden,true);
 b.click(el.clear);assert.equal(grid(b).length,60);assert.equal(b.location.search,'');
});

test('set pages and Reset stay within their set; small sets hide pagination',()=>{
 const b=browser('/cards/frieza-saga/'),el=b.elements;
 const count=catalog.filter(c=>c.set==='Frieza Saga').length;
 assert.equal(el.set.value,'Frieza Saga');assert.equal(el.sort.value,'name');
 const expected=catalog.filter(c=>c.set==='Frieza Saga').sort((a,b)=>a.name.localeCompare(b.name)).slice(0,60).map(cardPath);
 assert.deepEqual(grid(b).map(c=>c.href),expected);
 assert.equal(grid(b).length,Math.min(60,count));assert.equal(el['pagination-top'].hidden,count<=60);
 el.query.value='suspension';el.query.oninput();assert.equal(grid(b).length,1);
 b.events.pageshow();assert.equal(el.query.value,'suspension');
 el.sort.value='number';el.sort.onchange();
 assert.equal(new URLSearchParams(b.location.search).get('sort'),'number');
 b.events.pageshow();assert.equal(el.sort.value,'number');
 b.click(el.clear);assert.equal(el.set.value,'Frieza Saga');assert.equal(el.sort.value,'name');
 assert.equal(b.location.search,'');assert.deepEqual(grid(b).map(c=>c.href),expected);
 el.set.value='Saiyan Saga';el.set.onchange();assert.equal(b.location.assigned,'/cards/saiyan-saga/');
 el.set.value='';el.set.onchange();assert.equal(b.location.assigned,'/cards/');
});

test('card modal preserves page, set and filters through Close, Back and Forward',async()=>{
 const b=browser('/cards/?sort=number&page=3'),el=b.elements;
 const before=grid(b).map(c=>c.href);b.click(grid(b)[0]);
 assert.equal(el['card-detail'].open,true);
 await el['copy-link'].onclick();assert.equal(b.copied(),'https://dragonballocg.com'+before[0]);
 b.history.back();assert.equal(el['card-detail'].open,false);assert.equal(b.location.search,'?sort=number&page=3');
 assert.deepEqual(grid(b).map(c=>c.href),before);
 b.history.forward();assert.equal(el['card-detail'].open,true);b.click(el['close-detail']);
 assert.deepEqual(grid(b).map(c=>c.href),before);assert.equal(b.location.search,'?sort=number&page=3');
 const filtered=browser('/cards/frieza-saga/?query=rapid+deflection');
 filtered.click(grid(filtered)[0]);filtered.history.back();assert.equal(filtered.elements.query.value,'rapid deflection');
 const direct=browser('/cards/frieza-saga/011');direct.click(direct.elements['close-detail']);
 assert.equal(direct.location.pathname,'/cards/frieza-saga/');assert.equal(direct.elements['card-detail'].open,false);
});

test('old all-cards links still open the grid and normalize to Cards',()=>{
 const b=browser('/cards/all/?page=2');assert.equal(grid(b).length,60);
 assert.equal(b.location.pathname,'/cards/');assert.equal(b.location.search,'?page=2');
});

test('Trunks Saga shows all 180 cards across three pages, with its wordmark and working detail links',()=>{
 const b=browser('/cards/trunks-saga/?sort=number'),el=b.elements;
 assert.equal(grid(b).length,60);
 assert.equal(el['collection-logo-trunks'].hidden,false);
 assert.equal(el['collection-logo-trunks'].src,'/assets/sets/trunks-saga-logo-brushed-purple.webp');
 assert.equal(el['collection-logo'].hidden,true);
 assert.equal(el['collection-logo-frieza'].hidden,true);
 assert.equal(el['pagination-top'].hidden,false);
 assert.deepEqual(grid(b).map(c=>c.href),Array.from({length:60},(_,i)=>`/cards/trunks-saga/${String(i+1).padStart(3,'0')}`));
 b.click(grid(b)[2]);
 assert.equal(el['card-detail'].open,true);
 assert.equal(b.location.pathname,'/cards/trunks-saga/003');
 b.click(el['close-detail']);
 b.click(pageLink(b,2));
 assert.equal(grid(b).length,60);
 assert.deepEqual(grid(b).map(c=>c.href),Array.from({length:60},(_,i)=>`/cards/trunks-saga/${String(i+61).padStart(3,'0')}`));
 b.click(grid(b)[19]);
 assert.equal(el['card-detail'].open,true);
 assert.equal(b.location.pathname,'/cards/trunks-saga/080');
 b.click(el['close-detail']);
 b.click(pageLink(b,3));
 assert.equal(grid(b).length,60);
 assert.deepEqual(grid(b).map(c=>c.href),Array.from({length:60},(_,i)=>`/cards/trunks-saga/${String(i+121).padStart(3,'0')}`));
 b.click(grid(b)[59]);
 assert.equal(el['card-detail'].open,true);
 assert.equal(b.location.pathname,'/cards/trunks-saga/180');
});
