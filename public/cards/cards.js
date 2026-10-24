import {catalog} from './catalog.js';
import {cardFromPath,cardPath} from './card-links.js';
const $=id=>document.getElementById(id);
const normalize=value=>value.toLocaleLowerCase().replace(/[’']/g,'');
for(const key of ['set','type','style']) for(const value of [...new Set(catalog.map(c=>c[key]))].sort()) $(''+key).add(new Option(value,value));
// A new visit always opens the full database, including browsers restoring forms.
try{localStorage.removeItem('dbocg:cards:filters:v1');}catch{}
function resetFilters(){
 $('filters').reset();$('sort').value='name';
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
 const query=normalize($('query').value.trim());
 const cards=catalog.filter(c=>normalize(`${c.name} ${c.number} ${c.id}`).includes(query)&&['set','type','style'].every(key=>!$(key).value||c[key]===$(key).value));
 cards.sort((a,b)=>$('sort').value==='number'?a.number.localeCompare(b.number,undefined,{numeric:true}):a.name.localeCompare(b.name));
 $('results-count').textContent=`${cards.length} of ${catalog.length} cards`;
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
   e.preventDefault();history.pushState({dbocgCard:true},'',cardPath(c));openCard(c);
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
 const card=cardFromPath(location.pathname,catalog);
 $('card-link-error').hidden=!!card||/^\/cards\/?$/.test(location.pathname)||location.pathname==='/cards/index.html';
 if(card){openCard(card);return;}
 if($('card-detail').open)$('card-detail').close();
 document.title='Cards | Dragon Ball OCG';
}
function closeCard(){
 if(history.state?.dbocgCard){history.back();return;}
 history.replaceState(null,'','/cards/');syncRoute();
}
$('filters').onsubmit=e=>e.preventDefault();$('query').oninput=render;
for(const key of ['set','type','style','sort'])$(key).onchange=render;
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
window.addEventListener('popstate',syncRoute);
window.addEventListener('pageshow',()=>{resetFilters();render();syncRoute();});
resetFilters();
render();
syncRoute();
