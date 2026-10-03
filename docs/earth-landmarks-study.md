# Twelve wonders, on one small Earth: Earth landmarks study

Status: a study, 3 October 2026. No decision yet. Open `/studies/earth-landmarks-study.html`
on the Vite server. The study does not change the game or saved game data. It saves its
own answers as `fairy-earth-landmarks-study-v1`. The line numbers below describe the game
on 3 October 2026 (commit `b15d508`).

Earth in the game has meadows, rivers, hills, mountains and snow. This study looks at
twelve famous landscapes of the real Earth and builds each one on the Earth of the game,
with study code. Each landmark has a clip from the engine of the game and a photo of the
real place.

## What to review

- **The player** shows the clip of the selected landmark. The chips above it select a
  landmark; **Whole Earth** shows the twelve landmarks from space.
- Each clip is 14 s. The first 4.5 s are a view from the air. Then the camera of the game
  follows the fairy through the landmark.
- **Fly it live** runs the same Earth in live 3D. **Free flight** gives the keys to you:
  W and S climb and descend, A and D turn, Shift boosts. The fairy cannot fly through a
  rock tower or an iceberg.
- **01 / The real place and the game** shows a photo of each real place next to the game.
- **03 / How a landmark is made** compares one landmark on the mesh of the game and on a
  fine patch.
- **06 / Decisions to make** keeps your answers in this browser. **Copy answers** copies
  them for the chat. **Save study** exports them as JSON.

## Earth in the game today

| Finding | Evidence |
| --- | --- |
| One terrain rule for all of Earth | The Earth branch of `createTerrain()` (`src/terrain.ts:32-40`) adds three noise layers, river channels and ridges. Each place is a mix of sea, meadow, river, hill and mountain |
| Four ground colours | `buildGround()` (`src/worlds.ts:294-297`): sand below 0.7 m, grass, stone above 8.5 m, snow above 12 m and where the latitude is more than 64° |
| One tree | `buildVegetation()` (`src/worlds.ts:342-387`) puts one cone tree and grass on ground from 1.1 to 8.5 m |
| Cells of 3.4 m | The ground is a sphere of 512 × 256 cells (`src/worlds.ts:279`). The radius of Earth is 275 m (220 × 1.25), so one cell is 3.4 m at the equator |
| One water, at the sea level | One sphere at height 0 with one colour, `0x208dad` (`src/worlds.ts:317-328`). Ground below 0 is under water. `groundHeight()` (`src/terrain.ts:72-74`) stops the fairy at the water |
| The flight reads the same terrain | `surfaceRadius()` (`src/worlds.ts:105-109`) reads `world.sample`. `stepFlight()` (`src/flight.ts`) and the camera use it |
| A new landscape at each visit | `animate()` calls `regenerateWorld()` with a random seed when the fairy comes back below the clouds (`src/main.ts:703-706`, `src/worlds.ts:464-477`). The Moon and Blossom Haven keep one landscape |
| A small world | Earth is 1,728 m around. The clouds start at 42.5 m, and the air stops at 97.5 m |

## The method

The study adds the landmarks to the Earth of the game after `createWorlds()` made it.
The code is in `studies/earth-landmarks-study/`.

1. **A fixed Earth.** `prepareEarth()` (`tours.ts`) calls `regenerateWorld(earth, 20261003)`,
   so the landscape is the same at each load.
2. **A place for each landmark.** `findPlaces()` (`stamp.ts`) tests 900 fixed random
   places for each landmark. It reads the height of the game terrain on three rings
   around the place. A land landmark wants dry ground, a sea landmark wants water, and a
   coast landmark wants land to the north and water to the south (the search turns the
   landmark in 12 steps). The ice wants a place within 14° of a pole. Two patches do
   not overlap.
3. **The terrain.** `stampLandmarks()` replaces `earth.sample`. Inside 66% of the patch
   radius the height is the height rule of the landmark (`shapes.ts`). From 66% to 90%
   the two heights blend. The flight, the camera and the clip rails read this terrain.
