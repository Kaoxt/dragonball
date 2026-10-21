import { ZONES, PHASES } from './game.js';

const KEY = 'score-arena-session-v1';
export const validRoom = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);

// Tab-local storage survives refresh/navigation without overwriting another tab's game.
export function saveArenaSession(session) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...session, version: 1 })); return true; }
  catch { return false; }
}
export function clearArenaSession() {
  try { sessionStorage.removeItem(KEY); } catch { /* Storage can be disabled. */ }
}
export function readArenaSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved?.version !== 1) return null;
    if (saved.kind === 'room' && validRoom(saved.room)) return { kind: 'room', room: saved.room };
    const g = saved.game;
    if (saved.kind !== 'practice' || ![0, 1].includes(saved.seat) || g?.ruleset !== 'score-dbz-v1') return null;
    if (!['setup', 'playing', 'finished'].includes(g.status) || !PHASES.includes(g.phase) || ![0, 1].includes(g.turn)) return null;
    if (!Array.isArray(g.log) || g.players?.length !== 2) return null;
    if (!g.players.every(p => Array.isArray(p.personalities) && p.personalities.length >= 3 &&
      Number.isInteger(p.level) && p.level >= 1 && p.level <= p.personalities.length &&
      ZONES.every(zone => Array.isArray(p.zones?.[zone])))) return null;
    return { kind: 'practice', game: g, seat: saved.seat };
  } catch { return null; }
}

export function sessionToRestore(hash, saved) {
  const invitedRoom = hash.replace(/^#/, '');
  // An explicit invite always takes priority over an unrelated saved game.
  return validRoom(invitedRoom) ? { kind: 'room', room: invitedRoom } : saved;
}
