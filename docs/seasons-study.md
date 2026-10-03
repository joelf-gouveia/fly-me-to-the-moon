# A year on two worlds: seasons study

Status: decided on 3 October 2026. The game has the seasons of Earth and the magic seasons
of Blossom Haven; see "In the game" below. Open
`/studies/seasons-study.html` on the Vite server. The controls of the study do not change
the game or saved game data. It saves its own answers as `fairy-seasons-study-v1`.

## Decisions of 3 October 2026

| Decision | Answer |
| --- | --- |
| 1. What makes the seasons on Earth? | A: the real tilt of 23.4°. |
| 2. When does the Earth year start, and how fast does it go? | It starts at the real date of the device. One orbit is one year. |
| 3. Where does the flight start on Earth? | In the leaf forest, 24° to 34° N. |
| 4. Which magic seasons does Blossom Haven get? | All four: Blossom time, Bubble time, Lantern time and Crystal time. |
| 5. How does a magic season go over the planet? | Rings from the cottage. |
| 6. When does the magic season change? | At each hop of the planet: a year is 20 minutes. |
| 7. What happens at the cottage? | The cottage is the first place of each season. |
| 8. What comes next? | Earth first, then Blossom Haven. |

## In the game

The game has the seasons of Earth, with decisions 1 to 3, and the magic seasons of Blossom
Haven, with decisions 4 to 7.

### Earth

| Part | Where |
| --- | --- |
| The model, the lean and the shader changes | `src/seasons.ts` |
| Petals, leaves and snow in the air | `src/season-air.ts` |
| The season uniforms of Earth, the `seasonInfo` attribute of the ground, the start meadow | `createWorlds()`, `buildGround()` and `meadowNormal()` in `src/worlds.ts` |
| One material for each way that a plant changes | `addFoliage()` in `src/foliage/build.ts` |
| The lean at the start, the year on each frame | `leanEarth()` at the start and `updateEnvironment()` in `src/main.ts` |
| The morning Sun of a leaned world | `morningSpin()` in `src/daylight.ts` |
| Unit tests | `tests/seasons.test.ts` |
| Browser check | `scripts/seasons-smoke.mjs` |

How it differs from the proposal of this study:

- **The lean has no new quaternion in the loop.** `leanEarth()` sets the Euler order of the
  group of Earth to ZXY and sets `rotation.x` and `rotation.z`. `rotation.y` stays the
  daily spin, so `animate()`, the studies and the tests that set `rotation.y` need no
  change.
- **The game leans Earth, not `createWorlds()`.** A study that calls `createWorlds()` gets
  an Earth with a straight axis and with the seasons off (`seasonOn` is 0), which is the
  look of before. This study sets the uniforms of the game for its Earth clips; its own
  Earth shader is gone from `studies/seasons-study/seasons.ts`.
- **The year comes from the geometry.** `yearOf()` reads the angle of the Sun around
  Earth, so the orbit, World speed and a pause all agree with the season.
- **The plants need no new attribute.** `plantSeason()` gives each kind of plant one of
  four ways to change, and `addFoliage()` makes one material for each way: 8 materials at
  most for Earth, in place of 2.
- **The first heading of the fairy is in the frame of Earth**, as the first line of
  sparkle rings is. Before, it used the world Y axis, which is not the north of a leaned
  Earth.
- A browser check can set the year: `/?test&year=0.875` starts in the coldest look of the
  north. This works on the dev server only.

### Blossom Haven

| Part | Where |
| --- | --- |
| The four seasons, the ring, the clock, the ground shader and the season plants | `src/magic-seasons.ts` |
| Petals, bubbles, fireflies and glitter in the air | `src/season-air.ts` |
| The season uniforms of Blossom Haven, the `seasonInfo` attribute of its ground, the planting after the creatures | `createWorlds()` and `buildGround()` in `src/worlds.ts` |
| The magic year, the step at a hop, the glow, the flight panel | `moveHome()`, `animate()`, `updateEnvironment()` and `updateNearestWorld()` in `src/main.ts` |
| Unit tests | `tests/magic-seasons.test.ts` |
| Browser check | `scripts/magic-seasons-smoke.mjs` |

Answers to the points that the study left open:

| Point | In the game |
| --- | --- |
| The first season of a visit | Blossom time. The magic year is not saved. |
| The glow of the toadstools in Lantern time | A soft glow by day (0.35) and the full glow at night. |
| The bubble bloom | The shape of the study, with fewer triangles. It is in `src/magic-seasons.ts`, not in `src/foliage/species.ts`, because it needs a clear material. |
| Plants of the gardens that are season plants too | They stay all year. |
| Creatures and the season plants | A season plant does not stand in a plant of the gardens, in a different season plant, or within 2.5 m of a point of a creature route. The planting runs after the creatures. |
| The time of a change | 20 s for one season (`MAGIC_CHANGE_SECONDS`). A pause stops it. |
| Phone | Half of the season plants. |

How it differs from the proposal of this study:

- **The game has the rings from the cottage only.** The three other patterns and the
  garden of always blossom were in the study prototype. Clip B3 is a record of them. The
  study page now sets the uniforms of the game for its Blossom Haven clips, and its own
  shader and plants are gone from `studies/seasons-study/magic.ts`.
- **The season plants are not in the plan of `src/foliage/planting.ts`.** They have their
  own planting, which reads the obstacles of the gardens and the routes of the creatures.
- **The flight panel shows the season.** "Candy groves · sparkling soda rivers" is now the
  season and the garden, for example "Bubble time · Lollipop grove".
- **A hop needs free flight.** The clock of `src/relocation.ts` does not hop while the
  flower guide leads the fairy home, so the season does not change in a guided flight.
- A browser check can set the magic year: `/?test&magic=0.5` starts in Lantern time, and
  `__fairyTest.hop()` makes a hop. These work on the dev server only.

The cost at the cottage, on a computer: 4,190 instances in five draw calls. The picture
there has 4.6 million triangles in place of 3.4 million, because each season plant goes
to the graphics card at each moment, also at size 0. The frame time was not measured.

The line numbers in the next sections describe the game before these changes.

The first round gave the two worlds the seasons of Earth. The review of 3 October 2026
said:

- The seasons of Earth are good enough.
- Blossom Haven must not have the seasons of Earth. Its seasons are magic, and different
  plants show in different seasons.

This round keeps Earth and gives Blossom Haven four magic seasons. It also uses the plants
of the foliage study (`docs/foliage-study.md`), which went into the game code on the same
day: climate belts on Earth and four gardens on Blossom Haven (`src/foliage/`). The line
numbers below describe the game at commit `b15d508`, before the foliage change.

## What to review

- **The player** shows the clip of the selected chip. There are eight clips: four of Earth
  (E1 to E4) and four of Blossom Haven (B1 to B4).
- **Try it live** runs the seasons in live 3D. You set the world, the place, the year and
  the hour. **Play the year** runs one year in 12 seconds. **Free flight** gives the keys
  to you: fly to a different place and the season changes.
- For Earth, the live view compares option A (real tilt), option B (painted year) and the
  game of today. **Today** sets the real date.
- For Blossom Haven, the live view has the four patterns of **How a season spreads** and
  **The garden of always blossom**.
- **08 / Decisions to make** keeps your answers in this browser. **Copy answers** copies
  them for the chat. **Save study** exports them as JSON.

## The game today

| Finding | Evidence |
| --- | --- |
| Earth has no tilt. | Only the seven painted planets get `group.rotation.x` (`src/worlds.ts:501`). Earth and Blossom Haven turn about the straight Y axis, and each orbit is flat (`src/orbits.ts:72`). The Sun is over the equator all year. Each place has 12 hours of day. |
| The snow is painted once. | `buildGround()` paints snow where `abs(y) > 0.9` (above 64°) or the height is more than 12 m (`src/worlds.ts:296`). The colours are in the vertices. |
| A year is 60 minutes. | `SOLAR_ORBIT_SECONDS = 3600` (`src/orbits.ts:5`). Earth turns in 240 s, and a day from noon to noon is 225 s (`docs/day-night-study.md`). A year has 16 days. A season has 4 days. |
| World speed changes the year. | `orbitSpeedFactor` in `src/main.ts` is 1, 8, 16, 32 or 64. A year is 7.5 minutes at 8× and 56 seconds at 64×. At 64× a year is shorter than a day. |
| Each visit starts on the same day. | The orbit clock starts at 0 at each load (`src/orbits.ts:18`). |
| The belts of the game are near the equator. | `zoneAt()` in `src/foliage/zones.ts` puts the leaf forest from 17° to 34°, the pine forest to 48° and the snow line belt to 59°. |
| The start meadow can have a weak season. | `meadowNormal()` picks `y` from -0.45 to 0.45: 27° S to 27° N (`src/worlds.ts:119`). |
| Blossom Haven jumps. | The planet moves each 5 minutes (`src/relocation.ts:7`). A season of Earth needs a steady orbit. A hop is a good clock for a magic season. |
| The plants are built once. | `buildFoliage()` puts each plant on the planet as an instance (`src/foliage/build.ts`), and Blossom Haven keeps one landscape. |
| The cottage is the heart of Blossom Haven. | `homeCottageNormal()` is `(0, -1, 0)` (`src/worlds.ts:112`), and the flower guide brings the fairy there. |
| The start of Earth assumes a straight axis. | `morningSpin()` turns a place about `(0, 1, 0)` (`src/daylight.ts:65`). |
| The other code is ready for a tilt. | The flight, the camera, the creatures and the air read the quaternion of the world (`surfaceRadius()`, `src/worlds.ts:105`). The day and the night read the Sun from the geometry (`solarElevation()`, `src/daylight.ts:14`). |

