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
    focus(){this.focused=true;} select(){this.selected=true;}
  }
  const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()]));
  for(const key of ['set','type','style'])elements[key].options=[{value:''}];
  elements.sort.options=[{value:'name'},{value:'number'}];elements.sort.value='name';
  elements.filters.reset=()=>{for(const key of ['query','set','type','style'])elements[key].value='';};
  const events={},location={pathname:path,origin:'https://dragonballocg.com',assign(value){this.assigned=value;}};
  const window={addEventListener:(name,fn)=>events[name]=fn};
  const entries=[{path,state:null}];let position=0,removed=0,copied='';
  const move=()=>{location.pathname=entries[position].path;events.popstate?.();};
  const history={get state(){return entries[position].state;},
    pushState(state,unused,path){entries.splice(position+1);entries.push({path,state});position++;location.pathname=path;},
    replaceState(state,unused,path){entries[position]={path,state};location.pathname=path;},
    back(){if(position){position--;move();}},forward(){if(position<entries.length-1){position++;move();}}};
  const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag),title:''};
  const context=vm.createContext({catalog,cardPath,setPath,catalogRoute,catalogSets,document,window,location,history,URL,
    Option:class{constructor(text,value){this.text=text;this.value=value;}},
    localStorage:{removeItem(){removed++;}},navigator:{clipboard:{writeText:async value=>{copied=value;}}}});
  vm.runInContext(source,context);
  return {elements,location,history,events,document,removed:()=>removed,copied:()=>copied,
    click:element=>element.onclick({button:0,preventDefault(){}})};
}

test('Cards opens a set directory instead of loading all card images',()=>{
  const b=browser();
  assert.equal(b.elements['set-directory'].hidden,false);
  assert.equal(b.elements['card-browser'].hidden,true);
  assert.equal(b.elements['card-grid'].children.length,0);
  assert.equal(b.elements['set-rows'].children.length,catalogSets(catalog).length);
  assert.equal(b.elements['set-rows'].children[1].children[0].children[0].href,'/cards/frieza-saga/');
  assert.equal(b.removed(),1);
});

test('URL set survives refresh, pageshow and Reset, while text filters stay within the set',()=>{
  for(let refresh=0;refresh<2;refresh++) {
    const b=browser('/cards/frieza-saga/'),el=b.elements;
    assert.equal(el.set.value,'Frieza Saga');
    assert.equal(el.sort.value,'number');
    assert.equal(el['card-grid'].children.length,40);
    el.query.value='suspension';el.query.oninput();assert.equal(el['card-grid'].children.length,1);
    b.click(el.clear);assert.equal(el.set.value,'Frieza Saga');assert.equal(el['card-grid'].children.length,40);
    el.query.value='goku';b.events.pageshow();
    assert.equal(el.query.value,'');assert.equal(el.set.value,'Frieza Saga');
    el.set.value='Saiyan Saga';el.set.onchange();assert.equal(b.location.assigned,'/cards/saiyan-saga/');
  }
});

test('direct card link closes to its set; modal Back/Forward preserves the current set search',async()=>{
  const direct=browser('/cards/frieza-saga/011');
  assert.equal(direct.elements['card-detail'].open,true);
  direct.click(direct.elements['close-detail']);
  assert.equal(direct.location.pathname,'/cards/frieza-saga/');
  assert.equal(direct.elements['card-grid'].children.length,40);
  const b=browser('/cards/frieza-saga/'),el=b.elements;
  el.query.value='rapid deflection';el.query.oninput();b.click(el['card-grid'].children[0]);
  assert.equal(b.location.pathname,'/cards/frieza-saga/011');
  await el['copy-link'].onclick();assert.equal(b.copied(),'https://dragonballocg.com/cards/frieza-saga/011');
  b.history.back();assert.equal(el['card-detail'].open,false);assert.equal(el.query.value,'rapid deflection');
  b.history.forward();assert.equal(el['card-detail'].open,true);
  b.click(el['close-detail']);assert.equal(b.location.pathname,'/cards/frieza-saga/');
});

test('Browse all keeps cross-set search available and set switching changes the URL',()=>{
  const b=browser('/cards/all/');
  assert.equal(b.elements['card-grid'].children.length,catalog.length);
  b.click(b.elements['card-grid'].children[0]);b.history.back();
  assert.equal(b.location.pathname,'/cards/all/');
  assert.equal(b.elements['card-grid'].children.length,catalog.length);
  const set=browser('/cards/frieza-saga/');set.elements.set.value='';set.elements.set.onchange();
  assert.equal(set.location.assigned,'/cards/all/');
});
