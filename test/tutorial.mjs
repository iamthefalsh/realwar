// Plays through the training mission on a phone-sized screen, step by step, using real taps.
import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const OUT = new URL('./', import.meta.url).pathname, PAGE = new URL('../index.html', import.meta.url).href;
const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter', '--disable-crashpad', '--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
await p.goto(PAGE); await p.waitForTimeout(500);
await p.tap('#bTrain'); await p.waitForTimeout(600);
const step = () => p.evaluate(() => ({ i: G.tut.i, title: document.querySelector('#coach b') && document.querySelector('#coach b').textContent }));
const waitStep = async (i, ms = 8000) => { await p.waitForFunction(i => G.tut.i >= i || G.tut.done, i, { timeout: ms }); return step(); };
const tapWorld = (x, y) => p.evaluate(([x, y]) => { const [sx, sy] = w2s(x, y); onTap(sx, sy, false); }, [x, y]);
const log = [];
log.push(await step()); await p.screenshot({ path: OUT + 'tut-1.png' });
// 1: drag the map
await p.evaluate(() => { const cx = G.W * CELL / 2, cy = G.H * CELL / 2, d = Math.hypot(cx - CAM.x, cy - CAM.y) || 1; CAM.x += (cx - CAM.x) / d * 200; CAM.y += (cy - CAM.y) / d * 200; clampCam(); }); log.push(await waitStep(1));
// 2: tap a soldier
await p.evaluate(() => { const u = G.units.find(u => u.team === 1); const [sx, sy] = w2s(u.x, u.y); onTap(sx, sy, false); }); log.push(await waitStep(2));
await p.screenshot({ path: OUT + 'tut-3.png' });
// 3: send all troops to the marked city
await p.evaluate(() => { setSel(G.units.filter(u => u.team === 1)); const m = G.tut.mark; const [sx, sy] = w2s(m.x, m.y); onTap(sx, sy, false); }); log.push(await waitStep(3));
// 4: wait for the capture (sim runs at 3x)
await p.evaluate(() => { G.speed = 3; }); log.push(await waitStep(4, 90000)); await p.evaluate(() => { G.speed = 1; });
// 5: build a farm through the Build tab
await p.screenshot({ path: OUT + 'tut-5.png' });
await p.tap('.tab[data-tab="build"]'); await p.waitForTimeout(200); await p.tap('#panel .card[data-t="farm"]'); await p.waitForTimeout(200);
await p.evaluate(() => { computePlaceCells(); const i = G.placeCells[0]; const [sx, sy] = w2s((i % G.W + .5) * CELL, ((i / G.W | 0) + .5) * CELL); onTap(sx, sy, false); endPlace(); }); log.push(await waitStep(5));
// 6: iron mine on the marked deposit
await p.evaluate(() => { startPlace('iron'); computePlaceCells(); const i = G.placeCells[0]; const [sx, sy] = w2s((i % G.W + .5) * CELL, ((i / G.W | 0) + .5) * CELL); onTap(sx, sy, false); endPlace(); }); log.push(await waitStep(6));
// 7: recruit at the capital
await p.evaluate(() => { const c = capitalOf(1); CAM.x = c.x; CAM.y = c.y; clampCam(); const [sx, sy] = w2s(c.x, c.y); setSel([]); onTap(sx, sy, false); }); await p.waitForTimeout(250);
await p.tap('#panel .card[data-t="inf"]'); log.push(await waitStep(7));
// 8: form a division with ALL ARMY + Form Division
await p.tap('#divBar .chip[data-div="all"]'); await p.waitForTimeout(250); await p.tap('#panel [data-act="form"]'); log.push(await waitStep(8));
// 9: market trade
await p.tap('#panel [data-act="close"]').catch(() => {}); await p.tap('.tab[data-tab="market"]'); await p.waitForTimeout(250); await p.tap('#panel [data-act="msell"][data-r="food"]'); log.push(await waitStep(9));
// 10, 11: people and world tabs
await p.tap('.tab[data-tab="people"]'); log.push(await waitStep(10)); await p.tap('.tab[data-tab="world"]'); log.push(await waitStep(11));
await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'tut-war.png' });
const war = await p.evaluate(() => ({ peace: G.peace, aiCalm: G.tut.calm, target: G.tut.mark && G.tut.mark.name, targetOwner: G.tut.mark && G.tut.mark.owner }));
// 12: skip the final battle to reach the end card
await p.tap('#coach [data-tut="skip"]'); await p.waitForFunction(() => G.tut.done, null, { timeout: 5000 });
await p.waitForTimeout(200); await p.screenshot({ path: OUT + 'tut-done.png' });
const done = await p.evaluate(() => document.querySelector('#coach b').textContent);
console.log(log.map(s => `${s.i + 1}. ${s.title}`).join('\n')); console.log('war step:', JSON.stringify(war)); console.log('end card:', done);
console.log('errors:', errs.length ? errs : 'none'); await b.close();
