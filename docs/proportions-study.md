# How big is a world: proportions study

Status: the recommendation is implemented in the game on 27 September 2026, with
the Sun at ×1.6 and trees at their base density. This page keeps the proposal:
*Today* in the study is the game before the change. [What the game now
does](#what-the-game-now-does) lists the implementation. Open
`/proportions-study.html` on the Vite server. The study controls do not change the
game or saved game data.

From far away, the Moon looks like one more planet. This study finds why, and
it finds sizes and distances that fix it. Six sliders change the sizes and the
distances. Twelve targets show what works, and a search finds the smallest change
from today that meets every target.

## What to review

- **Sliders** change six numbers: planet size, spacing between worlds, the Moon
  orbit (in Earth radii), the Moon size (as a part of Earth), the flight speed in
  open space, and the Sun size.
- **Start from** sets three presets: *Today*, *Planets ×1.25* (the
  recommendation) and *Wide sky* (a large change that fails on purpose).
- **Find the smallest change for this planet size** keeps the planet size and
  the Sun size, and searches the other four numbers.
- **View** shows the result from far away beyond Earth, the whole system, Earth
  and the Moon, and Earth's ground.
- **Targets** gives a pass or a fail for each of the twelve targets.
- **Earth's neighbourhood** draws Earth, the Moon's orbit and the nearest other
  world to scale, today and for the setting.
- **Save study** exports the setting, the numbers, the targets and the code
  changes as JSON.

The preview uses the game data: the planet rows of `data` in `src/worlds.ts`,
Ceres and Vesta (`src/belt.ts`), the Moon orbit and its tilt (`src/moon.ts`),
the star sky and the game light in open space. Earth and the Moon keep their
terrain heights in metres, as in the game. The other worlds are plain spheres.

## Definitions

- **Size** multiplies the radius of every world except the Sun, and the height of
  its air and clouds.
- **Spacing** multiplies every distance from the Sun: the orbits, the asteroid
  belt, Ceres, Vesta and Blossom Haven's start.
- **Pairing** is the Moon's orbit radius divided by the distance from Earth to
  the nearest other world. A small pairing reads as a pair.
- **Trip time** is a guided flight in a straight line with the speed rules of
  `stepFlight()`: from 7 m above one world to 12 m above the other.

## Finding 1: the Moon's orbit is half the gap to Mercury

The planets turn together, so their gaps never change. Mercury is always the
nearest world to Earth, 1,948 m away. The Moon's orbit is 1,100 m: 56% of that
gap. For the real Moon the value is about 1%. When the Moon is more than half
way to the next world, the eye does not see a pair.

## Finding 2: larger planets alone do not help

The Moon is set in Earth units: its orbit in Earth radii and its radius as a part
of Earth. Thus when planets grow, the Moon's orbit grows too, and the pairing gets
worse: at 1.4 times the size it is 79%. Only a larger spacing makes the pairing
smaller. At 2.5 times the spacing, today's Moon has a pairing of 23%.

## Finding 3: a close Moon looks large

A Moon close to Earth is large in the sky. Its width from the ground depends only
on its orbit in Earth radii and its size as a part of Earth:

| Moon orbit | Moon of real size (0.273) | Moon of 0.225 |
| --- | --- | --- |
| 3 Earth radii | 15.7° | 12.9° |
| 3.5 Earth radii | 12.5° | 10.3° |
| 5 Earth radii (today) | 7.8° | 6.4° |

The real Moon is 0.5° wide. Closer than 3.5 Earth radii, the Moon must be smaller
than its real size to stay under 14°.

## Finding 4: planet size has a ceiling of about 1.4

Terrain heights, trees and animals do not grow with the planet:

- Earth has 3,400 trees and 28 animals at every size. At 1.5 times the size, the
  density is 44% of today. Today's density at 1.5 needs 7,650 trees.
- Hills are in metres, so a larger world looks smoother: at 1.25 times the size
  the relief is 80% of today, compared with the radius.
- A flight once around Earth near the ground takes 129 s today, 160 s at 1.25
  and 192 s at 1.5.

The search finds a set that meets every target for sizes up to 1.4. It finds no
set from 1.5.

## Finding 5: more space needs more speed

A trip gets longer with the spacing, but less than the gap grows, because the
climb out of the air and the landing do not change. At 2.5 times the spacing, a
trip from Earth to Mars takes 56.9 s at today's speed. With 2.25 times the speed
in open space (968 m/s) it takes 33.7 s, as today.

## Finding 6: the camera and the Sun set limits

- The game camera draws to 80,000 m. Today the system is 27.8 km wide. With a
  10% margin, the spacing can be at most 2.5 times today.
- The Sun keeps its size when the spacing grows, so it looks smaller from Earth:
  22.5° today, 8.6° at 2.5 times the spacing. The Moon of the recommendation is
  then larger than the Sun in the sky (12.5°), and each solar eclipse is total.
  The Sun slider can keep the Sun large: at ×1.6 it is 13.8° wide.
- The Moon at 3.5 Earth radii goes into Earth's shadow more often: 6 solar and
  8 lunar eclipses each game year, against 2 and 4 today. A steeper orbit tilt
  can bring this down. The tilt is not a slider in this study.

## Targets

The targets are design choices for a storybook game, not physics. Change them in
`TARGETS` in `src/proportions-study/model.ts`.

| Target | Goal | Today | Planets ×1.25 |
| --- | --- | --- | --- |
| The Moon reads as Earth's companion | Pairing at most 20% | 56% ✗ | 20% |
| The Moon stays close to Earth | At most 4 Earth radii | 5.0 ✗ | 3.5 |
| The Moon is a clear disc from the ground | 4° to 14° | 7.8° | 12.5° |
| The Moon is smaller than every planet | At most 0.75 of Mercury | 0.63 | 0.63 |
| A trip to the Moon | 8 to 25 s | 19 s | 15.4 s |
| A trip from Earth to Mars | At most 35 s (today) | 33.6 s | 33.7 s |
| A trip from Earth to Neptune | At most 50 s (today) | 44.4 s | 46.5 s |
| Once around Earth near the ground | 90 to 200 s | 129 s | 160 s |
| Trees and animals stay close together | At least 50% of today | 100% | 64% |
| The asteroid belt has room | At least 100 m | 135 m | 641 m |
| The Moon has room | At least 300 m | 693 m | 3,713 m |
| The camera can draw the whole system | At most 72 km wide | 27.8 km | 68.7 km |

## The search

`ideal(size)` keeps the planet size and searches a grid: spacing 1 to 3, the Moon
orbit 2.5 to 4 Earth radii, the Moon size 0.2 to 0.273, and the speed 1 to 3. It
returns the set that meets every target with the smallest change from today.
Speed and a smaller Moon cost the most, because players feel them. A search takes
less than 0.1 s.

| Planet size | Spacing | Moon orbit | Moon size | Speed |
| --- | --- | --- | --- | --- |
| ×1 | ×2 | 3.5 R | 0.273 | ×1.75 |
| ×1.1 | ×2.25 | 3.5 R | 0.273 | ×2 |
| ×1.25 | ×2.5 | 3.5 R | 0.273 | ×2.25 |
| ×1.4 | ×2.5 | 3 R | 0.225 | ×2.25 |
| ×1.5 and more | none | | | |

## Recommendation

Use **planets ×1.25, spacing ×2.5, the Moon at 3.5 Earth radii with its real
size, and 2.25 times the flight speed in open space.**

- Earth has radius 275 m. The Moon has radius 75 m and orbits 963 m from Earth:
  closer than today, although Earth is larger.
- Mercury is 4,870 m from Earth, so the Moon's orbit is 20% of the gap. From far
  away the Moon stays beside Earth.
- Every trip is as short as today, or shorter.
- Consider the Sun at about ×1.6, so that it stays larger than the Moon in
  Earth's sky.

## Changes to make

The values are for the recommendation. The page shows them for every setting.

| File | Constant | Today | Recommendation |
| --- | --- | --- | --- |
| `src/worlds.ts` | `data`: each radius, atmosphere and cloud height | Earth 220, 78, 34 | ×1.25: Earth 275, 98, 43 |
| `src/worlds.ts` | `data`: each orbit | Earth 3,300 | ×2.5: Earth 8,250 |
| `src/worlds.ts` | `HOME_START_POSITION` | 10,000 · 1,200 · 9,000 | 25,000 · 3,000 · 22,500 |
| `src/worlds.ts` | Blossom Haven radius and air | 110 · 52 | 138 · 65 |
| `src/moon.ts` | `MOON.radius` · `MOON.orbit` | 60 · 1,100 | 75 · 963 |
| `src/belt.ts` | `BELT` inner · outer · halfHeight | 4,850 · 5,550 · 160 | 12,125 · 13,875 · 400 |
| `src/belt.ts` | `DWARF_WORLDS` radius | Ceres 26, Vesta 18 | Ceres 33, Vesta 23 |
| `src/relocation.ts` | `findHomePosition()` radius · height | 1,100–14,400 · ±1,600 | 2,750–36,000 · ±4,000 |
| `src/adventure.ts` | Solar map scale | 14,500 | 36,250 |
| `src/flight.ts` | Open-space speed | 430 m/s | 968 m/s |
| `src/main.ts` | Fog density in the air (`fogBase`) | 0.0018 | 0.0014, so the air looks the same |
| `src/worlds.ts` | Earth trees (optional) | 3,400 | 5,313 for today's density |

Other changes to check:

- Tests that use today's distances: `src/home-world.test.ts` (Blossom Haven more
  than 10,000 m from Earth), `src/relocation.test.ts`, `src/asteroid-belt.test.ts`,
  `src/moon.test.ts` and the study models that copy `data`.