4. **The ground of the game.** The vertices of the game ground inside a patch go 40 m
   down, and its trees and grass get a size of 0. The study makes the animals again on the
   new ground, so they keep away from the patches.
5. **The patch mesh.** A square grid with cells of 0.6 to 1.1 m, cut to a circle, with a
   colour for each vertex from the colour rule of the landmark. At the edge the colour is
   the colour of the game ground. The material is the material of the game ground.
6. **The objects.** `scenery.ts` adds what a height and a colour cannot make: trees,
   stone columns, boats, penguins, the lagoon water, waterfalls, steam and a geyser.

The game has three rules that the study uses with no new code:

- Ground below 0 is water. The river of the canyon, the lake of Mount Fuji, the pond of
  the oasis, the pool of Angel Falls and the fjord are ground below 0.
- The terrain rule gives the collision. The fairy cannot fly through a butte.
- `createSunShading()` (`src/sun-shading.ts`) finds each new lit material at each frame,
  so the patches and the objects are dark on the night side.

### The patch against the mesh of the game

The page shows Monument Valley two times. With cells of 3.4 m, as the ground of the game,
the towers are soft cones and the thin spires are gone. With cells of 0.9 m the towers
have steep walls. A height mesh cannot make a vertical wall or a cave; the walls are steep
slopes with long triangles.

## The twelve landmarks

Size: S is less than one day, M is one to three days, and L is more than three days, for
the game code of one landmark after the patch method is in the game.

| Landmark | Real place | Needs | Patch radius | Cell | Parts | Size |
| --- | --- | --- | --- | --- | --- | --- |
| L1 Grand Canyon | Arizona, United States | Dry land | 78 m | 1 m | Ground | S |
| L2 Mount Fuji | Japan | Dry land | 86 m | 1.1 m | Ground, 206 trees | M |
| L3 Sahara dunes | Erg Chebbi, Morocco | Dry land | 75 m | 1 m | Ground, 13 palms | S |
| L4 Ha Long Bay | Vietnam | Open sea | 78 m | 0.9 m | Ground, 3 boats | M |
| L5 Coral atoll | Maldives | Open sea | 72 m | 1 m | Ground, own water, 30 palms | M |
| L6 Antarctic ice | Weddell Sea, Antarctica | Snow near a pole | 75 m | 0.9 m | Ground, 30 penguins | M |
| L7 Angel Falls | Venezuela | Dry land | 74 m | 0.9 m | Ground, moving water, mist, 190 trees | L |
| L8 Monument Valley | Arizona and Utah, United States | Dry land | 82 m | 0.9 m | Ground | S |
| L9 Giant's Causeway | Northern Ireland | A coast | 48 m | 0.8 m | Ground, 427 columns | M |
| L10 Geirangerfjord | Norway | A coast | 84 m | 1.1 m | Ground, moving water, 27 trees | M |
| L11 Rainbow hot spring | Yellowstone, United States | Dry land | 52 m | 0.6 m | Ground, steam, geyser | M |
| L12 Rainbow mountains | Zhangye Danxia, China | Dry land | 74 m | 1 m | Ground | S |

### L1 · Grand Canyon

The Colorado River cut the real canyon 446 km long and more than 1,800 m deep.

- Ground: a bent line gives the river. The distance from the line gives the height, in
  seven steps of 2.8 m, with a noise field for the side canyons. The rim is at 15.5 m.
- Colour: one colour for each rock layer, from dark red at the river to cream at the rim.
- Limit: the cut closes at each end, so the river starts and stops inside the patch.

### L2 · Mount Fuji

Fuji is a volcano of 3,776 m with snow for most of the year.

- Ground: one cone 44 m high with a crater and gullies. A lake below sea level at its foot.
- Colour: snow above about 27 m, lower in the gullies; blue rock; dark forest; grass.
- Objects: 36 pink cherry trees around the lake and 170 cone trees on the lower slopes.
- Limit: the top is in the cloud layer of Earth. The fairy sees white mist there.

