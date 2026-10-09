import {catalog} from '../cards/catalog.js';
import {parseDeck} from '../game.js';
import {STORAGE_KEY, createDeck, readDecks, snapshot, count, exportDeck, addCard, removalTarget, deckSize, deckLimit} from './store.js';
const $ = id => document.getElementById(id);
const node = (tag, text, className) => { const el=document.createElement(tag); if(text!==undefined)el.textContent=text;if(className)el.className=className;return el; };
const button = (text, label, action, className='') => {const b=node('button',text,className);b.type='button';b.setAttribute('aria-label',label);b.onclick=action;return b;};
const normalize = s => String(s || '').toLowerCase().replace(/[’']/g,'');
let data, storageBroken=false, visible=48, previewCard, messageTimer;
try { data=readDecks(); } catch {data={decks:[],active:null};storageBroken=true;}
if(!data.decks.length){const deck=createDeck();data.decks.push(deck);data.active=deck.id;}
const browserData=structuredClone(data);
let syncUser=null,syncVersion=0,syncBusy=false,syncDirty=false,syncBlocked=false,syncTimer;
try{const response=await fetch('/api/decks',{credentials:'same-origin',cache:'no-store'});if(response.status!==401){const result=await response.json();if(!response.ok)throw Error(result.error);syncUser=result.userId;syncVersion=result.version;data=result.data;storageBroken=false;if(!data.decks.length){const fresh=createDeck();data.decks.push(fresh);data.active=fresh.id;}}}
catch(e){document.querySelector('.builder-layout').textContent='Unable to load account decks. Reload to try again. Your browser decks are unchanged.';throw e;}
let deck=data.decks.find(d=>d.id===data.active)||data.decks[0];
function message(text){$('builder-message').textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('builder-message').textContent='',4500);}
async function syncDecks(){
 if(!syncUser||syncBusy||syncBlocked||!syncDirty)return;
 syncBusy=true;syncDirty=false;$('save-status').textContent='Saving to account…';
 try{const response=await fetch('/api/decks',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:syncUser,version:syncVersion,data})});const result=await response.json();if(!response.ok){if([400,401,409,413].includes(response.status))syncBlocked=true;throw Error(result.error||'Unable to sync decks.');}syncVersion=result.version;$('save-status').textContent='Saved to your account';}
 catch(e){syncDirty=true;$('save-status').textContent=e.message+' Your edits remain here; export a backup.';}
 finally{syncBusy=false;if(syncDirty&&!syncBlocked)syncTimer=setTimeout(syncDecks,5000);}
}
function save(){
 data.active=deck.id;
 if(syncUser){syncDirty=true;$('save-status').textContent=syncBlocked?'Sync paused — export changes and reload':'Saving to account…';clearTimeout(syncTimer);syncTimer=setTimeout(syncDecks,400);return;}
 try{if(storageBroken)throw new Error();localStorage.setItem(STORAGE_KEY,JSON.stringify(data));$('save-status').textContent='Saved in this browser — log in for account sync';}
 catch{$('save-status').textContent='Unable to save locally — export a backup';}
}
function library(){ $('saved-decks').replaceChildren(...data.decks.map(d=>new Option(d.name||'Untitled deck',d.id)));$('saved-decks').value=deck.id; }
function changed(){save();renderDeck();renderCounts();}
function add(c){try{addCard(deck,c,$('destination').value);changed();message(`Added ${c.name}`);$('preview-status').textContent=`Added ${c.name}`;}catch(e){message(e.message);$('preview-status').textContent=e.message;}}
function openPreview(c){previewCard=c;$('preview-image').src=c.image;$('preview-image').alt=c.name;$('preview-name').textContent=c.name;$('preview-meta').textContent=[c.set,c.number&&`#${c.number}`].filter(Boolean).join(' · ');$('preview-type').textContent=[c.type,c.style,c.level&&`Level ${c.level}`].filter(Boolean).join(' · ');$('preview-rules').textContent=c.rules||'';$('preview-status').textContent='';$('card-preview').showModal();}
function totalFor(id){return [...deck.cards,...deck.senseiDeck,...deck.personalities.filter(Boolean),deck.mastery,deck.sensei].filter(c=>c?.id===id).reduce((n,c)=>n+(c.qty||1),0);}
function removeFromBrowser(c){const target=removalTarget(deck,c,$('destination').value);if(!target)return;remove(target.zone,target.card,target.index);message(`Removed one ${c.name}`);}
function renderCounts(){document.querySelectorAll('.remove-card').forEach(b=>{b.disabled=!removalTarget(deck,{id:b.dataset.id},$('destination').value);});document.querySelectorAll('.add-card').forEach(b=>{const n=totalFor(b.dataset.id);b.textContent=n?`+ Add · ${n} in deck`:'+ Add';});}
function browse(){
 const q=normalize($('query').value.trim());
 const cards=catalog.filter(c=>normalize(`${c.name} ${c.number} ${c.rules||''}`).includes(q)&&['set','style','type'].every(k=>!$(k).value||$(k).value===c[k])).sort((a,b)=>a.name.localeCompare(b.name)||String(a.number).localeCompare(String(b.number),undefined,{numeric:true}));
 $('results').textContent=`${cards.length} card${cards.length===1?'':'s'}`;$('empty-results').hidden=cards.length>0;$('more-cards').hidden=cards.length<=visible;
 $('card-grid').replaceChildren(...cards.slice(0,visible).map(c=>{
  const article=node('article',undefined,'browse-card'),art=button('',`Preview ${c.name}, ${c.set} #${c.number}`,()=>openPreview(c),'card-art');
  const img=node('img');img.src=c.image;img.alt=c.name;img.loading='lazy';img.width=1070;img.height=1470;art.append(img);
  const addButton=button('+ Add',`Add ${c.name}, ${c.set} #${c.number}`,()=>add(c),'add-card');addButton.dataset.id=c.id;
  const removeButton=button('− Remove',`Remove one ${c.name}, ${c.set} #${c.number}`,()=>removeFromBrowser(c),'remove-card');removeButton.dataset.id=c.id;
  const actions=node('div',undefined,'browse-card-actions');actions.append(removeButton,addButton);
  article.append(art,node('h2',c.name),node('p',`#${c.number} · ${c.type}${c.level?' · L'+c.level:''}`),actions);return article;
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
 const checks=[];if(deckSize(deck)<50||deckSize(deck)>deckLimit(deck))checks.push(`Deck size: ${deckSize(deck)} of 50–${deckLimit(deck)} cards, including starting cards.`);const last=deck.personalities.findLastIndex(Boolean);
 if(last<2||deck.personalities.slice(0,last+1).some(c=>!c))checks.push('Choose consecutive Main Personality levels starting at level 1 (at least three).');
 if(deck.personalities.some((c,i)=>c?.level&&c.level!==i+1))checks.push('One or more personalities are in the wrong level slot.');
 if(!checks.length){try{checks.push(...parseDeck(exportDeck(deck)).warnings);}catch(e){checks.push(e.message);}}
 else{if(!deck.cards.length)checks.push('Add cards to your Life Deck.');if(deck.senseiDeck.length&&!deck.sensei)checks.push('Choose a Sensei for your Sensei Deck.');}
 $('checks-summary').textContent=`Deck checks${checks.length?' · '+checks.length+' to review':''}`;
 $('checks').replaceChildren(...(checks.length?checks:['Basic tabletop checks passed. Review card-specific restrictions.']).map(t=>node('li',t)));
}
for(const key of ['set','style','type']){for(const value of [...new Set(catalog.map(c=>c[key]).filter(Boolean))].sort())$(key).add(new Option(value,value));$(key).onchange=()=>{visible=48;browse();};}
$('destination').onchange=renderCounts;
$('filters').onsubmit=e=>e.preventDefault();$('query').oninput=()=>{visible=48;browse();};$('reset-filters').onclick=()=>{$('filters').reset();visible=48;browse();};$('more-cards').onclick=()=>{visible+=48;browse();};
$('deck-name').oninput=()=>{deck.name=$('deck-name').value.slice(0,70);save();library();};$('deck-name').onblur=()=>{if(!deck.name.trim()){deck.name='Untitled deck';save();library();renderDeck();}};
$('tokui').onchange=()=>{deck.tokui=$('tokui').value;changed();};$('saved-decks').onchange=()=>{deck=data.decks.find(d=>d.id===$('saved-decks').value);changed();};
$('new-deck').onclick=()=>{deck=createDeck();data.decks.push(deck);changed();library();message('New deck created');};
$('duplicate-deck').onclick=()=>{deck=structuredClone(deck);deck.id=crypto.randomUUID();deck.name=(deck.name+' copy').slice(0,70);data.decks.push(deck);changed();library();message('Deck duplicated');};
$('delete-deck').onclick=()=>{$('delete-name').textContent=`“${deck.name||'Untitled deck'}” will be removed from ${syncUser?'your account':'this browser'}.`;$('delete-dialog').showModal();};$('cancel-delete').onclick=()=>$('delete-dialog').close();
$('confirm-delete').onclick=()=>{data.decks=data.decks.filter(d=>d.id!==deck.id);deck=data.decks[0]||createDeck();if(!data.decks.length)data.decks.push(deck);changed();library();$('delete-dialog').close();message('Deck deleted');};
$('export-deck').onclick=()=>{const payload=exportDeck(deck);for(const c of [...payload.personalities,...payload.cards,...payload.senseiDeck,payload.mastery,payload.sensei].filter(Boolean))if(c.image?.startsWith('/'))c.image=new URL(c.image,location.origin).href;const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download=(deck.name.replace(/[^a-z0-9_-]+/gi,'-')||'deck')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('close-preview').onclick=()=>$('card-preview').close();$('preview-add').onclick=()=>add(previewCard);
for(const view of ['cards','deck'])$(view+'-tab').onclick=()=>{document.querySelector('.builder-layout').dataset.view=view;for(const v of ['cards','deck'])$(v+'-tab').setAttribute('aria-pressed',String(v===view));};
window.addEventListener('storage',e=>{if(!syncUser&&e.key===STORAGE_KEY){storageBroken=true;$('save-status').textContent='Decks changed in another tab — reload before editing';message('Reload to use the latest saved decks.');}});
const syncNote=document.querySelector('.storage-note');
syncNote.textContent=syncUser?'Autosaved to your account across devices. Export deck to download a backup.':'Autosaved in this browser. Log in to sync decks across devices.';
if(syncUser&&browserData.decks.some(d=>d.cards.length||d.personalities.some(Boolean)||d.mastery||d.sensei)){
 const importButton=button('Import browser decks','Import decks saved in this browser',()=>{let added=0;for(const d of browserData.decks){if(!data.decks.some(x=>x.id===d.id)){data.decks.push(structuredClone(d));added++;}}if(added){deck=data.decks.at(-1);changed();library();}message(added?`Imported ${added} browser decks`:'These browser decks are already in your account.');});
 syncNote.after(importButton);
}
window.addEventListener('beforeunload',event=>{if(syncUser&&(syncDirty||syncBusy)){event.preventDefault();event.returnValue='';}});
library();browse();renderDeck();save();
