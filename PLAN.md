# DOTFRONT v3: plan

Built from `src/` modules. `build.sh` joins them into `index.html` (one file).

## 1. Fair enemy that plays like a person
Causes of the old advantage, and the fixes:
- The enemy got an economy multiplier (×1.25 on Hard). **Removed.** Both sides run the exact same economy rules.
- The enemy saw your whole army. **Fixed:** it only knows what its units have spotted, kept as a fading memory.
- It reacted instantly and issued unlimited orders. **Fixed:** it has an action budget (Easy 0.35, Normal 0.6, Hard 1 action/s), a reaction delay before it notices threats, and sometimes makes a poor choice.
- Unlimited houses. **Fixed:** max homes per city for both sides (capital 10, other cities 5).
- Terrain wasn't mirrored. **Fixed:** the whole map is point-symmetric (terrain, cities, deposits, passes).

## 2. City-by-city conquest
- The map is split into **provinces**, one per city (terrain-weighted regions). Whoever owns the city owns the province.
- To capture a city, keep ground troops in it with no defenders. A progress ring fills, and the capital is fortified so it takes longer. When enemies and defenders are both present, the city is contested.
- When a city falls, its province, buildings and walls change hands. Smooth front lines are drawn between nations, with faint province borders.

## 3. Realistic units and combat
- Rifle squads of up to 5 soldiers, with men lost as the squad takes damage. Tanks with tracks and a rotating turret. Towed howitzers with crews. AA trucks. Propeller fighters and four-engine bombers with shadows.
- Real projectiles: rifle tracers, tank shells with muzzle flash and recoil, howitzer arcs, AA streams and flak, wing guns, falling bombs.
- Burning wrecks, fallen soldiers, tank track marks, planes spiralling down, and screen shake on big blasts.