## Earth: how the place changes the season

`studies/seasons-study/model.ts` has the model. It has no 3D code, and it has unit tests.

`year` is the part of one orbit, from 0 to 1. Year 0 is the March equinox. Year 0.25 is the
June solstice.

1. **The Sun latitude.** `declination(year, tilt)` is the latitude where the Sun is overhead
   at noon: `asin(sin(tilt) × sin(2π × year))`. With a tilt of 23.4° it goes from 23.4° N
   in June to 23.4° S in December.
2. **The warmth of a place.** `warmth(latitude, sun)` is `cos(latitude − sun)`. This is the
   sine of the height of the noon Sun: 1 with the Sun overhead, 0 with the Sun on the
   horizon.
3. **The strength of the season.** `seasonStrength(latitude)` is 0 below 10° and 1 from
   24°. Near the equator the colours do not change.
4. **The look phase.** The south is half a year after the north. The look comes one eighth
   of a year after the Sun (`LOOK_LAG`), because the land and the sea warm up slowly.
5. **Snow and ice.** Snow shows where the warmth is below 0.58 to 0.66. Each metre of
   height takes 0.012, so mountains get snow first. Sea ice shows below 0.30 to 0.36.

The climate belts of the game are nearer the equator than on the real Earth. So the bands
and the snow line of the study are nearer the equator too: the snow line is at 52° at an
equinox and at 28° in winter, in the leaf forest of the game. In the first round these
numbers were 64° and 41°.

| Place | Noon Sun in June | Noon Sun in December | Day in June | Day in December | Season |
| --- | --- | --- | --- | --- | --- |
| Equator | 67° | 67° | 12.0 h | 12.0 h | None |
| 23° N | 90° | 44° | 13.4 h | 10.6 h | Four seasons |
| 32° N | 81° | 35° | 14.1 h | 9.9 h | Four seasons |
| 45° N | 68° | 22° | 15.4 h | 8.6 h | Four seasons |
| 66° N | 47° | 1° | 22.2 h | 1.8 h | A long day and a long night |
| North pole | 23° | No Sun | 24 h | 0 h | A long day and a long night |

**Do not use the distance from the Sun.** Many people think that summer is the time when a
world is near the Sun. That is wrong for Earth. A season from the distance teaches the
wrong idea.

### The prototype of Earth

`studies/seasons-study/seasons.ts` adds the seasons to the real Earth that
`createWorlds()` makes. It does not make a new mesh or a new texture. Each material gets a
small shader change with `onBeforeCompile`, as the water ripples and the Sun shadow do
today. Three uniforms control the look: `seasonQ` (the look phase), `seasonDecl` (the sine
and the cosine of the Sun latitude) and `seasonOn`.

| Part | Change |
| --- | --- |
| Ground | A new vertex attribute `seasonInfo`: grass or not, the height, the detail. The fragment gives the grass the tint of its season, then the snow. |
| Water | Ice where the warmth is low. The ice is rough, so it does not shine. |
| Leaf plants | The broadleaf tree, the birch and the bush of `src/foliage/species.ts`. The leaves are the part with `aFoliage.x = 1`. They get blossom, then their own green, then gold and red, then a thin bare crown. |
| Small plants | The grass, the fern and the reeds get the tint of the ground. No small plant shows under the snow. The flowers are out in spring and in summer only. |
| Other plants | The pines, the palms, the cactus and the rocks keep their colour. They get snow on their tops in the cold. |
| Air | 520 points near the camera: petals in spring, leaves in autumn, snow in the cold. |
| Axis | `createPose()` leans the world. The world stays in its place and its axis turns, which gives the same Sun in the sky as an orbit with a fixed axis. |

The game gives all the plants of a world two materials. The study gives each kind of plant
its own material, so each kind can have its own season. The game change needs one number
for each kind of plant in place of that.