- The asteroid belt dust spreads over a ring 2.5 times as large. Its glow gets
  fainter unless the dust count grows.
- The README gives today's sizes ("Earth is 440 game metres across", "Home starts
  about 11 km from Earth").
- Values that stay: the Sun's position, the carry shell of the Moon (85 m), the
  flight near zone, the relocation margin (250 m) and the travel ramp to 1,000 m
  altitude.

## Decisions to make

1. **The targets.** Is 20% the right pairing? Is 64% of today's tree density
   acceptable, or does Earth get more trees?
2. **The Sun.** Keep it at 600 m (8.6° from Earth), or grow it with the Moon.
3. **The speed.** Flight in open space at 968 m/s, with 2,226 m/s in a boost.
4. **Eclipses.** Accept 6 solar and 8 lunar eclipses each game year, or tilt the
   Moon's orbit more.

## Tests and checks

- `npm test` runs `src/proportions-study/model.test.ts`: today's values against the
  game, the pairing of today, the effect of size and spacing, the search at 1.25,
  1.4 and 1.5, the Moon's size in the sky, the trips, and the code table.
- With the Vite server on port 5174, run
  `node scripts/proportions-study-smoke.mjs "path/to/chrome.exe"`. It checks the
  presets and the sliders against the model, the search, the four views, the
  export, this document link, and 390 px and 320 px layouts. Screenshots go to
  `artifacts.local/proportions-study/`.

