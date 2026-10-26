import {catalog} from './catalog.js';
import {cardPath,setPath,catalogRoute} from './card-links.js?v=20261026-set-banners';
const $=id=>document.getElementById(id);
const normalize=value=>value.toLocaleLowerCase().replace(/[’']/g,'');
for(const key of ['set','type','style']) for(const value of [...new Set(catalog.map(c=>c[key]))].sort()) if(![...$(key).options].some(option=>option.value===value))$(key).add(new Option(value,value));
// The URL selects the set; older browser-saved searches never override it.
try{localStorage.removeItem('dbocg:cards:filters:v1');}catch{}
const PAGE_SIZE=60;
let activeSet='';
let currentPage=1;
function resetFilters(){
 $('filters').reset();$('set').value=activeSet;$('sort').value='name';
 currentPage=1;
}
function browserURL(page=currentPage){
 const url=new URL(activeSet?setPath(activeSet):'/cards/',location.origin);
 for(const key of ['query','type','style'])if($(key).value)url.searchParams.set(key,$(key).value);
 const defaultSort='name';
 if($('sort').value!==defaultSort)url.searchParams.set('sort',$('sort').value);
 if(page>1)url.searchParams.set('page',page);
 return url.pathname+url.search;
}
function renderPagination(pageCount){
 for(const id of ['pagination-top','pagination-bottom']){
  const nav=$(id);nav.hidden=pageCount<=1;nav.replaceChildren();
  if(pageCount<=1)continue;
  const addLink=(label,page,ariaLabel)=>{
   const link=document.createElement('a');link.textContent=label;link.href=browserURL(page);
   if(ariaLabel)link.setAttribute('aria-label',ariaLabel);
   if(page===currentPage)link.setAttribute('aria-current','page');
   link.onclick=e=>{
    if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();history.pushState(null,'',link.href);syncRoute();
    $('card-browser').scrollIntoView({block:'start'});$('results-count').focus({preventScroll:true});
   };
   nav.append(link);
  };
  const addDisabled=label=>{const span=document.createElement('span');span.textContent=label;span.setAttribute('aria-disabled','true');nav.append(span);};
  if(currentPage>1)addLink('Previous',currentPage-1,'Previous page');else addDisabled('Previous');
  const pages=[...new Set([1,pageCount,currentPage-1,currentPage,currentPage+1,...(currentPage<=2?[2,3]:[]),...(currentPage>=pageCount-1?[pageCount-2,pageCount-1]:[])])].filter(p=>p>=1&&p<=pageCount).sort((a,b)=>a-b);
  let previous=0;
  for(const page of pages){
   if(previous&&page>previous+1){const gap=document.createElement('span');gap.className='pagination-gap';gap.textContent='…';gap.setAttribute('aria-hidden','true');nav.append(gap);}
   addLink(String(page),page,`Page ${page}`);previous=page;
  }
  if(currentPage<pageCount)addLink('Next',currentPage+1,'Next page');else addDisabled('Next');
 }
}
// Show each set's wordmark only when that set is selected.
const collectionBranding = {
 'saiyan saga': {image:'/assets/sets/saiyan-saga-logo-brushed-blue.webp?v=20261026-set-banners', name:'Saiyan Saga', element:'collection-logo'},
 'frieza saga': {image:'/assets/sets/frieza-saga-logo-brushed-green.webp?v=20261026-set-banners', name:'Frieza Saga', element:'collection-logo-frieza'},
 'trunks saga': {image:'/assets/sets/trunks-saga-logo-brushed-purple.webp?v=20261026-set-banners', name:'Trunks Saga', element:'collection-logo-trunks'},
 'android saga': {image:'/assets/sets/android-saga-logo-brushed-crimson.webp?v=20261026-set-banners', name:'Android Saga', element:'collection-logo-android'}
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
 const query=normalize($('query').value.trim());
 const setCards=catalog.filter(c=>!activeSet||c.set===activeSet);
 const cards=setCards.filter(c=>normalize(`${c.name} ${c.number} ${c.id}`).includes(query)&&['type','style'].every(key=>!$(key).value||c[key]===$(key).value));
 cards.sort((a,b)=>$('sort').value==='number'?a.number.localeCompare(b.number,undefined,{numeric:true}):a.name.localeCompare(b.name));
 const pageCount=Math.max(1,Math.ceil(cards.length/PAGE_SIZE));
 currentPage=Math.min(currentPage,pageCount);
 const start=(currentPage-1)*PAGE_SIZE;
 const matching=cards.length<setCards.length?' matching':'';
 $('results-count').textContent=cards.length?`Showing ${start+1}–${Math.min(start+PAGE_SIZE,cards.length)} of ${cards.length}${matching} cards${activeSet?' in '+activeSet:''}`:'0 matching cards';
 renderPagination(pageCount);
 $('no-results').hidden=!!cards.length;
 $('card-grid').replaceChildren(...cards.slice(start,start+PAGE_SIZE).map(c=>{
  const button=document.createElement('a');button.className='catalog-card';button.href=cardPath(c);button.setAttribute('aria-label',`View ${c.name}, card ${c.number}`);
  const img=document.createElement('img');img.src=c.image;img.alt=c.name;img.loading='lazy';img.width=c.width||1070;img.height=c.height||1470;
  const title=document.createElement('h2');title.textContent=c.name;
  const meta=document.createElement('p');meta.textContent=`#${c.number} · ${c.type}`;
  button.append(img,title,meta);
  if(c.status==='Preview'){const badge=document.createElement('span');badge.className='preview-tag';badge.textContent='SAIYAN SAGA PREVIEW';button.append(badge);}
  button.onclick=e=>{
   if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
   e.preventDefault();history.pushState({dbocgCard:true,cardReturnPath:location.pathname+location.search},'',cardPath(c));openCard(c);
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
function syncRoute(){
 const route=catalogRoute(location.pathname,catalog)||{kind:'missing'};
 let base=route;
 let url=new URL(location.pathname+location.search,location.origin);
 if(route.kind==='card'&&history.state?.dbocgCard){
  const previousURL=new URL(history.state.cardReturnPath||'/cards/',location.origin);
  const previous=catalogRoute(previousURL.pathname,catalog);
  if(previous&&['set','all'].includes(previous.kind)){base=previous;url=previousURL;}
 }
 activeSet=base.set||'';
 resetFilters();
 for(const key of ['query','type','style','sort']){
  const value=url.searchParams.get(key);
  if(value!==null&&(key==='query'||[...$(key).options].some(option=>option.value===value)))$(key).value=value;
 }
 const page=Number(url.searchParams.get('page'));
 currentPage=Number.isSafeInteger(page)&&page>0?page:1;
 $('card-link-error').hidden=route.kind!=='missing';
 $('cards-breadcrumbs').hidden=!activeSet;
 $('breadcrumb-current').textContent=activeSet;
 render();
 if(route.kind==='card'){openCard(route.card);return;}
 if($('card-detail').open)$('card-detail').close();
 if(route.kind!=='missing')history.replaceState(null,'',browserURL());
 document.title=`${activeSet||'All cards'} | Dragon Ball OCG`;
}
function closeCard(){
 if(history.state?.dbocgCard){history.back();return;}
 const route=catalogRoute(location.pathname,catalog);
 history.replaceState(null,'',route?.set?setPath(route.set):'/cards/');syncRoute();
}
function changeFilters(){
 currentPage=1;render();history.replaceState(null,'',browserURL());
}
$('filters').onsubmit=e=>e.preventDefault();$('query').oninput=changeFilters;
$('set').onchange=()=>location.assign($('set').value?setPath($('set').value):'/cards/');
for(const key of ['type','style','sort'])$(key).onchange=changeFilters;
$('clear').onclick=()=>{
 resetFilters();changeFilters();$('query').focus();
};
$('copy-link').onclick=async()=>{
 try{await navigator.clipboard.writeText($('share-url').value);$('share-status').textContent='Link copied.';}
 catch{$('share-url').focus();$('share-url').select();$('share-status').textContent='Select and copy the link above.';}
};
$('close-detail').onclick=closeCard;
$('card-detail').addEventListener('cancel',e=>{e.preventDefault();closeCard();});
$('card-detail').addEventListener('click',e=>{if(e.target===$('card-detail')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCard();}});
window.addEventListener('popstate',()=>syncRoute());
window.addEventListener('pageshow',()=>syncRoute());
syncRoute();
