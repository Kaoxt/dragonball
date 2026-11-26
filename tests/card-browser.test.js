import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {cardTypeLabel} from '../public/cards/card-types.js';
import {catalog} from '../public/cards/catalog.js';
import {cardPath,setPath,catalogRoute,catalogSets,browserSets,PROMOTIONAL_SET,promoCategory,cardInSet,comparePromoCategories} from '../public/cards/card-links.js';

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
  const context=vm.createContext({cardTypeLabel,catalog,cardPath,setPath,catalogRoute,catalogSets,browserSets,PROMOTIONAL_SET,promoCategory,cardInSet,comparePromoCategories,document,window,location,history,URL,
    Option:class{constructor(text,value){this.text=text;this.value=value;}},
    localStorage:{removeItem(){removed++;}},navigator:{clipboard:{writeText:async value=>{copied=value;}}}});
  vm.runInContext(source,context);
  return {elements,location,history,events,document,removed:()=>removed,copied:()=>copied,
    click:element=>element.onclick({button:0,preventDefault(){}})};
}

const grid=b=>b.elements['card-grid'].children;
const pageLink=(b,n)=>b.elements['pagination-top'].children.find(el=>el['aria-label']===`Page ${n}`);

test('Promotional Cards replaces the top promo panel and individual subset options',()=>{
 const root=browser();
 assert.equal(root.elements['promo-subsets-section'],undefined);
 assert.equal(root.elements['related-collections'],undefined);
 assert.equal(root.elements.set.options.filter(o=>o.value==='Promotional Cards').length,1);
 assert.ok(!root.elements.set.options.some(o=>o.value==='Movie 7: Super Android 13'));
 assert.ok(!grid(root).some(el=>el.className==='promo-category-heading'));
 root.elements.set.value='Promotional Cards';root.elements.set.onchange();
 assert.equal(root.location.assigned,'/cards/promotional-cards/');
});

test('promos render in named categories across 52-card pages without duplicates or omissions',()=>{
 const links=[],headings=[];
 for(let page=1;page<=3;page++){
  const b=browser(`/cards/promotional-cards/?sort=number&page=${page}`);
  assert.equal(b.elements.set.value,'Promotional Cards');
  assert.equal(b.elements['breadcrumb-current'].textContent,'Promotional Cards');
  assert.equal(b.elements['collection-name'].textContent,'Promotional Cards');
  const children=grid(b),cards=children.filter(el=>el.className==='catalog-card');
  assert.equal(children[0].className,'promo-category-heading');
  assert.equal(cards.length,page===3?19:52);
  links.push(...cards.map(el=>el.href));
  headings.push(...children.filter(el=>el.className==='promo-category-heading').map(el=>el.textContent));
  assert.ok(cards.every(el=>el.children[1].tagName==='h3'));
 }
 assert.equal(links.length,123);assert.equal(new Set(links).size,123);
 assert.equal(headings[0],'Movie 7');
 for(const category of ['Saiyan Saga Promos','Frieza Saga Promos','Trunks Saga Promos','Android Saga Promos','Cell Saga Promos','Cell Games Saga Promos','World Games Saga Promos','Cell Games Saga Previews','World Games Saga Previews','Babidi Saga Previews'])assert.ok(headings.includes(category));
 assert.deepEqual(links.slice(0,34),Array.from({length:34},(_,i)=>`/cards/movie-7-super-android-13/m${i+1}`));
 for(const card of catalog.filter(c=>/^P(?:R)?\d+$/.test(c.number)))assert.ok(links.includes(cardPath(card)));
 assert.ok(!links.includes('/cards/world-games-saga/201'));
});

test('promo category search, filters, pagination, card close and browser history retain the collection',()=>{
 const b=browser('/cards/promotional-cards/?sort=number');
 b.elements.query.value='Movie 7';b.elements.query.oninput();
 assert.equal(grid(b).filter(el=>el.className==='catalog-card').length,34);
 assert.equal(b.elements['pagination-top'].hidden,true);
 b.elements.type.value='Main Personality';b.elements.type.onchange();
 const filtered=grid(b).filter(el=>el.className==='catalog-card');
 assert.ok(filtered.length>0&&filtered.length<34);
 const returnPath=b.location.pathname+b.location.search;
 b.click(filtered[0]);assert.equal(b.elements['card-detail'].open,true);
 b.elements['close-detail'].onclick();
 assert.equal(b.location.pathname+b.location.search,returnPath);
 assert.equal(b.elements.query.value,'Movie 7');assert.equal(b.elements.type.value,'Main Personality');
 assert.equal(grid(b)[0].textContent,'Movie 7');
 b.elements.clear.onclick();
 assert.equal(b.location.pathname,'/cards/promotional-cards/');
 b.click(pageLink(b,2));assert.equal(b.location.search,'?page=2');
 b.history.back();assert.equal(b.location.search,'');
 b.elements.query.value='no such promotional card';b.elements.query.oninput();
 assert.equal(grid(b).length,0);assert.equal(b.elements['no-results'].hidden,false);
});

