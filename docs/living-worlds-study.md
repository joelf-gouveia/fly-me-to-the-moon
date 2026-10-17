# Living worlds study

Field study 27. The question: each world with air has the same white puffs today. How can each
planet get the clouds that it really has, and real things that move and happen, inside the budget
of a phone? The study does not change the game.

The page is `studies/living-worlds-study.html`. The code of the study is in
`studies/living-worlds-study/`. The clips and the pictures are in `public/studies/living-worlds/`.

## What the game has today

| World | Air | Clouds today (`buildClouds()` in `src/worlds.ts`) |
| --- | --- | --- |
| Mercury, the Moon, Ceres, Vesta | No | None: the cloud height is 0 |
| Venus | Yes | 1,500 golden puffs, and the closed painted deck of `venusDeck()` in `src/planet-paint.ts` |
| Earth | Yes | The heap clouds, wisps, rain curtains and grey layer of the weather (`src/weather-clouds.ts`) |
| Mars | Yes | 70 white puffs, 25% opaque |
| Jupiter, Saturn, Uranus, Neptune | Yes | 1,500 puffs each, in the cloud colour of `PLANET_LOOKS` |
| Blossom Haven | Yes | 50 cotton candy tufts (`src/cotton-candy.ts`) |

So the airless worlds already have no clouds. The problem is the six other worlds with air:

1. They all get the same puff: one `IcosahedronGeometry(1, 1)` of 80 triangles, flattened, in
   groups of 7 at random places. Only the colour, the number and the opacity change.
2. No real world has groups of round puffs at random places.
3. All cloud groups turn at the same rate, 0.001 rad/s (the loop of `src/main.ts`).
4. The puffs show only inside the air (`puffsVisibleAt()` in `src/planet-look.ts`). From space
   the painted maps of the planet look study are right. So the work of this study is only inside the air.
5. Nothing happens on these worlds. Earth has weather and 31 kinds of animals; Blossom Haven has
   magic seasons and 17 creatures.
6. The search stars of Jupiter and Neptune ask for the red storm and the dark storm under the
   clouds (`searchDone()` in `src/stickers.ts`), but inside the air the storm is only paint.

## The research

The facts and the sources of each world are on the page, in "The worlds one by one". In short:

| World | Real clouds | Real events |
| --- | --- | --- |
| Mercury | None; a thin exosphere | A sodium tail that only special cameras see |
| Venus | One closed deck of sulfuric acid, 45 to 70 km, with haze above and below | Super-rotation: the cloud tops go around in about 4 days, the ground in 243 days. Acid rain that goes back to gas. Lightning: not certain (Parker Solar Probe, 2023) |
| Mars | Thin water-ice wisps, canyon fog, the long wave cloud of Arsia Mons, high CO₂ clouds, a polar hood | Dust devils up to about 2 km tall, dust storms that can cover the planet (2018), CO₂ geysers, a blue sunset |
| The Moon | None | Impact flashes on the night side; a horizon glow of dust is not certain (LADEE) |
| Ceres, Vesta | None; some water vapour at Ceres (2014) | The salt spots of Ceres |
| Jupiter | Ammonia ice (white zones), ammonium hydrosulfide (tan), water (deep) | Alternating jets up to 539 km/h, the Great Red Spot (about 6 days for a turn), lightning and "mushballs", polar cyclones (8 north, 5 south), aurorae |
| Saturn | The same layers, deeper and under a thicker haze | Winds up to 500 m/s, the hexagon, the Great White Spot about each 30 years, lightning, ring rain |
| Uranus | A pale haze, a deck of hydrogen sulfide, a few methane clouds | Winds up to 900 km/h, backwards at the equator; it lies on its side |
| Neptune | White methane streaks high above a deeper deck, with shadows on it | The fastest winds (more than 2,000 km/h), the Great Dark Spot with a bright companion |

Life in the clouds is real science history, not a detection: Morowitz and Sagan (1967) on Venus,
Sagan and Salpeter (1976) with the floaters of Jupiter, and the phosphine claim on Venus (2020),
which most scientists now doubt.

How games do it: Outer Wilds gives each world one large, slow event. No Man's Sky moves weather
over a planet. Kerbal Space Program with the EVE mod draws each cloud layer as a shell with one
draw call. Ray-marched volumes (Horizon Zero Dawn, Flight Simulator) need about 2 ms of a console
graphics card, which is too much for a phone; the study does not use them.

## The options

- **A · True clouds.** The puffs go. Each world gets one to three cloud shells and one or two sets
  of soft tufts, and the bands move with the real jets.