## What the game now does

The game uses planets ×1.25, spacing ×2.5, the Moon at 3.5 Earth radii with its real
size, flight in open space ×2.25, and the Sun at ×1.6.

| Area | Implementation |
| --- | --- |
| `src/proportions.ts` | `PROPORTIONS = { size: 1.25, spacing: 2.5, sun: 1.6, speed: 2.25 }`, and `LIFE_SCALE`, the area factor (1.5625) |
| `src/worlds.ts` | `data` stays in base units. `createWorlds()` multiplies radii, air and cloud heights by `size`, and orbits by `spacing`. `HOME_START_BASE` and `HOME_START_POSITION`. Blossom Haven and the Sun (960 m) scale. Earth trees: 5,313 |
| `src/candy.ts` | Candy trees, canes, stones and flowers × `LIFE_SCALE` on Blossom Haven |
| `src/belt.ts` | `BELT_BASE` and the game `BELT` (12,125 to 13,875 m, 400 m high). The belt functions take the belt and the size as arguments, with the game values by default |
| `src/moon.ts` | `MOON.radius` 75 m and `MOON.orbit` 962.5 m, from Earth's game radius |
| `src/flight.ts` | `SPACE_SPEED` = 968 m/s |
| `src/relocation.ts` | The candidate space and the least move distance × `spacing` |
| `src/adventure.ts` | The solar map reaches 36,250 m. The Moon's ring has a radius of at least 12 px, and the Moon sits on it |
| `src/main.ts` | The Sun glow (3,920) and the fog in the air (÷ 1.25) |

Three studies record the game in base units: the asteroid belt study, the Moon
study and this study. Their models pass `BELT_BASE` and `HOME_START_BASE`, and keep
their own copies of the Moon values.

Differences from the proposal:

- **The Sun** is at ×1.6: 13.8° wide from Earth, larger than the Moon (12.5°).
- **Candy scenery** on Blossom Haven also keeps its density, not only Earth's trees.
- **Clouds and animals** keep their counts, so they are 64% as dense as before.

Checks: `src/proportions.test.ts` (the game constants against the recommended set,
the tree density, Ceres and Vesta in the larger belt, relocation across the larger
system). `scripts/moon-smoke.mjs` and `scripts/asteroid-belt-smoke.mjs` fly in the
resized game.

## Sources

- The Moon's mean distance (60.3 Earth radii) and radius (0.273 of Earth): NASA
  Solar System Exploration, "Earth's Moon" (science.nasa.gov/moon).
- All game values come from the game code, as listed above.
