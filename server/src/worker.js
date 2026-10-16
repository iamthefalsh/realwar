// Cloudflare Worker entry: routes players to the matchmaking lobby or to their match room.
// Each match runs inside its own Durable Object, so games never share state.
import { LobbyCore, RoomCore } from './core.js';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
const wrap = ws => ({ send: d => { try { ws.send(d); } catch (e) {} }, close: () => { try { ws.close(1000, 'bye'); } catch (e) {} } });
function upgrade(onOpen) {
  const pair = new WebSocketPair(), [client, server] = Object.values(pair);
  server.accept(); const conn = wrap(server); const h = onOpen(conn);
  server.addEventListener('message', e => h.msg(conn, e.data));
  server.addEventListener('close', () => h.leave(conn));
  server.addEventListener('error', () => h.leave(conn));
  return new Response(null, { status: 101, webSocket: client });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/health') return json({ ok: true, game: 'realwar' });
    if (url.pathname === '/lobby') return env.LOBBY.get(env.LOBBY.idFromName('main')).fetch(req);
    const m = url.pathname.match(/^\/room\/([a-f0-9]{24})$/);
    if (m) return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
    return json({ error: 'not found' }, 404);
  }
};

export class Lobby {
  constructor(state, env) {
    this.core = new LobbyCore(async (room, cfg) => {
      const r = await env.ROOM.get(env.ROOM.idFromName(room)).fetch('https://room/setup', { method: 'POST', body: JSON.stringify(cfg) });
      if (!r.ok) throw new Error('room setup failed');
    });
  }
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return json(this.core.status());
    return upgrade(conn => { this.core.join(conn); return this.core; });
  }
}

export class Room {
  constructor(state, env) { this.core = null; }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/setup' && req.method === 'POST') {
      const cfg = await req.json();
      this.core = new RoomCore(cfg, { setInterval, clearInterval, setTimeout }, () => { this.core = null; });
      return json({ ok: true });
    }
    if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected websocket' }, 426);
    const team = +url.searchParams.get('team'), key = url.searchParams.get('key') || '';
    return upgrade(conn => {
      if (!this.core) { conn.send(JSON.stringify({ t: 'error', msg: 'This match does not exist or has ended.' })); conn.close(); return { msg() {}, leave() {} }; }
      const core = this.core; core.join(conn, team, key);
      return { msg: (c, d) => core.msg(c, d), leave: c => core.leave(c) };
    });
  }
}