### L3 · Sahara dunes

The dunes of Erg Chebbi are up to 150 m high.

- Ground: a wave with a gentle side and a steep side, 26 m from crest to crest, bent by a
  noise field. One larger dune. An oasis with a pond below sea level.
- Colour: pale gold on the gentle side, orange on the steep side, green around the pond.
- Objects: 13 palm trees.
- Limit: the game has no shadows from the ground. The dunes are flatter to the eye than
  the real dunes at a low Sun.

### L4 · Ha Long Bay

About 1,600 limestone islands stand in the real bay.

- Ground: 22 towers at fixed places, 13 to 32 m high. Each is an oval with steep sides.
- Colour: grey and pale limestone, a dark band at the water, jungle on the top.
- Objects: three boats with orange sails.
- Limit: the sides are steep slopes, so a tower looks like a cloth over a post. Real
  towers have vertical walls, caves and trees on ledges. This landmark needs rock objects
  in place of the height mesh to look right.

### L5 · Coral atoll

The Maldives have 26 atolls. Each atoll is a ring of reef around a lagoon.

- Ground: a ring with a radius of about 30 m. Sand islands on parts of the ring, a lagoon
  floor 1 to 2.3 m deep, and a steep drop to 7 m outside.
- Colour: white sand, green on the islands, and coral in pink, orange, purple and yellow.
- Own water: the water of the game goes 9 m down inside 42 m. A clear disc at the sea
  level takes its place: pale over shallow ground, and solid sea colour over deep ground.
- Objects: 30 palm trees.
- Limit: the ducks of the game use the water sphere of the game, not the lagoon.

### L6 · Antarctic ice

A table iceberg breaks from an ice shelf; about nine tenths of it are below the water.

- Ground: a shelf 8 m high with a wavy front, and 15 icebergs. Each iceberg is a polygon
  with five to seven sides, with a flat or a pointed top.
- Colour: white tops, blue sides, darker blue at the water.
- Objects: 30 penguins, each of three parts.
- Place: near a pole, where the ground of the game is snow. The Sun is low there, so the
  light is pink.
- Limit: the icebergs are ground, so they do not move.

### L7 · Angel Falls

Angel Falls drops 979 m from the edge of a table mountain. It is the highest waterfall
on Earth.

- Ground: a plateau 28 m high with a cliff, a slope of jungle under it, a notch in the
  cliff, a pool and a river below sea level.
- Objects: a stream on the top and the waterfall are two strips with a picture of white
  streaks that moves. Seven soft puffs make the mist. 190 jungle trees.
- Limit: the game has no water above the sea level today. The fairy flies through the
  waterfall with no effect, and the waterfall has no sound.

### L8 · Monument Valley

Sandstone buttes stand up to 300 m above the floor of the real valley.

- Ground: eight blocks with a square outline. Each has a slope of fallen rock for 36% of
  its height, and a steep cap. West Mitten and East Mitten each have a thin thumb.
- Colour: red floor with grey-green dots, darker red layers on the caps.
- Limit: the walls are steep slopes, as for Ha Long Bay. On square blocks this looks right.

### L9 · Giant's Causeway

About 40,000 basalt columns stand at the real coast. Most have six sides.

- Ground: a green headland and a tongue of low ground into the sea.
- Objects: 427 columns, one instanced mesh. Each column is a prism with six
  sides, 1.4 m wide, on a honeycomb grid. Each has its own top height in steps of 0.3 m
  and its own grey. The flight height is the smooth top of the columns.
- Limit: one column is about three times the real width. From the air the landmark is small.

### L10 · Geirangerfjord

A glacier cut the real valley, and the sea filled it. The fjord is 15 km long.

- Ground: a mountain block of 30 to 43 m with a bent channel 5 m below sea level. The
  channel is open to the sea at the south end.
- Objects: four thin waterfalls on the walls, and 27 cone trees on the gentle ground.
- Limit: it needs a coast. The walls are in the cloud layer above 42 m.

