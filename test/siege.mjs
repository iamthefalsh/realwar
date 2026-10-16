import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter','--disable-crashpad','--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(new URL('../index.html', import.meta.url).href);
const r = await p.evaluate(() => {
  toMenu(); $('#menu').classList.add('hide'); $('#ui').style.display=''; newGame({ size: 'medium', diff: 'normal', prep: '0' }); renderResBar(); renderTabs();
  const E = G.E[1], cap = capitalOf(1), foe = capitalOf(2); E.money += 5000; for (const r of RES) E.res[r] += 500;
  for (const u of G.units) if (u.team === 1) u.dead = true; // empty capital: only the wall defends it
  G.place = { type: 'wall', n: 0 }; let n = 0;
  for (let a = 0; a < Math.PI * 2; a += .05) { const x = Math.round(cap.cx + Math.cos(a) * 6), y = Math.round(cap.cy + Math.sin(a) * 6); if (!placeOne('wall', y * G.W + x)) n++; }
  G.place = null; for (let i = 0; i < 300; i++) { G.wallHp.forEach((v, i) => { if (G.wall[i]) G.wallHp[i] = BT.wall.hp; }); }
  G.ai[2] = { think: 1e9, strat: 1e9, plane: 1e9, econ: 1e9, dip: 1e9, wall: 1e9 };
  const base = Math.atan2(foe.cy - cap.cy, foe.cx - cap.cx), ex = cap.x + Math.cos(base) * CELL * 11, ey = cap.y + Math.sin(base) * CELL * 11;
  const us = []; for (let i = 0; i < 6; i++) { const u = spawnUnit(i % 3 ? 'inf' : 'tank', 2, ex + rnd(-15, 15), ey + rnd(-15, 15)); us.push(u); }
  for (let i = 0; i < 10; i++) update(1 / 30);
  for (const u of us) setMove(u, cap.x, cap.y, true);
  const log = []; const wc = () => G.wall.reduce((s, v) => s + (v === 1), 0); const w0 = wc();
  let firstBreach = null;
  for (let i = 0; i < 30 * 60; i++) { update(1 / 30); if (firstBreach == null && wc() < w0) firstBreach = (G.time | 0) + 's';
    if (i % 300 === 0) log.push(`${(i / 30) | 0}s walls ${wc()} attacking ${us.filter(u => u.wallT >= 0).length} inside ${us.filter(u => !u.dead && Math.hypot(u.x - cap.x, u.y - cap.y) < CELL * 5).length} owner ${cap.owner}`); if (G.over) break; }
  CAM.x = cap.x; CAM.y = cap.y; CAM.z = 1.5; fitBounds(); uiTick();
  return { ringCells: n, firstBreach, over: G.over, result: G.result, log };
});
console.log(JSON.stringify(r, null, 1)); await p.waitForTimeout(300); await p.screenshot({ path: new URL('./v4-breach.png', import.meta.url).pathname });
console.log('errors', errs.slice(0, 5)); await b.close();
