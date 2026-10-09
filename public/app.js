import { powerChart, personalityPower } from './personality-power.js';
import {readDecks, exportDeck} from './decks/store.js';
import { practiceDeck } from './practice-deck.js';
import { newGame, addPlayer, act, view } from './game.js';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let room = '', seat = 0, game, practiceGame, socket, selected, openPile, connected = false, reconnectTimer, intentional = false;
const demo = () => practiceDeck();
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').hidden = true, 5500); }
function status(text) { $('connection').textContent = text; }
function send(action) {
  if (practiceGame) {
    try { const next = structuredClone(practiceGame); act(next, seat, action); practiceGame = next; game = view(practiceGame, seat); render(); } catch (e) { toast(e.message); }
  } else if (socket?.readyState === WebSocket.OPEN && connected) socket.send(JSON.stringify(action));
  else toast('Not connected. Wait for reconnection before making a move.');
}
async function join(create) {
  const name = $('name').value.trim() || 'Player'; localStorage.setItem('score-name', name);
  let id = $('room-code').value.trim();
  if (!create) { try { id = new URL(id).hash.slice(1); } catch { id = id.replace(/^#/, ''); } if (!/^[a-f0-9]{32}$/.test(id)) return toast('Paste a valid room link or 32-character code.'); }
  const button = create ? $('create') : $('join-form').querySelector('button'); button.disabled = true;
  try {
    const res = await fetch(create ? '/api/rooms' : `/api/room/${id}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Unable to join.');
    room = data.id; seat = data.seat; location.hash = room; practiceGame = null; intentional = false; connect();
  } catch (e) { toast(e.message); } finally { button.disabled = false; }
}
function connect() {
  clearTimeout(reconnectTimer); status('Connecting…'); connected = false;
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/room/${room}/socket`);
  socket.onmessage = event => {
    if (event.data === 'pong') return;
    const data = JSON.parse(event.data);
    if (data.type === 'error') return toast(data.error);
    if (data.type === 'state') { connected = true; seat = data.seat; game = data.game; status('● Connected'); render(); }
  };
  socket.onclose = event => {
    connected = false;
    if (intentional) return;
    if (event.code === 4001 || event.code === 4000) { status('Disconnected'); toast(event.reason); return; }
    status('Reconnecting…'); reconnectTimer = setTimeout(connect, 3000);
  };
  socket.onerror = () => status('Connection interrupted');
}
setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send('ping'); }, 30000);
function practice() {
  intentional = true; socket?.close(); clearTimeout(reconnectTimer); room = ''; location.hash = ''; seat = 0;
  practiceGame = newGame(); addPlayer(practiceGame, 'practice-a', $('name').value || 'You'); addPlayer(practiceGame, 'practice-b', 'Practice opponent');
  act(practiceGame, 0, { type: 'load', deck: demo() }); act(practiceGame, 1, { type: 'load', deck: practiceDeck(true) }); act(practiceGame, 0, { type: 'start' });
  game = view(practiceGame, seat); selected = null; status('Solo practice · both seats'); render();
}
const labels = { deck: 'Life Deck', hand: 'Hand', combat: 'Combat cards', noncombat: 'Non-Combat', drills: 'Drills', allies: 'Allies', dragonballs: 'Dragon Balls', location: 'Battleground / Location', discard: 'Discard', removed: 'Removed', senseiDeck: 'Sensei Deck', mp: 'Main Personality', mastery: 'Mastery', sensei: 'Sensei' };
function startDrawTest() {
  if (!practiceGame || practiceGame.status !== 'setup') return;
  const next = structuredClone(practiceGame);
  for (let i = 0; i < next.players.length; i++) {
    if (!next.players[i].ready) act(next, i, { type: 'ready' });
  }
  act(next, seat, { type: 'draw', count: 3 });
  practiceGame = next; game = view(practiceGame, seat); selected = null; render();
  $('hand').scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('Three cards drawn. Use Draw 1 or Draw 3 to draw more, or drag a card onto the table.');
}
function cardHTML(c, owner, zone) {
  const mine = owner === seat, key = `${owner}:${zone}:${c.uid}`, hidden = c.faceDown && !mine;
  return `<button class="card ${c.rested ? 'rested' : ''} ${selected === key ? 'selected' : ''} ${hidden ? 'back' : ''} ${c.image && !hidden ? 'has-image' : ''}" data-card="${esc(key)}" ${mine ? 'data-movable="true"' : ''} title="${esc(hidden ? 'Face-down card' : c.name)}" aria-label="${esc(hidden ? 'Face-down card' : c.name)}">${hidden ? '' : `${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" referrerpolicy="no-referrer">` : ''}<strong>${esc(c.name)}</strong><small>${esc(c.id)}${c.faceDown ? ' · Face down' : ''}${c.rested ? ' · Used' : ''}${zone === 'allies' ? `<br>Stages: ${c.stages}` : ''}</small>${c.image&&(c.faceDown||c.rested)?`<span class="card-state">${c.faceDown?'Face down':''}${c.rested?' · Used':''}</span>`:''}`}</button>`;
}
function zoneHTML(p, owner, zone) {
  const data = p.zones[zone], hidden = !Array.isArray(data), count = hidden ? data.count : data.length;
  if (!hidden && ['discard', 'removed', 'senseiDeck', 'location'].includes(zone)) {
    const top = data.at(-1), concealed = top?.faceDown && owner !== seat;
    return `<div class="zone compact-pile" data-zone="${zone}" data-owner="${owner}"><div class="zone-label">${labels[zone]} <span>${count}</span></div><button class="pile-open" data-pile="${owner}:${zone}" aria-haspopup="dialog" aria-label="View ${owner === seat ? 'your' : 'opponent’s'} ${labels[zone]} pile, ${count} cards"><span class="pile-cover ${count > 1 ? 'stacked' : ''} ${!top ? 'empty-cover' : ''}">${top ? top.image && !concealed ? `<img src="${esc(top.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : concealed ? '<img src="/assets/dragon-ball-online-card-back.webp?v=burnt-red-1" alt="">' : `<span>${esc(top.name)}</span>` : '<span>Empty</span>'}</span><span class="pile-caption">${count ? 'View pile' : 'Empty pile'}</span></button></div>`;
  }
  return `<div class="zone" data-zone="${zone}" data-owner="${owner}"><div class="zone-label">${labels[zone]} <span>${count}</span></div>${hidden ? `<div class="pile"><span class="card back" aria-hidden="true"></span>${count}</div><div class="pile-caption">${zone === 'deck' ? 'Life remaining' : 'Private'}</div>` : `<div class="cards">${data.map(c => cardHTML(c, owner, zone)).join('') || '<span class="empty">Empty</span>'}</div>`}</div>`;
}
function renderPile() {
  if (!openPile) return;
  const { owner, zone } = openPile, player=game.players[owner], cards = zone==='mp'?player?.personalities:player?.zones[zone];
  if (!Array.isArray(cards)) { $('pile-dialog').close(); openPile = null; return; }
  $('pile-title').textContent = `${owner === seat ? 'Your' : game.players[owner].name + '’s'} ${labels[zone]} · ${cards.length}`;
  const help=$('pile-dialog').querySelector('p.fine'); if(help)help.textContent=zone==='mp'?'All Main Personality levels in this stack. Select a card to enlarge it.':'Top card first. Select a card to inspect it or move your card.';
  if(zone==='mp') { $('pile-cards').innerHTML=cards.map((c,i)=>`<div class="mp-stack-card ${i+1===player.level?'active-level':''}"><strong>Level ${i+1}${i+1===player.level?' · Current':''}</strong><button class="card has-image" data-mp-preview="${owner}:${i}" aria-label="View ${esc(c.name)}, level ${i+1}">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}">`:esc(c.name)}</button></div>`).join('');return; }
  $('pile-cards').innerHTML = [...cards].reverse().map(c => cardHTML(c, owner, zone).replace('data-movable="true"', '')).join('') || '<p class="empty">This pile is empty.</p>';
}
const playZones=['combat','noncombat','drills','allies','dragonballs'];
function tableHTML(p,owner){
  const fixed=z=>z==='mp'?p.personalities[p.level-1]:p[z];
  let n=0;
  const placed=(c,z)=>{const q=c.position||{x:(n%6)/6,y:Math.min(.9,Math.floor(n/6)*.22)};n++;return cardHTML(c,owner,z).replace('<button ',`<button data-x="${q.x}" data-y="${q.y}" `);};
  const slot=z=>`<div class="zone starting-slot" data-zone="${z}" data-owner="${owner}"><div class="zone-label">${z==='mp'?`Main Personality · L${p.level}`:labels[z]}</div>${fixed(z)&&!fixed(z).position?cardHTML(fixed(z),owner,z):'<span class="empty pile-cover">'+(fixed(z)?'Drop here to return':'No card')+'</span>'}</div>`;
  return `<div class="arena-mat"><div class="free-table" data-table="${owner}" data-owner="${owner}" data-zone="combat">${['mp','mastery','sensei'].map(z=>fixed(z)?.position?placed(fixed(z),z):'').join('')}${playZones.map(z=>`<div class="free-zone" data-zone="${z}" data-owner="${owner}">${p.zones[z].map(c=>placed(c,z)).join('')}</div>`).join('')}</div><div class="arena-dock">${['removed','discard','deck'].map(z=>zoneHTML(p,owner,z)).join('')}${['mp','mastery','sensei'].map(slot).join('')}${zoneHTML(p,owner,'senseiDeck')}</div></div>`;
}
function counterHTML(p, owner, name, title) { return `<div class="counter"><span>${title}</span><strong>${p[name]}</strong>${owner === seat && ['setup','playing'].includes(game.status) ? `<button data-counter="${name}" data-delta="-1" aria-label="Decrease ${title}">−</button><button data-counter="${name}" data-delta="1" aria-label="Increase ${title}">+</button>` : ''}</div>`; }
function mpReadout(p,owner) {
 const rating=personalityPower(p), known=!!powerChart(p.personalities[p.level-1]);
 return `<div class="mp-readout" aria-label="${esc(p.name)} Main Personality counters"><div class="power-readout">Power <strong>${rating==null?'—':rating.toLocaleString()}</strong>${!known&&owner===seat&&['setup','playing'].includes(game.status)?'<button data-edit-power aria-label="Set power for an uncharted card">Edit</button>':''}</div><div class="counter-row">${counterHTML(p,owner,'level','Level')}${counterHTML(p,owner,'stages','Stages above 0')}${counterHTML(p,owner,'anger','Anger')}</div></div>`;
}
function fieldHTML(p, owner) {
  if (!p) return '<section class="player-field opponent"><p>Waiting for your opponent. Copy the invite to bring them to the table.</p></section>';
  return `<section class="player-field ${owner !== seat ? 'opponent' : ''}"><div class="player-meta"><strong>${esc(p.name)} ${owner === seat ? '· You' : '· Opponent'}</strong>${mpReadout(p,owner)}</div>${tableHTML(p,owner)}<div class="arena-extras">${zoneHTML(p,owner,'location')}${owner!==seat?zoneHTML(p,owner,'hand'):''}</div>${owner===seat&&game.status==='setup'&&!p.ready&&!p.senseiSwapped&&p.zones.senseiDeck.length?`<details class="sensei-choices"><summary>Sensei setup swaps</summary>${p.zones.senseiDeck.map(c=>`<label><input type="checkbox" class="sensei-choice" value="${esc(c.uid)}"> ${esc(c.name)}</label>`).join('')}<button id="swap-sensei">Reveal & swap selected Sensei cards</button></details>`:''}</section>`;
}

function render() {
  $('lobby').hidden = true; $('table').hidden = false;
  $('room-label').textContent = practiceGame ? 'SCORE DBZ · SOLO PRACTICE · NO AI' : `SCORE DBZ · PRIVATE TABLE · ${room.slice(0,8)}`;
  document.body.classList.add('at-table'); $('switch-seat').hidden = !practiceGame; $('copy-invite').hidden = !!practiceGame; $('open-deck').disabled = game.status !== 'waiting';
  const p=game.players[seat], opponent=game.players[1-seat], playing=game.status==='playing';
  const preparing=['waiting','setup'].includes(game.status);
  $('setup-bar').hidden=!preparing;
  document.querySelector('.practice-notice').hidden=!practiceGame||!preparing;
  $('table-title').textContent = `${p.name} vs ${opponent?.name || '…'}`;
  $('turn-bar').innerHTML = `<div><h2>${game.status==='finished'?`${esc(game.players[game.winner].name)} wins`:playing?`${esc(game.players[game.turn].name)}’s turn`:game.status==='setup'?'Prepare your personalities':'Prepare your decks'}</h2><p>${playing?`Turn ${game.turnNumber} · ${game.phase} Step`:'Original Score Entertainment DBZ CCG'}</p></div>${playing?game.phase==='Declare'?`<div class="toolbar"><button data-action="phase" data-combat="true" ${game.turn!==seat?'disabled':''}>Declare Combat</button><button data-action="phase" data-combat="false" ${game.turn!==seat?'disabled':''}>Skip Combat</button></div>`:`<button data-action="phase" ${game.turn!==seat?'disabled':''}>${game.phase==='Rejuvenation'?'Pass turn':'Next step'} <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button>`:''}`;
  $('setup-bar').innerHTML = game.status==='waiting'?`${p.loaded?'Your deck is ready. ':'Load your deck to get started. '}${seat===0?`<button data-action="start" ${game.players.length<2||!game.players.every(x=>x.loaded)?'disabled':''}>Shuffle & start setup</button>`:'The host starts once both decks are loaded.'}`:game.status==='setup'?`Starting MP: 5 stages above 0, anger 0. Resolve Double Power, alignment, Tokui-Waza, and Sensei choices manually. ${seat===0?`<label>First player<select id="first-player">${game.players.map((x,i)=>`<option value="${i}" ${game.turn===i?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:`${esc(game.players[game.turn].name)} goes first.`}${p.ready?' You are ready.':'<button data-action="ready">Finish setup</button>'}`:'';
  if (practiceGame && game.status === 'setup') $('setup-bar').insertAdjacentHTML('beforeend', '<button id="start-draw-test" class="primary">Start test · draw 3 cards</button>');
  $('board').innerHTML=fieldHTML(opponent,1-seat)+fieldHTML(p,seat);
  document.querySelectorAll('.free-table [data-x]').forEach(c=>{c.style.left=`calc(${+c.dataset.x*100}% - ${+c.dataset.x*80}px)`;c.style.top=`calc(${+c.dataset.y*100}% - ${+c.dataset.y*114}px)`;});
  const controls=[['undo','Undo'],['draw3','Draw 3'],['draw','Draw 1'],['shuffle','Shuffle Life Deck'],['search','Search Life Deck'],['damage','Flip 1 damage'],['powerUp','Power up'],['rejuvenate','Rejuvenate'],['concede','Concede']];
  $('controls').innerHTML=controls.map(([action,label])=>`<button data-action="${action}" ${(action==='undo'?!game.canUndo:!playing)?'disabled':''}>${label}</button>`).join('');
  $('hand-count').textContent=`· ${p.zones.hand.length}`; $('hand').innerHTML=p.zones.hand.map(c=>cardHTML(c,seat,'hand')).join('')||'<p class="empty">No opening hand. Draw three when the game reaches your Draw Step.</p>';
  $('hand').dataset.zone='hand';$('hand').dataset.owner=seat;
  $('search-panel').hidden=!p.searchCards;$('search-cards').innerHTML=p.searchCards?p.searchCards.map(c=>cardHTML(c,seat,'deck')).join(''):'';
  $('log').innerHTML=game.log.map(x=>`<li><time>${new Date(x.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time>${esc(x.text)}</li>`).join('');$('log').scrollTop=$('log').scrollHeight;renderInspector();renderPile();
}
function getSelected(){if(!selected)return null;const[owner,zone,uid]=selected.split(':'),p=game.players[+owner];const c=zone==='mp'?p?.personalities[p.level-1]:['mastery','sensei'].includes(zone)?p?.[zone]:zone==='deck'?p?.searchCards?.find(c=>c.uid===uid):Array.isArray(p?.zones[zone])?p.zones[zone].find(c=>c.uid===uid):null;return c?{owner:+owner,zone,c}:null;}
function renderInspector(){
  const s=getSelected();$('card-controls').hidden=!s;if(!s){selected=null;$('inspect').innerHTML='';return;}
  const {owner,zone,c}=s,mine=owner===seat,hidden=c.faceDown&&!mine,fixed=['mp','mastery','sensei'].includes(zone);
  $('inspect').innerHTML=`${hidden?'<img class="preview-image" src="/assets/dragon-ball-online-card-back.webp?v=burnt-red-1" alt="Face-down card">':c.image?`<img class="preview-image" src="${esc(c.image)}" alt="${esc(c.name)}" referrerpolicy="no-referrer">`:'<div class="large-placeholder">Z</div>'}${c.image&&!hidden?'<button id="enlarge-card" class="wide">Enlarge card <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 3h7v7M21 3 10 14"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg></button>':''}<h3>${esc(hidden?'Face-down card':c.name)}</h3><p>${esc(hidden?'Hidden':c.id)} · ${labels[zone]}</p>${mine&&zone==='senseiDeck'&&game.status==='setup'?'<p class="fine">Choose cards in the Sensei swap checkboxes below your table, then swap them together.</p>':''}${mine&&game.status==='playing'&&!fixed?`<label>Move to<select id="destination">${Object.entries(labels).filter(([z])=>z!==zone&&!['mp','mastery','sensei'].includes(z)).map(([z,l])=>`<option value="${z}">${l}${z==='deck'?' (top)':''}</option>`).join('')}${zone!=='deck'?'<option value="deck-bottom">Life Deck (bottom)</option>':''}</select></label><button class="primary wide" id="move-selected">Move card <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button>${!['hand','deck','senseiDeck'].includes(zone)?`<div class="toolbar"><button data-card-action="rest">${c.rested?'Mark unused':'Mark used'}</button><button data-card-action="flip">Flip</button></div>${zone==='allies'?'<div class="toolbar"><button data-card-action="stages" data-delta="-1">−1 stage</button><button data-card-action="stages" data-delta="1">+1 stage</button></div>':''}${zone==='dragonballs'?'<button data-card-action="giveDragonBall">Transfer to opponent</button>':''}`:''}`:''}`;
}

document.addEventListener('click', e => {
  if(suppressClick){e.preventDefault();return;}
  if(e.target.closest('#start-draw-test')) { startDrawTest(); return; }
  if(e.target.closest('[data-edit-power]')) { const value=prompt('Current power from the printed card at your current stage:',game.players[seat].power??''); if(value!==null&&value.trim()!=='')send({type:'power',value:Number(value.replaceAll(',',''))}); return; }
  const pile = e.target.closest('[data-pile]');
  if (pile) { const [owner, zone] = pile.dataset.pile.split(':'); openPile = { owner: Number(owner), zone }; renderPile(); $('pile-dialog').showModal(); return; }
  const preview=e.target.closest('[data-mp-preview]'); if(preview){const [owner,index]=preview.dataset.mpPreview.split(':').map(Number),c=game.players[owner].personalities[index];if(c.image){$('card-zoom-image').src=c.image;$('card-zoom-image').alt=c.name;$('card-zoom').showModal();}return;}
  const card = e.target.closest('[data-card]');
  if(card&&card.dataset.card.split(':')[1]==='mp'){openPile={owner:Number(card.dataset.card.split(':')[0]),zone:'mp'};renderPile();$('pile-dialog').showModal();return;}
  if (card) { if (card.closest('#pile-dialog')) { $('pile-dialog').close(); openPile = null; } selected = card.dataset.card; render(); return; }
  if(e.target.closest('#enlarge-card')){const s=getSelected();if(s?.c.image&&!(s.c.faceDown&&s.owner!==seat)){const im=$('card-zoom-image');im.src=s.c.image;im.alt=s.c.name;$('card-zoom').showModal();}return;}
  const action = e.target.closest('[data-action]');
  if (action) { if (action.dataset.action === 'concede' && !confirm('Concede this game?')) return; send(action.dataset.action === 'draw3' ? { type: 'draw', count: 3 } : { type: action.dataset.action, ...(action.dataset.combat !== undefined ? { combat: action.dataset.combat === 'true' } : {}) }); }
  const counter = e.target.closest('[data-counter]'); if (counter) send({ type: 'counter', counter: counter.dataset.counter, delta: Number(counter.dataset.delta) });
  if (e.target.closest('#swap-sensei')) send({ type: 'senseiSwap', uids: [...document.querySelectorAll('.sensei-choice:checked')].map(x=>x.value) });
  const ca = e.target.closest('[data-card-action]');
  if (ca) { const s = getSelected(); if (s) send({ type: ca.dataset.cardAction, from: s.zone, uid: s.c.uid, delta: Number(ca.dataset.delta) }); }
  if (e.target.closest('#move-selected')) { const s = getSelected(), dest = $('destination').value; if (s) send({ type: 'move', from: s.zone, uid: s.c.uid, to: dest === 'deck-bottom' ? 'deck' : dest, bottom: dest === 'deck-bottom' }); }
});
let dragging=null, suppressClick=false;
document.addEventListener('dragstart',e=>{if(e.target.closest('[data-card]'))e.preventDefault();});
document.addEventListener('pointerdown',e=>{
 const c=e.target.closest('[data-movable]');if(!c||e.button!==0||!['playing','setup'].includes(game.status))return;
 dragging={key:c.dataset.card,startX:e.clientX,startY:e.clientY,card:c,pointer:e.pointerId};
});
document.addEventListener('pointermove',e=>{
 const d=dragging;if(!d||e.pointerId!==d.pointer)return;
 if(!d.ghost&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<7)return;
 if(!d.ghost){d.ghost=d.card.cloneNode(true);d.ghost.classList.add('drag-ghost');d.ghost.removeAttribute('data-card');document.body.append(d.ghost);const scroll=()=>{if(dragging!==d)return;if(d.y<65)window.scrollBy(0,-9);else if(d.y>innerHeight-65)window.scrollBy(0,9);requestAnimationFrame(scroll);};requestAnimationFrame(scroll);}
 d.y=e.clientY;e.preventDefault();d.ghost.style.left=(e.clientX-35)+'px';d.ghost.style.top=(e.clientY-45)+'px';
},{passive:false});
document.addEventListener('pointerup',e=>{
 const d=dragging;dragging=null;if(!d?.ghost)return;d.ghost.remove();suppressClick=true;setTimeout(()=>suppressClick=false,0);
 const target=document.elementFromPoint(e.clientX,e.clientY),table=target?.closest('[data-table]'),z=target?.closest('[data-zone]');
 const [owner,from,uid]=d.key.split(':');if(+owner!==seat||!z||+z.dataset.owner!==seat)return;
 const fixed=['mp','mastery','sensei'].includes(from);
 if(table){const r=table.getBoundingClientRect(),position={x:Math.max(0,Math.min(1,(e.clientX-r.left-40)/Math.max(1,r.width-80))),y:Math.max(0,Math.min(1,(e.clientY-r.top-57)/Math.max(1,r.height-114)))};
 if(fixed||playZones.includes(from))send({type:'position',from,uid,position});
 else send({type:'move',from,uid,to:'combat',position});
 }else if(fixed){if(z.dataset.zone===from)send({type:'position',from,uid,position:null});}
 else if(!['mp','mastery','sensei'].includes(z.dataset.zone)&&z.dataset.zone!==from)send({type:'move',from,uid,to:z.dataset.zone});
});
document.addEventListener('pointercancel',()=>{dragging?.ghost?.remove();dragging=null;});
$('room-form').onsubmit = e => { e.preventDefault(); join(true); };
$('join-form').onsubmit = e => { e.preventDefault(); join(false); };
$('practice').onclick = practice;
$('switch-seat').onclick = () => { seat = 1 - seat; selected = null; game = view(practiceGame, seat); render(); };
$('leave').onclick = () => { intentional = true; clearTimeout(reconnectTimer); socket?.close(); location.href = '/'; };
$('copy-invite').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/play/#${room}`); toast('Invite copied. Share it with your opponent.'); } catch { toast(`Room code: ${room}`); } };
let availableBuilderDecks=[];
$('open-deck').onclick = async () => {
  $('deck-error').textContent = '';
  $('builder-saved-decks').replaceChildren(new Option('Choose a deck…',''));
  availableBuilderDecks=[];$('builder-saved-decks').disabled=true;$('deck-dialog').showModal();
  try {const response=await fetch('/api/decks',{credentials:'same-origin',cache:'no-store'});if(response.status===401)availableBuilderDecks=readDecks().decks;else{const result=await response.json();if(!response.ok)throw Error(result.error);availableBuilderDecks=result.data.decks;}for(const d of availableBuilderDecks)$('builder-saved-decks').add(new Option(d.name||'Untitled deck',d.id)); }
  catch { $('deck-error').textContent = 'Saved decks could not be read. You can still import a deck file.'; }
  $('builder-saved-decks').disabled=false;
};
$('builder-saved-decks').onchange = () => {
  try { const d=availableBuilderDecks.find(d=>d.id===$('builder-saved-decks').value); if(!d)return;
    const last=d.personalities.findLastIndex(Boolean);
    if(last<2||d.personalities.slice(0,last+1).some(c=>!c))throw new Error('Complete consecutive Main Personality levels in the deck builder first.');
    $('deck-text').value=JSON.stringify(exportDeck(d),null,2);$('tokui').value=d.tokui||'';$('deck-error').textContent='';
  } catch(e) { $('deck-error').textContent=e.message; }
};
$('close-deck').onclick = () => $('deck-dialog').close();
$('close-pile').onclick = () => $('pile-dialog').close();
$('pile-dialog').addEventListener('close', () => { openPile = null; });
$('save-deck').onclick = () => { localStorage.setItem('score-deck', JSON.stringify({ leader: $('mp-ids').value, mastery:$('mastery-id').value, sensei:$('sensei-id').value, tokui:$('tokui').value, text: $('deck-text').value })); toast('Deck draft saved in this browser.'); };
$('demo-deck').onclick = () => { $('deck-text').value = JSON.stringify(demo(), null, 2); $('mp-ids').value = 'PRACTICE-MP-1, PRACTICE-MP-2, PRACTICE-MP-3'; };
function deckInput() {
  const text = $('deck-text').value.trim(); if (text.startsWith('{')) return JSON.parse(text);
  const cards = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#')).map(line => {
    const m = /^\s*(\d+)\s*x?\s+([\w-]+)(?:\s+(.+))?\s*$/i.exec(line);
    if (!m) throw new Error(`Use "3 SAIYAN-001 Card name" on each line. Could not read: ${line.slice(0, 50)}`);
    return { qty: Number(m[1]), id: m[2], name: m[3] || m[2] };
  }); return { personalities: $('mp-ids').value.split(',').map(id=>({id:id.trim()})), mastery: $('mastery-id').value.trim()?{id:$('mastery-id').value.trim()}:null, sensei: $('sensei-id').value.trim()?{id:$('sensei-id').value.trim()}:null, tokui:$('tokui').value, cards };
}
$('deck-form').onsubmit = e => {
  e.preventDefault(); try {
    const deck = deckInput();
    // Validate locally too so errors stay next to the editor.
    const scratch = newGame(); addPlayer(scratch, 'validate', 'Player'); act(scratch, 0, { type: 'load', deck });
    send({ type: 'load', deck }); $('deck-dialog').close();
  } catch (e) { $('deck-error').textContent = e.message; }
};
$('deck-file').onchange = async e => { const f = e.target.files[0]; if (!f) return; if (f.size > 48000) return toast('Deck file must be under 48 KB.'); $('deck-text').value = await f.text(); };
$('chat-form').onsubmit = e => { e.preventDefault(); const text = $('chat').value.trim(); if (text) { send({ type: 'chat', text }); $('chat').value = ''; } };
try { $('name').value = localStorage.getItem('score-name') || ''; const draft = JSON.parse(localStorage.getItem('score-deck') || 'null'); if (draft) { $('mp-ids').value = draft.leader; $('deck-text').value = draft.text; $('mastery-id').value=draft.mastery||''; $('sensei-id').value=draft.sensei||''; $('tokui').value=draft.tokui||''; } } catch { /* invalid saved draft */ }
if (/^#[a-f0-9]{32}$/.test(location.hash)) { $('room-code').value = location.hash.slice(1); $('join-form').querySelector('button').textContent = 'Join / resume this table'; }
// Failed image URLs leave the readable card name and ID available.
document.addEventListener('error', e => { if (e.target.tagName === 'IMG') { e.target.hidden = true; e.target.parentElement.classList.remove('has-image'); } }, true);

document.addEventListener('change', e => { if(e.target.id==='first-player')send({type:'first',seat:Number(e.target.value)}); });

$('close-card-zoom').onclick=()=>$('card-zoom').close();

$('close-card-controls').onclick=()=>{selected=null;renderInspector();document.querySelectorAll('.card.selected').forEach(c=>c.classList.remove('selected'));};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('card-zoom').open){selected=null;renderInspector();}});
