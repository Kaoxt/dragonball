export const ZONES = ['deck', 'hand', 'life', 'battle', 'combo', 'energy', 'drop', 'removed'];
const PUBLIC = ['battle', 'combo', 'energy', 'drop', 'removed'];
export function check(ok, message) { if (!ok) throw new Error(message); }
export function randomInt(n) {
  const limit = 4294967296 - (4294967296 % n);
  let x; do { x = crypto.getRandomValues(new Uint32Array(1))[0]; } while (x >= limit);
  return x % n;
}
export function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) { const j = randomInt(i + 1); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  // New opaque IDs prevent tracking a previously seen card into a hidden pile.
  for (const card of cards) card.uid = crypto.randomUUID();
}
const clean = (v, max = 100) => String(v ?? '').trim().slice(0, max);
function url(v) { if (!v) return ''; try { const u = new URL(v); return u.protocol === 'https:' ? u.href.slice(0, 1000) : ''; } catch { return ''; } }
function card(v) {
  check(v && typeof v === 'object', 'Invalid card.');
  const id = clean(v.id, 40); check(id, 'Every card needs an ID.');
  return { uid: crypto.randomUUID(), id, name: clean(v.name || id), image: url(v.image), backImage: url(v.backImage), rested: false, faceDown: false, power: 0 };
}
export function parseDeck(input) {
  check(input && Array.isArray(input.cards), 'Import a deck first.');
  const leader = card(input.leader), cards = [], counts = {};
  check(input.cards.length <= 60, 'Too many card entries.');
  for (const item of input.cards) {
    const qty = Number(item.qty ?? 1);
    check(Number.isInteger(qty) && qty > 0 && qty <= 60, 'Invalid card quantity.');
    check(cards.length + qty <= 60, 'Maximum deck size is 60.');
    for (let i = 0; i < qty; i++) cards.push(card(item));
    counts[item.id] = (counts[item.id] || 0) + qty;
  }
  check(cards.length >= 50, 'Fusion World decks need 50–60 cards, plus a leader.');
  const warnings = Object.entries(counts).filter(([, n]) => n > 4).map(([id]) => `${id}: more than four copies; check card exceptions.`);
  return { leader, cards, warnings };
}
export function newGame() { return { players: [], status: 'waiting', turn: 0, turnNumber: 1, phase: 'Charge', log: [], updated: Date.now(), version: 0 }; }
export function log(g, text) { g.log.push({ text, at: Date.now() }); g.log = g.log.slice(-80); }
export function addPlayer(g, token, name) {
  check(g.players.length < 2 && g.status === 'waiting', 'This room is full.');
  const p = { token, name: clean(name, 24) || `Player ${g.players.length + 1}`, zones: Object.fromEntries(ZONES.map(z => [z, []])), leader: null, loaded: false, ready: false, mulligan: false, marker: 0, warnings: [] };
  g.players.push(p); log(g, `${p.name} joined the table.`); return g.players.length - 1;
}
function draw(p, n, to = 'hand') {
  check(p.zones.deck.length >= n, 'Not enough cards in the deck.');
  p.zones[to].push(...p.zones.deck.splice(0, n));
}
export function act(g, seat, a) {
  check(a && typeof a === 'object' && !Array.isArray(a), 'Invalid action.');
  const p = g.players[seat]; check(p, 'Not a player.');
  const say = text => log(g, `${p.name} ${text}`);
  if (a.type === 'chat') { const text = clean(a.text, 300); check(text, 'Enter a message.'); say(`: ${text}`); }
  else if (a.type === 'load') {
    check(g.status === 'waiting', 'Decks are locked once setup begins.');
    const parsed = parseDeck(a.deck);
    p.leader = parsed.leader; p.zones.deck = parsed.cards; p.warnings = parsed.warnings; p.loaded = true;
    say(`loaded a ${parsed.cards.length}-card deck.`);
  } else if (a.type === 'start') {
    check(seat === 0 && g.status === 'waiting' && g.players.length === 2 && g.players.every(x => x.loaded), 'Both players must load a deck; the host starts setup.');
    g.turn = randomInt(2); g.first = g.turn; g.status = 'setup';
    for (let i = 0; i < 2; i++) { shuffle(g.players[i].zones.deck); draw(g.players[i], 6); g.players[i].marker = i === g.first ? 0 : 1; }
    log(g, `${g.players[g.first].name} goes first. Keep your opening hand or mulligan once.`);
  } else if (a.type === 'mulligan') {
    check(g.status === 'setup' && !p.ready && !p.mulligan, 'Mulligan is available once before keeping your hand.');
    p.zones.deck.push(...p.zones.hand.splice(0)); shuffle(p.zones.deck); draw(p, 6); p.mulligan = true; say('took a mulligan.');
  } else if (a.type === 'ready') {
    check(g.status === 'setup' && !p.ready, 'Opening hand already kept.');
    draw(p, 8, 'life'); p.ready = true; say('kept their hand and set 8 life.');
    if (g.players.every(x => x.ready)) { g.status = 'playing'; log(g, 'Game started. Charge phase: ready cards, draw one, then optionally charge.'); }
  } else {
    check(g.status === 'playing', 'Finish opening-hand setup first.');
    switch (a.type) {
      case 'draw': draw(p, 1); say('drew a card.'); break;
      case 'life': check(p.zones.life.length, 'No life remaining.'); p.zones.hand.push(p.zones.life.pop()); say('took one life into hand.'); break;
      case 'critical': check(p.zones.life.length, 'No life remaining.'); p.zones.drop.push(p.zones.life.pop()); say('sent one life to drop (Critical).'); break;
      case 'shuffle': shuffle(p.zones.deck); p.searching = false; say('shuffled their deck.'); break;
      case 'search': p.searching = true; say('is searching their deck; shuffle when finished.'); break;
      case 'refresh': for (const z of ['battle', 'energy']) for (const c of p.zones[z]) c.rested = false; p.leader.rested = false; say('readied their cards.'); break;
      case 'marker': p.marker = p.marker ? 0 : 1; say(p.marker ? 'added an energy marker (manual adjustment).' : 'used their energy marker.'); break;
      case 'awaken': p.leader.awakened = !p.leader.awakened; say(p.leader.awakened ? 'awakened their leader; resolve its effects manually.' : 'returned their leader to its front side.'); break;
      case 'move': {
        check(ZONES.includes(a.from) && ZONES.includes(a.to) && a.from !== a.to, 'Choose a different valid area.');
        const source = p.zones[a.from];
        const index = a.from === 'deck' ? (p.searching && a.uid ? source.findIndex(c => c.uid === a.uid) : 0) : a.from === 'life' ? source.length - 1 : source.findIndex(c => c.uid === a.uid);
        check(index >= 0 && index < source.length, 'Card is no longer in that area.');
        const [c] = source.splice(index, 1); c.rested = false; c.faceDown = false; c.power = 0;
        if (['deck', 'life', 'hand'].includes(a.to)) c.uid = crypto.randomUUID();
        if (a.to === 'deck' && a.bottom !== true) p.zones.deck.unshift(c); else p.zones[a.to].push(c);
        say(`moved a card from ${a.from} to ${a.to}${a.to === 'deck' ? (a.bottom ? ' (bottom)' : ' (top)') : ''}.`); break;
      }
      case 'rest': case 'flip': case 'power': {
        check(a.from === 'leader' || PUBLIC.includes(a.from), 'Select a card on the table.');
        const c = a.from === 'leader' ? p.leader : p.zones[a.from].find(c => c.uid === a.uid); check(c, 'Card not found.');
        if (a.type === 'rest') c.rested = !c.rested;
        if (a.type === 'flip') { check(a.from !== 'leader', 'Use Awaken for the leader.'); c.faceDown = !c.faceDown; }
        if (a.type === 'power') { check(Number.isInteger(a.delta) && Math.abs(a.delta) <= 100000, 'Invalid power adjustment.'); c.power = Math.max(-1000000, Math.min(1000000, c.power + a.delta)); }
        say(`${a.type === 'rest' ? 'changed active/rest mode' : a.type === 'flip' ? 'flipped a card' : 'adjusted power'} in ${a.from}.`); break;
      }
      case 'clearCombo': p.zones.drop.push(...p.zones.combo.splice(0).map(c => ({ ...c, rested: false, power: 0, faceDown: false }))); say('cleared combo cards to drop.'); break;
      case 'phase': {
        check(g.turn === seat, 'Only the turn player advances phases.');
        const phases = ['Charge', 'Main', 'End']; const i = phases.indexOf(g.phase);
        if (i === 2) { g.turn = 1 - g.turn; g.turnNumber++; g.phase = 'Charge'; } else g.phase = phases[i + 1];
        log(g, `Turn ${g.turnNumber} · ${g.players[g.turn].name} · ${g.phase} phase.`); break;
      }
      case 'concede': g.status = 'finished'; g.winner = 1 - seat; say('conceded the game.'); break;
      default: throw new Error('Unknown action.');
    }
  }
  g.version++; g.updated = Date.now();
}
export function view(g, seat) {
  return { status: g.status, turn: g.turn, turnNumber: g.turnNumber, phase: g.phase, winner: g.winner, log: g.log, version: g.version,
    players: g.players.map((p, i) => ({ name: p.name, leader: p.leader, loaded: p.loaded, ready: p.ready, mulligan: p.mulligan, marker: p.marker, warnings: i === seat ? p.warnings : [], searchCards: i === seat && p.searching ? [...p.zones.deck].sort((a,b) => a.id.localeCompare(b.id)) : null,
      zones: Object.fromEntries(ZONES.map(z => [z, z === 'deck' || z === 'life' || (z === 'hand' && i !== seat) ? { count: p.zones[z].length } : p.zones[z].map(c => c.faceDown && i !== seat ? { uid: c.uid, faceDown: true, rested: c.rested } : c)])) })) };
}