### L11 · Rainbow hot spring

Grand Prismatic Spring is about 110 m wide. Living things that like heat make its rings.

- Ground: flat pale ground at 3 m with a shallow bowl, and a small mound for the geyser.
- Colour: the distance from the centre gives the colour: blue, turquoise, green, yellow,
  orange, red-brown. The edge has thin arms, and rust lines run out from it.
- Objects: 14 soft puffs of steam. The geyser is 110 points on a throw path; it goes up
  for 4.2 s in each 8 s.
- Limit: the colours need a cell of 0.6 m. The pool is coloured ground with no water
  surface.

### L12 · Rainbow mountains

Layers of sandstone and minerals give the real hills their stripes.

- Ground: ridges up to 16 m from a noise field, with round crests.
- Colour: eight stripe colours. The stripe changes with the height and along one
  direction, as tilted layers.
- Limit: a stripe is two or three cells wide. From far away the stripes blend.

## Cost

Measured in the lab on the computer of the study, at 1280 × 720.

| Item | Value |
| --- | --- |
| Triangles of the twelve patches | 462,946 |
| Triangles of the ground and the water of the game Earth | About 343,000 |
| Objects of the landmarks | 954 instances, puffs and strips, in 48 meshes and sprites |
| Time to make the Earth of the study (the game Earth, the search, the patches and the objects) | 0.65 s |
| Draw calls of one frame over a landmark, for the whole scene | 93 to 96 |
| Triangles of one frame over a landmark, for the whole scene | 774,000 to 797,000 |

- All twelve patches are in the scene at the same time. The game can make a patch only
  when the fairy is near it, or use a larger cell on a phone: a cell of 1.4 times the
  size has half of the triangles.
- The place search reads the terrain up to 33,300 times for each landmark (900 places × 37
  heights).

## More real places

The same method can make these places. The study did not build them.

| Place | Where | What it needs |
| --- | --- | --- |
| Uluru | Australia | One red rock on a flat plain. Ground only |
| Salar de Uyuni | Bolivia | A white salt plain that mirrors the sky. A mirror material |
| Victoria Falls | Zambia and Zimbabwe | A river that drops into a long gap. Water above the sea |
| Cappadocia | Türkiye | Thin rock cones with stone caps. Ground and objects |
| Pamukkale | Türkiye | White steps with blue pools. Water above the sea |
| Great Blue Hole | Belize | A dark round hole in a pale reef. The lagoon water of the atoll |
| Matterhorn | Switzerland and Italy | A sharp peak with four faces. Ground only |
| Kīlauea | Hawaii, United States | A crater with a lake of lava that glows at night. A glow material |
| Amazon River | Brazil | A wide river with loops in a flat forest. Ground and many trees |
| Rice terraces of Yuanyang | China | Hundreds of small flat steps with water. Water above the sea |

## Recommendation

Build the patch method first, then eight landmarks: L1, L2, L5, L6, L7, L8, L11 and L12.
They look the most different from each other and from the Earth of today.

1. **The patch, with L8, L1 and L12.** A new `src/landmarks.ts` with the place search, the
   terrain blend and the patch mesh. These three landmarks are ground only.
2. **Objects: L2 and L6.** The instance helper for trees and penguins.
3. **Own water and motion: L5, L11 and L7.** The lagoon water, the steam, the geyser and
   the waterfall.
4. **Find them.** From space the red desert, the white cone and the ice show clearly. A
   later step can add a sticker or a search star for each landmark.

The other four are good later. The towers of L4 look soft on a height mesh. The dunes of
L3 need shadows. The columns of L9 are small from the air. The fjord of L10 needs a coast.

## Decisions to make

1. Which landmarks do you want on Earth?
2. Where do the landmarks stand: all on each new Earth at places that a rule finds
   (recommended), on one fixed Earth, or a different set of three or four at each visit?
3. How sharp are the landmarks: a fine patch for each (recommended), only the ground of
   the game with cells of 3.4 m, or a finer ground for all of Earth?

