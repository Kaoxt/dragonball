import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, addPlayer, act, view, parseDeck, shuffle } from '../public/game.js';
const deck = prefix => ({ leader: { id: prefix + '-L' }, cards: Array.from({ length: 13 }, (_, i) => ({ id: `${prefix}-${i}`, qty: i === 12 ? 2 : 4 })) });
function setup() {
  const g = newGame(); addPlayer(g, 'secret-a', 'Alice'); addPlayer(g, 'secret-b', 'Bob');
  act(g, 0, { type: 'load', deck: deck('ALICE') }); act(g, 1, { type: 'load', deck: deck('BOB') }); act(g, 0, { type: 'start' }); return g;
}
function playing() { const g = setup(); act(g, 0, { type: 'ready' }); act(g, 1, { type: 'ready' }); return g; }
test('setup preserves card counts, handles one full mulligan before life, and assigns marker', () => {
  const g = setup(); assert.equal(g.players[0].zones.hand.length, 6); assert.equal(g.players[0].zones.life.length, 0);
  act(g, 0, { type: 'mulligan' }); assert.throws(() => act(g, 0, { type: 'mulligan' }));
  act(g, 0, { type: 'ready' }); act(g, 1, { type: 'ready' }); assert.equal(g.status, 'playing');
  for (let i = 0; i < 2; i++) { const p = g.players[i]; assert.equal(p.zones.deck.length, 36); assert.equal(p.zones.life.length, 8); assert.equal(p.marker, i === g.first ? 0 : 1); }
});
test('views do not leak tokens, opposing hands, life identities, or deck order', () => {
  const g = playing(), a = view(g, 0); assert.equal(JSON.stringify(a).includes('secret-'), false);
  assert.deepEqual(a.players[1].zones.hand, { count: 6 }); assert.deepEqual(a.players[0].zones.deck, { count: 36 });
  assert.deepEqual(a.players[0].zones.life, { count: 8 });
  for (const c of g.players[1].zones.hand) assert.equal(JSON.stringify(a).includes(c.uid), false);
});
test('only own cards can be moved, opponents cannot advance another turn, decks lock', () => {
  const g = playing(), uid = g.players[1].zones.hand[0].uid;
  assert.throws(() => act(g, 0, { type: 'move', from: 'hand', to: 'battle', uid }));
  assert.throws(() => act(g, 1 - g.turn, { type: 'phase' }));
  assert.throws(() => act(g, 0, { type: 'load', deck: deck('OTHER') }));
});
test('face-down public cards hide all identity and artwork from opponents', () => {
  const g = playing(), uid = g.players[0].zones.hand[0].uid;
  act(g, 0, { type: 'move', from: 'hand', to: 'battle', uid }); act(g, 0, { type: 'flip', from: 'battle', uid });
  assert.deepEqual(Object.keys(view(g, 1).players[0].zones.battle[0]).sort(), ['faceDown','rested','uid']);
  assert.ok(view(g, 0).players[0].zones.battle[0].id);
});
test('private search sorts results, hides them from opponent, shuffles and rekeys on completion', () => {
  const g = playing(); act(g, 0, { type: 'search' });
  const v = view(g, 0), id = v.players[0].searchCards.at(-1).uid;
  assert.equal(view(g, 1).players[0].searchCards, null);
  act(g, 0, { type: 'move', from: 'deck', to: 'hand', uid: id }); assert.equal(g.players[0].zones.hand.length, 7);
  const before = g.players[0].zones.deck.map(c => c.uid); act(g, 0, { type: 'shuffle' });
  assert.equal(view(g, 0).players[0].searchCards, null); assert.ok(g.players[0].zones.deck.every(c => !before.includes(c.uid)));
});
test('life and Critical move one card to correct destination without logging identity', () => {
  const g = playing(); act(g, 0, { type: 'life' }); act(g, 0, { type: 'critical' });
  assert.equal(g.players[0].zones.life.length, 6); assert.equal(g.players[0].zones.hand.length, 7); assert.equal(g.players[0].zones.drop.length, 1);
  assert.ok(!g.log.at(-1).text.includes('ALICE-'));
});
test('deck validation rejects malformed/oversized lists and strips unsafe image schemes', () => {
  const d = deck('A'); d.cards[0].qty = 70; assert.throws(() => parseDeck(d));
  const valid = deck('A'); valid.cards[0].image = 'javascript:alert(1)'; assert.equal(parseDeck(valid).cards[0].image, '');
  assert.throws(() => parseDeck({ leader: { id: 'a' }, cards: [{ id: 'b', qty: -1 }] }));
});
test('shuffle preserves card multiset and removes tracking IDs', () => {
  const cards = parseDeck(deck('A')).cards, ids = cards.map(c => c.id).sort(), uids = cards.map(c => c.uid); shuffle(cards);
  assert.deepEqual(cards.map(c => c.id).sort(), ids); assert.ok(cards.every(c => !uids.includes(c.uid)));
});
test('phase progression passes turn and finished games cannot be modified', () => {
  const g = playing(), first = g.turn; for (let i = 0; i < 3; i++) act(g, first, { type: 'phase' });
  assert.equal(g.turn, 1 - first); assert.equal(g.phase, 'Charge'); assert.equal(g.turnNumber, 2);
  act(g, first, { type: 'concede' }); assert.equal(g.winner, 1 - first); assert.throws(() => act(g, 0, { type: 'draw' }));
});
