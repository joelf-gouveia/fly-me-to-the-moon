# A sky that changes: weather study

Status: decided on 3 October 2026. The game has the weather of Earth, steps 1 to 4; see
"In the game" below. The sound, the creatures and the sticker tasks (step 5) are next. Open
`/studies/weather-study.html` on the Vite server. The controls of the study do not change
the game or saved game data. It saves its own answers as `fairy-weather-study-v1`.

## Decisions of 3 October 2026

| Decision | Answer |
| --- | --- |
| 1. How does the game make the weather? | A: a weather map. The place, the season and the hour change the weather. |
| 2. Which weather does Earth get? | All six: rain, snow that falls from a cloud and stays, wind in the plants, morning mist, a rainbow, thunder far away. |
| 3. How fast does the weather change? | A shower passes a place in about 1 minute. |
| 4. Which sky does a visit to Earth start with? | The weather of the map, with no change. |
| 5. How dark is the rain? | As in the study: a soft grey sky. |
| 6. What does the thunder do? | A glow in a cloud far away, with a soft, low rumble. |
| 7. Which other systems follow the weather and the season? | The ground, the water, the plants, the stars, the sound, the creatures and the sticker book. Not selected: the flight panel text, and a wind that carries the fairy. |
| 8. Which clouds does Earth get? | All the new kinds: heap clouds, high wisps, the grey layer and rain curtains. |
| 9. What comes next? | Build the weather of Earth in the game, in the five steps of this study. |

Answers 1 to 7 and 9 came from the first round of the page, which had eight decisions.
The new clouds (section "The new clouds") came after a comment of Joel: the clouds must
get better as a part of this change. Answer 8 came after the second round.

The study is for Earth only. Blossom Haven is a magic planet, so it gets weather of its
own in a later study, as it gets magic seasons (`docs/seasons-study.md`).

## In the game

The game has steps 1 to 4 of this study. The study page keeps its own prototype, on an
Earth with the puffs of before (`WORLD_OPTIONS.weather` in `src/worlds.ts`).

| Part | Where |
| --- | --- |
| The model, the weather map and the shader changes of the ground, the water and the plants | `src/weather.ts` |
| The heap clouds, the high wisps, the rain curtains and the grey layer | `src/weather-clouds.ts`, from `buildClouds()` in `src/worlds.ts` |
| The rain, the mist, the rainbow, and the weather at the camera | `src/weather-air.ts` |
| The map of each new Earth | `regenerateWorld()` in `src/worlds.ts` |
| The sky, the fog, the light, the stars, the snow and the wind of the plants | `updateEnvironment()` and `animate()` in `src/main.ts` |
| Unit tests | `tests/weather.test.ts` |
| Browser check | `scripts/weather-smoke.mjs` |

How it differs from the prototype of this study:

- **The map has one sixteenth on each frame.** A phone has a map of 64 × 32.
- **The clouds are in `world.clouds`**, so `regenerateWorld()` makes them again with each
  new Earth. The clouds of Earth do not turn, because they read the map at their place.
- **The high wisps go clear in the dark.** The planet is small, so the Sun is low for a
  wisp that is not far away. The prototype made such a wisp dark.
- **The game has no stamps.** A browser check can give the whole planet one weather:
  `/?test&weather=rain` on the dev server.
- **Snow falls only under a snow cloud.** `fallAt()` of `src/seasons.ts` still gives the
  leaves and the petals; `updateEnvironment()` takes the snow from the weather.
- **The weather of the game is calm.** In the first version of the game the fronts were
  80 m across, as in this study, and a flight went through a new weather each few seconds.
  Joel's review of 4 October 2026: the weather changed too fast, and a sky with no Sun
  was too frequent. Now the planet has only one or two fronts at a time: a front is about
  250 m across (`frontSize` 0.5), with one smooth edge (`frontDetail`). The limits for
  cloud and rain are higher, and the wet air of a belt adds less (`wetPull`). About 87% of
  the planet has Sun, a grey sky is on about 5%, and rain or snow is on about 8%. The jungle
  has rain at 17% of its places, and the leaf forest at 6% to 9%. A shower passes a place
  in about 3 minutes. The numbers of the sections below are those of the study, not of
  the game.
- **Fair weather has small clouds.** Groups of small heap clouds are in the clear sky
  where the air is not dry (`fairSize`, `fairCover`). They do not hide the Sun.