## Photo credits

The photos of the real places come from Wikimedia Commons. Each file in
`public/studies/earth-landmarks/real/` is a copy 960 pixels wide, with no other change.

| Landmark | File on Wikimedia Commons | Author | Licence |
| --- | --- | --- | --- |
| L1 | Grand Canyon (Arizona, USA), Luftaufnahme -- 2012 -- 5964.jpg | Dietmar Rabich | CC BY-SA 4.0 |
| L2 | Lake Kawaguchiko Sakura Mount Fuji 4.JPG | Midori | CC BY 3.0 |
| L3 | Erg Chebbi in the evening light.jpg | Thomas Fuhrmann | CC BY-SA 4.0 |
| L4 | Vietnam 08 - 53 - Halong Bay (3171040702).jpg | McKay Savage | CC BY 2.0 |
| L5 | Maledives Atoll Lhaviyani (28800519036).jpg | dronepicr | CC BY 2.0 |
| L6 | Tabular-iceberg weddellsea hg.jpg | Hannes Grobe | CC BY-SA 4.0 |
| L7 | Salto del Angel-Canaima-Venezuela18.JPG | Diego Delso | CC BY 3.0 |
| L8 | Mittens at monument valley.jpg | Jon Sullivan | Public domain |
| L9 | Causeway-code poet-4.jpg | code poet on Flickr | CC BY-SA 2.0 |
| L10 | Geirangerfjord from Ørnesvingen, 2013 June.jpg | Ximonic (Simo Räsänen) | CC BY-SA 3.0 |
| L11 | Grand prismatic spring.jpg | Jim Peaco, National Park Service | Public domain |
| L12 | Colorful strata (Zhangye National Geopark).jpg | Terry Wu | CC BY-SA 2.0 |

The page gives a link to each file and to its licence. A share-alike licence (BY-SA)
applies to the photo and to a changed copy of the photo, not to the game.

## Limits of this study

- The landmarks use study code, not game code. The game code needs its own design, tests
  and smoke script.
- The study has one fixed Earth. The place search ran on this Earth only. On another
  landscape a coast landmark can get a poor coast.
- The worlds stand still in the clips. In the game Earth turns.
- The study did not test a phone. All twelve patches are in the scene at the same time.
- The game has no shadows from the ground. A canyon and dunes get their depth from the
  colours and from the light on each slope.
- The real sizes are much larger. Mount Fuji is 44 m high in the study: 1 m for 86 m.
- The clips have no sound.
- The live view needs a graphics card with WebGL 2. The Webb pictures of the sky load from
  the server.

## How the clips were made

The study uses the lab of the feature ideas study (`studies/feature-ideas-study/lab.ts`):
the renderer settings, the worlds, the sky, the Sun light, the fairy and the camera of the
game. `tours.ts` gives each landmark a view from the air and a flight path. The path keeps
a set clearance above the ground and goes around the towers, the icebergs and the buttes.

`studies/earth-landmarks-study/earth-landmarks-study-capture.mjs` asks the capture page
(`?capture`) for each frame, 30 frames in each second, and makes a WebM clip with ffmpeg.
Each clip is 14 s at 1280 × 720. The clips and the pictures are in
`public/studies/earth-landmarks/` (66 MB). Run the capture again after a change of a
landmark:

```
node studies/earth-landmarks-study/earth-landmarks-study-capture.mjs "path/to/chrome.exe" L1,L2
node studies/earth-landmarks-study/earth-landmarks-study-capture.mjs "path/to/chrome.exe" L8-coarse --still
```

A change of a source file reloads the page of the dev server. When this occurs during a
capture, run the capture of that landmark again.

## Verification

- `npx tsc --noEmit -p .` gives no error in the files of this study.
- `npx vitest run studies/earth-landmarks-study` passes: twelve landmarks, a photo credit
  for each, a clip and a picture for each, the main feature of each ground, and a place
  for each landmark with no overlap.
- The capture made the thirteen clips and pictures. Each picture was checked by eye.
