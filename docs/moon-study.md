# A moon for the fairy: Moon study

Status: option C is implemented in the game on 26 September 2026, with the three
proposed fixes. This page keeps the original proposal. [What the game now
does](#what-the-game-now-does) lists the implementation. Open `/studies/moon-study.html`
on the Vite server. The study controls do not change the game or saved game data.

On 27 September 2026 the game changed its proportions ([proportions
study](proportions-study.md)): worlds are 1.25 times as large and 2.5 times as far
apart. This study keeps the base units of the time of the proposal. The game Moon now has radius 75 m and
orbits 963 m (3.5 Earth radii) from Earth.

Before this study, the game was called *Fly me to the moon*, but it had no Moon. This study gives
three options to add a Moon that orbits Earth. It has a live 3D preview of each
option, the numbers of each option, and the changes that a Moon needs.

## What to review

- **Compare options** switches between A, B and C in the same 3D scene.
- **View** shows the Moon from four places: Earth and the Moon from space, a
  meadow on Earth, the Moon's surface behind the fairy (B and C only), and the
  current or next eclipse.
- **Time-lapse** plays one game year at 1×, 8× or 32×. The timeline marks each
  solar eclipse (gold ring) and each lunar eclipse (red dot).
- **Next full moon**, **Next solar eclipse** and **Next lunar eclipse** move the
  time to that event.
- **Orbit tilt** changes the tilt of the orbit. The eclipse count follows it.
- **Proposed fixes** turns on or off the three changes to the Moon's look: no
  fog, a dark night side, and moonlight at night.
- **Relocation zones** shows where Blossom Haven cannot go today (pink) and the
  space that the Moon's path needs (gold).
- **Save study** exports the settings, the numbers of each option, the eclipse
  list and the recommendation as JSON.

The preview uses the game code where it can: the game lights and fog rules
(`updateEnvironment()`), the sky colours (`src/daylight.ts`), the star sky
(`createStarSky()`), the fairy (`createFairyRig()`), the Earth terrain
(`createTerrain('earth')`) and the planet shadow (`createSunShading()`). Thus an
eclipse in the preview looks as it would in the game. Differences from the game:
Earth has no clouds and no atmosphere shader, and the air seen from the ground is
a flat veil of 35% sky colour. In the preview the time-lapse speeds up the spin
too. In the game the orbital speed button speeds up only the orbits.

## What the code does today

| Area | Current behavior | Consequence for a Moon |
| --- | --- | --- |
| `src/orbits.ts`, `createPlanetaryOrbits()` | Each world except the Sun gets a circle around the Sun, with one period, `SOLAR_ORBIT_SECONDS` (3,600 s) | The Moon needs its own orbit around Earth. It must be skipped in this loop |
| `src/main.ts`, `axialSpinPeriods` | Each world turns about +Y at its own period. Earth: 240 s | A tidally locked Moon cannot use a fixed period |
| `src/main.ts`, `animate()` | Carries the fairy with the nearest world when she is at most `max(atmosphere, 6)` m above its ground | An airless Moon carries her only in the last 6 m |
| `src/relocation.ts`, `clearHomePosition()` | Checks each world at its current position | Only the Moon moves relative to the other worlds, so a clear place can be in its path later |
| `src/sun-shading.ts`, `MAX_SUN_OCCLUDERS` | 12 slots; the game uses 11 | The Moon takes the last slot |
| `src/main.ts`, `updateEnvironment()` | Fog of 0.0018 in clear air at the ground; the hemisphere light is 0.85 to 2.1 | Fog hides far objects from the ground; the hemisphere light brightens the dark side of each world |
| `src/main.ts`, line 226 | The lilac night fill "does not imply a moon" | The night fill can become moonlight |
| `src/adventure.ts`, solar map | Draws each orbit as a circle around the Sun, with the live distance | The Moon's circle would change size each frame |
| `src/terrain.ts`, `visitTransition()` | Arms a new visit above `max(70, 1.5 × atmosphere)`: 117 m for Earth | A trip to the Moon always gives a new Earth landscape on return |

## Finding 1: Earth has room

The Moon has radius 60 m: 0.273 of Earth's radius (220 m), as in the real Solar
System. The real distance, 60 Earth radii, is 13.3 km in the game. That is almost
the distance from the Sun to Neptune (13,600 m), so the Moon must be closer.
The planets turn together, so only the Moon moves near Earth. Mercury is the
nearest other world: 1,948 m from Earth's centre.

| Gap | B: 528 m | C: 1,100 m |
| --- | --- | --- |
| Moon to the top of Earth's air | 170 m | 742 m |
| Earth's flight near zone to the Moon's near zone | 42 m | 614 m |
| Moon to Mercury | 1,265 m | 693 m |
| Moon to Venus and its air | 2,183 m | 1,611 m |
| Moon to the Sun | 2,112 m | 1,540 m |

`clearances()` in `src/moon-study/model.ts` calculates these values. A test keeps
the near zones apart and the other gaps above 500 m.

## Finding 2: a month of five minutes

The game year is 3,600 s. A lunar month of 300 s gives 12 new moons in one game
year; the real year has 12.4. The Moon turns in the direction of Earth's spin.
This has three results:

- The Moon rises in the east, as the Sun does.
- A waxing Moon shows in the evening and a waning Moon in the morning, as in the
  real sky. A test checks that a first-quarter Moon is high at sunset.
- The sidereal month is 327.3 s (3,600 / 11 s). In the game the planets orbit in
  the direction opposite to the spin. Thus the sidereal month is longer than the
  synodic month, the reverse of the real Moon. After 3,600 s the Moon is back at
  its start, so the Moon wraps with `orbits.elapsed`.

The Moon keeps one face to Earth (tidal lock). Its local +X points to Earth and
its local +Y is the orbit normal. The dark maria are on the near side.

The Sun is near in the game (3,300 m). Thus a quarter Moon shows about two
thirds of its disc lit, not half. The preview and `moonPhase()` use the real
geometry.

At 1× a Moon day on Earth (from one moonrise to the next) is about 900 s, because
the Earth solar day is 225 s and the Moon moves 1/300 of a turn each second.

## Finding 3: Earth's shadow is wide

`sunShadow()` in `src/sun-shading.ts` treats the Sun as a point. Earth's shadow
thus has no tip: it gets wider behind Earth. It is about 510 m wide at the orbit
of B and 590 m at the orbit of C. Every orbit that fits is less than 5 Earth
radii from Earth. The real Moon is at 60. Thus the Moon passes through the
shadow much more often than the real Moon.

Eclipses in one game year of 12 lunar months:

| Orbit tilt | B: solar · lunar | C: solar · lunar |
| --- | --- | --- |
| 5.1° (the real tilt) | 12 · 12 | 12 · 12 |
| 20° | 12 · 12 | 6 · 8 |
| 28° | 12 · 12 | 2 · 4 |
| 35° | 6 · 12 | 2 · 4 |
| 45° | 6 · 8 | 2 · 4 |

At the real tilt, every full moon is dark and every new moon puts a shadow on
Earth. This happens every 2.5 minutes. With C at 28°, eclipses come in two
seasons each game year, as in the real sky. For B, every full moon is dark up
to a tilt of 35°.

An eclipse in the game changes only the direct sunlight. In a solar eclipse the
ground in the shadow gets darker, but the sky stays blue, because
`daylightAt()` uses only the Sun elevation. The shadow edge is sharp.

B has one more quality: from the ground below it, the Moon has the same size as
the Sun (22.5°). In a solar eclipse the Moon covers the Sun exactly, as in the
real sky. But the game fog hides the Sun disc from the ground (3,080 m away), so
players see this only from high in the air or from space.

## Finding 4: relocation can put Blossom Haven in the Moon's path

`findHomePosition()` picks a radius from 1,100 m to 14,400 m and a height of
±1,600 m. `clearHomePosition()` keeps Blossom Haven 752 m from Earth's centre.
This is Earth, its air, the extent of Blossom Haven (204 m) and the 250 m
margin. The Moon's path needs more:

| Option | Distance needed | Moves that go into the path | About once in |
| --- | --- | --- | --- |
| B | 1,042 m | 0.36% | 23 hours of play |
| C | 1,614 m | 1.85% | 4.5 hours of play |

`relocationRisk()` runs 40,000 candidates through `clearHomePosition()` as it was at
the time: the model keeps a copy in base units, without the Moon test.
The Moon can then go through Blossom Haven each month.

**Fix for every Moon world:** add `touchesMoonPath(position, extent + 250)` to
`clearHomePosition()`. It is a sphere around Earth with the radius of the orbit
and the Moon, so it covers each tilt. Add a test with a fixed seed, as for the
asteroid belt.

## Finding 5: the Moon can leave the fairy behind

Near a world, the fairy flies at 11 to 32 m/s. The Moon moves around Earth, and
the orbital speed button multiplies this speed:

| Option | 1× | 8× | 64× |
| --- | --- | --- | --- |
| B | 10 m/s | 81 m/s | 649 m/s |
| C | 21 m/s | 169 m/s | 1,352 m/s |

Today, the game carries the fairy with an airless world only in the last 6 m.
Above that, the Moon flies away from her, or into her. A hovering fairy does not
stop at the ground (`hoverFlight()` has no ground test), so the Moon can pass
over her.

**Fix:** carry the fairy with the Moon up to 85 m above its ground. This is the
height of the flight near zone in `turnFlight()`. The carry code in `animate()`
already keeps her position and her direction in the frame of the world.

At 64×, the Moon of C moves faster than a boost (989 m/s). A guided journey to the
Moon then can fail. Journeys read `destination.group.position` each frame, so
at 1× to 32× the fairy follows the Moon.

## Finding 6: fog and light hide the Moon from the ground

The game fog replaces part of the Moon's colour: 26% for B and 92% for C.
Thus C is almost invisible from the ground. **Fix:** set `fog: false` on the
Moon material. The air veil (the atmosphere shader) still tints it.

The hemisphere light lights all sides of each world. On the Moon, the lit side
gets only 3.2 times the light of the dark side in space, 3.8 times at night, and
2.1 times at noon. These are light values before tone mapping. The phases are weak. **Fix:** in the Moon material, scale
the indirect light by 0.12 (earthshine). The ratio is then 19. The preview uses
this shader change:

```ts
shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>',
  '#if defined( RE_IndirectDiffuse )\n\tirradiance *= earthshine;\n#endif\n#include <lights_fragment_end>')
```

`createSunShading().track()` keeps an existing `onBeforeCompile`, so both
changes apply.

**Optional:** the night fill becomes moonlight. It comes from the Moon's
direction and grows with the phase. It keeps 45% of today's strength on a
new-moon night, so nights stay gentle.

## Finding 7: small changes

- **Shadow slots.** The Moon is the 12th of 12 occluders. The next new world
  needs a larger `MAX_SUN_OCCLUDERS`.
- **Worlds.** The dialog grows from 12 to 13 pictures. The solar map must draw
  the Moon's path around Earth's marker, not around the Sun.
- **The same face.** Natural worlds regenerate on arrival. The Moon must keep
  one seed, as Blossom Haven does, or its near side changes.
- **The start.** The first flight starts in mid-morning. A last-quarter Moon
  (elongation 270°) is then high in the sky (test: more than 30°).
- **Mesh.** `buildGround()` uses a 96 × 64 sphere only below radius 60. The
  Moon has radius 60, so it would get 256 × 128 (65,024 triangles). Use
  128 × 96 (24,320 triangles).

## The three options

B and C are worlds. They need all the changes in the next section. A is scenery.

### A: Sky Moon

A Moon in Earth's sky with real phases. A picture, not a place.

- **From space:** nothing.
- **From the ground:** a Moon 11.9° wide that rises, sets and shows phases. It
  is drawn at 800 m with no fog, and it shows only inside Earth's air.
- **Cost:** 1 draw call, 3,968 triangles. No change to flight, relocation,
  shadows or Worlds.
- **Risk:** a child flies up to the Moon and never arrives.

### B: Close Moon

A large Moon at 528 m. From the ground it has the same size as the Sun.

- **From space:** a large grey companion beside Earth. Earth is 56° wide in the
  Moon's sky.
- **From the ground:** 22.5° wide. The fog hides 26% of it.
- **Trip:** 10.3 s from the meadow, 5.0 s with boost.
- **Risk:** every full moon is dark, at any tilt up to 35°. The near zones of
  Earth and the Moon are only 42 m apart.

### C: Journey Moon

A smaller Moon at 1,100 m, on an orbit tilted 28°.

- **From space:** a small grey world on a tilted path. Earth is 24° wide in the
  Moon's sky.
- **From the ground:** 7.8° wide, 15 times the real Moon. Invisible without the
  fog fix.
- **Trip:** 19.0 s from the meadow, 9.1 s with boost.
- **Eclipses:** 2 solar and 4 lunar in each game year, in two seasons.
- **Risk:** the largest relocation risk (1.85% of moves) and the fastest Moon.

## Comparison

| Measure | A: Sky Moon | B: Close Moon | C: Journey Moon |
| --- | --- | --- | --- |
| Orbit radius · tilt | 800 m · 5.1° | 528 m · 5.1° | 1,100 m · 28° |
| Moon size from the ground (Sun: 22.5°) | 11.9° | 22.5° | 7.8° |
| Game fog on the Moon today | off | 26% | 92% |
| Trip from the meadow · with boost | none | 10.3 s · 5.0 s | 19.0 s · 9.1 s |
| Moon speed at 1× · 64× | 15.4 · 983 m/s | 10.1 · 649 m/s | 21.1 · 1,352 m/s |
| Solar · lunar eclipses each game year | none | 12 · 12 | 2 · 4 |
| Relocation moves into the path | none | 0.36% | 1.85% |
| Sun occluder slots used | 11 of 12 | 12 of 12 | 12 of 12 |
| Worlds pictures | 12 | 13 | 13 |
| Moon triangles · draw calls | 3,968 · 1 | 24,320 · 1 | 24,320 · 1 |

`budget()` in `model.ts` calculates these values. The tests check them.

## Recommendation

Build C, the Journey Moon, in four steps. Do steps 1 and 2 before the Moon is
visible.

1. **Fix relocation.** Add `touchesMoonPath()` to `clearHomePosition()`.
2. **Add the Moon world.** Put it on its orbit in `createPlanetaryOrbits()`,
   with the tidal lock and the 85 m carry shell.
3. **Show it from the ground.** Set `fog: false` and add the earthshine change.
4. **Add it to Worlds.** Add the picture and the Moon's path on the solar map.

Optional after step 4: moonlight at night, and a darker sky in a solar eclipse.

Choose B when the Moon must be large in the sky and the trip must be short.
Then decide how to show a full moon: B goes dark at each full moon unless the
Moon takes no Earth shadow.

## Changes to make

| File | Change |
| --- | --- |
| `src/terrain.ts` | Add `'moon'` to `PlanetKind` and to the cratered kinds. Scale the relief by 0.3 |
| `src/worlds.ts` | Create the Moon after Earth, with one fixed seed, no air and no clouds. Colour the maria on the near side (local +X) and the rays of Tycho. Use `fog: false` and the earthshine change. Skip regeneration after the first visit |
| `src/orbits.ts` | Skip the Moon in the solar orbit list. In `update()`, after `sync()`, put the Moon on its orbit around Earth and set its tidal-lock rotation. Draw its path around Earth |
| `src/main.ts` | Leave the Moon out of the `axialSpinPeriods` loop. Carry the fairy up to 85 m above the Moon. Add a region label, for example "Airless · grey dust and dark seas". Start the Moon at elongation 270° |
| `src/relocation.ts` | Add `touchesMoonPath(position, extent + 250)` to `clearHomePosition()` |
| `src/adventure.ts` | Draw the Moon's path around Earth's marker on the solar map |
| `src/adventure.css` | Add a small grey `.planet-picture.moon` with dark spots |
| `src/sun-shading.ts` | No change: 12 of 12 slots are then in use |
| `src/daylight.ts` | No change: the default sky profile is black space |
| `src/flight.ts`, `src/journey.ts` | No change: both read the world position each frame |

The study model (`src/moon-study/model.ts`) has the orbit, the phase, the
eclipse test and the relocation test with no scene code. Move the shared parts
to a new `src/moon.ts`, as `src/belt.ts` did for the asteroid belt.

## Decisions to make

1. **Eclipses.** How often? The choices: C at 28° (in seasons), a real tilt with
   an eclipse at each new and full moon, or no eclipses (the Moon takes no
   shadow and casts no shadow).
2. **A new Earth after each trip.** A trip to the Moon arms a new Earth visit.
   Keep this, or keep Earth the same after a Moon trip.
3. **The orbital speed button.** At 64× the Moon of C turns once in 5.1 s and is
   faster than a boost. Keep the Moon on the same speed as the planets, or give
   it a lower limit.
4. **Size.** C is 15 times the real Moon in the sky and B is 43 times. Both are
   storybook sizes, as for the planets.

## Tests and checks

- `npm test` runs `src/moon-study/model.test.ts`: the 12 months and the wrap, the
  direction of the Moon in the sky, the sizes and the quarter phase, the gaps,
  the eclipse seasons, the relocation risk with a copy of `clearHomePosition()`,
  the carry speeds, and the budgets.
- With the Vite server on port 5174, run
  `node scripts/moon-study-smoke.mjs "path/to/chrome.exe"`. It checks each option
  in each view, the Moon's orbit radius in the preview, the fog and earthshine
  fixes, the eclipse jumps against the model, the export, this document link,
  and 390 px and 320 px layouts. Screenshots go to `artifacts.local/moon-study/`.

## What the game now does

The game uses option C, with no fog on the Moon, a dark night side and moonlight
at night. All four steps of the recommendation shipped together.

| Area | Implementation |
| --- | --- |
| `src/moon.ts` | The shared Moon data and code: size, orbit, tilt, start phase, `moonOffset()`, `tidalQuaternion()`, `touchesMoonPath()`, `moonlightAt()`, `earthshineAt()`, `createMoonMaterial()` and `moonGroundColor()`. The study model imports it, so the study and the game use the same orbit |
| `src/terrain.ts` | New kind `'moon'`: craters, 30% of the rocky relief, and low maria, most of them on the near side. `TerrainSample.mare` holds the maria amount |
| `src/worlds.ts` | The Moon world after Earth, with one fixed seed and no regeneration after its first visit. A 128 × 96 sphere (96 × 64 on a phone), the maria and the rays of Tycho, and the Moon material |
| `src/orbits.ts` | The Moon is not in the solar orbit list. `update()` puts it on its orbit around Earth and sets the tidal lock. Its path is drawn around Earth |
| `src/main.ts` | No axial spin for the Moon. The carry shell of 85 m. The region label "Airless · grey dust and dark seas". Moonlight on Earth at night. Earthshine by camera distance |
| `src/relocation.ts` | `clearHomePosition()` rejects a place when `touchesMoonPath(position, earth, extent + 250)` is true and the Moon exists |
| `src/adventure.ts`, `src/adventure.css` | The Moon's path is a small ring around Earth's marker on the solar map. A small grey Moon picture; Worlds has 13 pictures |

Differences from the proposal:

- **Earthshine changes with distance.** It is 0.12 when the camera is more than
  400 m from the Moon's ground, and 0.5 closer than 40 m. Thus the phases show
  from Earth, and the ground of the Moon's night side stays readable near the fairy.
- **Moonlight only on Earth.** On other worlds the night fill stays lilac and
  keeps its old direction. On Earth it turns toward the Moon and whiter as the
  Moon rises. Its strength is 45% of the old fill with no Moon, and 100% under a
  high full moon.
- **The decisions.** Eclipses come in two seasons (the 28° tilt). A trip to the
  Moon still gives a new Earth landscape on return. The Moon follows the orbital
  speed button.

Known limit: the fairy's sparkle trail stays where it was drawn. Near the Moon,
which carries the fairy at about 21 m/s, the trail makes a long line. The same
effect is shorter on Earth.

Checks: `src/moon.test.ts` (the orbit around Earth, the wrap, the tidal lock, the
tilt, the maria on the near side, the relocation test, the moonlight and the
earthshine). `scripts/moon-smoke.mjs` flies from the meadow to the Moon in the real
game and checks the carry of a hovering fairy at 8×.

## Sources

- Moon radius (0.273 of Earth), the mean distance (60.3 Earth radii), the
  synodic month (29.53 days), the sidereal month (27.32 days), the orbit tilt
  (5.1°), the tidal lock and the maria on the near side: NASA Solar System
  Exploration, "Earth's Moon" (science.nasa.gov/moon).
- Eclipse seasons and the conditions for solar and lunar eclipses: NASA Eclipse
  Web Site (eclipse.gsfc.nasa.gov).
- Game sizes and times are stylized, as for the planets.
