# RealWar (DOTFRONT)

A mobile-first real-time war and nation-building game in a single HTML file.

**Play:** open `index.html` in any browser. No install, no dependencies, works offline.

## What's in the game
- Real-time battles with rifle squads, tanks, howitzers, anti-air, fighters and bombers. Bullets, shells and bombs travel visibly, and destroyed units leave wrecks and craters.
- City-by-city conquest. Each city controls a province; take it by holding the city with no defenders left.
- Economy: food, wood, coal, iron, petrol, steel, guns and gold. You build farms, mines, oil wells, steel mills, arms factories, housing and walls.
- Citizens who work, pay taxes, become manpower, and react to war with happiness, protests, riots, refugees and voices.
- An internal market plus 6 neutral nations to trade with, hire from and sign treaties with.
- A fair AI: same economy, mirrored map, and a human-like action rate. Difficulty only changes how fast and well it thinks.

## Project layout
| Path | Purpose |
|---|---|
| `index.html` | The built game. This is the only file needed to play or host. |
| `src/` | Source modules, joined in order by `build.sh` |
| `build.sh` | Rebuilds `index.html` from `src/` |
| `test/` | Headless Playwright checks (simulations, UI flows, screenshots) |
| `PLAN.md` | Design notes |

Source modules: `head.html` (styles and markup), `data.js` (constants, icons, flags, portraits), `map.js` (map generation and pathfinding), `game.js` (units, combat, conquest), `econ.js` (economy, diplomacy, citizens), `ai.js`, `render.js`, `art.js` (unit art and effects), `ui.js`.

## Editing
Change files in `src/`, then run `./build.sh`. Never edit `index.html` by hand, because the next build overwrites it.

The tests need Node and Playwright with Chromium; the browser path is set at the top of each test file.
