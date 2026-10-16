// Matchmaking queue and match rooms. Platform-neutral: a "conn" is anything with send(data) and close().
import { createSim } from './sim.js';

const TICK_MS = 50;          // simulation step (20 per second)
const SNAP_EVERY = 3;        // send a snapshot every 3 steps (~6.7 per second)
const RECONNECT_S = 60;      // a player who stays disconnected this long forfeits
const MAX_MINUTES = 40;      // after this, the player with more territory wins
const enc = new TextEncoder();
const rid = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
const safeName = n => (typeof n === 'string' ? n : '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 16) || 'Commander';
const parse = d => { if (typeof d !== 'string' || d.length > 20000) return null; try { return JSON.parse(d); } catch { return null; } };

export class LobbyCore {
  constructor(createRoom) { this.queue = []; this.conns = new Set(); this.createRoom = createRoom; }
  status() { return { t: 'status', online: this.conns.size, waiting: this.queue.length }; }
  broadcast() { const s = JSON.stringify(this.status()); for (const c of this.conns) c.send(s); }
  join(conn) { this.conns.add(conn); conn.send(JSON.stringify(this.status())); this.broadcast(); }
  leave(conn) { if (!this.conns.has(conn)) return; this.conns.delete(conn); this.queue = this.queue.filter(c => c !== conn); this.broadcast(); }
  async msg(conn, data) {
    const m = parse(data); if (!m) return;
    if (m.t === 'ping') return conn.send(JSON.stringify(this.status()));
    if (m.t === 'cancel') { this.queue = this.queue.filter(c => c !== conn); return this.broadcast(); }
    if (m.t === 'queue') {
      conn.name = safeName(m.name);
      if (!this.queue.includes(conn)) this.queue.push(conn);
      this.broadcast();
      while (this.queue.length >= 2) {
        const a = this.queue.shift(), b = this.queue.shift();
        const room = rid(), keys = { 1: rid(), 2: rid() }, names = { 1: a.name, 2: b.name };
        try { await this.createRoom(room, { keys, names, created: Date.now() }); }
        catch (e) { a.send(JSON.stringify({ t: 'error', msg: 'Could not create a match. Try again.' })); b.send(JSON.stringify({ t: 'error', msg: 'Could not create a match. Try again.' })); continue; }
        a.send(JSON.stringify({ t: 'match', room, team: 1, key: keys[1], opp: names[2], me: names[1] }));
        b.send(JSON.stringify({ t: 'match', room, team: 2, key: keys[2], opp: names[1], me: names[2] }));
      }
      this.broadcast();
    }
  }
}

export class RoomCore {
  constructor(cfg, timers, onEnd) {
    this.cfg = cfg; this.timers = timers; this.onEnd = onEnd || (() => {});
    this.conns = { 1: null, 2: null }; this.away = { 1: 0, 2: 0 }; this.full = { 1: true, 2: true };
    this.sim = null; this.iv = null; this.n = 0; this.ended = false;
  }
  send(t, obj) { const c = this.conns[t]; if (c) c.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); }
  join(conn, team, key) {
    if (!(team === 1 || team === 2) || !this.cfg || this.cfg.keys[team] !== key) {
      conn.send(JSON.stringify({ t: 'error', msg: 'This match does not exist or has ended.' })); conn.close(); return;
    }
    const old = this.conns[team]; this.conns[team] = conn; conn.team = team; this.away[team] = 0;
    if (old && old !== conn) { old.replaced = true; old.close(); }
    if (this.ended) { conn.send(JSON.stringify({ t: 'error', msg: 'This match has ended.' })); return; }
    if (!this.sim) {
      if (this.conns[1] && this.conns[2]) this.start();
      else conn.send(JSON.stringify({ t: 'wait', opp: this.cfg.names[3 - team] }));
    } else { this.sendInit(team); this.full[team] = true; this.send(3 - team, { t: 'opp', online: true }); }
  }
  leave(conn) {
    const t = conn.team; if (!t || this.conns[t] !== conn) return;
    this.conns[t] = null; this.away[t] = 0.0001;
    this.send(3 - t, { t: 'opp', online: false, grace: RECONNECT_S });
    if (!this.sim && !this.conns[1] && !this.conns[2]) this.stop();
  }
  msg(conn, data) {
    const m = parse(data); if (!m || !conn.team) return;
    if (m.t === 'ping') return conn.send(JSON.stringify({ t: 'pong', c: m.c | 0 }));
    if (m.t !== 'cmd' || !this.sim || this.ended || typeof m.n !== 'string') return;
    const now = Date.now(); conn.win = conn.win && now - conn.win.t < 1000 ? conn.win : { t: now, n: 0 };
    if (++conn.win.n > 40) return; // flood protection
    const err = this.sim.runCmd(conn.team, m.n, m.a);
    if (err) this.sim.note(conn.team, err);
  }
  start() {
    const S = this.sim = createSim();
    S.newGame({ size: 'medium', diff: 'normal', prep: 0, mp: true, headless: true, vertical: true });
    for (const t of [1, 2]) this.sendInit(t);
    this.iv = this.timers.setInterval(() => this.tick(), TICK_MS);
  }
  sendInit(t) { this.send(t, { t: 'init', team: t, names: this.cfg.names, map: this.sim.mapPack() }); }
  tick() {
    const S = this.sim, G = S.G;
    try { if (!G.over) S.update(TICK_MS / 1000); } catch (e) { console.error('sim error', e && e.stack); }
    for (const t of [1, 2]) if (!this.conns[t] && this.away[t] && !G.over) { this.away[t] += TICK_MS / 1000; if (this.away[t] > RECONNECT_S) S.forfeit(t); }
    if (!G.over && G.time > MAX_MINUTES * 60) S.timeUp();
    if (++this.n % SNAP_EVERY === 0 || G.over) this.broadcast();
    if (G.over && !this.ended) { this.ended = true; this.timers.setTimeout(() => this.stop(), 10000); }
  }
  broadcast() {
    const S = this.sim, units = S.encUnits(), shared = S.sharedDiff();
    for (const t of [1, 2]) {
      if (!this.conns[t]) continue;
      const json = enc.encode(JSON.stringify(S.teamPayload(t, this.full[t], shared))); this.full[t] = false;
      const out = new Uint8Array(4 + units.length + json.length);
      new DataView(out.buffer).setUint32(0, units.length, true); out.set(units, 4); out.set(json, 4 + units.length);
      this.conns[t].send(out);
    }
    S.endBroadcast();
  }
  stop() { if (this.iv) this.timers.clearInterval(this.iv); this.iv = null; for (const t of [1, 2]) if (this.conns[t]) this.conns[t].close(); this.onEnd(); }
}