- **The mist is gone at 08:00**, the hour of the start of a flight (`mistHour`, `mistSpan`).
- **The light changes in about 2 seconds** at the edge of a front, not in 1 second.
- **Not in the game:** the name of the weather in the flight panel (decision 7), and
  step 5: the sound, the creatures and the sticker tasks.

## What to review

- **The player** shows the clip of the selected chip. There are ten clips, W1 to W10.
- **Try it live** runs the weather in live 3D. You set the place, the day of the year and
  the hour. **Sky over the fairy** puts a weather over the camera. **Free flight** gives
  the keys to you: fly to a cloud to find the rain.
- **Weather** in the live view compares option A (a weather map), option B (one sky) and
  the game of today. Select **From space** to see the difference.
- **Clouds** in the live view compares the new clouds with the puffs of the game.
- **10 / Decisions to make** keeps your answers in this browser. **Copy answers** copies
  them for the chat. **Save study** exports them as JSON.

## The game today

| Finding | Evidence |
| --- | --- |
| The clouds do not know the place. | `buildClouds()` puts 1,050 puffs on Earth in random groups of seven (`src/worlds.ts:206`). The loop turns them slowly (`src/main.ts:1010`). A desert and a jungle have the same sky. |
| Snow falls all the time in the cold. | `fallAt()` gives snow where the snow cover of the season is more than 0.35 (`src/seasons.ts:77`). The snow does not need a cloud. The game has no rain. |
| A puff is a clear ball. | Each puff is a ball of 80 triangles with an opacity of 0.65 and no depth write (`src/worlds.ts:216`). The puffs of a group show through each other. From below, a puff has only the ground light of the game, so it is grey-green. The sky has one kind of cloud. |
| The wind is one number. | `foliageWind` has the strength 1 at each place and at each time (`src/foliage/build.ts:23`). |
| The fog and the light know the Sun only. | `updateEnvironment()` sets the fog, the sky and the light from the height of the camera and the height of the Sun (`src/main.ts:879`). |
| The game has a moisture field. | `fields.moist` of `src/foliage/zones.ts:36` decides where the jungle, the savanna and the desert are. |
| The seasons give a temperature. | `warmth()` and `snowCover()` of `src/seasons.ts` give each place a warmth for the day of the year. |
| Earth is new at each visit. | `regenerateWorld()` makes a new landscape and new clouds from a new seed (`src/worlds.ts:427`). The weather must come from rules and from the seed, not from fixed places. |
| The stars read one number. | `skyVisibility` fades the stars, the asteroid belt and the comet (`src/main.ts:897`). The cloud cover can go into the same number. |

## The model

`studies/weather-study/model.ts` has the model. It has no 3D code, and it has unit tests.
`createWeatherModel(seed).at(place, moment)` gives the weather of a place at a moment.

Four things go into the weather. Each one comes from a system that the game has.

1. **The place.** The latitude, the height, and the moisture field of the game. The
   weather reads the same field as the plants, so it rains where the jungle is.
2. **The season.** `year` of `src/seasons.ts`. Year 0 is the March equinox.
3. **The hour.** The local hour of the Sun, from the geometry. Noon is 12.
4. **The fronts.** Fields of cloud that move around the planet. `time` is in seconds of
   the game.

The model makes one number for the place:

```
value = front(place, time) + (wetness - 0.5) × 0.62 + heat shower
```

Cloud starts where the value is above 0.50, and the sky is full at 0.80. Rain starts at
0.68 and is full at 0.88. Thunder starts at 0.84 in warm air.

### The place and the season: how wet the air is

`wetness(latitude, moist, year)` is from 0 to 1.

- **The tropics** (below 15° in the game). The moisture field gives 0.08 for a desert and
  0.80 for a jungle. A jungle is wet all year. A savanna has a wet season: the rain belt
  of the tropics follows the Sun, one eighth of a year late. `rainBelt(year)` is the
  latitude of its middle: 14° N in August and 14° S in February.
- **The middle latitudes.** The air is wet in each season: 0.54 in spring, 0.42 in
  summer, 0.60 in autumn and 0.50 in winter. The south is half a year after the north.
- **The poles.** Cold air holds little water: the wetness is 40% less.