test('existing Movie 7 set, card, and download links remain usable',()=>{
 const movie=browser('/cards/movie-7-super-android-13/?sort=number');
 assert.equal(movie.elements.set.value,'Promotional Cards');
 assert.equal(grid(movie).length,34);
 assert.ok(grid(movie).some(el=>el.href.endsWith('/m16')));
 const m16=browser('/cards/movie-7-super-android-13/m16');
 assert.equal(m16.elements['card-detail'].open,true);
 assert.equal(m16.elements['detail-name'].textContent,'Super Saiyan Goku');
 assert.equal(m16.elements.download.href,catalog.find(c=>c.id==='movie7-m16-super-saiyan-goku').downloadImage);
});

test('Personality labels appear in filters, result cards and details while legacy filter URLs work',()=>{
 const b=browser('/cards/?type=Main+Personality');
 assert.equal(b.elements.type.options.find(o=>o.value==='Main Personality').text,'Personality');
 assert.ok(grid(b).length>0);
 assert.ok(grid(b).every(c=>c.children[2].textContent.endsWith(' · Personality')));
 b.click(grid(b)[0]);
 const fields=b.elements['detail-meta'].children;
 assert.equal(fields[fields.findIndex(c=>c.textContent==='Type')+1].textContent,'Personality');
});

test('Cell Games Saga exposes 142 reviewed cards across three pages and resolves every detail and download',()=>{
 const cards=catalog.filter(c=>c.set==='Cell Games Saga'),b=browser('/cards/cell-games-saga/?sort=number');
 assert.equal(cards.length,142);assert.equal(grid(b).length,52);
 assert.equal(b.elements['results-count'].textContent,'Showing 1–52 of 142 cards in Cell Games Saga');
 assert.equal(b.elements['collection-name'].hidden,true);
 assert.equal(b.elements['collection-logo-cell-games'].hidden,false);
 assert.equal(b.elements['collection-logo-cell-games'].alt,'Cell Games Saga');
 assert.match(b.elements['collection-logo-cell-games'].src,/cell-games-saga-logo-brushed-green\.webp/);
 assert.equal(b.elements['collection-name'].textContent,'Cell Games Saga');
 assert.equal(b.elements['pagination-top'].hidden,false);
 assert.deepEqual(grid(b).map(c=>c.href),Array.from({length:52},(_,i)=>`/cards/cell-games-saga/${String(i+1).padStart(3,'0')}`));
 const second=browser('/cards/cell-games-saga/?sort=number&page=2');
 const remaining=Array.from({length:52},(_,i)=>i+53);
 assert.equal(second.elements['results-count'].textContent,'Showing 53–104 of 142 cards in Cell Games Saga');
 assert.deepEqual(grid(second).map(c=>c.href),remaining.map(n=>`/cards/cell-games-saga/${String(n).padStart(3,'0')}`));
 const third=browser('/cards/cell-games-saga/?sort=number&page=3');
 assert.equal(third.elements['results-count'].textContent,'Showing 105–142 of 142 cards in Cell Games Saga');
 const finalNumbers=[...Array.from({length:21},(_,i)=>String(i+105)),...['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10'],...Array.from({length:7},(_,i)=>`PR${i+1}`)];
 assert.deepEqual(grid(third).map(c=>c.href),finalNumbers.map(n=>`/cards/cell-games-saga/${n.toLowerCase()}`));
 for(const card of cards){
  const direct=browser(cardPath(card));assert.equal(direct.elements['card-detail'].open,true);
  assert.equal(direct.elements['download'].href,card.downloadImage);
  assert.equal(catalogRoute(cardPath(card),catalog).card.id,card.id);
 }
});

test('complete Android Saga includes 125 numbered cards, P1–P11, and a reachable third page',()=>{
 const android=catalog.filter(c=>c.set==='Android Saga');
 assert.equal(android.length,136);
 assert.equal(new Set(android.map(c=>c.number)).size,136);
 for(const n of [...Array.from({length:125},(_,i)=>String(i+1)),...Array.from({length:11},(_,i)=>`P${i+1}`)])
  assert.ok(android.some(c=>c.number===n),`Missing Android ${n}`);
 const b=browser('/cards/android-saga/?page=3');
 const expected=[...android].sort((a,b)=>a.name.localeCompare(b.name)).slice(104).map(cardPath);
 assert.deepEqual(grid(b).map(c=>c.href),expected);
 assert.equal(b.elements['results-count'].textContent,'Showing 105–136 of 136 cards in Android Saga');
 assert.equal(android.find(c=>c.number==='P10').width,1484);
 assert.equal(android.find(c=>c.number==='P10').type,'Location');
 for(const c of android.filter(c=>Number(c.number)>=114 && Number(c.number)<=123)){
  assert.equal(c.type,'Main Personality');assert.equal(c.powerStages.length,11);
  assert.equal(c.powerStages.at(-1),0);assert.ok(c.downloadImage);
 }
});

