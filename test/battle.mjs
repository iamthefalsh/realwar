// Staged battle close-ups: squads, tanks, howitzers, AA, planes, projectiles, wrecks, city capture.
import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const OUT = new URL('./', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter', '--disable-crashpad', '--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(new URL('../index.html', import.meta.url).href); await p.waitForTimeout(500);
await p.evaluate(() => {
  toMenu(); $('#menu').classList.add('hide'); startGame({ size: 'medium', diff: 'normal', prep: '0' }); $('#toasts').style.display = 'none';
  for (const t of [1, 2]) G.ai[t] = Object.assign(aiState(t), { think: 1e9, strat: 1e9, plane: 1e9, econ: 1e9, dip: 1e9, wall: 1e9 });
  for (const u of G.units) u.dead = true; update(1 / 30);
  // open plain near the map centre
  const W = G.W, H = G.H; let best = null;
  for (let r = 0; r < 20 && !best; r++) for (let y = (H / 2 | 0) - r; y <= (H / 2 | 0) + r && !best; y++) for (let x = (W / 2 | 0) - r; x <= (W / 2 | 0) + r; x++) {
    let ok = true; for (let dy = -4; dy <= 4 && ok; dy++) for (let dx = -7; dx <= 7; dx++) { const t = G.terr[(y + dy) * W + x + dx]; if (t === WATER || t === MOUNT) { ok = false; break; } } if (ok) { best = [x, y]; break; } }
  const cx = (best[0] + .5) * CELL, cy = (best[1] + .5) * CELL; window.BC = [cx, cy];
  const mk = (t, team, dx, dy) => { const u = spawnUnit(t, team, cx + dx, cy + dy); u.ang = u.tAng = team === 1 ? 0 : Math.PI; return u; };
  for (let i = 0; i < 4; i++) { mk('inf', 1, -60, -36 + i * 24); mk('inf', 2, 60, -36 + i * 24); }
  mk('tank', 1, -84, -12); mk('tank', 1, -84, 18); mk('tank', 2, 84, -12); mk('tank', 2, 84, 18);
  mk('art', 1, -125, 0); mk('art', 2, 125, 0); mk('aa', 1, -110, 40); mk('aa', 2, 110, -40);
  const f = mk('ftr', 1, -40, -70); f.order = { x: cx + 60, y: cy }; const bm = mk('bmb', 2, 140, 60); bm.order = { x: cx - 70, y: cy };
  for (const u of G.units) if (!UT[u.type].air) setMove(u, cx + (u.team === 1 ? 20 : -20), u.y, true);
  CAM.x = cx; CAM.y = cy; CAM.z = 2.6; G.peace = false;
});
for (const [sec, name] of [[2.2, 'b1-engage'], [2.5, 'b2-firefight'], [5, 'b3-aftermath']]) {
  await p.evaluate(s => { for (let i = 0; i < s * 30; i++) update(1 / 30); CAM.x = BC[0]; CAM.y = BC[1]; }, sec);
  await p.waitForTimeout(80); await p.screenshot({ path: OUT + name + '.png' });
}
const r = await p.evaluate(() => ({ alive: [G.units.filter(u => u.team === 1).length, G.units.filter(u => u.team === 2).length], wrecks: G.wrecks.length, proj: G.proj.length }));
console.log(JSON.stringify(r));
// city capture
const cap = await p.evaluate(() => {
  const c = G.cities.find(c => c.owner === 0); for (const u of G.units) u.dead = true; update(1 / 30);
  for (let i = 0; i < 3; i++) spawnUnit('inf', 1, c.x + rnd(-12, 12), c.y + rnd(-12, 12));
  const log = []; for (let i = 0; i < 30 * 30 && c.owner !== 1; i++) { update(1 / 30); if (i % 60 === 0) log.push((c.cp * 100 | 0) + '%'); }
  CAM.x = c.x; CAM.y = c.y; CAM.z = 1.4; return { city: c.name, owner: c.owner, progress: log.join(' '), provinceCells: G.provCells[c.id].filter(i => G.own[i] === 1).length };
});
console.log('capture', JSON.stringify(cap));
await p.waitForTimeout(100); await p.screenshot({ path: OUT + 'b4-captured.png' });
console.log('errors', errs.slice(0, 5)); await b.close();