The average of the model at noon, with the fronts of 2,000 places and times:

| Belt of the game | Spring in the north | Summer | Autumn | Winter |
| --- | --- | --- | --- | --- |
| Jungle, 4° N | Rain at 54% of the places | Rain at 54% | Rain at 54% | Rain at 53% |
| Savanna, 11° N | Rain at 4% | Rain at 12% | Rain at 4% | Rain at 1% |
| Desert, 9° N | Dry | Dry | Dry | Dry |
| Leaf forest, 30° N | Rain at 21% | Rain at 12% | Rain at 28% | Snow at 14% |
| Pine forest, 41° N | Rain at 18% | Rain at 12% | Rain at 23% | Snow at 14% |
| Snow line, 54° N | Snow at 12% | Rain at 8% | Snow at 16% | Snow at 10% |

Cloud covers 27% of the planet on average, and rain or snow falls on 17% of it. The real
Earth has more cloud. The game has less, so the land shows from space and most of a visit
has Sun.

### The fronts: the weather moves

`front()` is two fields of simplex noise, each with two sizes. One field turns to the
east and one to the west. East is the direction of the spin of Earth.

- In the middle latitudes the weather goes from the west to the east, as on the real
  Earth.
- In the tropics it goes from the east to the west, at 60% of that speed.
- A front is about 80 m across. A front goes around the planet in 40 minutes
  (`frontRound`). Its shape changes in 15 minutes (`frontChange`).
- At 32° N a shower passes a place in 46 s on average, and the longest one takes 220 s.
  That place has rain for 19% of the time. In the jungle a shower takes 2 minutes on
  average. The fairy flies 11 m in each second, so she crosses a shower in 5 s to 10 s.
- The seed of the fields is the seed of the landscape. Each new Earth has new weather.

### Rain or snow

`warmthAt()` is `warmth()` of `src/seasons.ts`, less 0.012 for each metre of height. Snow
falls where the warmth is below 0.74, and all the rain is snow below 0.66. The snow of
the seasons is on the ground below 0.66. So snow falls a short distance in front of the
snow line, and on mountains first.

### The hour

- **Heat showers.** A warm, wet afternoon adds to the value: the most at 15:30.
- **Morning mist.** Mist comes at 06:30 on low ground (below 1.5 m to 4 m) or on a
  river, where the air is wet and the sky is clear. Autumn has the most.
- **Rainbow.** `rainbow(sunElevation, rain, sunshine)` needs rain in front of the eye,
  Sun on the place of the eye, and a Sun lower than 42°. So a rainbow comes in the morning
  and in the late afternoon, not at noon.

### The wind

The wind is the strength of the bend of the plants: `uWind.y` of
`src/foliage/build.ts`. The game of today has 1. The model gives 0.75 under a clear sky,
and more in cloud, rain and thunder, in autumn and winter, and on high ground. The
strongest wind is 3 times that of today.

### The ground

`groundAfter()` keeps one number for each place: the water or the fresh snow on the
ground. Rain makes the ground wet in 14 s. Wet ground dries in 70 s. Fresh snow stays
for 20 minutes with no new snow.

## The weather map

The weather is a place. One texture of 128 × 64 points holds four numbers for each place
of the planet:

| Channel | Number |
| --- | --- |
| R | Cloud cover |
| G | Rain or snow |
| B | The part of the rain that is snow |
| A | Water or fresh snow on the ground |

A point of the map is 13 m at the equator. The shaders read the map with a smooth
filter, and the cloud shader adds fine noise, so no point shows.

Each system reads the same map, so each system agrees with the others:

- The clouds, the ground, the water and the plants read the map in their shaders.
- The rain, the fog, the light, the wind and the stars read the weather at the camera.

## The new clouds

The weather needs better clouds than the puffs of the game. `studies/weather-study/clouds.ts`
has new clouds for Earth. Each kind reads the weather map, so the kind of cloud follows
the weather.

| Kind | Where it shows | Its look |
| --- | --- | --- |
| Heap clouds | Where the map has cloud. Each cloud has its own limit, so the sky fills cloud by cloud. | Solid and white, with a flat, light grey base. No cloud shows through a different cloud. |
| Rain clouds | Where the map has rain. | The same heap clouds, to 2 times as tall and with a darker base. |
| The grey layer | Under a front, where more than half of the sky has cloud. | It closes the sky between the heap clouds, and it hides the Sun and the stars. |
| High wisps | In groups above the heap clouds, and not above a front. | Thin streaks from the west to the east. They go pink at dusk. |
| Rain curtains | Under a rain cloud. | A soft grey column to the ground, and a white one for snow. The fairy sees the rain from far away. |

