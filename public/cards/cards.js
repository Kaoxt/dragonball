import {catalog} from './catalog.js';
import {cardPath,setPath,catalogRoute,catalogSets} from './card-links.js';
const $=id=>document.getElementById(id);
const normalize=value=>value.toLocaleLowerCase().replace(/[’']/g,'');
for(const key of ['set','type','style']) for(const value of [...new Set(catalog.map(c=>c[key]))].sort()) if(![...$(key).options].some(option=>option.value===value))$(key).add(new Option(value,value));
// The URL selects the set; older browser-saved searches never override it.
try{localStorage.removeItem('dbocg:cards:filters:v1');}catch{}
let activeSet='';
let activeView='sets';
function resetFilters(){
 $('filters').reset();$('set').value=activeSet;$('sort').value=activeSet?'number':'name';
}
// Also populate the directory when serving this file without the Worker locally.
if(!$('set-rows').children.length){
 for(const set of catalogSets(catalog)){
  const row=document.createElement('tr'),name=document.createElement('th'),count=document.createElement('td');
  name.scope='row';
  const link=document.createElement('a');link.className='set-entry';link.href=set.path;
  if(set.image){
   const logo=document.createElement('span');logo.className=`set-logo set-logo--${set.slug}`;logo.setAttribute('aria-hidden','true');
   for(const part of ['symbol','lettering']){const img=document.createElement('img');img.className=`set-logo-${part}`;img.src=set.image;img.alt='';img.width=2172;img.height=724;logo.append(img);}
   link.append(logo);
  }
  const label=document.createElement('span');label.className='set-name';label.textContent=set.name;link.append(label);name.append(link);
  const countLink=document.createElement('a');countLink.className='set-count';countLink.href=set.path;countLink.textContent=String(set.count);countLink.setAttribute('aria-label',`${set.count} cards in ${set.name}`);count.append(countLink);
  row.append(name,count);$('set-rows').append(row);
 }
}
// Show each set's wordmark only when that set is selected.
const collectionBranding = {
 'saiyan saga': {image:'/assets/sets/saiyan-saga-logo-brushed-blue.webp', name:'Saiyan Saga', element:'collection-logo'},
 'frieza saga': {image:'/assets/sets/frieza-saga-logo-brushed-green.webp', name:'Frieza Saga', element:'collection-logo-frieza'}
};
function renderCollectionBrand(){
 const selected=$('set').value;
 let visibleBrands=0;
 for(const [key,brand] of Object.entries(collectionBranding)){
  const logo=$(brand.element);
  logo.hidden=!selected || selected.toLowerCase()!==key;
  if(!logo.hidden){logo.src=brand.image;logo.alt=brand.name;visibleBrands++;}
 }
 const title=$('collection-name');
 title.hidden=!selected || visibleBrands>0;
 title.textContent=selected;
}
function render(){
 renderCollectionBrand();
 if(activeView==='sets'){$('card-grid').replaceChildren();return;}
 const query=normalize($('query').value.trim());
 const setCards=catalog.filter(c=>!activeSet||c.set===activeSet);
 const cards=setCards.filter(c=>normalize(`${c.name} ${c.number} ${c.id}`).includes(query)&&['type','style'].every(key=>!$(key).value||c[key]===$(key).value));
 cards.sort((a,b)=>$('sort').value==='number'?a.number.localeCompare(b.number,undefined,{numeric:true}):a.name.localeCompare(b.name));
 $('results-count').textContent=`${cards.length} of ${setCards.length} cards${activeSet?' in '+activeSet:''}`;
 $('no-results').hidden=!!cards.length;
 $('card-grid').replaceChildren(...cards.map(c=>{
  const button=document.createElement('a');button.className='catalog-card';button.href=cardPath(c);button.setAttribute('aria-label',`View ${c.name}, card ${c.number}`);
  const img=document.createElement('img');img.src=c.image;img.alt=c.name;img.loading='lazy';img.width=c.width||1070;img.height=c.height||1470;
  const title=document.createElement('h2');title.textContent=c.name;
  const meta=document.createElement('p');meta.textContent=`#${c.number} · ${c.type}`;
  button.append(img,title,meta);
  if(c.status==='Preview'){const badge=document.createElement('span');badge.className='preview-tag';badge.textContent='SAIYAN SAGA PREVIEW';button.append(badge);}
  button.onclick=e=>{
   if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
   e.preventDefault();history.pushState({dbocgCard:true,cardReturnPath:location.pathname},'',cardPath(c));openCard(c);
  };return button;
 }));
}
function openCard(c){
 document.title=`${c.name} · ${c.set} #${c.number} | Dragon Ball OCG`;
 $('detail-image').src=c.image;$('detail-image').alt=c.name;$('detail-name').textContent=c.name;$('detail-status').textContent=c.status==='Preview'?'SAIYAN SAGA · DESIGN PREVIEW':c.set.toUpperCase();
 $('detail-meta').replaceChildren(...[['Number',c.number],['Type',c.type],['Style',c.style],['Set',c.set]].flatMap(([name,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;return[dt,dd];}));
 $('download').href=c.downloadImage||c.image;$('download').download=c.id+'.webp';
 $('share-url').value=new URL(cardPath(c),location.origin).href;$('share-status').textContent='';
 $('preview-note').hidden=c.status!=='Preview';if(!$('card-detail').open)$('card-detail').showModal();
}
function syncRoute(reset=false){
 const route=catalogRoute(location.pathname,catalog)||{kind:'missing'};
 let base=route;
 if(route.kind==='card'&&history.state?.dbocgCard){
  const previous=catalogRoute(history.state.cardReturnPath||'',catalog);
  if(previous&&['set','all'].includes(previous.kind))base=previous;
 }
 const nextSet=base.set||'';
 const nextView=['sets','missing'].includes(route.kind)?'sets':'cards';
 const changed=nextSet!==activeSet||nextView!==activeView;
 activeSet=nextSet;activeView=nextView;
 if(reset||changed)resetFilters();
 $('set').value=activeSet;
 $('card-link-error').hidden=route.kind!=='missing';
 $('set-directory').hidden=activeView!=='sets';
 $('card-browser').hidden=activeView==='sets';
 $('breadcrumb-current').textContent=activeSet||'All cards';
 render();
 if(route.kind==='card'){openCard(route.card);return;}
 if($('card-detail').open)$('card-detail').close();
 document.title=activeView==='sets'?'Card sets | Dragon Ball OCG':`${activeSet||'All cards'} | Dragon Ball OCG`;
}
function closeCard(){
 if(history.state?.dbocgCard){history.back();return;}
 const route=catalogRoute(location.pathname,catalog);
 history.replaceState(null,'',route?.set?setPath(route.set):'/cards/all/');syncRoute();
}
$('filters').onsubmit=e=>e.preventDefault();$('query').oninput=render;
$('set').onchange=()=>location.assign($('set').value?setPath($('set').value):'/cards/all/');
for(const key of ['type','style','sort'])$(key).onchange=render;
$('clear').onclick=()=>{
 resetFilters();
 render();$('query').focus();
};
$('copy-link').onclick=async()=>{
 try{await navigator.clipboard.writeText($('share-url').value);$('share-status').textContent='Link copied.';}
 catch{$('share-url').focus();$('share-url').select();$('share-status').textContent='Select and copy the link above.';}
};
$('close-detail').onclick=closeCard;
$('card-detail').addEventListener('cancel',e=>{e.preventDefault();closeCard();});
$('card-detail').addEventListener('click',e=>{if(e.target===$('card-detail')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCard();}});
window.addEventListener('popstate',()=>syncRoute());
window.addEventListener('pageshow',()=>syncRoute(true));
syncRoute(true);