### Two ways to make a season on Earth

| | A · Real tilt | B · Painted year |
| --- | --- | --- |
| Cause | The axis leans. The orbit makes the year. | No tilt. A season clock paints each latitude. |
| Noon Sun at 32° N | 81° in June, 35° in December | 58° all year |
| Day at 32° N | 14.1 h in June, 9.9 h in December | 12 h all year |
| Poles | A long day and a long night | Day and night as today |
| Length of a year | One orbit: 60 minutes at 1× | Free, for example 20 minutes |
| Change to the light code | None: it reads the geometry | None |
| Other changes | `morningSpin()`, the start meadow, the spin in `animate()` | A season clock |

## Blossom Haven: magic seasons

Blossom Haven is a magic planet. The Sun does not make its seasons, and the planet does
not lean. Each season has a colour, a thing in the air and plants of its own. The plants
of a season grow from the ground when it comes and go back into the ground when it leaves.
The candy of the four gardens of the game stays all year.

| Season | Ground | Plants | Air |
| --- | --- | --- | --- |
| Blossom time | The colours of the four gardens of the game | Blossom trees and giant flowers | Petals fall |
| Bubble time | Mint green | Bubble blooms: clear bubbles on thin stems | Bubbles rise |
| Lantern time | Violet | Giant toadstools that glow | Fireflies drift |
| Crystal time | Frost white | Sugar crystals: spires of rock candy | Glitter falls |

The blossom tree, the giant flower, the toadstool and the sugar crystal are plants of
`src/foliage/species.ts`. The blossom tree and the giant flower are in the code of the
game, but no garden of the game uses them. The bubble bloom is new, and it is in the study
code only. Other seasons are possible, for example a rainbow time, a star time or a honey
time. Decision 4 has a place for them.

### The place changes the magic season too

`magicOffset(pattern, direction)` in `model.ts` gives each place a delay. The study has
four patterns:

| Pattern | Which areas have which season |
| --- | --- |
| Two halves | The half of the cottage gets each season first. The other half gets it two seasons later. |
| Rings from the cottage (proposed) | A new season starts at the cottage and goes out in a ring. The far side gets it three seasons later, so the planet shows two or three seasons at one time. |
| Patches | Each region has its own time, so a short flight goes from one season to the next. |
| The whole planet | Each place has the same season. |

The proposed pattern is the rings. The cottage is the heart of the planet, and the flower
guide brings the fairy there, so the child sees each new season first. A flight away from
the cottage goes back through the last seasons.

### The prototype of Blossom Haven

`studies/seasons-study/magic.ts` puts the plants of all four seasons on the planet at the
start, as instances: 620 blossom trees, 520 giant flowers, 1,100 bubble blooms, 1,000 giant
toadstools and 950 sugar crystals. A shader gives each plant the size of its season at its
place, from 0 to 1, and each plant starts to grow at its own time. So a change of season is
a change of one uniform. Four uniforms control the look: `seasonQ` (the magic year),
`seasonPattern`, `seasonOn` and `seasonGarden`.

- The ground keeps the colours of the four gardens in Blossom time. Each other season
  gives the grass 70% of its own colour, so the gardens still show.
- A season keeps its full look for 60% of its time. The change takes the other 40%.
- `seasonGarden` keeps Blossom time in the clearing of the cottage (decision 7).

## The clips

The clips run in the lab of the feature ideas study
(`studies/feature-ideas-study/lab.ts`): the renderer, the worlds, the sky, the fairy and
the light of the game. `studies/seasons-study/clips.ts` sets the day of the year on each
frame. `studies/seasons-study/seasons-study-capture.mjs` asks the page for each frame, 30
frames in each second, and makes a WebM clip with ffmpeg.

| Clip | What it shows |
| --- | --- |
| E1 | Earth through one year, from space. |
| E2 | One leaf forest at 32° N through one year, each frame at noon. |
| E3 | The same noon in August at 35° N, the equator, 35° S and 75° S. |
| E4 | The noon Sun through one year at 32° N: option A, then option B. |
| B1 | Blossom Haven through one magic year, from space, with the rings from the cottage. |
| B2 | One grove through the four magic seasons. |
| B3 | The same magic year with three patterns: two halves, rings, patches. |
| B4 | Blossom time ends at the cottage, and Bubble time starts there. |

Each clip is 12 s at 1280 × 720 (B4 is 8 s). The clips and the pictures are in
`public/studies/seasons/`. Run the capture again after a change:

```
node studies/seasons-study/seasons-study-capture.mjs "path/to/chrome.exe" E1,E2
STILLS=0,3,6,9 node studies/seasons-study/seasons-study-capture.mjs "path/to/chrome.exe" E2 --still
STILLS=1,4,7,10 node studies/seasons-study/seasons-study-capture.mjs "path/to/chrome.exe" B2 --still
```

The last two lines make the season pictures of section 03 of the page.

## Recommendation

**Lean Earth. Give Blossom Haven its own magic.**

- Earth gets option A: a tilt of 23.4°. The year starts at the real date of the device. In
  October the north of the game is in autumn, as the north of the real world is.
- The start meadow of Earth moves to the leaf forest, 24° to 34° N.
- Blossom Haven gets the four magic seasons, with no tilt. Each hop of the planet brings
  the next season: a year is four hops, 20 minutes.
- Each magic season starts at the cottage and goes out in a ring.

### The change in the game, in five steps

1. **The model.** A new `src/seasons.ts` with `declination()`, `warmth()`,
   `seasonStrength()`, the look phase and `magicOffset()`, and `tests/seasons.test.ts`.
2. **Earth leans.** `World` gets a `lean` quaternion. `animate()` in `src/main.ts` keeps a
   spin angle for each world and sets `group.quaternion` to `lean × spin`; today it adds to
   `rotation.y`. The seven planets keep their look: their `rotation.x` is the same lean.
   `createWorlds()` turns the lean of Earth so that the first day is the real date.
   `morningSpin()` takes the lean. `meadowNormal()` picks `y` from 0.41 to 0.56.
3. **The ground, the sea and the plants of Earth.** A shader change in `buildGround()` and
   in `foliageMaterial()` of `src/foliage/build.ts`. `buildGround()` has the terrain sample
   of each vertex in its loop, so `seasonInfo` costs no new sample. The plants need one
   new number for each instance or each kind: leaf plant, small plant or other.
   `updateEnvironment()` sets the uniforms from the orbit angle.
4. **Petals, leaves and snow.** One `THREE.Points` in the group of the nearest world, with
   the kind from the place of the fairy. Reduced motion keeps the points still.
5. **Blossom Haven.** The plants of the four seasons go into the plan of
   `src/foliage/planting.ts`, with the season of each plant in one number. `moveHome()` in
   `src/main.ts` adds a quarter to the magic year, and the look goes to the new season in
   about 20 s. The bubble bloom goes into `src/foliage/species.ts`.

## Decisions to make

1. What makes the seasons on Earth: the real tilt (recommended) or the painted year?
2. When does the Earth year start, and how fast does it go? The recommendation is the real
   date at the start, and one orbit for one year.
3. Where does the flight start on Earth? The recommendation is the leaf forest.
4. Which magic seasons does Blossom Haven get? The study has four. The notes are for other
   ideas.
5. How does a magic season go over the planet? The recommendation is rings from the
   cottage.
6. When does the magic season change? The recommendation is at each hop of the planet.
7. What happens at the cottage? The recommendation: it is the first place of each season.
8. What comes next? The recommendation is Earth first, then Blossom Haven.

## Limits of this study

- The clips use study code, not game code. The game code needs its own design, tests and
  smoke scripts.
- The foliage change of the game was in the working tree, not in a commit, when the study
  made its clips. A later change of the plants can change the clips.
- Earth does not move on its orbit in the clips. The axis turns in place of the orbit. The
  Sun in the sky is the same.
- The study did not measure the frame time or test a phone. Blossom Haven gets 4,190 new
  plant instances in five draw calls, and the plants of three seasons have a size of 0 at
  each moment. Earth and Blossom Haven get three floats for each ground vertex (1.5 MB for
  each world).
- The magic plants do not keep the creatures away, and they can stand in a plant of the
  game. The game change needs the planting rules of `src/foliage/planting.ts`.
- The toadstools glow by day in the study. The game gives its plants a glow at night only.
- The creatures, the water and the cotton candy clouds do not change with the season.
- At World speed 64× a year of Earth is 56 seconds and a day is 225 seconds. With option A
  the noon Sun then goes up and down four times in one day. This is a setting for
  grown-ups, and the study does not limit it.
- The live view needs a graphics card with WebGL 2.

## Verification

- `npx tsc --noEmit -p .` passes.
- `npx vitest run studies/seasons-study` passes: the Sun latitude, opposite seasons in the
  two hemispheres, no season at the equator, the day length, the snow line, the four magic
  seasons and their patterns, and a clip and a picture for each clip of the page.
- The capture script made the eight clips and the pictures with no page errors. Each
  picture was checked by eye.