- **B · The weather of each world (recommended).** A, and one or two real events on each world.
- **C · Imagined sky life.** B, and the floaters of Sagan and Salpeter on Jupiter.

## How the prototypes work

All the parts are in `studies/living-worlds-study/skies/`. Each part adds meshes to
`world.clouds` or `world.surface` of the real worlds of `src/worlds.ts`, and takes them away in
`dispose()`. A part hides the puffs of today with `count = 0` (`hidePuffs()` in `common.ts`);
`updatePlanetLooks()` sets `visible` on each frame, so the count is the safe switch.

| File | What it has |
| --- | --- |
| `data.ts` | The real jets as one function of the latitude (`jet()`), the same function in GLSL (`jetGlsl()`), the zones of Jupiter and Saturn, and the layers of each world. The game shows a jet at `WIND_SCALE` = 0.04: 100 m/s moves the clouds 4 m/s. |
| `shell.ts` | A cloud layer: one sphere and one draw call. Its body is GLSL: `lwLayer()` gives the colour and the cover of each direction. The pattern turns with the jet of its latitude, so the bands slide past each other. |
| `tufts.ts` | The near clouds: a few joined balls with a flat base, as the heap clouds of Earth, with round normals so they are soft. One InstancedMesh for a set. The vertex shader turns each tuft with the jet of its latitude. A `flash` uniform lights the tufts near a lightning. |
| `giants.ts` | Jupiter: a zone shell of ammonia ice, white tufts on the zones and brown tufts of the deeper layer in the belts. Saturn: a haze shell over soft bands. Uranus: a pale haze and a few bright clouds. Neptune: a blue deck, high white streaks, and their shadows on the deck, away from the Sun. B adds a storm shell that turns in place (`vortexGlsl()` in `common.ts`) and five storm towers with lightning. |
| `venus.ts` | Streaks and chevrons above the deck that move with the super-rotation, a thin lower haze, and in B the curtains of acid rain (virga) and faint flashes. |
| `mars.ts` | Thin wisps of water ice in patches, and in B the dust devils: 900 points each, moved on the CPU on each frame. |
| `airless.ts` | The sparks of small stones on the night side of the Moon or Mercury. |
| `life.ts` | Option C: the floaters, see-through bags with threads. |

The storms of B are where `src/planet-paint.ts` paints them: `RED_SPOT` and `DARK_SPOT` of
`src/search-places.ts`. The map longitude of a direction is `atan2(z, -x)`; the longitude λ of
`dirAt()` in `features/kit.ts` is the map longitude λ + 180°. The storm shells use the size of
the painted ovals, and the tufts keep out of the storm.

## The clips

The clips run in the lab of the feature ideas study (`studies/feature-ideas-study/lab.ts`) with
the real worlds, the real sky and the real fairy. Each clip flies a rail on a great circle with a
height profile (`flight()` in `features/kit.ts`), and the Sun stands at a fixed height over the
route (`tipToSun()` of the learn and play study). Today and each option fly the same route.

| Clip | World | Option | Route |
| --- | --- | --- | --- |
| T, A, B, C | Jupiter | Today, A, B, C | From the top of the air down along the north edge of the Great Red Spot, through the top layer and under it, past the storm towers |
| V | Venus | B | Above the deck, down through it, and under it among the acid rain |
| M | Mars | B | Down to the plain among the dust devils |
| N | Neptune | B | Over the Great Dark Spot and between the high streaks |
| L | The Moon | B | Low over the night side |

To record them, start a second Vite server with no hot reload, as in the other studies (a
config file in the scratchpad with `root` set to the repo and `server.hmr: false`, port 5197), then:

```
node studies/living-worlds-study/living-worlds-study-capture.mjs "path/to/chrome.exe" [T,A,...] [origin]
node studies/living-worlds-study/living-worlds-study-capture.mjs "path/to/chrome.exe" --moments [T,A,...] [origin]
```

The pictures of the worlds (`V-today`, `M-today`, `N-today`, `L-today`, `S-today`, `S-B`,
`U-today`, `U-A`) are the pictures at 2 s and 12 s of each feature (`<id>-0.jpg` and `<id>-1.jpg`);
`pictures` of `WORLDS` in `model.ts` says which one the page shows:

```
STILLS=2,12 STUDY_OUT=living-worlds STUDY_PAGE=living-worlds-study node studies/feature-ideas-study/feature-ideas-study-capture.mjs "path/to/chrome.exe" --still S-B http://127.0.0.1:5197
```

## The bench

