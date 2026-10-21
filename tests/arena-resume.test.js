import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { newGame, addPlayer, act, view } from '../public/game.js';
import { API_SECURITY_HEADERS } from '../src/community/security.js';

// Exercise the real Worker routing and GameRoom handler with the Cloudflare host supplied by a small test double.
const source = readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8')
  .replace(/^export \{ Community \}[^\n]*\n/m, '')
  .replace(/^import [^\n]*\n/gm, '')
  .replace('export default {', 'const worker = {')
  .replace('export class GameRoom', 'class GameRoom');
const context = vm.createContext({ crypto, TextEncoder, Request, Response, URL, newGame, addPlayer, act, view, API_SECURITY_HEADERS,
  DurableObject: class { constructor(ctx) { this.ctx = ctx; } },
  WebSocketRequestResponsePair: class {} });
vm.runInContext(source + '\nglobalThis.handlers = { worker, GameRoom };', context);
const { worker, GameRoom } = context.handlers;
const id = 'c'.repeat(32), secret = 'a'.repeat(64);
const hash = async value => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('hex');
async function fixture() {
  const game = newGame(); addPlayer(game, await hash('b'.repeat(64)), 'Host'); addPlayer(game, await hash(secret), 'Guest');
  game.status = 'playing'; game.version = 17;
  let ready, writes = 0;
  const ctx = { storage: { get: async () => game, put: async () => writes++, setAlarm: async () => writes++ },
    blockConcurrencyWhile: fn => { ready = fn(); }, setWebSocketAutoResponse() {}, getWebSockets: () => [] };
  const room = new GameRoom(ctx, {}); await ready;
  const env = { ROOMS: { getByName: name => { assert.equal(name, 'score-' + id); return room; } } };
  return { room, game, env, writes: () => writes };
}
function request(cookie = secret, origin = 'https://arena.test') {
  return new Request(`https://arena.test/api/room/${id}/resume`, { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: 'score_session=' + cookie } : {}) }, body: '{}' });
}
test('refresh resumes the authenticated guest seat in a running full room without changing progress', async () => {
  const f = await fixture(), before = structuredClone(f.game);
  const response = await worker.fetch(request(), f.env);
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { id, seat: 1 });
  assert.deepEqual(f.game, before); assert.equal(f.writes(), 0);
});
test('opening an invitation without its seat cookie never joins or takes over a seat', async () => {
  const f = await fixture(), before = structuredClone(f.game);
  for (const cookie of [null, 'd'.repeat(64)]) {
    const response = await worker.fetch(request(cookie), f.env);
    assert.equal(response.status, 401); assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.deepEqual(f.game, before); assert.equal(f.writes(), 0);
});
test('expired rooms and cross-origin resume requests fail safely', async () => {
  const f = await fixture(); f.room.game = null;
  assert.equal((await worker.fetch(request(), f.env)).status, 404);
  assert.equal((await worker.fetch(request(secret, 'https://other.test'), f.env)).status, 403);
  assert.equal(f.writes(), 0);
});