test('Cards opens all sets directly with 52 cards and no set directory',()=>{
 const b=browser();
 assert.equal(grid(b).length,52);
 assert.equal(b.elements['set-directory'],undefined);
 assert.equal(b.elements.set.value,'');
 assert.equal(b.elements['pagination-top'].hidden,false);
 assert.equal(b.elements['pagination-bottom'].hidden,false);
 assert.equal(b.elements['results-count'].textContent,`Showing 1–52 of ${catalog.length} cards`);
 assert.equal(b.removed(),1);
});

test('every page contains its 52-card slice without omissions or duplicates',()=>{
 const expected=[...catalog].sort((a,b)=>a.name.localeCompare(b.name)).map(cardPath),seen=[];
 const b=browser();
 for(let n=1;n<=Math.ceil(catalog.length/52);n++){
  if(n>1)b.click(pageLink(b,n));
  assert.deepEqual(grid(b).map(c=>c.href),expected.slice((n-1)*52,n*52));
  assert.equal(pageLink(b,n)['aria-current'],'page');
  seen.push(...grid(b).map(c=>c.href));
 }
 assert.deepEqual(seen,expected);
 assert.equal(b.elements['pagination-top'].children.at(-1)['aria-disabled'],'true');
 b.history.back();assert.equal(b.location.search,`?page=${Math.ceil(catalog.length/52)-1}`);
 b.history.forward();assert.equal(b.location.search,`?page=${Math.ceil(catalog.length/52)}`);
});

test('page and filter URLs survive refresh and invalid pages are corrected',()=>{
 const b=browser('/cards/?page=2');const expected=grid(b).map(c=>c.href);
 b.events.pageshow();assert.deepEqual(grid(b).map(c=>c.href),expected);
 assert.deepEqual(grid(browser('/cards/?page=2')).map(c=>c.href),expected);
 for(const page of ['0','-2','NaN','1.5','Infinity','9007199254740992']){
  const invalid=browser('/cards/?page='+page);assert.equal(invalid.location.search,'');assert.equal(grid(invalid).length,52);
 }
 const last=browser('/cards/?page=999');assert.equal(last.location.search,`?page=${Math.ceil(catalog.length/52)}`);
 const filtered=browser('/cards/saiyan-saga/?query=goku&type=Main+Personality&sort=name&page=2');
 assert.equal(filtered.elements.query.value,'goku');assert.equal(filtered.elements.type.value,'Main Personality');
 assert.ok(grid(filtered).every(c=>c.children[1].textContent.toLowerCase().includes('goku')));
});

test('search, type, style, sort and Reset return to page one; empty results hide pagination',()=>{
 for(const key of ['query','type','style','sort']){
  const b=browser('/cards/?page=3'),el=b.elements;
  el[key].value={query:'goku',type:'Physical Combat',style:'Orange',sort:'number'}[key];
  (key==='query'?el[key].oninput:el[key].onchange)();
  assert.ok(!b.location.search.includes('page='));assert.ok(grid(b).length<=52);
 }
 const b=browser('/cards/?page=3'),el=b.elements;
 el.query.value='no-such-card-ever';el.query.oninput();
 assert.equal(grid(b).length,0);assert.equal(el['no-results'].hidden,false);assert.equal(el['pagination-top'].hidden,true);
 b.click(el.clear);assert.equal(grid(b).length,52);assert.equal(b.location.search,'');
});

test('set pages and Reset stay within their set; small sets hide pagination',()=>{
 const b=browser('/cards/frieza-saga/'),el=b.elements;
 const count=catalog.filter(c=>c.set==='Frieza Saga').length;
 assert.equal(el.set.value,'Frieza Saga');assert.equal(el.sort.value,'name');
 const expected=catalog.filter(c=>c.set==='Frieza Saga').sort((a,b)=>a.name.localeCompare(b.name)).slice(0,52).map(cardPath);
 assert.deepEqual(grid(b).map(c=>c.href),expected);
 assert.equal(grid(b).length,Math.min(52,count));assert.equal(el['pagination-top'].hidden,count<=52);
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
 const b=browser('/cards/all/?page=2');assert.equal(grid(b).length,52);
 assert.equal(b.location.pathname,'/cards/');assert.equal(b.location.search,'?page=2');
});

