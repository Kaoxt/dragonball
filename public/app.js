import { newGame, addPlayer, act, view } from './game.js';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let room = '', seat = 0, game, practiceGame, socket, selected, connected = false, reconnectTimer, intentional = false;
const demo = () => ({ personalities: [1,2,3].map(n => ({ id: `PRACTICE-MP-${n}`, name: `Practice MP level ${n}`, pur: 2 })), cards: Array.from({ length: 17 }, (_, i) => ({ id: `PRACTICE-${i+1}`, name: `Practice card ${i+1}`, qty: i === 16 ? 2 : 3 })) });
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
  act(practiceGame, 0, { type: 'load', deck: demo() }); act(practiceGame, 1, { type: 'load', deck: demo() }); act(practiceGame, 0, { type: 'start' });
  game = view(practiceGame, seat); selected = null; status('Solo practice · both seats'); render();
}
const labels = { deck: 'Life Deck', hand: 'Hand', combat: 'Combat cards', noncombat: 'Non-Combat', drills: 'Drills', allies: 'Allies', dragonballs: 'Dragon Balls', location: 'Battleground / Location', discard: 'Discard', removed: 'Removed', senseiDeck: 'Sensei Deck', mp: 'Main Personality', mastery: 'Mastery', sensei: 'Sensei' };
function cardHTML(c, owner, zone) {
  const mine = owner === seat, key = `${owner}:${zone}:${c.uid}`, hidden = c.faceDown && !mine;
  return `<button class="card ${c.rested ? 'rested' : ''} ${selected === key ? 'selected' : ''} ${hidden ? 'back' : ''} ${c.image && !hidden ? 'has-image' : ''}" data-card="${esc(key)}" ${mine && !['mp','mastery','sensei'].includes(zone) && !hidden ? 'draggable="true"' : ''} title="${esc(hidden ? 'Face-down card' : c.name)}" aria-label="${esc(hidden ? 'Face-down card' : c.name)}">${hidden ? '' : `${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" referrerpolicy="no-referrer">` : ''}<strong>${esc(c.name)}</strong><small>${esc(c.id)}${c.faceDown ? ' · Face down' : ''}${c.rested ? ' · Used' : ''}${zone === 'allies' ? `<br>Stages: ${c.stages}` : ''}</small>`}</button>`;
}
function zoneHTML(p, owner, zone) {
  const data = p.zones[zone], hidden = !Array.isArray(data), count = hidden ? data.count : data.length;
  return `<div class="zone" data-zone="${zone}" data-owner="${owner}"><div class="zone-label">${labels[zone]} <span>${count}</span></div>${hidden ? `<div class="pile"><span class="card back" aria-hidden="true"></span>${count}</div><div class="pile-caption">${zone === 'deck' ? 'Life remaining' : 'Private'}</div>` : `<div class="cards">${data.map(c => cardHTML(c, owner, zone)).join('') || '<span class="empty">Empty</span>'}</div>`}</div>`;
}
function counterHTML(p, owner, name, title) { return `<div class="counter"><span>${title}</span><strong>${p[name]}</strong>${owner === seat && ['setup','playing'].includes(game.status) ? `<button data-counter="${name}" data-delta="-1" aria-label="Decrease ${title}">−</button><button data-counter="${name}" data-delta="1" aria-label="Increase ${title}">+</button>` : ''}</div>`; }
function fieldHTML(p, owner) {
  if (!p) return '<section class="player-field opponent"><p>Waiting for your opponent. Copy the invite to bring them to the table.</p></section>';
  return `<section class="player-field ${owner !== seat ? 'opponent' : ''}"><div class="player-meta"><strong>${esc(p.name)} ${owner === seat ? '· You' : '· Opponent'}</strong><span>${p.loaded ? 'Deck loaded' : 'No deck'}${p.tokui ? ` · ${esc(p.tokui)} Tokui-Waza` : ''}</span></div><div class="counter-row">${counterHTML(p,owner,'level','MP level')}${counterHTML(p,owner,'anger','Anger')}${counterHTML(p,owner,'stages','Power stages')}</div><div class="field-grid"><div class="zone-stack"><div class="zone"><div class="zone-label">Main Personality</div>${p.personalities.length ? cardHTML(p.personalities[p.level-1],owner,'mp') : '<span class="empty">Load a deck</span>'}</div>${['mastery','sensei'].map(z=>`<div class="zone"><div class="zone-label">${labels[z]}</div>${p[z]?cardHTML(p[z],owner,z):'<span class="empty">None</span>'}</div>`).join('')}</div><div>${zoneHTML(p,owner,'combat')}<div class="zone-row">${zoneHTML(p,owner,'noncombat')}${zoneHTML(p,owner,'drills')}</div><div class="zone-row">${zoneHTML(p,owner,'allies')}${zoneHTML(p,owner,'dragonballs')}</div></div><div class="zone-stack">${zoneHTML(p,owner,'deck')}${zoneHTML(p,owner,'discard')}${zoneHTML(p,owner,'removed')}</div></div><div class="zone-row">${zoneHTML(p,owner,'location')}${owner!==seat?zoneHTML(p,owner,'hand'):''}</div>${owner===seat?zoneHTML(p,owner,'senseiDeck'):''}${owner===seat&&game.status==='setup'&&!p.ready&&!p.senseiSwapped&&p.zones.senseiDeck.length?`<div class="sensei-choices">${p.zones.senseiDeck.map(c=>`<label><input type="checkbox" class="sensei-choice" value="${esc(c.uid)}"> ${esc(c.name)}</label>`).join('')}<button id="swap-sensei">Reveal & swap selected Sensei cards</button></div>`:''}</section>`;
}

function render() {
  $('lobby').hidden = true; $('table').hidden = false;
  $('room-label').textContent = practiceGame ? 'SCORE DBZ · SOLO PRACTICE · NO AI' : `SCORE DBZ · PRIVATE TABLE · ${room.slice(0,8)}`;
  $('switch-seat').hidden = !practiceGame; $('copy-invite').hidden = !!practiceGame; $('open-deck').disabled = game.status !== 'waiting';
  const p=game.players[seat], opponent=game.players[1-seat], playing=game.status==='playing';
  $('table-title').textContent = `${p.name} vs ${opponent?.name || '…'}`;
  $('turn-bar').innerHTML = `<div><h2>${game.status==='finished'?`${esc(game.players[game.winner].name)} wins`:playing?`${esc(game.players[game.turn].name)}’s turn`:game.status==='setup'?'Prepare your personalities':'Prepare your decks'}</h2><p>${playing?`Turn ${game.turnNumber} · ${game.phase} Step`:'Original Score Entertainment DBZ CCG'}</p></div>${playing?game.phase==='Declare'?`<div class="toolbar"><button data-action="phase" data-combat="true" ${game.turn!==seat?'disabled':''}>Declare Combat</button><button data-action="phase" data-combat="false" ${game.turn!==seat?'disabled':''}>Skip Combat</button></div>`:`<button data-action="phase" ${game.turn!==seat?'disabled':''}>${game.phase==='Rejuvenation'?'Pass turn':'Next step'} →</button>`:''}`;
  $('setup-bar').innerHTML = game.status==='waiting'?`${p.loaded?'Your deck is ready. ':'Load your deck to get started. '}${seat===0?`<button data-action="start" ${game.players.length<2||!game.players.every(x=>x.loaded)?'disabled':''}>Shuffle & start setup</button>`:'The host starts once both decks are loaded.'}`:game.status==='setup'?`Starting MP: 5 stages above 0, anger 0. Resolve Double Power, alignment, Tokui-Waza, and Sensei choices manually. ${seat===0?`<label>First player<select id="first-player">${game.players.map((x,i)=>`<option value="${i}" ${game.turn===i?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:`${esc(game.players[game.turn].name)} goes first.`}${p.ready?' You are ready.':'<button data-action="ready">Finish setup</button>'}`:'';
  $('board').innerHTML=fieldHTML(opponent,1-seat)+fieldHTML(p,seat);
  const controls=[['draw3','Draw 3'],['draw','Draw 1'],['shuffle','Shuffle Life Deck'],['search','Search Life Deck'],['damage','Flip 1 damage'],['powerUp','Power up'],['rejuvenate','Rejuvenate'],['concede','Concede']];
  $('controls').innerHTML=controls.map(([action,label])=>`<button data-action="${action}" ${!playing?'disabled':''}>${label}</button>`).join('');
  $('hand-count').textContent=`· ${p.zones.hand.length}`; $('hand').innerHTML=p.zones.hand.map(c=>cardHTML(c,seat,'hand')).join('')||'<p class="empty">No opening hand. Draw three when the game reaches your Draw Step.</p>';
  $('hand').dataset.zone='hand';$('hand').dataset.owner=seat;
  $('search-panel').hidden=!p.searchCards;$('search-cards').innerHTML=p.searchCards?p.searchCards.map(c=>cardHTML(c,seat,'deck')).join(''):'';
  const notes={Draw:'The active player draws three from the Life Deck. There is no opening hand or mulligan.', 'Non-Combat':'Play eligible Non-Combat cards, Drills, Allies, Dragon Balls, and Battlegrounds/Locations. Playing a Battleground/Location means skipping Combat this turn.', 'Power Up':'MP powers up by its PUR (+1 for declared Tokui-Waza); Allies gain one stage under the original Score rules. Imported PUR defaults to 1; verify your cards.', Declare:'Choose whether to enter Combat. Resolve restrictions and card effects before declaring.', Combat:'Resolve both players’ entering-Combat effects, then the opposing player draws three. Alternate attacks/actions until both pass. Apply costs, PAT damage, Endurance, and Dragon Ball rules manually.', Discard:'Both players discard down to at most one card unless an effect changes that limit. Select hand cards and move them to Discard.', Rejuvenation:'If you did not declare Combat, you may put the top discard on the bottom of your Life Deck. Then pass the turn.'};
  $('guidance').textContent=game.status==='setup'?'Hero normally goes first unless Double Power applies; resolve ties manually. Confirm Sensei choices before Finish setup.':notes[game.phase];
  if(p.anger===5)$('guidance').textContent+=' At five anger, resolve the MP level change, anger reset, power stages, Drills, and possible victory manually.';
  if(p.warnings.length)$('guidance').textContent+=` Deck notes: ${p.warnings.join(' ')}`;
  $('log').innerHTML=game.log.map(x=>`<li><time>${new Date(x.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time>${esc(x.text)}</li>`).join('');$('log').scrollTop=$('log').scrollHeight;renderInspector();
}
function getSelected(){if(!selected)return null;const[owner,zone,uid]=selected.split(':'),p=game.players[+owner];const c=zone==='mp'?p?.personalities[p.level-1]:['mastery','sensei'].includes(zone)?p?.[zone]:zone==='deck'?p?.searchCards?.find(c=>c.uid===uid):Array.isArray(p?.zones[zone])?p.zones[zone].find(c=>c.uid===uid):null;return c?{owner:+owner,zone,c}:null;}
function renderInspector(){
  const s=getSelected();if(!s){selected=null;$('inspect').innerHTML='<p>Select a card to inspect or move it. On mobile, tap a card and choose its destination here.</p>';return;}
  const {owner,zone,c}=s,mine=owner===seat,hidden=c.faceDown&&!mine,fixed=['mp','mastery','sensei'].includes(zone);
  $('inspect').innerHTML=`${hidden?'<img class="preview-image" src="/assets/score-card-back.jpg" alt="Face-down card">':c.image?`<img class="preview-image" src="${esc(c.image)}" alt="${esc(c.name)}" referrerpolicy="no-referrer">`:'<div class="large-placeholder">Z</div>'}<h3>${esc(hidden?'Face-down card':c.name)}</h3><p>${esc(hidden?'Hidden':c.id)} · ${labels[zone]}</p>${mine&&zone==='senseiDeck'&&game.status==='setup'?'<p class="fine">Choose cards in the Sensei swap checkboxes below your table, then swap them together.</p>':''}${mine&&game.status==='playing'&&!fixed?`<label>Move to<select id="destination">${Object.entries(labels).filter(([z])=>z!==zone&&!['mp','mastery','sensei'].includes(z)).map(([z,l])=>`<option value="${z}">${l}${z==='deck'?' (top)':''}</option>`).join('')}${zone!=='deck'?'<option value="deck-bottom">Life Deck (bottom)</option>':''}</select></label><button class="primary wide" id="move-selected">Move card →</button>${!['hand','deck','senseiDeck'].includes(zone)?`<div class="toolbar"><button data-card-action="rest">${c.rested?'Mark unused':'Mark used'}</button><button data-card-action="flip">Flip</button></div>${zone==='allies'?'<div class="toolbar"><button data-card-action="stages" data-delta="-1">−1 stage</button><button data-card-action="stages" data-delta="1">+1 stage</button></div>':''}${zone==='dragonballs'?'<button data-card-action="giveDragonBall">Transfer to opponent</button>':''}`:''}`:''}`;
}

document.addEventListener('click', e => {
  const card = e.target.closest('[data-card]');
  if (card) { selected = card.dataset.card; render(); return; }
  const action = e.target.closest('[data-action]');
  if (action) { if (action.dataset.action === 'concede' && !confirm('Concede this game?')) return; send(action.dataset.action === 'draw3' ? { type: 'draw', count: 3 } : { type: action.dataset.action, ...(action.dataset.combat !== undefined ? { combat: action.dataset.combat === 'true' } : {}) }); }
  const counter = e.target.closest('[data-counter]'); if (counter) send({ type: 'counter', counter: counter.dataset.counter, delta: Number(counter.dataset.delta) });
  if (e.target.closest('#swap-sensei')) send({ type: 'senseiSwap', uids: [...document.querySelectorAll('.sensei-choice:checked')].map(x=>x.value) });
  const ca = e.target.closest('[data-card-action]');
  if (ca) { const s = getSelected(); if (s) send({ type: ca.dataset.cardAction, from: s.zone, uid: s.c.uid, delta: Number(ca.dataset.delta) }); }
  if (e.target.closest('#move-selected')) { const s = getSelected(), dest = $('destination').value; if (s) send({ type: 'move', from: s.zone, uid: s.c.uid, to: dest === 'deck-bottom' ? 'deck' : dest, bottom: dest === 'deck-bottom' }); }
});
document.addEventListener('dragstart', e => { const c = e.target.closest('[data-card]'); if (c) e.dataTransfer.setData('text/plain', c.dataset.card); });
document.addEventListener('dragover', e => { const z = e.target.closest('[data-zone]'); if (z && Number(z.dataset.owner) === seat) { e.preventDefault(); z.classList.add('drop-target'); } });
document.addEventListener('dragleave', e => e.target.closest('[data-zone]')?.classList.remove('drop-target'));
document.addEventListener('drop', e => { const z = e.target.closest('[data-zone]'); if (!z || Number(z.dataset.owner) !== seat) return; e.preventDefault(); z.classList.remove('drop-target'); const [owner, from, uid] = e.dataTransfer.getData('text/plain').split(':'); if (+owner === seat) send({ type: 'move', from, uid, to: z.dataset.zone }); });
$('room-form').onsubmit = e => { e.preventDefault(); join(true); };
$('join-form').onsubmit = e => { e.preventDefault(); join(false); };
$('practice').onclick = practice;
$('switch-seat').onclick = () => { seat = 1 - seat; selected = null; game = view(practiceGame, seat); render(); };
$('leave').onclick = () => { intentional = true; clearTimeout(reconnectTimer); socket?.close(); location.href = '/'; };
$('copy-invite').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/#${room}`); toast('Invite copied. Share it with your opponent.'); } catch { toast(`Room code: ${room}`); } };
$('open-deck').onclick = () => { $('deck-error').textContent = ''; $('deck-dialog').showModal(); };
$('close-deck').onclick = () => $('deck-dialog').close();
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
