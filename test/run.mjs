// Headless test suite for DOTFRONT: runtime errors, simulations, UI flows, screenshots.
import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const OUT = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter', '--disable-crashpad', '--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.stack));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(new URL('../index.html', import.meta.url).href);
await page.waitForTimeout(1200);
await page.evaluate(() => { for (let i = 0; i < 30 * 40; i++) update(1 / 30); });
await page.screenshot({ path: OUT + '1-menu.png' });
const step = (s) => page.evaluate(s => { for (let i = 0; i < s * 30; i++) { update(1 / 30); if (G.over) break; } }, s);

// 1) AI vs AI with full economy
const sim = await page.evaluate(() => {
  const t0 = performance.now(); newGame({ size: 'medium', diff: 'normal', demo: true });
  let mx = 0; while (!G.over && G.time < 1500) { update(1 / 30); mx = Math.max(mx, G.units.length); }
  const b = {}; for (const x of G.blds) b[x.type] = (b[x.type] || 0) + 1;
  return { over: G.over, t: G.time | 0, ms: (performance.now() - t0) | 0, maxUnits: mx, blds: b, walls: G.wall.reduce((s, v) => s + (v ? 1 : 0), 0),
    pop: [G.E[1].pop | 0, G.E[2].pop | 0], hap: [G.E[1].hap | 0, G.E[2].hap | 0], treaties: G.countries.map(c => Object.keys(c.tr[1]).filter(k => c.tr[1][k]).length + '/' + Object.keys(c.tr[2]).filter(k => c.tr[2][k]).length).join(' ') };
});
console.log('AI-vs-AI:', JSON.stringify(sim));

// 2) Real game: 5-year prep, idle player
await page.evaluate(() => toMenu());
await page.tap('#bStart');
await page.waitForTimeout(600);
const prep = await page.evaluate(() => {
  const o = { peace: G.peace, peaceEnd: G.peaceEnd, nat: G.nat[1].full + ' vs ' + G.nat[2].full };
  const enemyStart = G.units.filter(u => u.team === 2).length;
  for (let i = 0; i < 30 * 150; i++) update(1 / 30);
  const E = G.E[2], P = G.E[1], b = {}; for (const x of G.blds) if (x.owner === 2) b[x.type] = (b[x.type] || 0) + 1;
  o.at150 = { combatFired: G.proj.length, enemyUnits: G.units.filter(u => u.team === 2).length, enemyBlds: b, enemyPop: E.pop | 0, enemyHap: E.hap | 0, enemyMoney: E.money | 0,
    enemyRes: Object.fromEntries(RES.map(r => [r, E.res[r] | 0])), playerPop: P.pop | 0, playerHap: P.hap | 0, playerMp: P.mp | 0, playerMoney: P.money | 0, playerFood: P.res.food | 0, voices: G.voices.length,
    enemyCellsInPlayerLand: 0, terr: G.terrPct.map(x => (x * 100).toFixed(0)) };
  return o;
});
console.log('Prep (idle 150s):', JSON.stringify(prep));
await page.evaluate(() => { CAM.z = CAM.minZ * 1.25; CAM.x = G.W * CELL / 2; CAM.y = G.H * CELL / 2; uiTick(); });
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + '2-prep-overview.png' });