How the heap clouds work:

- The planet has 450 places for a heap cloud, with an even distance between them. Each
  place has one cloud: an instance of one of three shapes.
- A shape is six low-poly balls in one mesh, with a flat base. The material is solid
  and has flat shading, as the trees have. It writes depth, so the clouds have the
  correct order with no sort.
- The vertex shader reads the cover and the rain at the place of the cloud. The cloud
  has the size 0 under a clear sky. It grows when the cover goes above its own limit.
- The colour is white at the top and grey at the base. The light of the sky fills the
  shade, so the base is not dark and not green. A low Sun gives the cloud warm colours.
- The clouds stay at their places. A front goes through them: the clouds grow at its
  front edge and get small at its back edge.

## The prototype

`studies/weather-study/weather.ts` adds the weather to the real Earth that
`createWorlds()` makes. Each material gets a small shader change with `onBeforeCompile`,
as the seasons and the Sun shadow have.

| Part | Change |
| --- | --- |
| Heap clouds | 450 solid clouds in 3 instanced meshes, in place of the puffs (`clouds.ts`). |
| High wisps | One thin sphere 24 m above the heap clouds, with streaks of noise. |
| Rain curtains | 360 soft columns in one instanced mesh. A column has the size 0 with no rain, and it is clear near the camera. |
| Grey layer | One sphere at the cloud height. Its shader reads the cover from the map and adds noise. From space it is white in the Sun. From below, a rain cloud is grey. |
| Puffs | The 1,050 puffs of the game stay for the comparison: the vertex shader gives each puff a size from the cover at its place. |
| Ground | A shadow under a cloud. Wet ground is darker and shines more. Fresh snow is white where the air is cold. |
| Water | A shadow under a cloud. Rain makes the water dull. |
| Plants | A shadow under a cloud, and a thin cover of fresh snow. The wind strength comes from the weather at the camera. |
| Rain | 2,600 short lines in a box of 44 m around the camera: one draw call. The wind leans them. |
| Snow, leaves, petals | `createSeasonAir()` of the game. Snow falls only under a snow cloud. |
| Sky, fog, light | Under a cloud the sky of Earth goes grey, the Sun light goes down to 28%, and the fog gets more dense in rain and in mist. |
| Mist | A higher fog density, and 150 soft discs on the low ground near the camera. |
| Rainbow | One square with a shader, 60 m from the camera: a circle of 42° around the point opposite to the Sun, and a faint second bow at 51°. |
| Thunder | A glow in the cloud layer at the place of the storm, three times in each 5 seconds. No bolt. |
| Stars | The cover at the camera goes into the visibility of the stars. The cloud layer hides the stars, the Sun and the Moon behind it. |

## What the weather and the season change

| System | With the weather | With the season | Proposal |
| --- | --- | --- | --- |
| Clouds | New heap clouds, high wisps, a grey layer under a front, rain curtains | The rain belt follows the Sun; more cloud in autumn | First |
| Rain and snow in the air | Rain under a rain cloud; snow where the air is cold | The season decides rain or snow | First |
| Sky, fog and light | Grey sky, soft light, shorter view; mist at dawn | Mist comes most in autumn | First |
| Ground | Cloud shadow; wet ground; fresh snow | The snow line moves forward with each snow | First |
| Water | Dull in the rain | The sea ice of the seasons stays | First |
| Plants | The wind from the weather | More wind in autumn and winter | First |
| Rainbow | After rain, opposite to a low Sun | Spring showers give the most | First |
| Stars and shooting stars | Only in a clear night sky | No change | First |
| Flight panel | The name of the weather | The name of the season | First |
| Sound | Soft rain, wind, a low rumble | Birds in spring, crickets in summer | Later |
| Creatures | Shelter under trees in the rain; ducks stay out | Animals of each season | Later |
| Sticker book and postcard | "Fly through a rainbow", "Find the snow" | A sticker for each season | Later |
| Rivers | No change | A full river in spring needs new terrain | Open |
| The flight | The wind does not push the fairy | No change | Open |

