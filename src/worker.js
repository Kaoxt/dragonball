import { DurableObject } from 'cloudflare:workers';
import { newGame, addPlayer, act, view } from '../public/game.js';
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const token = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
const digest = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
function cookie(req) { return /(?:^|;\s*)score_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.get('Cookie') || '')?.[1]; }
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!u.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (req.headers.get('Origin') !== u.origin) return json({ error: 'Same-origin requests only.' }, 403);
    if (u.pathname === '/api/rooms' && req.method === 'POST') {
      const ip = req.headers.get('CF-Connecting-IP') || 'local';
      if (env.ROOM_LIMITER && !(await env.ROOM_LIMITER.limit({ key: ip })).success) return json({ error: 'Too many room requests. Try again in a minute.' }, 429);
      const id = token().slice(0, 32);
      return env.ROOMS.getByName(`score-${id}`).fetch(new Request(`${u.origin}/api/room/${id}/create`, req));
    }
    const m = /^\/api\/room\/([a-f0-9]{32})\/(join|socket)$/.exec(u.pathname);
    if (m) {
      if (m[2] === 'join' && env.ROOM_LIMITER && !(await env.ROOM_LIMITER.limit({ key: req.headers.get('CF-Connecting-IP') || 'local' })).success) return json({ error: 'Too many join requests.' }, 429);
      return env.ROOMS.getByName(`score-${m[1]}`).fetch(req);
    }
    return json({ error: 'Not found.' }, 404);
  }
};
export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.game = null;
    ctx.blockConcurrencyWhile(async () => { this.game = await ctx.storage.get('game') || null; });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async save() { await this.ctx.storage.put('game', this.game); await this.ctx.storage.setAlarm(Date.now() + 7 * 86400000); }
  async fetch(req) {
    const u = new URL(req.url), id = u.pathname.split('/')[3], action = u.pathname.split('/')[4];
    let secret = cookie(req), hash = secret ? await digest(secret) : null;
    const secure = u.protocol === 'https:' ? '; Secure' : '';
    if (action === 'socket') {
      const seat = this.game?.players.findIndex(p => p.token === hash) ?? -1;
      if (seat < 0) return json({ error: 'Join this room first.' }, 401);
      if (req.method !== 'GET' || req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocket required.' }, 426);
      // One active connection per seat prevents duplicate commands across tabs.
      for (const ws of this.ctx.getWebSockets()) if (ws.deserializeAttachment()?.seat === seat) ws.close(4001, 'Opened in another tab');
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server); server.serializeAttachment({ seat, window: Date.now(), count: 0 });
      server.send(JSON.stringify({ type: 'state', seat, game: view(this.game, seat) }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (req.method !== 'POST') return json({ error: 'POST required.' }, 405);
    try {
      const text = await req.text(); if (text.length > 2048) return json({ error: 'Request too large.' }, 413);
      const body = JSON.parse(text);
      if (action === 'create') {
        if (this.game) return json({ error: 'Room exists.' }, 409);
        this.game = newGame();
      } else if (!this.game) return json({ error: 'Room not found or expired.' }, 404);
      let seat = this.game.players.findIndex(p => p.token === hash);
      if (seat < 0) { secret = token(); hash = await digest(secret); seat = addPlayer(this.game, hash, body.name); }
      await this.save(); this.broadcast();
      return json({ id, seat }, 200, { 'Set-Cookie': `score_session=${secret}; Path=/api/room/${id}/; HttpOnly; SameSite=Strict; Max-Age=604800${secure}` });
    } catch (e) { return json({ error: e.message || 'Unable to join.' }, 400); }
  }
  async webSocketMessage(ws, message) {
    try {
      if (typeof message !== 'string' || message.length > 48000) throw new Error('Message too large.');
      const info = ws.deserializeAttachment(), now = Date.now();
      if (now - info.window > 10000) { info.window = now; info.count = 0; }
      info.count++; ws.serializeAttachment(info);
      if (info.count > 35) throw new Error('Slow down for a moment.');
      const next = structuredClone(this.game); act(next, info.seat, JSON.parse(message));
      this.game = next; await this.save(); this.broadcast();
    } catch (e) { ws.send(JSON.stringify({ type: 'error', error: e.message || 'Action failed.' })); }
  }
  broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      try { const seat = ws.deserializeAttachment().seat; ws.send(JSON.stringify({ type: 'state', seat, game: view(this.game, seat) })); } catch { /* closed connection */ }
    }
  }
  webSocketClose(ws, code) { ws.close(code === 1005 ? 1000 : code); }
  webSocketError(ws) { ws.close(1011, 'Connection error'); }
  async alarm() { for (const ws of this.ctx.getWebSockets()) ws.close(4000, 'Room expired'); await this.ctx.storage.deleteAll(); this.game = null; }
}