`node studies/living-worlds-study/living-worlds-study-bench.mjs "path/to/chrome.exe" [origin]`
measures five places of the clips, today and with each option, on a computer page, a phone page
and a phone page with a CPU 4 times slower. A row gives the median frame time of 60 frames (the
update of the skies, the render and a read of one pixel), the draw calls and the triangles. The
clip stays at the time of the place, so the bench measures one place, not a flight. The numbers
are on the page and in `public/studies/living-worlds/bench.json`. None of the rows is a real phone.

Results (17 October 2026, NVIDIA GeForce RTX 4080 SUPER, headless Chrome):

- Draw calls: A adds at most 2, B at most 5, C at most 7. On Mars, A adds 0: the wisps take the
  place of the puffs.
- Frame time: on the computer page and the phone page, all options are at most 2.1 ms, as today.
  The differences are smaller than the noise of the measure.
- The phone page with a CPU 4 times slower gives 3 to 8 ms for each option, today too. The noise
  of this row is larger than the cost of the skies, so the row does not rank the options.
- The study computer is fast. A real phone must be measured before the game takes the skies.

## The recommendation

Build B: first the cloud layers of A for Venus, Mars and the giants, then one event at a time,
Jupiter first. Leave C out: the planets stay real, and Blossom Haven keeps the magic. The page
gives the plan and the decisions.

## Limits of the study

- The clips are short flights on fixed routes. A flight around a giant can show bands with no
  tufts near the route; the number of tufts must be checked on a long flight before it goes into
  the game.
- The lightning has two quick pulses. In the game it must be soft for a child and stop with
  reduced motion.
- The colours of the tufts are by eye from the painted maps.
- The bench is a headless Chrome on the study computer, not a phone.

## The decisions

Joel answered the six decisions on 17 October 2026:

| Decision | Answer |
| --- | --- |
| Which option do we build? | B, the weather of each world |
| The floaters of Jupiter | Leave them out: the planets stay real |
| Things that science is not sure of | Keep them, and the friend says "scientists are not sure" |
| Which world first? | All the giants, then Venus and Mars |
| The speed of the winds | Faster, so a child sees the bands slide |
| The colour of Neptune | Change to the pale blue of the new pictures |

## What was built

Option B is in the game. The code is in `src/skies/`, and the README section "Living worlds" describes it.

- **The skies.** `buildClouds()` in `src/worlds.ts` calls `buildSky()` of `src/skies/index.ts` for
  Venus, Mars, the four giants, the Moon and Mercury, and keeps the result in `world.living`.
  `regenerateWorld()` disposes it before the new visit. The puffs are gone from these worlds; Venus keeps
  its painted deck. `WORLD_OPTIONS.living` false gives the puffs of before: this study uses it, so its
  clips of today stay as they were.
- **The loop.** `src/main.ts` updates each living sky with its own clock, which stops with reduced motion,
  and a world with a living sky no longer turns its cloud group.
- **The storms** are on the painted `RED_SPOT` and `DARK_SPOT` of `src/search-places.ts`
  (`dirOnMap()` in `src/skies/common.ts`). The storm towers (three groups on Jupiter at 12° S, two on
  Saturn at 37° N) and the dust devils get new places at each visit.
- **The winds** are at `WIND_SCALE` = 0.07, faster than the 0.04 of the clips, as the answer asks.
- **The events in the game.** The lightning of the giants and the faint flashes of Venus come in slots
  (`slotRandom()`), so they need no list of times. A spark of the Moon or Mercury lands in front of
  the camera on the night side only. A dust devil grows by day and goes at night.
- **The friend.** `src/sky-note.ts` shows one true fact for each world once in a visit, after 4 s in its
  air, or at the first spark on the Moon or Mercury. The label is the name of the fairy friend, or the
  name of the world when there is no friend. The note of Venus says "Scientists are not sure". The note
  waits for the sticker note, the thermometer, the Moon note and the notes of the friend, and those
  notes wait for it.
- **Neptune** has the pale blue of the pictures of 2024 in the painted map, the sky, the world colour and
  the sticker. The planet look study keeps its record; its test knows of the later colour.
- **The checks.** `tests/skies.test.ts` and `tests/sky-note.test.ts` test the jets, the places of the
  storms, the slots, the colours and the rule of the note. `scripts/living-worlds-smoke.mjs` checks the
  game in the browser and is in `scripts/run-checks.mjs`.

A fault of the study clips: the wisps of Mars used the word `patch`, which GLSL keeps for itself, so
their shader did not compile and the first clips of Mars had no wisps. The browser check of the game
found it. The clip M was recorded again with the wisps.

## When you come back

Option B is built. The next steps are not decided: a search star for each event (find a dust devil,
see lightning), the long wave cloud of Arsia Mons in the Mars morning, and a test on a real phone.
