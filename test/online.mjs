// End-to-end online test: local server + two phone-sized browsers find each other in the
// queue, play a match through the real UI paths, and check both see the same world.
import { spawn } from 'node:child_process';
import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const OUT = new URL('./', import.meta.url).pathname, PAGE = new URL('../index.html', import.meta.url).href, PORT = 8799;
const srv = spawn(process.execPath, [new URL('./mpserver.mjs', import.meta.url).pathname, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
let srvErr = ''; srv.stderr.on('data', d => srvErr += d); await new Promise(r => srv.stdout.once('data', r));
const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter', '--disable-crashpad', '--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const errs = [];
async function player(name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.stack.split('\n').slice(0, 3).join(' | ')));
  await p.goto(PAGE); await p.waitForTimeout(400);
  await p.evaluate(port => localStorage.setItem('rw_server', 'ws://localhost:' + port), PORT);
  await p.tap('#bOnline'); await p.fill('#mpName', name); return p;
}
const A = await player('Alice'), B = await player('Bob');
await A.tap('#bFind'); await A.waitForTimeout(400);
const queued = await A.textContent('#mpStatus');
await B.tap('#bFind');
await A.waitForFunction(() => G && G.mp && G.units.length > 0, null, { timeout: 15000 });
await B.waitForFunction(() => G && G.mp && G.units.length > 0, null, { timeout: 15000 });
console.log('queue status while waiting:', JSON.stringify(queued));
const view = p => p.evaluate(() => { const cap = G.cities.find(c => c.type === 'capital' && c.owner === 1), foe = G.cities.find(c => c.type === 'capital' && c.owner === 2);
  return { team: MP.team, opp: MP.opp, myCapitalAtBottom: cap.y > foe.y, mine: G.units.filter(u => u.team === 1).length, theirs: G.units.filter(u => u.team === 2).length, money: Math.round(G.E[1].money) }; });
console.log('Alice view:', JSON.stringify(await view(A)));
console.log('Bob view:  ', JSON.stringify(await view(B)));
await A.screenshot({ path: OUT + 'online-alice-start.png' });

// Alice: recruit, build a farm and march her army toward Bob's capital
const a1 = await A.evaluate(() => {
  const cap = G.cities.find(c => c.type === 'capital' && c.owner === 1), foe = G.cities.find(c => c.type === 'capital' && c.owner === 2);
  openCity(cap); renderPanel(); document.querySelector('#panel .card[data-t="inf"]').click(); document.querySelector('#panel .card[data-t="tank"]').click();
  startPlace('farm'); computePlaceCells(); const ci = G.placeCells[0]; const [sx, sy] = w2s((ci % G.W + .5) * CELL, ((ci / G.W | 0) + .5) * CELL); onTap(sx, sy, false); endPlace();
  document.querySelector('#divBar .chip[data-div="all"]').click();
  const [mx, my] = w2s(foe.x, foe.y); onTap(mx, my, false);
  return { sel: G.sel.length, foeY: Math.round(foe.y), myY: Math.round(cap.y) };
});
console.log('Alice orders:', JSON.stringify(a1));
await A.waitForTimeout(6000);
const check = await Promise.all([A, B].map(p => p.evaluate(() => {
  const cap = G.cities.find(c => c.type === 'capital' && c.owner === 1);
  return { t: Math.round(G.time), queue: cap.queue.length, myBlds: G.blds.filter(b => b.owner === 1).length, foeBlds: G.blds.filter(b => b.owner === 2).length,
    myUnits: G.units.filter(u => u.team === 1).map(u => Math.round(u.y)).sort((a, b) => a - b).slice(0, 3), foeUnits: G.units.filter(u => u.team === 2).map(u => Math.round(u.y)).sort((a, b) => b - a).slice(0, 3),
    moving: G.units.filter(u => u.state === 'move').length, voices: G.voices.length };
})));
console.log('after 6s  Alice:', JSON.stringify(check[0]));
console.log('after 6s  Bob:  ', JSON.stringify(check[1]));
// Bob: market trade + policy, verify server applied them
const bob = await B.evaluate(async () => { const m0 = G.E[1].money, g0 = G.E[1].res.guns; G.qty = 50; G.tab = 'market'; G.selDirty = true; renderPanel();
  document.querySelector('#panel [data-act="mbuy"][data-r="guns"]').click(); doCmd('pol', { k: 'tax', v: 2 });
  await new Promise(r => setTimeout(r, 2500)); return { gunsBefore: Math.round(g0), gunsAfter: Math.round(G.E[1].res.guns), moneyDrop: Math.round(m0 - G.E[1].money), tax: G.E[1].pol.tax }; });
console.log('Bob market:', JSON.stringify(bob));
await A.evaluate(() => { CAM.z = CAM.minZ * 1.15; CAM.x = G.W * CELL / 2; CAM.y = G.H * CELL / 2; });
await B.evaluate(() => { const c = G.units.filter(u => u.team === 2)[0]; if (c) { CAM.x = c.x; CAM.y = c.y; CAM.z = 1.4; } });
await A.waitForTimeout(500); await A.screenshot({ path: OUT + 'online-alice.png' }); await B.screenshot({ path: OUT + 'online-bob.png' });
// reconnect: Bob drops and comes back
await B.evaluate(() => MP.ws.close()); await B.waitForTimeout(4000);
const rec = await B.evaluate(() => ({ state: MP.state, connected: !!(MP.ws && MP.ws.readyState === 1), units: G.units.length }));
console.log('Bob after reconnect:', JSON.stringify(rec));
// Bob surrenders: both get the end screen
await B.evaluate(() => mpLeave()); await A.waitForTimeout(3000);
const end = await Promise.all([A, B].map(p => p.evaluate(() => ({ over: G.over, title: document.querySelector('#endTitle').textContent, sub: document.querySelector('#endSub').textContent, shown: !document.querySelector('#endScr').classList.contains('hide') }))));
console.log('end Alice:', JSON.stringify(end[0])); console.log('end Bob:  ', JSON.stringify(end[1]));
await A.screenshot({ path: OUT + 'online-alice-end.png' });
console.log('browser errors:', errs.length ? errs : 'none'); console.log('server errors:', srvErr.trim() || 'none');
await b.close(); srv.kill();
