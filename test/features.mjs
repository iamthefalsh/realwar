// Headless checks of the builder economy, money buildings, missiles and nukes on the real server sim.
import { createSim } from '../server/src/sim.js';
const out = {};
// 1) AI vs AI: do both sides use builders, money buildings, silos and strikes over a long game?
{
  const S = createSim(); S.newGame({ size: 'medium', diff: 'normal', prep: 0, headless: true, vertical: true, demo: true }); const G = S.G;
  const seen = new Set(); let missiles = 0, nukes = 0; const snap = [];
  for (let i = 0; i < 20 * 1200 && !G.over; i++) {
    S.update(.05);
    for (const s of G.strikes) if (!seen.has(s.id)) { seen.add(s.id); s.kind === 'nuke' ? nukes++ : missiles++; }
    if (i % (20 * 150) === 0) {
      const m = t => { const b = {}; for (const x of G.blds) if (x.owner === t && ['goods', 'shop', 'bank', 'silo'].includes(x.type) && x.prog >= 1) b[x.type] = (b[x.type] || 0) + 1; return JSON.stringify(b); };
      snap.push(`${G.time | 0}s builders ${G.units.filter(u => u.team === 1 && u.type === 'eng').length}/${G.units.filter(u => u.team === 2 && u.type === 'eng').length} sites ${G.blds.filter(b => b.owner === 1 && b.prog < 1).length}/${G.blds.filter(b => b.owner === 2 && b.prog < 1).length} biz $${G.E[1].biz.toFixed(1)}/$${G.E[2].biz.toFixed(1)} money-blds ${m(1)} ${m(2)}`);
    }
  }
  out.aiGame = { end: `${G.over ? 'team ' + G.winner + ' won by ' + G.why : 'no winner'} at ${G.time | 0}s`, missiles, nukes, snapshots: snap };
}
// 2) Construction: a site needs builders; it stays unbuilt without them and completes with them.
{
  const S = createSim(); S.newGame({ size: 'medium', diff: 'normal', prep: 5, headless: true, vertical: true }); const G = S.G;
  const E = G.E[1]; E.money += 5000; for (const r in E.res) E.res[r] += 500;
  const cells = G.provCells[G.cities.find(c => c.type === 'capital' && c.owner === 1).id].filter(i => G.terr[i] === 0 && !G.bAt.has(i));
  const keepB = G.units.filter(u => u.team === 1 && u.type === 'eng'); for (const u of keepB) u.dead = true; S.update(.05);
  const err = S.runCmd(1, 'place', { type: 'goods', cells: [cells[40]] }); const site = G.blds.find(b => b.type === 'goods' && b.owner === 1);
  for (let i = 0; i < 20 * 30; i++) S.update(.05);
  const noBuilders = { err: err || 'ok', mat: site.mat, prog: site.prog };
  const cap = G.cities.find(c => c.type === 'capital' && c.owner === 1); S.runCmd(1, 'queue', { city: cap.id, type: 'eng' }); S.runCmd(1, 'queue', { city: cap.id, type: 'eng' });
  let t = 0; const trace = []; while (site.prog < 1 && t < 120) { S.update(.05); t += .05; if (Math.abs(t % 5) < .05) trace.push(`m${site.mat.toFixed(2)} p${site.prog.toFixed(2)}`); }
  const shopErr = S.runCmd(1, 'place', { type: 'shop', cells: [cells[60]] }); const bankErr = S.runCmd(1, 'place', { type: 'bank', cells: [cells[80]] });
  for (let i = 0; i < 20 * 90; i++) S.update(.05);
  out.construction = { noBuilders, builtAfterSeconds: t.toFixed(1), trace: trace.join(' '), shopErr: shopErr || 'ok', bankErr: bankErr || 'ok',
    shop: G.blds.find(b => b.type === 'shop').prog, bank: G.blds.find(b => b.type === 'bank').prog, businessIncome: G.E[1].biz.toFixed(2), goodsStock: G.E[1].res.goods | 0 };
}
// 3) Missiles and nukes
const ground = u => ['inf', 'tank', 'art'].includes(u.type);
{
  const S = createSim(); S.newGame({ size: 'medium', diff: 'normal', prep: 0, headless: true, vertical: true }); const G = S.G;
  const E = G.E[1]; E.money += 20000; for (const r in E.res) E.res[r] += 2000;
  const cap = G.cities.find(c => c.type === 'capital' && c.owner === 1), foe = G.cities.find(c => c.type === 'capital' && c.owner === 2);
  const cell = G.provCells[cap.id].filter(i => G.terr[i] === 0 && !G.bAt.has(i))[30];
  S.runCmd(1, 'place', { type: 'silo', cells: [cell] }); const silo = G.blds.find(b => b.type === 'silo');
  for (let i = 0; i < 20 * 120 && silo.prog < 1; i++) S.update(.05);
  const arm1 = S.runCmd(1, 'arm', { id: silo.id, k: 'missile' }), arm2 = S.runCmd(1, 'arm', { id: silo.id, k: 'nuke' });
  for (let i = 0; i < 20 * 80; i++) S.update(.05);
  const ready = { ...silo.ars };
  // missile at an enemy building
  const tgtB = G.blds.find(b => b.owner === 2 && b.type === 'farm'); const hp0 = tgtB.hp;
  const l1 = S.runCmd(1, 'launch', { k: 'missile', x: tgtB.x, y: tgtB.y });
  for (let i = 0; i < 20 * 12; i++) S.update(.05);
  const missile = { launch: l1 || 'ok', farmHp: `${hp0}->${G.blds.includes(tgtB) ? Math.round(tgtB.hp) : 'destroyed'}` };
  // nuke a city next to the enemy capital (not the capital itself)
  const city = G.cities.filter(c => c.owner !== 1 && c.type !== 'capital').sort((a, b) => Math.hypot(a.x - foe.x, a.y - foe.y) - Math.hypot(b.x - foe.x, b.y - foe.y))[0];
  for (const u of G.units.filter(u => u.team === 2 && ground(u)).slice(0, 6)) { u.x = city.x + (Math.random() - .5) * 60; u.y = city.y + (Math.random() - .5) * 60; }
  const pop0 = city.pop, rel0 = G.countries.map(c => Math.round(c.rel[1])), units0 = G.units.filter(u => Math.hypot(u.x - city.x, u.y - city.y) < 120).length;
  const l2 = S.runCmd(1, 'launch', { k: 'nuke', x: city.x, y: city.y });
  for (let i = 0; i < 20 * 25; i++) S.update(.05);
  out.strikes = { ready, armErr: [arm1 || 'ok', arm2 || 'ok'], missile, nuke: { launch: l2 || 'ok', city: city.name, pop: `${pop0 | 0}->${city.pop | 0}`,
    unitsNear: `${units0}->${G.units.filter(u => Math.hypot(u.x - city.x, u.y - city.y) < 120).length}`, fallout: G.fallout.length,
    relations: `${rel0.join(',')} -> ${G.countries.map(c => Math.round(c.rel[1])).join(',')}` },
    peacetime: (() => { const S2 = createSim(); S2.newGame({ size: 'small', prep: 5, headless: true, vertical: true }); return S2.runCmd(1, 'launch', { k: 'missile', x: 10, y: 10 }); })() };
}
console.log(JSON.stringify(out, null, 1));
