// Local stand-in for the Cloudflare Worker: same LobbyCore/RoomCore, served over a tiny
// dependency-free WebSocket implementation. Usage: node test/mpserver.mjs [port]
import http from 'node:http';
import crypto from 'node:crypto';
import { LobbyCore, RoomCore } from '../server/src/core.js';

const PORT = +(process.argv[2] || 8787);
const rooms = new Map();
const lobby = new LobbyCore(async (id, cfg) => { rooms.set(id, new RoomCore(cfg, { setInterval, clearInterval, setTimeout }, () => rooms.delete(id))); });
export const stats = { rooms, lobby };

function frame(data) {
  const bin = typeof data !== 'string', body = bin ? Buffer.from(data) : Buffer.from(data, 'utf8'), n = body.length;
  const head = n < 126 ? Buffer.from([bin ? 0x82 : 0x81, n]) : n < 65536 ? Buffer.from([bin ? 0x82 : 0x81, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = bin ? 0x82 : 0x81; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
  return Buffer.concat([head, body]);
}
function accept(req, sock, handler) {
  const key = req.headers['sec-websocket-key'];
  const acceptKey = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptKey}\r\n\r\n`);
  let closed = false;
  const conn = { send: d => { if (!closed) sock.write(frame(d)); }, close: () => { if (closed) return; closed = true; try { sock.write(Buffer.from([0x88, 0])); sock.end(); } catch {} handler.leave(conn); } };
  let buf = Buffer.alloc(0);
  sock.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const op = buf[0] & 15, masked = buf[1] & 128; let len = buf[1] & 127, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const mOff = off; if (masked) off += 4; if (buf.length < off + len) return;
      const payload = Buffer.from(buf.subarray(off, off + len));
      if (masked) for (let i = 0; i < len; i++) payload[i] ^= buf[mOff + (i & 3)];
      buf = buf.subarray(off + len);
      if (op === 8) return conn.close();
      if (op === 9) { sock.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); continue; }
      if (op === 1) handler.msg(conn, payload.toString('utf8'));
    }
  });
  sock.on('close', () => { if (!closed) { closed = true; handler.leave(conn); } });
  sock.on('error', () => {});
  return conn;
}
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify({ ok: true, game: 'realwar', rooms: rooms.size, ...lobby.status() }));
});
server.on('upgrade', (req, sock) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/lobby') { const c = accept(req, sock, lobby); lobby.join(c); return; }
  const m = url.pathname.match(/^\/room\/([a-f0-9]{24})$/), room = m && rooms.get(m[1]);
  if (!room) { const c = accept(req, sock, { msg() {}, leave() {} }); c.send(JSON.stringify({ t: 'error', msg: 'This match does not exist or has ended.' })); c.close(); return; }
  const c = accept(req, sock, room); room.join(c, +url.searchParams.get('team'), url.searchParams.get('key') || '');
});
server.listen(PORT, () => console.log(`realwar test server on ws://localhost:${PORT}`));
