# Rocks between the worlds: asteroid belt study

Status: option C is implemented in the game on 26 September 2026. This page
keeps the original proposal. [What the game now does](#what-the-game-now-does)
lists the implementation. Open `/studies/asteroid-belt-study.html` on the Vite server.
The study controls do not change the game or saved game data.

On 27 September 2026 the game changed its proportions ([proportions
study](proportions-study.md)): worlds are 1.25 times as large and 2.5 times as far
apart. This study keeps the base units of the time of the proposal. Its model passes
the base values (`BELT_BASE`, `HOME_START_BASE`) to the shared code.

The game has no asteroid belt. The space between Mars and Jupiter is empty.
This study gives three options to add the belt, with a live 3D preview of each
option, the cost of each option, and the changes that every option needs.

## What to review

- **Compare options** switches between A, B and C in the same 3D scene.
- **View** shows the belt from four places: the whole system, just past Mars,
  inside the belt behind the fairy, and at Ceres (option C only).
- **The fairy in the belt** flies the fairy through the belt at the game speed
  in open space (430 m/s), with boost, or holds her still.
- **Device** shows the phone budget: half of the dust and half of the rocks.
- **Safe zones and Kirkwood gaps** shows the space that Mars, Jupiter and a
  relocated Blossom Haven need, and the four gaps.
- **Cost in the game** gives the budget of the selected option. The last row
  measures the draw calls of the whole preview scene.
- **Save study** exports the settings, the budgets, the clearances and the
  recommendation as JSON.

The preview uses the game data: the same planet sizes and orbits, the same
light in open space, the same star sky (`createStarSky()`), and the same fairy
(`createFairyRig()`). Planets are plain spheres without terrain or atmosphere.

## What the code does today

| Area | Current behavior | Consequence for a belt |
| --- | --- | --- |
| `src/worlds.ts`, `data` | Mars orbits at 4,500 m, Jupiter at 6,300 m | The gap has room for a belt |
| `src/orbits.ts`, `createPlanetaryOrbits()` | Every world finishes one orbit in `SOLAR_ORBIT_SECONDS` (one hour) | The system turns as one piece, so a belt that turns with it never moves into a planet |
| `src/relocation.ts`, `clearHomePosition()` | Checks planets, atmospheres and Saturn's rings | Blossom Haven can move into the belt |
| `src/flight.ts`, `nearestWorldAt()` | Only `World` objects change the flight mode | A belt that is not a `World` does not change flight |
| `src/flight.ts`, `stepFlight()` | Open-space speed 430 m/s, 989 m/s with Shift | The fairy crosses the belt in 1.6 s, or 0.7 s with boost |
| `src/sun-shading.ts`, `MAX_SUN_OCCLUDERS` | 12 occluders; the game uses 9 | Two new worlds fit |
| `docs/mobile-play.md` | Phones draw about half of the clouds, trees and candy | The belt must follow the same rule |

## Finding 1: the gap has room

The belt fills 4,850 m to 5,550 m from the Sun, and 160 m above and below the
middle plane. This maps the real belt, 2.1 to 3.3 AU, onto the game gap in a
straight line: `auToGame()` and `gameToAu()` in `src/asteroid-belt-study/model.ts`.

| Edge | Distance from the Sun | Free space to the belt |
| --- | --- | --- |
| Mars, its radius and its air | 4,687 m | 137 m, with the largest rock (26 m) |
| Belt, inner edge | 4,850 m | — |
| Belt, outer edge | 5,550 m | — |
| Jupiter, its radius and its air | 5,685 m | 109 m, with the largest rock |

A test in `model.test.ts` keeps both clearances above 100 m.

## Finding 2: the belt must turn with the planets

All worlds have the same orbital period. Thus the belt can be one group that
turns by the same angle as the planets. In `createPlanetaryOrbits().update()`,
set the rotation of the belt group:

```ts
belt.rotation.y = -time / SOLAR_ORBIT_SECONDS * TAU
```

The minus sign is necessary. `sync()` adds the angle in the x–z plane, and a
positive rotation about y subtracts it. The orbital speed button (1× to 64×)
then applies to the belt with no more code.

The fairy is not carried with the belt, because the belt is not a `World`.
At 1× the rocks move at about 9 m/s. At 64× they move at about 580 m/s, which
is faster than the fairy. The planets have the same behavior today.

## Finding 3: relocation can put Blossom Haven into the belt

`findHomePosition()` picks a radius from 1,100 m to 14,400 m and a height of
±1,600 m. `clearHomePosition()` does not know the belt. With the extent of
Blossom Haven (204 m: radius, air, carry margin and 30 m), 1.9% of the
candidates touch the belt. `relocationRisk()` measures this with 40,000 samples.

With one move each five minutes of active play, this is about one move in 53,
or about once in 4.4 hours of play. The planet then sits inside the rocks.

**Fix for every option:** add a belt test to `clearHomePosition()`. Use
`touchesBelt(position, extent + 250)`, with the same 250 m margin that the
function uses for planets. Add a test with a fixed seed, as for Saturn's rings.

## Finding 4: a whole ring cannot look full up close

The belt volume is about 7.3 billion cubic metres. Rocks spread over the whole
ring are far apart:

| Rocks in the whole ring | Mean spacing |
| --- | --- |
| 1,600 (phone) | 166 m |
| 3,200 (computer) | 132 m |
| 270,000 | 30 m |

A spacing of 30 m looks like a rock field behind the fairy. The whole ring
would need about 270,000 rocks for that. This is too many for a phone.

Option C solves this with a near field. It draws rocks only in a box of cells
around the camera, about 600 m wide. The same number of rocks then gives a
spacing of about 63 m on a computer and 80 m on a phone.

## Finding 5: the real belt is almost empty

NASA gives the mean distance between asteroids as about 1 million km.
A spacecraft crosses the belt without a near pass. Thus option A and option B
are closer to the real belt. Option C is a storybook belt near the fairy, and
the real picture from far away.

The real belt has four clear gaps, the Kirkwood gaps. Jupiter clears these
orbits because the orbital periods have simple ratios with the period of
Jupiter. The study draws the gaps in the dust, the glow and the near field.

| Gap | Real distance | Game distance |
| --- | --- | --- |
| 3:1 | 2.50 AU | 5,083 m |
| 5:2 | 2.82 AU | 5,270 m |
| 7:3 | 2.95 AU | 5,346 m |
| 2:1 | 3.27 AU | 5,533 m |

## The three options

All three options are scenery, not a `World`. Put the code in one new module,
`src/asteroid-belt.ts`, with `createAsteroidBelt(scene, mobile)`. Call it in
`src/main.ts` after `createWorlds()`. The study code in `src/asteroid-belt-study/`
is the starting point: `model.ts` has no Three.js code and has tests.

### A: Glitter ribbon

Dust and a faint glow. A picture of the belt, not a place.

- **Look from far away:** a grainy ring of light between Mars and Jupiter.
  The glow follows the real density, so zoom shows the Kirkwood gaps.
- **Look up close:** dust sparkles go past. There are no rocks.
- **Objects:** one `THREE.Points` with 12,000 points (6,000 on a phone), and
  one flat ring with a density texture. The glow fades near the camera,
  because inside the belt it looks like a grey floor.
- **Cost:** 2 draw calls, no triangles for rocks, about 281 KB of data, no
  work per frame.
- **Risk:** a child who flies into the belt finds nothing to see.

### B: Rock ring

Real rocks all around the Sun, placed once at the start, with less dust.

- **Look from far away:** grains of rock near Mars and near Jupiter. From the
  whole system, the ring is a fine grey line.
- **Look up close:** one rock about every 132 m. Most of the time no rock is
  near the fairy.
- **Objects:** 3,200 rocks (1,600 on a phone) in 4 `InstancedMesh` objects,
  one for each rock shape. Each shape is an icosahedron with 80 faces, pushed
  in and out by noise. Rock colours are grey, sand, metal and lilac.
- **Cost:** 5 draw calls, 256,000 triangles (128,000 on a phone), no work per
  frame. For scale: the Earth ground mesh alone has about 262,000 triangles.
- **Risk:** the fairy flies through rocks. The triangle count is the largest
  of the three options.

### C: Living belt

The far layer of A, rocks near the fairy, and two small worlds to visit.

- **Look from far away:** the same as A, with Ceres and Vesta.
- **Look up close:** one rock about every 63 m in a box around the fairy.
  The rocks turn slowly. They grow in at the edge of the box, so no rock
  appears in one frame.
- **Near field:** cells of 120 m, 5 × 3 × 5 cells around the camera. Each cell
  gets its rocks from a seed made from the cell position (`cellSeed()`), so a
  cell has the same rocks at each visit. The number of rocks follows the belt
  density, with the gaps. Rocks do not go into Ceres or Vesta. The list of rocks
  changes only when the camera enters a new cell. Rocks near the fairy or
  the camera shrink to nothing, so no rock goes through her.
- **Ceres and Vesta:** new `World` entries at their real distances (2.77 AU and
  2.36 AU). Radius 26 m and 18 m: larger than true scale, as for the planets.
  Ceres has the bright salt spots of Occator crater. Vesta has its large
  south-pole basin. No air, no clouds.
- **Cost:** 8 draw calls, up to 1,050 rocks (525 on a phone), about 109,000
  triangles, and up to 1,050 rock updates per frame.
- **Risk:** the most code. The rock updates cost CPU time each frame on a phone.

Changes for Ceres and Vesta as worlds:

| File | Change |
| --- | --- |
| `src/terrain.ts` | Add `'ceres' \| 'vesta'` to `PlanetKind`. The rocky branch of `createTerrain()` already works |
| `src/worlds.ts` | Add two rows to `data`, with atmosphere 0 and cloud height 0 |
| `src/main.ts` | Add both kinds to `axialSpinPeriods`. Add a text to the region label, for example "Dwarf planet · airless" |
| `src/adventure.css` | Optional: a picture style for the Worlds dialog. It grows from 10 to 12 pictures |
| `src/daylight.ts` | No change: the default sky profile is black space |
| `src/relocation.ts` | No change: `clearHomePosition()` checks every `World` |
| `src/orbits.ts` | No change: new worlds get an orbit path automatically |
| `src/sun-shading.ts` | No change: 11 of 12 occluders are then in use |

## Comparison

Values are for a computer. A phone draws half of the dust and rocks.

| Measure | A: Glitter ribbon | B: Rock ring | C: Living belt |
| --- | --- | --- | --- |
| Dust points | 12,000 | 6,000 | 12,000 |
| Rocks drawn at one time | 0 | 3,200 | up to 1,050 |
| Rock spacing near the fairy | no rocks | ≈ 132 m | ≈ 63 m |
| Draw calls | 2 | 5 | 8 |
| Triangles | 0 | 256,000 | 108,576 |
| Rock updates per frame | 0 | 0 | 1,050 |
| New places in Worlds | none | none | Ceres, Vesta |
| Work | small | small to medium | largest |

`budget()` in `model.ts` calculates these values. A test checks them, and the
browser check compares them with the objects in the preview.

## Recommendation

Build option C in three steps. Each step can ship alone.

1. **Fix relocation first.** Add the belt test to `clearHomePosition()`.
   Do this before any belt is visible.
2. **Ship A.** Its dust and glow are also the far layer of C. No work is lost.
3. **Add the near field.** This makes the belt a place to fly through.
4. **Add Ceres and Vesta.** This gives the belt a destination in Worlds.

Choose B when the belt must show rocks from far away and the code must stay
the simplest. B cannot become C without replacing its rock layer.

## Decisions to make

1. **Real or storybook belt.** A and B are closer to the real, almost empty
   belt. C is full only near the fairy.
2. **Collisions.** No option has collisions. The game has no damage and no
   failure. We recommend no collisions.
3. **Ceres and Vesta in Worlds.** They give a guided journey into the belt.
   Without them, the Worlds dialog has no way to go to the belt.
4. **Phone budget.** Measure the frame rate of step 3 on a real phone before
   step 4 ships. `scripts/mobile-play-smoke.mjs` uses desktop emulation only.

## Tests and checks

- `npm test` runs `src/asteroid-belt-study/model.test.ts`: clearances, the gaps
  in the samples, the relocation risk, the budgets, stable cells, and the
  dwarf worlds clear of the gaps and of the rocks.
- With the Vite server on port 5174, run
  `node scripts/asteroid-belt-study-smoke.mjs "path/to/chrome.exe"`. It checks
  each option in three views against the model counts, the Ceres view, the
  phone budget, the safe zones, the export, this document link, and 390 px and
  320 px layouts. Screenshots go to `artifacts.local/asteroid-belt-study/`.

## What the game now does

The game uses option C. All four steps of the recommendation shipped together.

| Area | Implementation |
| --- | --- |
| `src/belt.ts` | The shared belt data: edges, gaps, density, near-field cells, Ceres and Vesta. The study model imports it, so the study and the game use the same values |
| `src/asteroid-belt.ts` | `createAsteroidBelt(scene, mobile)`: dust, glow and the near field of rocks. `update()` turns the belt with `orbits.elapsed` |
| `src/relocation.ts` | `clearHomePosition()` rejects a position when `touchesBelt(position, extent + 250)` is true |
| `src/terrain.ts` | New kinds `'ceres'` and `'vesta'`. Ceres relief is 13% of the rocky relief; Vesta relief is 26%, with the south-pole basin |
| `src/worlds.ts` | Vesta and Ceres rows in `data`, after Mars. Small worlds use a 96 × 64 sphere. Occator spots on Ceres |
| `src/main.ts` | Spin periods (Ceres 180 s, Vesta 150 s), region labels, and the belt update after `updateEnvironment()` |
| `src/adventure.css` | Six Worlds pictures per row (twelve in all), and small pictures for the two dwarf worlds |

Differences from the proposal:

- The belt fades with the stars inside an atmosphere and in daylight. It uses
  the same visibility value as `stars.update()`.
- The rock fade uses the full size of each rock shape (up to about 1.7 times
  the rock size), not the plain size. A stretched rock thus cannot touch the
  fairy. A test checks each drawn rock against the fairy and the camera.
- Outside the air of a world, the flight panel says **Asteroid belt** when the
  fairy is in the belt, and **Open space** elsewhere.
- Rocks do not tumble when the system asks for reduced motion.

Checks: `src/asteroid-belt.test.ts` (the belt and the dwarf worlds turn together,
rocks stay away from the camera and the fairy, the phone budget, the dwarf
terrain) and `src/relocation.test.ts` (the belt test).
`scripts/asteroid-belt-smoke.mjs` flies the fairy through the belt to Ceres and
Vesta in the real game.

## Sources

- Belt edges, the Kirkwood gaps and the mean distance between asteroids: NASA
  Solar System Exploration, "Asteroids" (science.nasa.gov/solar-system/asteroids).
- Ceres, Vesta, the Occator bright spots and the Rheasilvia basin: NASA Dawn
  mission (science.nasa.gov/mission/dawn).
- Game sizes are stylized, as for the planets. The belt height (±160 m) is a
  game choice. The real belt is thicker, because many orbits are inclined.
