// Screenshots of the new visuals on a phone and a PC: base close-up, construction, world view, strikes, nuke, menu.
import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const OUT = new URL('./', import.meta.url).pathname, PAGE = new URL('../index.html', import.meta.url).href;
const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter', '--disable-crashpad', '--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const errs = [];
async function shots(name, vp) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: vp.width < 600, isMobile: vp.width < 600 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.stack.split('\n').slice(0, 3).join(' | ')));
  await p.goto(PAGE); await p.waitForTimeout(500); await p.evaluate(() => { for (let i = 0; i < 30 * 30; i++) update(1 / 30); }); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + `look-${name}-menu.png` });
  await p.evaluate(() => {
    startGame({ size: 'medium', diff: 'normal', prep: '5' }); $('#toasts').style.display = 'none';
    for (const t of [1, 2]) Object.assign(aiState(t), { think: 1e9, strat: 1e9, plane: 1e9, econ: 1e9, dip: 1e9, wall: 1e9, stk: 1e9 });
    const E = G.E[1]; E.money += 30000; for (const r of RES) E.res[r] += 3000;
    const cap = capitalOf(1);
    for (const t of ['house', 'house', 'coal', 'iron', 'oil', 'gold', 'steel', 'arms', 'goods', 'shop', 'bank', 'silo', 'lumber', 'farm']) { const ci = findBuildSpot(1, t); if (ci >= 0) runCmd(1, 'place', { type: t, cells: [ci] }); }
    for (const b of G.blds) if (b.owner === 1) { b.mat = 1; b.prog = 1; }
    for (const t of ['farm', 'goods']) { const ci = findBuildSpot(1, t); if (ci >= 0) runCmd(1, 'place', { type: t, cells: [ci] }); }
    for (let i = 0; i < 4; i++) spawnUnit('eng', 1, cap.x + rnd(-20, 20), cap.y + rnd(-20, 20));
    for (let i = 0; i < 30 * 14; i++) update(1 / 30);
    CAM.x = cap.x; CAM.y = cap.y; CAM.z = 2.4; clampCam(); G.tab = null; G.selDirty = true;
  });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + `look-${name}-base.png` });
  await p.evaluate(() => { const ci = findBuildSpot(1, 'bank'); runCmd(1, 'place', { type: 'bank', cells: [ci] }); const s = G.blds.find(b => b.owner === 1 && b.prog < 1);
    for (let i = 0; i < 30 * 6 && s.prog < .35; i++) update(1 / 30); CAM.x = s.x; CAM.y = s.y + 20; CAM.z = 3.6; clampCam(); G.selBld = s; G.selDirty = true; });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + `look-${name}-site.png` });
  await p.evaluate(() => { G.selBld = G.blds.find(b => b.type === 'silo'); G.selDirty = true; CAM.x = G.selBld.x; CAM.y = G.selBld.y + 60; });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + `look-${name}-silo.png` });
  await p.evaluate(() => { G.selBld = null; G.tab = 'build'; G.selDirty = true; const c = capitalOf(1); CAM.x = c.x; CAM.y = c.y; CAM.z = 1.6; clampCam(); });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + `look-${name}-build.png` });
  await p.evaluate(() => { G.tab = null; G.selDirty = true; CAM.z = CAM.minZ; CAM.x = G.W * CELL / 2; CAM.y = G.H * CELL / 2; clampCam(); });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + `look-${name}-world.png` });
  await p.evaluate(() => { const a = G.wanchors[0]; CAM.x = a.x; CAM.y = a.y + 120; CAM.z = 1.2; clampCam(); });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + `look-${name}-coast.png` });
  // strikes: missile in flight with targeting, then a nuke
  await p.evaluate(() => {
    declareWar(); const silo = G.blds.find(b => b.type === 'silo'); silo.ars.missile = 3; silo.ars.nuke = 1;
    const foe = capitalOf(2), tgt = G.cities.filter(c => c.owner !== 1 && c.type !== 'capital').sort((a, b) => Math.hypot(a.x - foe.x, a.y - foe.y) - Math.hypot(b.x - foe.x, b.y - foe.y))[0]; window.TGT = tgt;
    runCmd(1, 'launch', { k: 'missile', x: tgt.x + 30, y: tgt.y + 120 }); startAim('nuke'); aimAt(tgt.x, tgt.y);
    for (let i = 0; i < 30 * 2; i++) update(1 / 30); const s = G.strikes[0]; const [x, y] = strikePos(s, s.t); CAM.x = (x + tgt.x) / 2; CAM.y = (y + tgt.y) / 2; CAM.z = .9; clampCam();
  });
  await p.waitForTimeout(250); await p.screenshot({ path: OUT + `look-${name}-aim.png` });
  await p.evaluate(() => { runCmd(1, 'launch', { k: 'nuke', x: TGT.x, y: TGT.y }); endAim(); const s = G.strikes.find(s => s.kind === 'nuke'); for (let i = 0; i < 30 * 40 && G.strikes.includes(s); i++) update(1 / 30);
    for (let i = 0; i < 30 * 3.5; i++) update(1 / 30); CAM.x = TGT.x; CAM.y = TGT.y - 50; CAM.z = 1.1; clampCam(); });
  await p.waitForTimeout(1800); await p.screenshot({ path: OUT + `look-${name}-nuke.png` });
  await ctx.close();
}
await shots('phone', { width: 390, height: 844 });
await shots('pc', { width: 1440, height: 900 });
console.log('errors:', errs.length ? errs : 'none'); await b.close();
