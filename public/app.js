import { newGame, addPlayer, act, view } from './game.js';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let room = '', seat = 0, game, practiceGame, socket, selected, connected = false, reconnectTimer, intentional = false;
const demo = () => ({ leader: { id: 'PRACTICE-L', name: 'Practice leader' }, cards: Array.from({ length: 13 }, (_, i) => ({ id: `PRACTICE-${i + 1}`, name: `Practice card ${i + 1}`, qty: i === 12 ? 2 : 4 })) });
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').hidden = true, 5500); }
function status(text) { $('connection').textContent = text; }
function send(action) {
  if (practiceGame) {
    try { const next = structuredClone(practiceGame); act(next, seat, action); practiceGame = next; game = view(practiceGame, seat); render(); } catch (e) { toast(e.message); }
  } else if (socket?.readyState === WebSocket.OPEN && connected) socket.send(JSON.stringify(action));
  else toast('Not connected. Wait for reconnection before making a move.');
}
async function join(create) {
  const name = $('name').value.trim() || 'Player'; localStorage.setItem('fw-name', name);
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
const labels = { deck: 'Deck', hand: 'Hand', life: 'Life', battle: 'Battle area', combo: 'Combo area', energy: 'Energy', drop: 'Drop', removed: 'Removed', leader: 'Leader' };
function cardHTML(c, owner, zone) {
  const mine = owner === seat, key = `${owner}:${zone}:${c.uid}`, image = c.awakened && c.backImage ? c.backImage : c.image;
  const hidden = c.faceDown && !mine;
  return `<button class="card ${c.rested ? 'rested' : ''} ${selected === key ? 'selected' : ''} ${hidden ? 'back' : ''} ${image && !hidden ? 'has-image' : ''}" data-card="${esc(key)}" ${mine && zone !== 'leader' && !hidden ? 'draggable="true"' : ''} title="${esc(hidden ? 'Face-down card' : c.name)}" aria-label="${esc(hidden ? 'Face-down card' : c.name)}${c.rested ? ', rested' : ''}">${hidden ? 'F' : `${image ? `<img src="${esc(image)}" alt="${esc(c.name)}" loading="lazy" referrerpolicy="no-referrer">` : ''}<strong>${esc(c.name)}</strong><small>${esc(c.id)}${c.awakened ? ' · Awakened' : ''}${c.faceDown ? ' · Face down' : ''}${c.rested ? ' · Rest' : ''}${c.power ? `<br>${c.power > 0 ? '+' : ''}${c.power} power` : ''}</small>`}</button>`;
}
function zoneHTML(p, owner, zone) {
  const data = p.zones[zone], hidden = !Array.isArray(data), count = hidden ? data.count : data.length;
  return `<div class="zone" data-zone="${zone}" data-owner="${owner}"><div class="zone-label">${labels[zone]} <span>${count}</span></div>${hidden ? `<div class="pile"><span class="card back">F</span>${count}</div><div class="pile-caption">${zone === 'hand' ? 'Private hand' : 'Face down'}</div>` : `<div class="cards">${data.map(c => cardHTML(c, owner, zone)).join('') || '<span class="empty">Empty</span>'}</div>`}</div>`;
}
function fieldHTML(p, owner) {
  if (!p) return '<section class="player-field opponent"><p>Waiting for your opponent. Copy the invite to bring them to the table.</p></section>';
  return `<section class="player-field ${owner !== seat ? 'opponent' : ''}"><div class="player-meta"><strong>${esc(p.name)} ${owner === seat ? '· You' : '· Opponent'}</strong><span>${p.loaded ? 'Deck loaded' : 'No deck'} · ${p.marker ? 'Energy marker ×1' : 'No marker'}</span></div><div class="field-grid"><div class="zone-stack"><div class="zone"><div class="zone-label">Leader</div>${p.leader ? cardHTML(p.leader, owner, 'leader') : '<span class="empty">Load a deck</span>'}</div>${zoneHTML(p, owner, 'life')}</div><div>${zoneHTML(p, owner, 'battle')}<div class="zone-row">${zoneHTML(p, owner, 'combo')}${zoneHTML(p, owner, 'energy')}</div></div><div class="zone-stack">${zoneHTML(p, owner, 'deck')}${zoneHTML(p, owner, 'drop')}</div></div><div class="zone-row">${owner !== seat ? zoneHTML(p, owner, 'hand') : ''}${zoneHTML(p, owner, 'removed')}</div></section>`;
}
function render() {
  $('lobby').hidden = true; $('table').hidden = false;
  $('room-label').textContent = practiceGame ? 'SOLO PRACTICE · NO AI OPPONENT' : `PRIVATE TABLE · ${room.slice(0, 8)}`;
  $('switch-seat').hidden = !practiceGame; $('copy-invite').hidden = !!practiceGame;
  $('open-deck').disabled = game.status !== 'waiting';
  const p = game.players[seat], opponent = game.players[1 - seat];
  $('table-title').textContent = `${p.name} vs ${opponent?.name || '…'}`;
  const playing = game.status === 'playing';
  $('turn-bar').innerHTML = `<div><h2>${game.status === 'finished' ? `${esc(game.players[game.winner].name)} wins` : playing ? `${esc(game.players[game.turn].name)}’s turn` : game.status === 'setup' ? 'Choose your opening hand' : 'Prepare your decks'}</h2><p>${playing ? `Turn ${game.turnNumber} · ${game.phase} phase` : game.status === 'finished' ? 'Create a new table for another game.' : 'Manual play with guided setup'}</p></div>${playing ? `<button data-action="phase" ${game.turn !== seat ? 'disabled' : ''}>${game.phase === 'End' ? 'Pass turn' : 'Next phase'} →</button>` : ''}`;
  $('setup-bar').innerHTML = game.status === 'waiting' ? `${p.loaded ? 'Your deck is ready. ' : 'Load your deck to get started. '}${seat === 0 ? `<button data-action="start" ${game.players.length < 2 || !game.players.every(x => x.loaded) ? 'disabled' : ''}>Shuffle & start setup</button>` : 'The host will start when both decks are loaded.'}` : game.status === 'setup' ? p.ready ? 'Opening hand kept. Waiting for the other player.' : `Keep these six cards, or reshuffle your whole hand once.<button data-action="mulligan" ${p.mulligan ? 'disabled' : ''}>Mulligan</button><button data-action="ready">Keep hand · set life</button>` : '';
  $('board').innerHTML = fieldHTML(opponent, 1 - seat) + fieldHTML(p, seat);
  const controls = [['draw','Draw 1'],['shuffle','Shuffle deck'],['search','Search deck'],['life','Take life'],['critical','Critical damage'],['refresh','Ready all'],['marker',p.marker ? 'Use marker' : 'Add marker'],['awaken','Awaken / revert'],['clearCombo','Clear combo'],['concede','Concede']];
  $('controls').innerHTML = controls.map(([action, label]) => `<button data-action="${action}" ${!playing ? 'disabled' : ''}>${label}</button>`).join('');
  $('hand-count').textContent = `· ${p.zones.hand.length}`;
  $('hand').innerHTML = p.zones.hand.map(c => cardHTML(c, seat, 'hand')).join('') || '<p class="empty">Your cards will appear here.</p>';
  $('search-panel').hidden = !p.searchCards;
  $('search-cards').innerHTML = p.searchCards ? p.searchCards.map(c => cardHTML(c, seat, 'deck')).join('') : '';
  $('hand').dataset.zone = 'hand'; $('hand').dataset.owner = seat;
  $('guidance').textContent = game.status === 'setup' ? 'Each player draws six, may mulligan once, then sets eight life. The second player gets an energy marker.' : game.phase === 'Charge' ? 'Ready rested cards, draw one (including the first turn), then optionally charge one card from hand as energy. Use the buttons below the table.' : game.phase === 'Main' ? 'Play cards, pay costs, use skills, and resolve battles manually. The first player cannot attack on the first turn. Check Awaken conditions on your leader.' : 'Resolve end-of-turn effects and temporary power changes before passing the turn.';
  if (p.warnings.length) $('guidance').textContent += ` Deck notes: ${p.warnings.join(' ')}`;
  $('log').innerHTML = game.log.map(x => `<li><time>${new Date(x.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>${esc(x.text)}</li>`).join(''); $('log').scrollTop = $('log').scrollHeight;
  renderInspector();
}
function getSelected() {
  if (!selected) return null;
  const [owner, zone, uid] = selected.split(':'); const p = game.players[+owner];
  const c = zone === 'leader' ? p?.leader : zone === 'deck' ? p?.searchCards?.find(c => c.uid === uid) : Array.isArray(p?.zones[zone]) ? p.zones[zone].find(c => c.uid === uid) : null;
  return c ? { owner: +owner, zone, c } : null;
}
function renderInspector() {
  const s = getSelected();
  if (!s) { selected = null; $('inspect').innerHTML = '<p>Select a card to inspect or move it. On mobile, tap a card and choose its destination here.</p>'; return; }
  const { owner, zone, c } = s, mine = owner === seat, hidden = c.faceDown && !mine;
  const image = c.awakened && c.backImage ? c.backImage : c.image;
  $('inspect').innerHTML = `${image && !hidden ? `<img class="preview-image" src="${esc(image)}" alt="${esc(c.name)}" referrerpolicy="no-referrer">` : '<div class="large-placeholder">F</div>'}<h3>${esc(hidden ? 'Face-down card' : c.name)}</h3><p>${esc(hidden ? 'Hidden from your view' : c.id)} · ${labels[zone]}</p>${mine && game.status === 'playing' ? `${zone !== 'leader' ? `<label>Move to<select id="destination">${Object.entries(labels).filter(([z]) => z !== zone && z !== 'leader').map(([z,l]) => `<option value="${z}">${l}${z === 'deck' ? ' (top)' : ''}</option>`).join('')}${zone !== 'deck' ? '<option value="deck-bottom">Deck (bottom)</option>' : ''}</select></label><button class="primary wide" id="move-selected">Move card →</button>` : ''}${!['hand','deck'].includes(zone) ? `<div class="toolbar"><button data-card-action="rest">${c.rested ? 'Ready' : 'Rest'}</button>${zone !== 'leader' ? '<button data-card-action="flip">Flip</button>' : ''}</div><div class="toolbar"><button data-card-action="power" data-delta="-5000">−5k power</button><button data-card-action="power" data-delta="5000">+5k power</button></div><p class="fine">Temporary power: ${c.power || 0}. Adjust or clear effects manually.</p>` : ''}` : ''}`;
}
document.addEventListener('click', e => {
  const card = e.target.closest('[data-card]');
  if (card) { selected = card.dataset.card; render(); return; }
  const action = e.target.closest('[data-action]');
  if (action) { if (action.dataset.action === 'concede' && !confirm('Concede this game?')) return; send({ type: action.dataset.action }); }
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
$('save-deck').onclick = () => { localStorage.setItem('fw-deck', JSON.stringify({ leader: $('leader-id').value, text: $('deck-text').value })); toast('Deck draft saved in this browser.'); };
$('demo-deck').onclick = () => { $('deck-text').value = JSON.stringify(demo(), null, 2); $('leader-id').value = 'PRACTICE-L'; };
function deckInput() {
  const text = $('deck-text').value.trim(); if (text.startsWith('{')) return JSON.parse(text);
  const cards = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#')).map(line => {
    const m = /^\s*(\d+)\s*x?\s+([\w-]+)(?:\s+(.+))?\s*$/i.exec(line);
    if (!m) throw new Error(`Use "4 FS01-02 Card name" on each line. Could not read: ${line.slice(0, 50)}`);
    return { qty: Number(m[1]), id: m[2], name: m[3] || m[2] };
  }); return { leader: { id: $('leader-id').value.trim(), name: $('leader-id').value.trim() }, cards };
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
try { $('name').value = localStorage.getItem('fw-name') || ''; const draft = JSON.parse(localStorage.getItem('fw-deck') || 'null'); if (draft) { $('leader-id').value = draft.leader; $('deck-text').value = draft.text; } } catch { /* invalid saved draft */ }
if (/^#[a-f0-9]{32}$/.test(location.hash)) { $('room-code').value = location.hash.slice(1); $('join-form').querySelector('button').textContent = 'Join / resume this table'; }
// Failed image URLs leave the readable card name and ID available.
document.addEventListener('error', e => { if (e.target.tagName === 'IMG') { e.target.hidden = true; e.target.parentElement.classList.remove('has-image'); } }, true);
