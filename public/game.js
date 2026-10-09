import { powerChart, personalityPower } from './personality-power.js';
export const ZONES = ['deck', 'hand', 'combat', 'noncombat', 'drills', 'allies', 'dragonballs', 'location', 'discard', 'removed', 'senseiDeck'];
export const PHASES = ['Draw', 'Non-Combat', 'Power Up', 'Declare', 'Combat', 'Discard', 'Rejuvenation'];
const PUBLIC = ZONES.filter(z => !['deck', 'hand', 'senseiDeck'].includes(z));
export function check(ok, message) { if (!ok) throw new Error(message); }
export function randomInt(n) { const limit = 4294967296 - 4294967296 % n; let x; do { x = crypto.getRandomValues(new Uint32Array(1))[0]; } while (x >= limit); return x % n; }
export function shuffle(cards) { for (let i = cards.length - 1; i > 0; i--) { const j = randomInt(i + 1); [cards[i], cards[j]] = [cards[j], cards[i]]; } for (const c of cards) c.uid = crypto.randomUUID(); }
const clean = (v, max = 100) => String(v ?? '').trim().slice(0, max);
const integer = (v, fallback, max = 20) => Number.isInteger(v) && v >= 0 && v <= max ? v : fallback;
function url(v) { if (!v) return ''; if (typeof v === 'string' && /^\/assets\/cards\/[a-z0-9-]+\.(?:jpg|webp)$/.test(v)) return v.replace(/\.jpg$/, '.webp'); try { const u = new URL(v); return u.protocol === 'https:' ? u.href.slice(0, 1000) : ''; } catch { return ''; } }
function card(v) { check(v && typeof v === 'object', 'Invalid card.'); const id = clean(v.id, 60); check(id, 'Every card needs an ID.'); return { uid: crypto.randomUUID(), id, name: clean(v.name || id), image: url(v.image), rested: false, faceDown: false, stages: 0, pur: integer(v.pur, 1), maxStages: powerChart(v)?.length-1 || integer(v.maxStages, 10), ...(powerChart(v)?{powerLevels:[...powerChart(v)]}:{}) }; }
function expand(items, max = 90) { check(Array.isArray(items) && items.length <= max, 'Invalid card list.'); const result = []; for (const item of items) { const qty = Number(item.qty ?? 1); check(Number.isInteger(qty) && qty > 0 && qty <= max && result.length + qty <= max, 'Invalid quantity or too many cards.'); for (let i = 0; i < qty; i++) result.push(card(item)); } return result; }
export function parseDeck(input) {
  check(input && Array.isArray(input.personalities), 'Supply 3–5 Main Personality cards in level order.');
  check(input.personalities.length >= 3 && input.personalities.length <= 5, 'Main Personality stacks need consecutive levels 1 through 3, 4, or 5.');
  const personalities = input.personalities.map(card), cards = expand(input.cards), mastery = input.mastery ? card(input.mastery) : null, sensei = input.sensei ? card(input.sensei) : null, senseiDeck = expand(input.senseiDeck || []);
  check(cards.length > 0, 'The Life Deck cannot be empty.'); check(!senseiDeck.length || sensei, 'A Sensei Deck requires a Sensei card.');
  const tokui = clean(input.tokui, 20), total = personalities.length + cards.length + (mastery ? 1 : 0) + (sensei ? 1 : 0), max = tokui.toLowerCase() === 'namekian' ? 90 : 85;
  const warnings = [];
  if (total < 50 || total > max) warnings.push(`Deck size ${total}: Score generally uses 50–${max} including starting cards; verify your format.`);
  const counts = Object.create(null); for (const c of cards) counts[c.id] = (counts[c.id] || 0) + 1;
  for (const [id,n] of Object.entries(counts)) if (n > 3) warnings.push(`${id}: ${n} copies; check Named-card and card-text exceptions.`);
  return { personalities, cards, mastery, sensei, senseiDeck, tokui, warnings };
}
export function newGame() { return { ruleset: 'score-dbz-v1', players: [], status: 'waiting', turn: 0, turnNumber: 1, phase: 'Draw', combatDeclared: false, log: [], updated: Date.now(), version: 0 }; }
export function log(g, text) { g.log.push({ text, at: Date.now() }); g.log = g.log.slice(-80); }
export function addPlayer(g, token, name) { check(g.players.length < 2 && g.status === 'waiting', 'This room is full.'); g.players.push({ token, name: clean(name, 24) || `Player ${g.players.length + 1}`, zones: Object.fromEntries(ZONES.map(z => [z, []])), personalities: [], level: 1, anger: 0, stages: 5, mastery: null, sensei: null, tokui: '', loaded: false, ready: false, warnings: [] }); log(g, `${g.players.at(-1).name} joined the table.`); return g.players.length - 1; }
function validPosition(q) { return q && Number.isFinite(q.x) && Number.isFinite(q.y) && q.x >= 0 && q.x <= 1 && q.y >= 0 && q.y <= 1; }
function draw(p, n) { check(p.zones.deck.length >= n, 'Not enough Life Deck cards. Resolve survival victory or card effects manually.'); p.zones.hand.push(...p.zones.deck.splice(0, n)); }
function applyAction(g, seat, a) {
  check(a && typeof a === 'object' && !Array.isArray(a), 'Invalid action.'); const p = g.players[seat]; check(p, 'Not a player.'); const say = text => log(g, `${p.name} ${text}`);
  if (a.type === 'chat') { const text = clean(a.text, 300); check(text, 'Enter a message.'); say(`: ${text}`); }
  else if (a.type === 'load') { check(g.status === 'waiting', 'Decks lock when setup begins.'); const d = parseDeck(a.deck); Object.assign(p, { personalities: d.personalities, mastery: d.mastery, sensei: d.sensei, tokui: d.tokui, warnings: d.warnings, loaded: true }); p.zones.deck = d.cards; p.zones.senseiDeck = d.senseiDeck; say(`loaded ${d.cards.length} Life Deck cards and ${d.personalities.length} MP levels.`); }
  else if (a.type === 'start') { check(seat === 0 && g.status === 'waiting' && g.players.length === 2 && g.players.every(x => x.loaded), 'Both players must load a deck; the host starts setup.'); g.status = 'setup'; for (const x of g.players) shuffle(x.zones.deck); log(g, 'Setup: declare alignment and Tokui-Waza, check Double Power, choose first player, and resolve Sensei swaps. No opening hand is dealt.'); }
  else if (a.type === 'first') { check(seat === 0 && g.status === 'setup' && [0,1].includes(a.seat), 'The host chooses the first player during setup.'); g.turn = a.seat; log(g, `${g.players[g.turn].name} will take the first turn.`); }
  else if (a.type === 'ready') { check(g.status === 'setup' && !p.ready, 'Already ready.'); p.ready = true; say('finished setup.'); if (g.players.every(x => x.ready)) { g.status = 'playing'; log(g, 'Game started. Active player: draw three cards in the Draw Step.'); } }
  else {
    check(g.status === 'playing' || g.status === 'setup', 'Start setup first.');
    const setupActions = ['counter', 'power', 'senseiSwap', 'position']; check(g.status === 'playing' || setupActions.includes(a.type), 'This action is available after setup.');
    switch (a.type) {
      case 'power': check(Number.isSafeInteger(a.value) && a.value >= 0 && a.value <= 999999999, 'Enter a whole power rating from 0 to 999,999,999.'); p.power = a.value; say(`set power to ${a.value.toLocaleString()} (manual).`); break;
      case 'position': { const fixed = ['mp','mastery','sensei'].includes(a.from); check(fixed || PUBLIC.includes(a.from), 'Choose a card on the table.'); const c = a.from === 'mp' ? p.personalities[p.level-1] : fixed ? p[a.from] : p.zones[a.from].find(c=>c.uid===a.uid); check(c && c.uid === a.uid, 'Card not found.'); check(a.position === null && fixed || validPosition(a.position), 'Invalid table position.'); c.position = a.position === null ? null : {x:a.position.x,y:a.position.y}; break; }
      case 'draw': { const n = a.count === 3 ? 3 : 1; draw(p, n); say(`drew ${n} card${n === 1 ? '' : 's'}.`); break; }
      case 'damage': check(p.zones.deck.length, 'Life Deck empty: resolve survival victory.'); p.zones.discard.push(p.zones.deck.shift()); say('flipped one Life Deck card into discard. Resolve Endurance / Dragon Ball exceptions before continuing.'); break;
      case 'rejuvenate': check(g.turn === seat && g.phase === 'Rejuvenation' && !g.combatDeclared, 'Normal rejuvenation requires your Rejuvenation Step without declared Combat. Use manual card movement for effects.'); check(p.zones.discard.length, 'Discard pile is empty.'); check(!g.rejuvenated, 'Already rejuvenated this turn.'); { const c = p.zones.discard.pop(); c.uid = crypto.randomUUID(); c.faceDown = false; c.rested = false; p.zones.deck.push(c); g.rejuvenated = true; } say('rejuvenated the top discard to the bottom of the Life Deck.'); break;
      case 'shuffle': shuffle(p.zones.deck); p.searching = false; say('shuffled their Life Deck.'); break;
      case 'search': p.searching = true; say('is searching their Life Deck; shuffle when finished.'); break;
      case 'senseiSwap': { check(g.status === 'setup' && !p.ready && !p.senseiSwapped, 'Sensei swaps happen before you finish setup.'); const ids = a.uids; check(Array.isArray(ids) && ids.length > 0 && ids.length <= p.zones.deck.length && new Set(ids).size === ids.length, 'Select distinct Sensei cards to swap.'); const cards = ids.map(id => p.zones.senseiDeck.find(c => c.uid === id)); check(cards.every(Boolean), 'Sensei card not found.'); p.zones.senseiDeck = p.zones.senseiDeck.filter(c => !ids.includes(c.uid)); p.zones.senseiDeck.push(...p.zones.deck.splice(0, cards.length)); p.zones.deck.push(...cards); shuffle(p.zones.deck); p.senseiSwapped = true; say(`revealed Sensei choices: ${cards.map(c => c.name).join(', ')}; swapped ${cards.length} top Life Deck cards and shuffled.`); break; }
      case 'counter': { check(['anger','stages','level'].includes(a.counter) && [-1,1].includes(a.delta), 'Invalid counter.'); const max = a.counter === 'level' ? p.personalities.length : a.counter === 'anger' ? 5 : p.personalities[p.level - 1].maxStages; const min = a.counter === 'level' ? 1 : 0; p[a.counter] = Math.max(min, Math.min(max, p[a.counter] + a.delta)); if (['level','stages'].includes(a.counter)) p.power = null; if (a.counter === 'level') p.stages = Math.min(p.stages, p.personalities[p.level - 1].maxStages); say(`set ${a.counter} to ${p[a.counter]} (manual).`); break; }
      case 'powerUp': { p.power = null; const mp = p.personalities[p.level - 1]; p.stages = Math.min(mp.maxStages, p.stages + mp.pur + (p.tokui ? 1 : 0)); for (const c of p.zones.allies) c.stages = Math.min(c.maxStages, c.stages + 1); say('powered up: MP by imported PUR (+1 for declared Tokui-Waza), Allies by one. Adjust card exceptions manually.'); break; }
      case 'move': { if(a.position !== undefined) check(PUBLIC.includes(a.to) && validPosition(a.position), 'Invalid table position.'); check(ZONES.includes(a.from) && ZONES.includes(a.to) && a.from !== a.to, 'Choose a different area.'); const source = p.zones[a.from], index = a.from === 'deck' ? (p.searching && a.uid ? source.findIndex(c => c.uid === a.uid) : 0) : source.findIndex(c => c.uid === a.uid); check(index >= 0 && index < source.length, 'Card no longer in that area.'); const [c] = source.splice(index, 1); const named = PUBLIC.includes(a.to) || (PUBLIC.includes(a.from) && !c.faceDown); c.rested = false; c.faceDown = false; delete c.position; if(a.position) c.position={x:a.position.x,y:a.position.y}; if (['deck','hand','senseiDeck'].includes(a.to)) c.uid = crypto.randomUUID(); if (a.to === 'deck' && !a.bottom) p.zones.deck.unshift(c); else p.zones[a.to].push(c); const areas = {deck:'Life Deck',hand:'hand',combat:'combat',noncombat:'Non-Combat',drills:'Drills',allies:'Allies',dragonballs:'Dragon Balls',location:'Battleground / Location',discard:'discard pile',removed:'removed pile',senseiDeck:'Sensei Deck'}; const played = a.from === 'hand' && PUBLIC.includes(a.to) && !['discard','removed'].includes(a.to); say(played ? `played ${c.name} from hand to ${areas[a.to]}.` : `moved ${named ? c.name : 'a card'} from ${areas[a.from]} to ${areas[a.to]}${a.to === 'deck' ? a.bottom ? ' (bottom)' : ' (top)' : ''}.`); break; }
      case 'giveDragonBall': { const index = p.zones.dragonballs.findIndex(c => c.uid === a.uid); check(index >= 0, 'Choose a Dragon Ball you control.'); const [c] = p.zones.dragonballs.splice(index, 1); c.faceDown = false; g.players[1-seat].zones.dragonballs.push(c); say(`transferred ${c.name} to ${g.players[1-seat].name}; resolve capture conditions manually.`); break; }
      case 'rest': case 'flip': case 'stages': { check(PUBLIC.includes(a.from), 'Select a card in play.'); const c = p.zones[a.from].find(c => c.uid === a.uid); check(c, 'Card not found.'); if (a.type === 'rest') c.rested = !c.rested; if (a.type === 'flip') c.faceDown = !c.faceDown; if (a.type === 'stages') { check([-1,1].includes(a.delta), 'Invalid stage change.'); c.stages = Math.max(0, Math.min(c.maxStages, c.stages + a.delta)); } say(`adjusted ${a.type} in ${a.from}.`); break; }
      case 'phase': { check(g.turn === seat, 'Only the active player advances steps.'); if (g.phase === 'Declare') { check(typeof a.combat === 'boolean', 'Choose declare or skip Combat.'); g.combatDeclared = a.combat; g.phase = a.combat ? 'Combat' : 'Discard'; } else if (g.phase === 'Rejuvenation') { g.turn = 1-g.turn; g.turnNumber++; g.phase = 'Draw'; g.combatDeclared = false; g.rejuvenated = false; } else g.phase = PHASES[PHASES.indexOf(g.phase)+1]; log(g, `Turn ${g.turnNumber} · ${g.players[g.turn].name} · ${g.phase} Step.`); break; }
      case 'concede': g.status = 'finished'; g.winner = 1-seat; say('conceded the game.'); break;
      default: throw new Error('Unknown action.');
    }
  }
  g.version++; g.updated = Date.now();
}
// One action of history, kept server-side and never included in a player view.
const undoable = new Set(['counter','power','powerUp','move','position','rest','flip','stages','damage','draw','rejuvenate','shuffle','senseiSwap','phase','giveDragonBall']);
export function act(g, seat, a) {
 check(g.players[seat], 'Not a player.');
 if (a?.type === 'undo') {
  check(g.undo?.seat === seat && ['setup','playing'].includes(g.status), 'There is no action you can undo. Another game action may have been made.');
  const name=g.players[seat].name, history=g.log, version=g.version, previous=g.undo.state, action=g.undo.action;
  Object.keys(g).forEach(key=>delete g[key]);
  Object.assign(g,previous,{log:history,version:version+1,updated:Date.now()});
  delete g.undo;
  log(g, `${name} undid their last action (${action}).`);
  return;
 }
 const {undo,...state}=g;
 const previous=undoable.has(a?.type)?structuredClone(state):null;
 applyAction(g,seat,a);
 if(a.type!=='chat') {
  delete g.undo;
  if(previous) g.undo={seat,state:previous,action:a.type};
 }
}
export function view(g, seat) { return { canUndo: g.undo?.seat===seat && ['setup','playing'].includes(g.status), ruleset: g.ruleset, status: g.status, turn: g.turn, turnNumber: g.turnNumber, phase: g.phase, combatDeclared: g.combatDeclared, winner: g.winner, log: g.log, version: g.version, players: g.players.map((p,i) => ({ name:p.name, personalities:p.personalities, level:p.level, anger:p.anger, stages:p.stages, power:personalityPower(p), mastery:p.mastery, sensei:p.sensei, tokui:p.tokui, loaded:p.loaded, ready:p.ready, senseiSwapped:!!p.senseiSwapped, warnings: i===seat?p.warnings:[], searchCards: i===seat&&p.searching?[...p.zones.deck].sort((a,b)=>a.id.localeCompare(b.id)):null, zones:Object.fromEntries(ZONES.map(z=>[z,z==='deck'||(['hand','senseiDeck'].includes(z)&&i!==seat)?{count:p.zones[z].length}:p.zones[z].map(c=>c.faceDown&&i!==seat?{uid:c.uid,faceDown:true,rested:c.rested,...(c.position?{position:c.position}:{})}:c)])) })) }; }
