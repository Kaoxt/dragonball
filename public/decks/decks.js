import {catalog} from '../cards/catalog.js';
import {parseDeck} from '../game.js';
import {STORAGE_KEY, createDeck, readDecks, snapshot, count, exportDeck, addCard} from './store.js';
const $ = id => document.getElementById(id);
const node = (tag, text, className) => { const el=document.createElement(tag); if(text!==undefined)el.textContent=text;if(className)el.className=className;return el; };
const button = (text, label, action, className='') => {const b=node('button',text,className);b.type='button';b.setAttribute('aria-label',label);b.onclick=action;return b;};
const normalize = s => String(s || '').toLowerCase().replace(/[’']/g,'');
let data, storageBroken=false, visible=48, previewCard, messageTimer;
try { data=readDecks(); } catch {data={decks:[],active:null};storageBroken=true;}
if(!data.decks.length){const deck=createDeck();data.decks.push(deck);data.active=deck.id;}
let deck=data.decks.find(d=>d.id===data.active)||data.decks[0];
function message(text){$('builder-message').textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('builder-message').textContent='',4500);}
function save(){
 data.active=deck.id;
 try{if(storageBroken)throw new Error();localStorage.setItem(STORAGE_KEY,JSON.stringify(data));$('save-status').textContent='Saved in this browser';}
 catch{$('save-status').textContent='Unable to save locally — export a backup';}
}
function library(){ $('saved-decks').replaceChildren(...data.decks.map(d=>new Option(d.name||'Untitled deck',d.id)));$('saved-decks').value=deck.id; }
function changed(){save();renderDeck();renderCounts();}
function add(c){try{addCard(deck,c,$('destination').value);changed();message(`Added ${c.name}`);$('preview-status').textContent=`Added ${c.name}`;}catch(e){message(e.message);$('preview-status').textContent=e.message;}}
function openPreview(c){previewCard=c;$('preview-image').src=c.image;$('preview-image').alt=c.name;$('preview-name').textContent=c.name;$('preview-meta').textContent=[c.set,c.number&&`#${c.number}`].filter(Boolean).join(' · ');$('preview-type').textContent=[c.type,c.style,c.level&&`Level ${c.level}`].filter(Boolean).join(' · ');$('preview-rules').textContent=c.rules||'';$('preview-status').textContent='';$('card-preview').showModal();}
function totalFor(id){return [...deck.cards,...deck.senseiDeck,...deck.personalities.filter(Boolean),deck.mastery,deck.sensei].filter(c=>c?.id===id).reduce((n,c)=>n+(c.qty||1),0);}
function renderCounts(){document.querySelectorAll('.add-card').forEach(b=>{const n=totalFor(b.dataset.id);b.textContent=n?`+ Add · ${n} in deck`:'+ Add';});}
function browse(){
 const q=normalize($('query').value.trim());
 const cards=catalog.filter(c=>normalize(`${c.name} ${c.number} ${c.rules||''}`).includes(q)&&['set','style','type'].every(k=>!$(k).value||$(k).value===c[k])).sort((a,b)=>a.name.localeCompare(b.name)||String(a.number).localeCompare(String(b.number),undefined,{numeric:true}));
 $('results').textContent=`${cards.length} card${cards.length===1?'':'s'}`;$('empty-results').hidden=cards.length>0;$('more-cards').hidden=cards.length<=visible;
 $('card-grid').replaceChildren(...cards.slice(0,visible).map(c=>{
  const article=node('article',undefined,'browse-card'),art=button('',`Preview ${c.name}, ${c.set} #${c.number}`,()=>openPreview(c),'card-art');
  const img=node('img');img.src=c.image;img.alt=c.name;img.loading='lazy';img.width=1070;img.height=1470;art.append(img);
  const addButton=button('+ Add',`Add ${c.name}, ${c.set} #${c.number}`,()=>add(c),'add-card');addButton.dataset.id=c.id;
  article.append(art,node('h2',c.name),node('p',`#${c.number} · ${c.type}${c.level?' · L'+c.level:''}`),addButton);return article;
 }));renderCounts();
}
function remove(zone,c,index){if(zone==='personalities')deck.personalities[index]=null;else if(['mastery','sensei'].includes(zone))deck[zone]=null;else{c.qty--;if(c.qty<=0)deck[zone]=deck[zone].filter(x=>x.id!==c.id);}changed();}
function row(c,zone,index){
 const el=node('div',undefined,'deck-row');const title=button(c.name,`Preview ${c.name}`,()=>openPreview(catalog.find(x=>x.id===c.id)||c),'row-name');
 if(c.number)title.append(node('span',`#${c.number}${c.set?' · '+c.set:''}`,'row-meta'));el.append(title);
 const controls=node('div',undefined,'quantity');
 if(zone==='cards'||zone==='senseiDeck'){
 controls.append(button('−',`Remove one ${c.name}`,()=>remove(zone,c,index),'small-control'),node('span',c.qty),button('+',`Add one ${c.name}`,()=>{try{addCard(deck,c,zone);changed();}catch(e){message(e.message);}},'small-control'));
 }else controls.append(button('×',`Remove ${c.name}`,()=>remove(zone,c,index),'small-control'));
 el.append(controls);return el;
}
function renderDeck(){
 $('deck-name').value=deck.name;$('tokui').value=deck.tokui;
 $('life-count').textContent=$('life-label').textContent=count(deck.cards);$('sensei-count').textContent=$('sensei-label').textContent=count(deck.senseiDeck);$('starting-count').textContent=deck.personalities.filter(Boolean).length+!!deck.mastery+!!deck.sensei;$('tab-count').textContent=count(deck.cards);
 $('personalities').replaceChildren(...deck.personalities.map((c,i)=>{const slot=node('div',undefined,'mp-slot');slot.append(node('span',i+1,'level-number'));slot.append(c?row(c,'personalities',i):node('span','Choose a personality','empty-slot'));return slot;}));
 $('starting-extras').replaceChildren(...['mastery','sensei'].map(k=>{const el=node('div',undefined,'extra-row');el.append(node('span',k==='mastery'?'Mastery':'Sensei','extra-label'),deck[k]?row(deck[k],k):node('span','Not selected','empty-slot'));return el;}));
 for(const [key,id,empty]of[['cards','life-list','Add cards from the collection to start your Life Deck.'],['senseiDeck','sensei-list','Choose “Sensei Deck” above the collection to add cards here.']]){
 const cards=[...deck[key]].sort((a,b)=>a.name.localeCompare(b.name));$(id).replaceChildren(...(cards.length?cards.map(c=>row(c,key)):[node('p',empty,'list-empty')]));
 }
 const checks=[];const last=deck.personalities.findLastIndex(Boolean);
 if(last<2||deck.personalities.slice(0,last+1).some(c=>!c))checks.push('Choose consecutive Main Personality levels starting at level 1 (at least three).');
 if(deck.personalities.some((c,i)=>c?.level&&c.level!==i+1))checks.push('One or more personalities are in the wrong level slot.');
 if(!checks.length){try{checks.push(...parseDeck(exportDeck(deck)).warnings);}catch(e){checks.push(e.message);}}
 else{if(!deck.cards.length)checks.push('Add cards to your Life Deck.');if(deck.senseiDeck.length&&!deck.sensei)checks.push('Choose a Sensei for your Sensei Deck.');}
 $('checks-summary').textContent=`Deck checks${checks.length?' · '+checks.length+' to review':''}`;
 $('checks').replaceChildren(...(checks.length?checks:['Basic tabletop checks passed. Review card-specific restrictions.']).map(t=>node('li',t)));
}
for(const key of ['set','style','type']){for(const value of [...new Set(catalog.map(c=>c[key]).filter(Boolean))].sort())$(key).add(new Option(value,value));$(key).onchange=()=>{visible=48;browse();};}
$('filters').onsubmit=e=>e.preventDefault();$('query').oninput=()=>{visible=48;browse();};$('reset-filters').onclick=()=>{$('filters').reset();visible=48;browse();};$('more-cards').onclick=()=>{visible+=48;browse();};
$('deck-name').oninput=()=>{deck.name=$('deck-name').value.slice(0,70);save();library();};$('deck-name').onblur=()=>{if(!deck.name.trim()){deck.name='Untitled deck';save();library();renderDeck();}};
$('tokui').onchange=()=>{deck.tokui=$('tokui').value;changed();};$('saved-decks').onchange=()=>{deck=data.decks.find(d=>d.id===$('saved-decks').value);changed();};
$('new-deck').onclick=()=>{deck=createDeck();data.decks.push(deck);changed();library();message('New deck created');};
$('duplicate-deck').onclick=()=>{deck=structuredClone(deck);deck.id=crypto.randomUUID();deck.name=(deck.name+' copy').slice(0,70);data.decks.push(deck);changed();library();message('Deck duplicated');};
$('delete-deck').onclick=()=>{$('delete-name').textContent=`“${deck.name||'Untitled deck'}” will be removed from this browser.`;$('delete-dialog').showModal();};$('cancel-delete').onclick=()=>$('delete-dialog').close();
$('confirm-delete').onclick=()=>{data.decks=data.decks.filter(d=>d.id!==deck.id);deck=data.decks[0]||createDeck();if(!data.decks.length)data.decks.push(deck);changed();library();$('delete-dialog').close();message('Deck deleted');};
$('export-deck').onclick=()=>{const payload=exportDeck(deck);for(const c of [...payload.personalities,...payload.cards,...payload.senseiDeck,payload.mastery,payload.sensei].filter(Boolean))if(c.image?.startsWith('/'))c.image=new URL(c.image,location.origin).href;const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download=(deck.name.replace(/[^a-z0-9_-]+/gi,'-')||'deck')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('close-preview').onclick=()=>$('card-preview').close();$('preview-add').onclick=()=>add(previewCard);
for(const view of ['cards','deck'])$(view+'-tab').onclick=()=>{document.querySelector('.builder-layout').dataset.view=view;for(const v of ['cards','deck'])$(v+'-tab').setAttribute('aria-pressed',String(v===view));};
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){storageBroken=true;$('save-status').textContent='Decks changed in another tab — reload before editing';message('Reload to use the latest saved decks.');}});
library();browse();renderDeck();save();