"First" is in the prototype of this study. "Later" and "Open" have no prototype.

## Two ways to make the weather

| | A · A weather map | B · One sky |
| --- | --- | --- |
| Where | Each place has its own weather. | The whole planet has one weather at a time. |
| The place | Rain in the jungle, a dry desert, snow near the pole | Rain in the desert too |
| From space | Fronts, a rain belt and clear land | All cloud or all clear |
| The fairy | Sees a shower far away, and flies into it and out of it | Cannot leave the rain |
| Cost | One texture; a shader change in the ground, the water, the plants and the clouds | A clock; the fog, the light and the rain only |

The live view has option B: each place takes the cloud and the rain of one fixed place at
30° N. The warmth of the place still decides rain or snow.

## The clips

The clips run in the lab of the feature ideas study
(`studies/feature-ideas-study/lab.ts`): the renderer, the worlds, the sky, the fairy and
the light of the game. `studies/weather-study/clips.ts` sets the day, the hour and the
weather on each frame. `studies/weather-study/weather-study-capture.mjs` asks the page
for each frame, 30 frames in each second, and makes a WebM clip with ffmpeg.

The game makes a new Earth at each visit. The capture page gives `Math.random` a seed
(5), so each run records the same Earth. `SEED=7` before the command gives a different
Earth.

Each clip puts its weather over the camera with a stamp: a weather with a soft edge at a
place. So a clip is the same at each run. Outside the stamp, the model gives the
weather.

| Clip | What it shows |
| --- | --- |
| W1 | Earth from space: one year of the seasons and 12 minutes of the fronts. |
| W2 | One leaf forest at 32° N in each season: a shower with a rainbow, a heat shower far away, wind and rain, snow. |
| W3 | The same day in the jungle, the desert, the leaf forest and at 50° S. |
| W4 | A shower passes: cloud, rain, wet ground, Sun, rainbow. |
| W5 | Morning mist in autumn, from 07:20 to 10:30. |
| W6 | The fairy flies 240 m to the east, into a shower and out of it. |
| W7 | The first snow at 36° N at the end of autumn: the ground goes white. |
| W8 | A warm night: stars above, and thunder far away. |
| W9 | The clouds, before and after: the puffs of the game, then the new clouds in fair weather, under a front and at dusk. |
| W10 | A rain curtain far away, the tops of the clouds from 60 m, and the low Sun. |

Each clip is 10 s to 14 s at 1280 × 720. The clips and the pictures are in
`public/studies/weather/`. Run the capture again after a change:

```
node studies/weather-study/weather-study-capture.mjs "path/to/chrome.exe" W1,W2
STILLS=1.6,4.6,7.6,10.6 node studies/weather-study/weather-study-capture.mjs "path/to/chrome.exe" W2,W9 --still
```

The second line makes the pictures of sections 03 and 04 of the page.

## Recommendation

**A weather map that follows the place and the season.**

- Earth is the real world of the game, so its weather follows the rules of the real
  world: the belts, the seasons, the hour and the fronts.
- The rules use the landscape and the seed of each visit. A new Earth has new weather,
  and no place is fixed.
- The weather stays calm: a soft grey sky, a glow for the thunder, and no danger.

### The rules for a calm game

- The weather does not push the fairy, and it cannot make a flight fail.
- The rain does not hide the ground: the fog of a full rain still shows 150 m.
- A visit to Earth starts with the weather of the map (decision 4). The study proposed a
  fair sky at the place of arrival; that proposal is not selected.
- The flower guide and the route home are above the weather: they do not fade in fog.
- Thunder is a glow far away. It has no bolt and no bang.
- With reduced motion, the rain and the snow stand still, as the petals of the seasons
  do, and the thunder does not flash.

### The change in the game, in five steps

1. **The model and the map.** A new `src/weather.ts` with the model of this study and
   `tests/weather.test.ts`. It makes the weather map and updates one sixteenth of it on
   each frame. `World` gets a `weather` field for Earth, as it has `season`.
2. **The clouds.** `buildClouds()` in `src/worlds.ts` makes the new clouds of Earth in
   place of the puffs: the heap clouds, the high wisps, the grey layer and the rain
   curtains, in `world.clouds`. `regenerateWorld()` makes the model again with the new
   seed. The other worlds keep their puffs.