// 3) Player actions: build, walls, market, world, treaty, hire, policies
const acts = await page.evaluate(() => {
  const o = {}, E = G.E[1], cap = capitalOf(1);
  E.money += 3000; for (const r of RES) E.res[r] += 300; E.res.gold += 60;
  // open build tab, start placement for farm, tap valid cell
  document.querySelector('.tab[data-tab="build"]').click(); renderPanel();
  o.buildCards = document.querySelectorAll('#panel .card').length;
  document.querySelector('#panel .card[data-t="farm"]').click(); renderPanel();
  computePlaceCells(); o.farmSpots = G.placeCells.length;
  const n0 = G.blds.filter(b => b.owner === 1).length;
  const ci = G.placeCells[0], [sx, sy] = w2s((ci % G.W + .5) * CELL, ((ci / G.W | 0) + .5) * CELL); onTap(sx, sy, false);
  o.farmPlaced = G.blds.filter(b => b.owner === 1).length - n0;
  // mine on deposit
  startPlace('iron'); computePlaceCells(); o.ironSpots = G.placeCells.length;
  if (G.placeCells.length) { const c2 = G.placeCells[0]; const r = placeOne('iron', c2); o.ironPlaced = r || 'ok'; }
  // walls: paint a line
  startPlace('wall'); computePlaceCells(); const w0 = G.wall.reduce((s, v) => s + (v === 1 ? 1 : 0), 0);
  const cx = cap.cx, cy = cap.cy; gest = { type: 'paint', lx: null, ly: null, err: '', ok: 0 };
  const a = w2s((cx - 4 + .5) * CELL, (cy - 5 + .5) * CELL), b = w2s((cx + 4 + .5) * CELL, (cy - 5 + .5) * CELL);
  paintTo(a[0], a[1]); paintTo(b[0], b[1]); finishPaint();
  o.wallsPainted = G.wall.reduce((s, v) => s + (v === 1 ? 1 : 0), 0) - w0; endPlace();
  // market
  const g0 = E.res.guns, m0 = E.money, p0 = mPrice(E, 'guns'); o.buyErr = mBuy(1, 'guns', 50) || 'ok'; o.gunsBought = E.res.guns - g0; o.spent = (m0 - E.money) | 0; o.priceUp = mPrice(E, 'guns') > p0;
  // world: open country, trade, gift, sign
  const c = G.countries[0]; o.country = c.full + ' (' + c.persona + ')';
  o.tradeErr = cTrade(1, c, c.exp[0], 50, true) || 'ok';
  const r0 = c.rel[1]; for (let i = 0; i < 6; i++) gift(1, c, 'gold'); o.relGain = (c.rel[1] - r0).toFixed(1);
  c.rel[1] = 80; o.sign = TKEYS.map(k => k + ':' + (sign(c, k, 1) || 'ok')).join(',');
  o.hire = hire(1, c, 500) || 'ok';
  // policies
  E.pol.tax = 2;
  return o;
});
console.log('Player actions:', JSON.stringify(acts));
await page.evaluate(() => { const cap = capitalOf(1); CAM.x = cap.x; CAM.y = cap.y - 30; CAM.z = 1.6; setSel([]); G.tab = 'build'; G.selDirty = true; });
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '3-build.png' });
await page.evaluate(() => { G.tab = 'market'; G.selDirty = true; });
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '4-market.png' });
await page.evaluate(() => { G.tab = 'world'; G.country = null; G.selDirty = true; });
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '5-world.png' });
await page.evaluate(() => { G.country = G.countries[0]; G.selDirty = true; });
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '6-country.png' });
await page.evaluate(() => { G.country = null; G.tab = 'people'; G.selDirty = true; for (let i = 0; i < 30 * 20; i++) update(1 / 30); });
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '7-people.png' });
await page.evaluate(() => { const p = document.querySelector('#panel'); p.scrollTop = 99999; });
await page.waitForTimeout(200);
await page.screenshot({ path: OUT + '8-people-voices.png' });
await page.evaluate(() => { G.tab = 'army'; G.selDirty = true; });
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + '9-army.png' });

// 4) War: run until peace ends, then fight a bit
const war = await page.evaluate(() => {
  G.tab = null; G.selDirty = true;
  while (G.peace) update(1 / 30);
  const o = { warAt: dateStr(G.time) };
  for (let i = 0; i < 30 * 90; i++) { update(1 / 30); if (G.over) break; }
  const E = G.E[1];
  o.after90 = { over: G.over, units: [G.units.filter(u => u.team === 1).length, G.units.filter(u => u.team === 2).length], terr: G.terrPct.map(x => (x * 100).toFixed(0)), hap: E.hap | 0, state: E.state,
    voices: G.voices.slice(0, 4).map(v => v.cat + ': ' + v.text), allyUnits: G.units.filter(u => u.ally != null).length, wallsLeft: G.wall.reduce((s, v) => s + (v ? 1 : 0), 0) };
  // fuel test: a tank far from supply
  const tk = G.units.find(u => u.team === 1 && u.type === 'tank');
  if (tk) { tk.fuel = 2; const f0 = tk.fuel; const ex = capitalOf(2); setMove(tk, ex.x, ex.y, true); for (let i = 0; i < 30 * 5; i++) update(1 / 30); o.tankFuel = f0 + '->' + tk.fuel.toFixed(1) + ' state ' + tk.state + (tk.rcWhy ? ' (' + tk.rcWhy + ')' : ''); }
  return o;
});
console.log('War:', JSON.stringify(war, null, 0));
await page.evaluate(() => { const c = G.units.filter(u => u.team === 1)[0] || capitalOf(1) || G.cities[0]; CAM.x = c.x; CAM.y = c.y; CAM.z = 1.3; uiTick(); });
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '10-war.png' });
// 5) end screen
await page.evaluate(() => { if (!G.over) gameOver('win', 'capital'); });
await page.waitForTimeout(1500);
await page.screenshot({ path: OUT + '11-end.png' });
console.log('Errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
