import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, addPlayer, act, view } from '../public/game.js';
import { practiceDeck } from '../public/practice-deck.js';
import { saveArenaSession, readArenaSession, clearArenaSession, sessionToRestore } from '../public/arena-session.js';

function storage(t) {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous); else delete globalThis.sessionStorage; });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, writable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  } });
  return values;
}
function practice() {
  const game = newGame();
  addPlayer(game, 'practice-a', 'You'); addPlayer(game, 'practice-b', 'Opponent');
  act(game, 0, { type: 'load', deck: practiceDeck() });
  act(game, 1, { type: 'load', deck: practiceDeck(true) });
  act(game, 0, { type: 'start' });
  act(game, 0, { type: 'ready' }); act(game, 1, { type: 'ready' });
  return game;
}
test('practice refresh restores exact deck order, cards, positions, counters, turn, log and Undo', t => {
  storage(t);
  const game = practice();
  act(game, 1, { type: 'draw', count: 3 });
  const uid = game.players[1].zones.hand[0].uid;
  act(game, 1, { type: 'move', from: 'hand', to: 'combat', uid, position: { x: .7, y: .3 } });
  act(game, 1, { type: 'rest', from: 'combat', uid });
  act(game, 1, { type: 'flip', from: 'combat', uid });
  act(game, 0, { type: 'phase' });
  const beforeCounter = structuredClone(game);
  act(game, 1, { type: 'counter', counter: 'anger', delta: 1 });
  assert.equal(saveArenaSession({ kind: 'practice', seat: 1, game }), true);
  const restored = readArenaSession();
  assert.equal(restored.seat, 1); assert.deepEqual(restored.game, game);
  assert.notEqual(restored.game, game);
  assert.deepEqual(view(restored.game, 1), view(game, 1));
  act(restored.game, 1, { type: 'undo' });
  assert.equal(restored.game.players[1].anger, beforeCounter.players[1].anger);
  assert.deepEqual(restored.game.players[1].zones, beforeCounter.players[1].zones);
});
test('multiplayer remembers only its room and an explicit invite wins over saved practice', t => {
  storage(t);
  const room = 'a'.repeat(32), other = 'b'.repeat(32);
  saveArenaSession({ kind: 'room', room });
  assert.deepEqual(readArenaSession(), { kind: 'room', room });
  assert.deepEqual(sessionToRestore('', readArenaSession()), { kind: 'room', room });
  assert.deepEqual(sessionToRestore('#' + other, { kind: 'practice', game: practice(), seat: 0 }), { kind: 'room', room: other });
  clearArenaSession(); assert.equal(readArenaSession(), null);
});
test('practice saved during the former Non-Combat step restores as Planning', t => {
  storage(t);
  const game = practice(); game.phase = 'Non-Combat';
  const players = structuredClone(game.players);
  saveArenaSession({ kind: 'practice', seat: 0, game });
  const restored = readArenaSession();
  assert.equal(restored.game.phase, 'Planning');
  assert.deepEqual(restored.game.players, players);
  act(restored.game, 0, { type: 'phase' });
  assert.equal(restored.game.phase, 'Power Up');
});
test('invalid or unavailable storage never prevents entering the Arena', t => {
  const values = storage(t);
  for (const invalid of ['{', '{"version":2}', JSON.stringify({ version: 1, kind: 'room', room: '../other' }),
    JSON.stringify({ version: 1, kind: 'practice', seat: 0, game: { ruleset: 'score-dbz-v1', players: [] } })]) {
    values.set('score-arena-session-v1', invalid); assert.equal(readArenaSession(), null);
  }
  globalThis.sessionStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); }, removeItem() { throw Error('blocked'); } };
  assert.equal(readArenaSession(), null); assert.equal(saveArenaSession({ kind: 'room', room: 'a'.repeat(32) }), false);
  assert.doesNotThrow(clearArenaSession);
});