3. **Rain and snow.** A rain mesh next to `src/season-air.ts`, with half the lines on a
   phone. `fallAt()` of `src/seasons.ts` gets the weather: snow only under a snow cloud,
   and more leaves in the wind.
4. **The sky, the light and the ground.** A weather term in `updateEnvironment()` of
   `src/main.ts` for the fog, the sky colour, the light, `skyVisibility` and
   `foliageWind`. A shader change in `buildGround()` and in `addFoliage()`, next to the
   season change. The rainbow and the mist.
5. **The sound and the life.** The sound of the rain and the wind, the soft rumble, the
   creatures and the sticker tasks, each as its own change. The flight panel text is not
   selected (decision 7).

## Cost

| Part | Cost |
| --- | --- |
| The map | 8,192 points, 32 kB. The model takes 12 ms for the whole map in Node on the PC of the study. One sixteenth on each frame is less than 1 ms. |
| Heap clouds | 450 clouds of 480 triangles: 216,000 triangles in 3 draw calls. The puffs of today have 84,000 triangles in 1 draw call, with no depth write. |
| Draw calls | 3 for the heap clouds, 1 for the wisps, 1 for the rain curtains, 1 for the grey layer, 1 for the rain, 1 for the mist, 1 for the rainbow. The puffs go: 1 less. The snow uses the draw call of the seasons. |
| Shaders | One texture read in the ground, the water, the plants and the clouds. The grey layer has 5 noise reads for each pixel, and the wisps have 3. |
| Phone | Not measured. The proposal is 225 heap clouds, 1,300 rain lines, no wisps, 1 noise read in the grey layer, and a map of 64 × 32. |

## Decisions to make

1. How does the game make the weather: a weather map (recommended), one sky, or no
   weather?
2. Which weather does Earth get: rain, snow that stays, wind, mist, a rainbow, thunder
   far away?
3. How fast does the weather change? The recommendation: a shower passes a place in
   about 1 minute.
4. Which sky does a visit to Earth start with? The recommendation is a fair sky at the
   place of arrival.
5. How dark is the rain? The recommendation is the look of the study.
6. What does the thunder do? The recommendation is a glow far away with a soft, low
   rumble.
7. Which other systems follow the weather and the season?
8. Which clouds does Earth get? The recommendation is all the new kinds.
9. What comes next? The recommendation is the five steps above.

## Limits of this study

- The clips use study code, not game code. The game code needs its own design, tests and
  smoke scripts.
- Each clip puts its weather over the camera. The weather of the model shows in clip W1
  and in the live view.
- The study did not measure the frame time or test a phone.
- The study calculates the whole map on each frame of a clip, and one quarter of it on
  each frame of the live view.
- The rain is in a box around the camera. Rain far away shows only as a grey cloud and a
  dark ground: no rain curtain.
- The shadow of a cloud is directly below the cloud, at each height of the Sun.
- The heap clouds do not move. A front goes through them, and they change size.
- A rain curtain is a column with a soft edge. Near the camera it is clear, and the rain
  lines take its place. In snow it is a pale column.
- At dusk the base of a heap cloud is brown, not gold.
- The new clouds are for Earth only. The other worlds keep their puffs.
- The mist does not flow, and it does not follow the shape of a valley.
- The study has no sound and no change to the creatures.
- The grey layer is one thin sphere. A flight through it shows the mist of the game for
  the cloud height, as today.
- A place with one sky (option B) gets no morning mist in the live view.
- Earth does not move on its orbit in the clips. The study turns the axis for the day of
  the year, as the seasons study does.
- The live view needs a graphics card with WebGL 2.

## Verification

- `npx tsc --noEmit -p .` passes for the files of the study.
- `npx vitest run studies/weather-study` passes: the belts, the rain belt and the Sun,
  rain or snow, snow in front of the snow line, the heat showers, the mist, the
  rainbow, the direction of the fronts, the wet ground, the names, and a clip and a
  picture for each clip of the page.
- `node studies/weather-study/weather-study-smoke.mjs "path/to/chrome.exe"` opens the
  page and the live view, and checks the weather at the camera with each setting, and the
  switch between the new clouds and the puffs.
- The capture script made the ten clips and the pictures with no page errors. Each
  picture was checked by eye.
