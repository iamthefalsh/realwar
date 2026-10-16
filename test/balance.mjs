// Balance: AI-controlled "player" (team 1) vs enemy AI on each difficulty, full 5-year prep.
import { createRequire } from 'module';
const require = createRequire('/root/.nvm/versions/node/v22.23.3/lib/node_modules/@playwright/mcp/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium-1232/chrome-linux64/chrome', args: ['--disable-crash-reporter', '--disable-crashpad', '--no-zygote'], env: { ...process.env, HOME: '/tmp' } });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(new URL('../index.html', import.meta.url).href);
const runs = process.argv[2] ? +process.argv[2] : 2;
for (const diff of ['easy', 'normal', 'hard']) for (let k = 0; k < runs; k++) {
  const r = await p.evaluate(diff => {
    newGame({ size: 'medium', diff, prep: '5' }); const snap = [];
    while (!G.over && G.time < 1200) { update(1 / 30); aiTick(1, 1 / 30);
      if (Math.abs(G.time % 100) < 1 / 30) snap.push(`${G.time | 0}s u${G.units.filter(u => u.team === 1).length}/${G.units.filter(u => u.team === 2).length} t${(G.terrPct[1] * 100) | 0}/${(G.terrPct[2] * 100) | 0} pop${(G.E[1].pop / 1000) | 0}k/${(G.E[2].pop / 1000) | 0}k h${G.E[1].hap | 0}/${G.E[2].hap | 0} b${G.blds.filter(x => x.owner === 1).length}/${G.blds.filter(x => x.owner === 2).length}`); }
    const caps = G.cities.filter(c => c.type === 'capital').map(c => c.owner);
    return `${diff}: ${G.result||'timeout'} @${G.time | 0}s\n   ` + snap.join('\n   ');
  }, diff);
  console.log(r);
}
console.log('errors', errs.slice(0, 5));
await b.close();
