// Close-up visual checks: placement overlay, walls, buildings, deposits, civilians, a battle at a wall.
import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const OUT = new URL('./', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter', '--disable-crashpad', '--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(new URL('../index.html', import.meta.url).href);
await p.tap('#bStart'); await p.waitForTimeout(500);
await p.evaluate(() => {
  const E = G.E[1], cap = capitalOf(1); E.money += 5000; for (const r of RES) E.res[r] += 500;
  for (const t of ['house', 'house', 'farm', 'lumber', 'coal', 'iron', 'steel', 'arms']) { const ci = findBuildSpot(1, t); if (ci >= 0) { pay(E, BT[t].cost); addBld(t, 1, ci, false); } }
  for (let i = 0; i < 30 * 12; i++) update(1 / 30);
  // wall arc on the side facing the enemy
  const foe = capitalOf(2), base = Math.atan2(foe.cy - cap.cy, foe.cx - cap.cx);
  G.place = { type: 'wall', n: 0 };
  for (let a = -1.1; a <= 1.1; a += .1) { const x = Math.round(cap.cx + Math.cos(base + a) * 6), y = Math.round(cap.cy + Math.sin(base + a) * 6); placeOne('wall', y * G.W + x); }
  for (let i = 0; i < 30 * 3; i++) update(1 / 30);
  G.place = null; startPlace('farm');
  CAM.x = cap.x + Math.cos(base) * 40; CAM.y = cap.y + Math.sin(base) * 40; CAM.z = 2.2; $('#toasts').innerHTML = '';
});
await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'v1-placement.png' });
await p.evaluate(() => { endPlace(); G.tab = null; G.selDirty = true; $('#toasts').innerHTML = ''; });
await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'v2-base.png' });
// war at the wall: spawn enemies outside the wall heading for the capital
const res = await p.evaluate(() => {
  declareWar(); const cap = capitalOf(1), foe = capitalOf(2), base = Math.atan2(foe.cy - cap.cy, foe.cx - cap.cx);
  const ex = cap.x + Math.cos(base) * CELL * 10, ey = cap.y + Math.sin(base) * CELL * 10;
  for (let i = 0; i < 8; i++) { const u = spawnUnit(i % 3 ? 'inf' : 'tank', 2, ex + rnd(-20, 20), ey + rnd(-20, 20)); setMove(u, cap.x, cap.y, true); }
  const w0 = G.wall.reduce((s, v) => s + (v === 1), 0);
  for (let i = 0; i < 30 * 14; i++) update(1 / 30);
  CAM.x = cap.x + Math.cos(base) * 70; CAM.y = cap.y + Math.sin(base) * 70; CAM.z = 1.9; $('#toasts').innerHTML = '';
  const inside = G.units.filter(u => u.team === 2 && Math.hypot(u.x - cap.x, u.y - cap.y) < CELL * 5).length;
  return { wallsBefore: w0, wallsAfter: G.wall.reduce((s, v) => s + (v === 1), 0), enemiesInsideWall: inside, breaching: G.units.filter(u => u.team === 2 && u.wallT >= 0).length };
});
console.log('Wall siege:', JSON.stringify(res));
await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'v3-siege.png' });
console.log('errors', errs.slice(0, 5)); await b.close();
