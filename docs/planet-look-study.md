# Worlds worth the trip: planet look study

Status: option B is implemented in the game on 27 September 2026, with every fix of option A
and the rounder rocky worlds. [What the game now does](#what-the-game-now-does) lists the
implementation. The rest of this page keeps the study. Open `/planet-look-study.html` on the
Vite server. The study controls do not change the game or saved game data. Earth, the Moon,
Ceres, Vesta and Blossom Haven keep their look.

The seven planets (Mercury, Venus, Mars, Jupiter, Saturn, Uranus and Neptune) look dull
and different from their pictures. This study finds six causes, and compares three options
to give each planet the colours and the features of its pictures.

The game changed its proportions during this study (`src/proportions.ts`, see
[the proportions study](proportions-study.md)): planet radii ×1.25 and distances ×2.5. The
study reads the live worlds, so the preview uses the new sizes. `inGame()` in the model
applies the same factors. Terrain heights stay in metres. The values below are for the new
proportions, unless a line says "before".

## What to review

| Control | What it does |
| --- | --- |
| **Planet** | Selects one of the seven planets. |
| **Compare options** | Switches between **Before**, **A — Retune**, **B — Storybook paint** (the game now) and **C — Photo maps**. |
| **View** | **Portrait**: the lit side from 3.3 radii, as in most pictures. **Approach**: 1.62 radii, near the terminator. **In flight**: the fairy in the air, with the game camera. |
| **Side by side with before** | Shows Before on the left and the selected option on the right, with one camera. |
| **Turn the planet** | Turns the planet at its game spin period. |
| **01 / The pictures** | The reference map of the planet, and colour strips: Before, option A and the 18 measured bands of the map. |
| **02 / Numbers** | Band contrast, strongest colour, day and night light, tilt, texture memory, build time, and the draw calls of the preview now. |
| **Save study** | Exports the settings, the measures, the budgets and the recommendation as JSON. |

The preview uses the game code where it can. Option B is `createWorlds()` from
`src/worlds.ts` with the frame update `updatePlanetLooks()`, the renderer, the tone mapping
and the lights of `src/main.ts`, and the planet shadow of `createSunShading()`. The Before
option is a copy of the old code (`src/planet-look-study/legacy.ts`): the old deck, the one-colour
ground with the full relief, the flakes, the thick air, and the five flat rings. The flight view uses the rules of
`updateEnvironment()` for fog, sky and light. Differences from the game:

- The planets do not orbit. They stay at their start positions. All planets orbit in the
  same 3,600 s, so their positions relative to each other and to the Sun are the same
  as in the game.
- The preview does not move the fairy. The flight view is a fixed pose above the day side,
  with the Sun 33° high.
- The game shader now has the shadow test of Finding 5, so the Before option cannot show
  the old far-side shadow.

## What the code does today

| Area | Current behavior | Consequence |
| --- | --- | --- |
| `src/worlds.ts`, `buildGasDeck()` | A 512 × 256 canvas per giant: the planet colour times 0.65 + band × 0.15 + noise × 0.1, with `sin(lat × 30 + noise × 2.5)` | 30 wavy stripes of one hue on every giant, darker than the planet colour |
| `src/worlds.ts`, `buildGround()` | One ground colour per rocky world, times 0.9 + detail × 0.2 + height × 0.025 | No dark regions, no ice caps, no ray craters |
| `src/worlds.ts`, `buildClouds()` | 1,500 icosahedron puffs on each giant and on Venus, in the planet colour, 65% opacity | From space, the puffs are flakes on the disc and outside its edge |
| `src/worlds.ts`, `addAtmosphere()` | A back-side shell; alpha is `1 − exp(−depth × 0.028)` | From space, the shell is almost opaque for about two scale heights: a thick halo |
| `src/worlds.ts`, `createWorlds()` | Five `MeshBasicMaterial` rings, turned by π / 2.3 about X, in the spinning group | Rings 11.7° off the equator; they wobble as Saturn turns; the Sun does not light them |
| `src/main.ts`, `updateEnvironment()` | The hemisphere light is 1.1 outside the air, with the olive ground colour `0x65794e` | The night side of each planet is lit and olive |
| `src/sun-shading.ts`, `sunShadow()` | Tests if a sphere touches the line to the Sun | A world behind the Sun also casts a shadow |
| `src/main.ts`, `axialSpinPeriods` | Each world turns about its +Y axis | No planet has an axial tilt |

## Finding 1: half the contrast, in one hue

The study measures the reference maps in the browser. For each 10° band of latitude it
takes the mean colour, and it gives the 18 bands in OKLCH. `PLANETS[id].reference` in
`src/planet-look-study/model.ts` holds the values.

A mean colour of the whole map hides the bands: Jupiter's white zones and orange belts
average to a grey (`#a7a196`, chroma 0.017). Thus the study uses two measures:

- **Band contrast**: the lightness range from the darkest to the lightest band.
- **Strongest colour**: the highest chroma of a band.

| Planet | Band contrast today | Band contrast, pictures | Strongest colour today | Strongest colour, pictures |
| --- | --- | --- | --- | --- |
| Jupiter | 0.11 | 0.23 | 0.049 | 0.050 |
| Saturn | 0.11 | 0.26 | 0.060 | 0.070 |
| Uranus | 0.11 | 0.17 | 0.063 | 0.055 |
| Neptune | 0.09 | 0.22 | 0.097 | 0.160 |
| Mars | 0.05 | 0.38 | 0.101 | 0.150 |
| Venus (ground) | 0.04 | 0.12 | 0.077 | 0.092 |
| Mercury | 0.04 | 0.14 | 0.012 | 0.003 |

The giants have about half the band contrast of their pictures. Neptune and Mars also have
weaker colour. Uranus has 30 stripes; its pictures show a smooth gradient from pole to pole.
The Mercury chroma today is higher than in its pictures: Mercury is a neutral grey, and the
game gives it a warm grey.

The 10° means are soft. The belts of Jupiter are more orange in the pictures than the
means show. Thus the chroma values are a low limit.

## Finding 2: a lit night side

Outside the air, the hemisphere light is 1.1 and the Sun (a point light) is 2.4. The day side
of a planet gets (2.4 + 1.1) / 1.1 = 3.2 times the light of its night side. No planet has
a clear terminator. The night side also gets the ground colour of the hemisphere light,
`0x65794e`, the olive of Earth's meadows.

The Moon has the same problem, and `createMoonMaterial()` in `src/moon.ts` already fixes it:
it scales the hemisphere light on the Moon material only (earthshine). The same fix with a
scale of 0.18 far from the planet and 1 in the air gives the day side 13 times the light of
the night side. `spaceLightAt()` in the model gives the scale at each altitude.

## Finding 3: flakes on every giant

`buildClouds()` puts 1,500 puffs at the cloud height of each giant and Venus. They are flat
icosahedrons in the planet colour, at 65% opacity. From space they show as flakes on the
disc, and in a ring outside the disc. On Venus, the brown ground shows between the puffs,
but the pictures show a closed deck of cloud.

In flight, the puffs are the cloud layer that the fairy flies through. The proposal keeps
them in the air and hides them from space.

## Finding 4: a thick halo

The air shell has a scale height of 0.21 × the air depth: 38 m on Jupiter. The alpha
`1 − exp(−depth × 0.028)` is almost 1 for a ray that grazes the planet up to about two scale
heights. Jupiter's shell is 181 m deep on a radius of 588 m, so a cream band surrounds
the disc. The pictures show a thin bright rim.

The proposal multiplies the depth by 0.12 when the camera is far from the planet
(`HALO_THIN` in `src/planet-look-study/scene.ts`). The factor goes back to 1 between 1.1 and
2.2 air depths above the ground, so the sky in flight does not change.

## Finding 5: shadows from behind the Sun

`sunShadow()` in `src/sun-shading.ts` finds the point of the line to the Sun that is nearest
to each occluder. It does not test if that point is further than the Sun. The Sun is a
point light, so the lines from the day side of a planet cross at the Sun and open again
behind it. A world on the far side of the Sun can shadow the day side.

Before the proportions change, Venus and Jupiter were almost opposite each other across the
Sun. Venus cast a dark patch on Jupiter's day side, and Jupiter cast one on Venus. All planets
orbit in the same 3,600 s, so the patches never moved. With the new proportions the
distances grew 2.5 times and the radii 1.25 times, so no fixed pair casts this shadow now.
Blossom Haven moves, so it can still cast one after a move. `farSideShadows()` in the model
finds the pairs for both proportions, and a test keeps both lists.

The fix is one test in the loop of `sunShadow()`: skip the occluder when `along` is longer
than the distance from the point to the Sun. The defect has no permanent effect now, so the
fix is small but not urgent.

## Finding 6: rings off the equator, and lumpy rocky worlds

Saturn's rings turn by π / 2.3 about X. They are 90° − 78.3° = 11.7° off the equator. They are
children of the spinning group, so they wobble by 11.7° in each turn of 200 s. They use
`MeshBasicMaterial`, so the Sun does not light them and the planet shadow does not fall
on them. The pictures show rings in the equator plane, with the dark Cassini division and
the shadow of the planet.

The relief of Mercury is 16 m on a radius of 119 m (13%). The relief of Mars is 14 m on a
radius of 181 m (8%). Before the proportions change the values were 16% and 10%. Real
planets have relief below 1% of the radius: Mars has about 30 km on a radius of 3,390 km. From space the outline is lumpy, and the
planets look like potatoes.

No planet has an axial tilt. In the pictures, Saturn is tilted 26.7° and Uranus lies on its
side at 97.8°.

## The options

All three options include these fixes. Together they are option A.

1. The shadow test of Finding 5.
2. The space light of Finding 2.
3. The thin halo of Finding 4, with a new air colour per planet.
4. The cloud puffs of the giants only inside the air.
5. The real axial tilt: `group.rotation.x`. The spin of `main.ts` sets `rotation.y`. With the
   Euler order XYZ, the planet turns about its own tilted axis.
6. Saturn's rings in the equator plane, with a lit material.
7. Half the relief on Mercury and Mars (`ROCKY_RELIEF`). This changes the flight ground; see
   the decisions.

### A — Retune

The code of today with new numbers: two colours per giant (a zone and a belt), a band count
per giant (Jupiter 22, Saturn 26, Uranus 6, Neptune 9), less noise in the bands, new ground
colours, and a flat cream deck for Venus. The planets are cleaner. They do not yet have the
features of their pictures: no Great Red Spot, no ice caps, no hexagon.

### B — Storybook paint

A, plus one hand-made recipe per planet. The graphics card paints each map in
equirectangular form, reads it back, and uses it as an sRGB texture with mipmaps
(`bakePlanetMap()` in `src/planet-look-study/paint.ts`). The map uses the uv of
`THREE.SphereGeometry`, so the game spheres can use it without a change.

| Planet | What the recipe paints |
| --- | --- |
| Jupiter | 17 bands from the measured colours, a little more saturated; warped belt edges; blue-grey festoons; seven white ovals; a Great Red Spot larger than life, with a swirl |
| Saturn | 14 soft butterscotch bands; the north polar hexagon with its dark vortex |
| Uranus | A smooth cyan gradient with a bright polar cap and three small bright clouds |
| Neptune | Azure bands; soft white streaks; the Great Dark Spot with its white companion cloud; a small bright cloud (the Scooter) |
| Venus | A closed cream-gold deck with soft swirls and a sideways Y |
| Mars (vertex colours) | Rust, bright dust and dark basalt regions; two ragged ice caps; a long canyon near the equator |
| Mercury (vertex colours) | Dark blue-grey plains, lighter smooth plains, four ray craters |

Saturn gets one ring mesh with a radial texture: the C ring, the B ring, the Cassini
division, the A ring and the Encke gap at their real radii, scaled to 1.26 to 2.06 Saturn
radii. The rings stay inside the 2.1 radii that `src/relocation.ts` keeps clear. The Sun
lights them, and the planet shadow falls on them. A second patch puts the shadow of the
rings on the planet. Uranus gets nine thin rings at 1.64 to 2.0 radii.

The recipes use the seed of the world. Thus a new visit can give new storm positions, as
the game gives a new landscape to other worlds on each visit.

### C — Photo maps

A, plus the 2k maps of [Solar System Scope](https://www.solarsystemscope.com/textures/),
based on NASA mission data, under CC BY 4.0. The files are in `public/planets/ssc/`. Mercury
and Mars keep their vertex colours as a grey detail layer under the map. Uranus uses the
rings of option B, because there is no Uranus ring map.

The planets look like their pictures from far away. Close by, the craters of Mercury and
the volcanoes of Mars do not match the hills of the game terrain, which change on each
visit. Each planet has the same look on each visit.

## Cost

| Measure | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Planets with a texture | 4 | 4 | 5 | 7 |
| Texture size | 512 × 256 | 512 × 256 | 2048 × 1024 (phone 1024 × 512) | 2048 × 1024 |
| Texture memory, computer | 2.7 MB | 2.7 MB | 53.3 MB | 76.0 MB |
| Texture memory, phone | 2.7 MB | 2.7 MB | 13.3 MB | 76.0 MB |
| Download | None | None | None | 2.7 MB |
| Pixels made on the processor | 524,288 | 524,288 | 0 | 0 |
| Saturn ring draw calls | 5 | 5 | 1 (+1 for Uranus) | 1 (+1 for Uranus) |

Texture memory counts mipmaps. `budget()` in the model gives these values, and a test
compares the download with the files.

Build time on this computer (headless Chrome 153, Windows 11, graphics card), in three runs:
option B takes 58 to 441 ms for each planet, with the shader compile. Option A takes 21 to
447 ms. The times change much from run to run, because the computer also ran other work.
`createWorlds()` took about 0.6 s for all worlds before the proportions change, and 1.9 to
2.3 s after it. A phone was not measured.

## Recommendation

**Do the fixes of option A first, then option B, one planet at a time.**

- The fixes of A are small, and they help every option and the Moon, Ceres and Vesta.
  The ring plane and the shadow test are defects; the shadow defect has no permanent effect
  with the new proportions.
- B gives every feature that a child knows from the pictures, in the storybook style of Earth
  and Blossom Haven. It needs no download and no licence credit, and it keeps a new look on
  each visit.
- C gives the most exact look from far away. It adds a download, a credit to keep, and a
  photo look beside the storybook Earth. It is the better choice only if the game moves to a
  realistic style.

## Into the game

1. `src/sun-shading.ts`, `sunShadow()`: skip an occluder when `along` is longer than
   `length(sunPosition − point)`.
2. `src/worlds.ts`: give each planet surface material a space light uniform, as
   `createMoonMaterial()` does. Set it each frame in `updateEnvironment()` with
   `spaceLightAt()`.
3. `src/worlds.ts`, `addAtmosphere()`: add a `haloFar` uniform to the air shader. Set it from
   the camera altitude.
4. `src/main.ts`, `animate()`: show the cloud group of a giant only when the camera is inside
   its air.
5. `src/worlds.ts`: set `group.rotation.x` to the real tilt once. Put Saturn's rings in the
   equator plane with `MeshStandardMaterial`.
6. `src/worlds.ts`, `buildGasDeck()`: replace the canvas with `bakePlanetMap()`. Bake
   1024 × 512 on a touch device. Add the deck of Venus above its cloud puffs.
7. `src/worlds.ts`, `buildGround()`: use `createGroundPainter()` for Mars and Mercury.
8. `src/relocation.ts`: add Uranus's rings (2.0 radii) to the clear space. Saturn stays at
   2.1 radii.
9. `src/terrain.ts`: if the decision is yes, scale the relief of Mercury and Mars by 0.5, so
   the flight ground and the outline agree.

## Decisions

- **Rounder rocky worlds?** The study halves the relief of Mercury and Mars. The flight ground
  must use the same terrain, so the hills are lower in flight too.
- **Uranus on its side?** The real tilt of 97.8° makes the bands and rings run from pole to
  pole relative to the orbit. It is correct, but it can surprise a player.
- **How red is the Great Red Spot?** The recipe makes it larger and redder than in the
  pictures, so it reads from far away.

## Limits of this study

- The measured colours are 10° means of one set of maps.
- The recipes of B are hand-made from those maps. Each needs an art review against the
  pictures.
- In flight inside the air, the fog and the sky colour decide most of the look. The options
  change that view little. A study of the sky of each planet is a separate step.
- The preview draws the planets at their start positions and does not test the orbits.

## What the game now does

| Change | Where |
| --- | --- |
| The painted maps of the giants and the cloud deck of Venus, baked on the graphics card: 2048 × 1024 on a computer, 1024 × 512 on a phone. A new visit to a giant bakes new storms. | `src/planet-paint.ts`, `bakePlanetMap()`; `buildGasDeck()` and `buildClouds()` in `src/worlds.ts` |
| Painted vertex colours for Mars and Mercury | `createGroundPainter()`; `buildGround()` |
| Half the relief of Mercury and Mars, in one field for the ground and the collision | `worldTerrain()` in `src/worlds.ts`; `ROCKY_RELIEF` in `src/planet-look.ts` |
| The real axial tilts | `group.rotation.x` in `createWorlds()`; `PLANET_LOOKS` |
| Saturn's rings in the equator plane, lit, with the ring gaps and the ring shadow on the planet; thin rings on Uranus | `planetRings()`, `withRingShadow()` |
| The dark night side from far away, the thin air rim, the cloud puffs only inside the air, the deck of Venus that opens in flight | `updatePlanetLooks()`, called in `animate()` in `src/main.ts` |
| New sky and cloud colours of the seven planets | `PLANET_LOOKS`; `world.sky` |
| No shadow from a world beyond the Sun | `sunShadow()` in `src/sun-shading.ts` |
| Uranus's rings in the space that relocation keeps clear (2.05 radii) | `occupiedRadius()` in `src/relocation.ts` |

`createWorlds()` takes the renderer as a third argument. Without it, the giants keep the old
canvas deck. `src/planet-look.test.ts` checks the relief, the light rules, the ring clearance
and the shadow test. The Moon smoke script passes in software rendering with the painted maps.

## Sources

- Reference maps and option C: Solar System Scope planet textures, based on NASA mission data,
  CC BY 4.0.
- Ring radii and axial tilts: NASA planetary fact sheets.
- Noise for the painted maps: webgl-noise by Ian McEwan and Stefan Gustavson (Ashima Arts),
  MIT license.
- Chroma and lightness: the OKLab colour space of Björn Ottosson.

## Verification

- `npx vitest run src/planet-look-study` checks the planet values and the proportions against
  `src/worlds.ts` and `src/main.ts`, the air shader lines that the patch uses, the measured contrast, the light
  contrast, the far-side shadow pairs, the ring gaps, and the cost.
- `node scripts/planet-look-study-smoke.mjs "path/to/chrome.exe"` against port 5174 builds all
  21 looks, checks the tilts, the views, the split view, the export and the 390/320 px
  layouts, and writes screenshots to `artifacts.local/planet-look-study/`. It uses the graphics
  card. The painted maps are too slow in software rendering; add `--swiftshader` to use it.
