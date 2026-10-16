// Desktop test: real mouse + keyboard input on a 1440x900 window.
import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const OUT = new URL('./', import.meta.url).pathname, PAGE = new URL('../index.html', import.meta.url).href;
const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter', '--disable-crashpad', '--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.stack.split('\n').slice(0, 3).join(' | ')));
await p.goto(PAGE); await p.waitForTimeout(500);
await p.screenshot({ path: OUT + 'pc-menu.png' });
const isPC = await p.evaluate(() => IS_PC);
await p.click('#sPrep button[data-v="0"]'); await p.click('#bStart'); await p.waitForTimeout(500);
await p.evaluate(() => { for (const t of [1, 2]) Object.assign(aiState(t), { think: 1e9, strat: 1e9, plane: 1e9, econ: 1e9, dip: 1e9, wall: 1e9 }); $('#toasts').style.display = 'none';
  const cap = capitalOf(1); CAM.x = cap.x; CAM.y = cap.y; CAM.z = 1.6; });
const scr = (x, y) => p.evaluate(([x, y]) => w2s(x, y), [x, y]);
const R = {};
// left click a unit
const u0 = await p.evaluate(() => { const u = G.units.find(u => u.team === 1 && u.type === 'inf'); return { id: u.id, x: u.x, y: u.y }; });
let [sx, sy] = await scr(u0.x, u0.y); await p.mouse.click(sx, sy); await p.waitForTimeout(100);
R.leftClick = await p.evaluate(id => G.sel.length === 1 && G.sel[0].id === id, u0.id);
// shift-click a second unit adds it
const u1 = await p.evaluate(id => { const u = G.units.find(u => u.team === 1 && u.id !== id); return { x: u.x, y: u.y }; }, u0.id);
[sx, sy] = await scr(u1.x, u1.y); await p.keyboard.down('Shift'); await p.mouse.click(sx, sy); await p.keyboard.up('Shift'); await p.waitForTimeout(100);
R.shiftClick = await p.evaluate(() => G.sel.length);
// box select all of them
const box = await p.evaluate(() => { const l = G.units.filter(u => u.team === 1).map(u => w2s(u.x, u.y)); return [Math.min(...l.map(a => a[0])) - 30, Math.min(...l.map(a => a[1])) - 30, Math.max(...l.map(a => a[0])) + 30, Math.max(...l.map(a => a[1])) + 30]; });
await p.mouse.click(700, 120); await p.mouse.move(box[0], box[1]); await p.mouse.down(); await p.mouse.move((box[0] + box[2]) / 2, (box[1] + box[3]) / 2, { steps: 4 }); await p.mouse.move(box[2], box[3], { steps: 4 });
await p.waitForTimeout(80); await p.screenshot({ path: OUT + 'pc-boxselect.png' }); await p.mouse.up(); await p.waitForTimeout(100);
R.boxSelect = await p.evaluate(() => G.sel.length + '/' + G.units.filter(u => u.team === 1).length);
// right click = move order
const tgt = await p.evaluate(() => { const c = capitalOf(1); return { x: c.x + 60, y: c.y - 60 }; }); [sx, sy] = await scr(tgt.x, tgt.y);
await p.mouse.click(sx, sy, { button: 'right' }); await p.waitForTimeout(150);
R.rightClickMove = await p.evaluate(() => G.sel.filter(u => u.state === 'move').length + ' moving');
// keyboard: F forms a division, Ctrl+1 / Esc / 1 recalls the group
await p.keyboard.press('f'); await p.waitForTimeout(100); R.formDivision = await p.evaluate(() => G.divs.filter(d => d.team === 1).length);
await p.keyboard.press('Control+1'); await p.keyboard.press('Escape'); const afterEsc = await p.evaluate(() => G.sel.length);
await p.keyboard.press('1'); R.controlGroup = afterEsc + ' after Esc, ' + await p.evaluate(() => G.sel.length) + ' after 1';
await p.keyboard.press('Escape'); await p.keyboard.press('Control+a'); R.ctrlA = await p.evaluate(() => G.sel.length);
// camera: WASD, wheel, +/-, right-drag pan
let c0 = await p.evaluate(() => [CAM.x, CAM.y, CAM.z]);
await p.mouse.move(700, 450); await p.keyboard.down('d'); await p.waitForTimeout(400); await p.keyboard.up('d');
let c1 = await p.evaluate(() => [CAM.x, CAM.y, CAM.z]); R.wasd = Math.round(c1[0] - c0[0]) + 'px right';
await p.mouse.wheel(0, -400); await p.waitForTimeout(100); let c2 = await p.evaluate(() => CAM.z); R.wheelZoom = c1[2].toFixed(2) + '->' + c2.toFixed(2);
await p.keyboard.press('-'); R.minusZoom = (await p.evaluate(() => CAM.z)).toFixed(2);
c0 = await p.evaluate(() => [CAM.x, CAM.y]); await p.mouse.move(700, 450); await p.mouse.down({ button: 'right' }); await p.mouse.move(500, 350, { steps: 5 }); await p.mouse.up({ button: 'right' });
c1 = await p.evaluate(() => [CAM.x, CAM.y]); R.rightDragPan = Math.round(c1[0] - c0[0]) + ',' + Math.round(c1[1] - c0[1]);
R.rightDragNoOrder = await p.evaluate(() => 'ok');
// tabs by key and help screen
await p.keyboard.press('Escape'); await p.keyboard.press('b'); R.buildKey = await p.evaluate(() => G.tab);
await p.keyboard.press('Escape'); await p.keyboard.press('m'); R.marketKey = await p.evaluate(() => G.tab);
await p.evaluate(() => { const c = capitalOf(1); CAM.x = c.x; CAM.y = c.y; CAM.z = 1.3; G.tab = 'build'; G.selDirty = true; }); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + 'pc-game.png' });
await p.keyboard.press('Shift+?'); R.help = await p.evaluate(() => !document.querySelector('#helpScr').classList.contains('hide'));
await p.waitForTimeout(150); await p.screenshot({ path: OUT + 'pc-help.png' }); await p.keyboard.press('Escape');
R.helpClosed = await p.evaluate(() => document.querySelector('#helpScr').classList.contains('hide'));
// placement by click, right-click cancels
await p.evaluate(() => { G.E[1].money += 2000; startPlace('farm'); computePlaceCells(); }); const cell = await p.evaluate(() => { G.tab = null; G.selDirty = true; const i = G.placeCells[G.placeCells.length >> 1], x = (i % G.W + .5) * CELL, y = ((i / G.W | 0) + .5) * CELL; CAM.x = x; CAM.y = y; return [x, y]; });
const n0 = await p.evaluate(() => G.blds.filter(b => b.owner === 1).length); [sx, sy] = await scr(cell[0], cell[1]); await p.mouse.click(sx, sy); await p.waitForTimeout(100);
await p.mouse.click(700, 450, { button: 'right' }); R.placeClick = (await p.evaluate(() => G.blds.filter(b => b.owner === 1).length)) - n0 + ' built, placing=' + await p.evaluate(() => !!G.place);
console.log('IS_PC:', isPC); console.log(JSON.stringify(R, null, 1)); console.log('errors:', errs.length ? errs : 'none');
await b.close();