test('Trunks Saga shows all 210 cards across five pages, with its wordmark and working detail links',()=>{
 const b=browser('/cards/trunks-saga/?sort=number'),el=b.elements;
 assert.equal(grid(b).length,52);
 assert.equal(el['collection-logo-trunks'].hidden,false);
 assert.equal(el['collection-logo-trunks'].src,'/assets/sets/trunks-saga-logo-brushed-purple.webp?v=20261026-set-banners');
 assert.equal(el['collection-logo'].hidden,true);
 assert.equal(el['collection-logo-frieza'].hidden,true);
 assert.equal(el['pagination-top'].hidden,false);
 assert.deepEqual(grid(b).map(c=>c.href),Array.from({length:52},(_,i)=>`/cards/trunks-saga/${String(i+1).padStart(3,'0')}`));
 b.click(grid(b)[2]);
 assert.equal(el['card-detail'].open,true);
 assert.equal(b.location.pathname,'/cards/trunks-saga/003');
 b.click(el['close-detail']);
 b.click(pageLink(b,2));
 assert.equal(grid(b).length,52);
 assert.deepEqual(grid(b).map(c=>c.href),Array.from({length:52},(_,i)=>`/cards/trunks-saga/${String(i+53).padStart(3,'0')}`));
 b.click(grid(b)[19]);
 assert.equal(el['card-detail'].open,true);
 assert.equal(b.location.pathname,'/cards/trunks-saga/072');
 b.click(el['close-detail']);
 b.click(pageLink(b,3));
 assert.equal(grid(b).length,52);
 assert.deepEqual(grid(b).map(c=>c.href),Array.from({length:52},(_,i)=>`/cards/trunks-saga/${String(i+105).padStart(3,'0')}`));
 b.click(grid(b)[51]);
 assert.equal(el['card-detail'].open,true);
 assert.equal(b.location.pathname,'/cards/trunks-saga/156');
 b.click(el['close-detail']);
 b.click(pageLink(b,4));
 assert.equal(grid(b).length,52);
 assert.deepEqual(grid(b).map(c=>c.href),[...Array.from({length:44},(_,i)=>`/cards/trunks-saga/${157+i}`),...Array.from({length:8},(_,i)=>`/cards/trunks-saga/p${i+1}`)]);
 b.click(pageLink(b,5));
 assert.equal(grid(b).length,2);
 assert.deepEqual(grid(b).map(c=>c.href),Array.from({length:2},(_,i)=>`/cards/trunks-saga/p${i+9}`));
 b.click(grid(b)[1]);
 assert.equal(el['card-detail'].open,true);
 assert.equal(b.location.pathname,'/cards/trunks-saga/p10');
});


test('Android set shows its banner through refresh and hides it outside that set',()=>{
 const b=browser('/cards/android-saga/'),el=b.elements;
 assert.equal(el.set.value,'Android Saga');
 assert.equal(el['collection-logo-android'].hidden,false);
 assert.equal(el['collection-logo-android'].src,'/assets/sets/android-saga-logo-brushed-crimson.webp?v=20261026-set-banners');
 assert.equal(el['collection-name'].hidden,true);
 for(const id of ['collection-logo','collection-logo-frieza','collection-logo-trunks'])assert.equal(el[id].hidden,true);
 const expected=catalog.filter(c=>c.set==='Android Saga').sort((a,b)=>a.name.localeCompare(b.name)).slice(0,52).map(cardPath);
 assert.ok(expected.length>0);assert.deepEqual(grid(b).map(c=>c.href),expected);
 b.events.pageshow();assert.equal(el['collection-logo-android'].hidden,false);
 assert.equal(browser('/cards/').elements['collection-logo-android'].hidden,true);
 assert.equal(browser('/cards/trunks-saga/').elements['collection-logo-android'].hidden,true);
});


test('Cell Saga promos appear in type filters and expose exact display and download images',()=>{
 const promos=catalog.filter(c=>c.set==='Cell Saga'&&/^P\d+$/.test(c.number));
 assert.equal(promos.length,10);
 const set=browser('/cards/cell-saga/');
 assert.equal(set.elements['results-count'].textContent,'Showing 1–52 of 216 cards in Cell Saga');
 for(const card of promos){
  const filtered=browser('/cards/cell-saga/?query='+encodeURIComponent(card.name)+'&type='+encodeURIComponent(card.type));
  assert.ok(grid(filtered).some(el=>el.href===cardPath(card)),card.name);
  const direct=browser('/cards/cell-saga/'+card.number);
  assert.equal(direct.elements['card-detail'].open,true);
  assert.equal(direct.elements['detail-image'].src,card.image);
  assert.equal(direct.elements.download.href,card.downloadImage);
 }
});

