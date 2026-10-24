import {catalog} from './catalog.js';
const $=id=>document.getElementById(id);
const normalize=value=>value.toLocaleLowerCase().replace(/[’']/g,'');
for(const key of ['set','type','style']) for(const value of [...new Set(catalog.map(c=>c[key]))].sort()) $(''+key).add(new Option(value,value));
const filterStorageKey='dbocg:cards:filters:v1';
const filterKeys=['query','set','type','style','sort'];
function restoreFilters(){
 try{
  const saved=JSON.parse(localStorage.getItem(filterStorageKey));
  if(!saved || typeof saved!=='object' || Array.isArray(saved))return;
  for(const key of filterKeys){
   const control=$(key),value=saved[key];
   if(typeof value==='string' && (key==='query' || [...control.options].some(option=>option.value===value)))control.value=value;
  }
 }catch{/* Filters remain usable when browser storage is unavailable or invalid. */}
}
function updateFilters(){
 try{localStorage.setItem(filterStorageKey,JSON.stringify(Object.fromEntries(filterKeys.map(key=>[key,$(key).value]))));}catch{}
 render();
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
  const button=document.createElement('button');button.className='catalog-card';button.type='button';button.setAttribute('aria-label',`View ${c.name}, card ${c.number}`);
  const img=document.createElement('img');img.src=c.image;img.alt=c.name;img.loading='lazy';img.width=c.width||1070;img.height=c.height||1470;
  const title=document.createElement('h2');title.textContent=c.name;
  const meta=document.createElement('p');meta.textContent=`#${c.number} · ${c.type}`;
  button.append(img,title,meta);
  if(c.status==='Preview'){const badge=document.createElement('span');badge.className='preview-tag';badge.textContent='SAIYAN SAGA PREVIEW';button.append(badge);}
  button.onclick=()=>openCard(c);return button;
 }));
}
function openCard(c){
 $('detail-image').src=c.image;$('detail-image').alt=c.name;$('detail-name').textContent=c.name;$('detail-status').textContent=c.status==='Preview'?'SAIYAN SAGA · DESIGN PREVIEW':c.set.toUpperCase();
 $('detail-meta').replaceChildren(...[['Number',c.number],['Type',c.type],['Style',c.style],['Set',c.set]].flatMap(([name,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;return[dt,dd];}));
 $('download').href=c.downloadImage||c.image;$('download').download=c.id+'.webp';
 $('preview-note').hidden=c.status!=='Preview';$('card-detail').showModal();
}
$('filters').onsubmit=e=>e.preventDefault();$('query').oninput=updateFilters;
for(const key of ['set','type','style','sort'])$(key).onchange=updateFilters;
$('clear').onclick=()=>{
 $('filters').reset();$('sort').value='name';
 try{localStorage.removeItem(filterStorageKey);}catch{}
 render();$('query').focus();
};
$('close-detail').onclick=()=>$('card-detail').close();
$('card-detail').addEventListener('click',e=>{if(e.target===$('card-detail')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
restoreFilters();
render();
