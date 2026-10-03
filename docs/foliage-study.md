# Each plant, a place to grow: foliage study

Status: accepted on 3 October 2026. The game has look B on both worlds, with all the
levers: climate belts on Earth and four gardens on Blossom Haven. See "In the game" below.
Open `/studies/foliage-study.html` on the Vite server. The controls of the study do not
change the game. It saves its own answers as `fairy-foliage-study-v1`.

In this document, "today" and the line numbers describe the game before the change, at
commit `b15d508`. The study page shows that game as **Before**.

This study proposes new trees and small plants for Earth and for Blossom Haven. It has 25
kinds of plants and three looks for each world. A look says which plants grow in which
part of the world. Each clip comes from the engine of the game: the real terrain, the
fairy and the light of the game, with the plants added by study code.

## What to review

- **The player** shows the clip of the selected look. The first row of chips selects the
  world. The second row selects **Today** or look **A**, **B** or **C**.
- The clips of Today, A and B of one world fly the same paths, so only the plants change.
  Each clip has a few cuts: a low flight through one zone for each cut, then a view from
  above.
- **Fly it live** runs the look in live 3D. **Free flight** gives the keys to you: W and S
  climb and descend, A and D turn, Shift boosts. Five switches turn the levers on and off:
  woods and glades, size and colour, wind, ground colours, and night.
- **01 / The plants** shows each plant with its name, and the fairy for the size.
- **02 / The looks** shows a picture of each look and its cost.
- **03 / The levers** shows three pictures of the same place, with one more lever in each.
- **06 / Decisions to make** keeps your answers in this browser. **Copy answers** copies
  them for the chat. **Save study** exports them as JSON.

## What the game has today

1. **Earth has one tree.** `buildVegetation()` (`src/worlds.ts`, line 342) makes one cone
   on a trunk in one green, and one grass tuft of three triangles. A computer gets 5,313
   trees and 21,252 tufts. A phone gets half.
2. **The spread is even.** The loop takes a random point on the planet. The point is good
   if its height is between 1.1 m and 8.5 m and no river is there. Then 38 of 100 points
   become a tree, and the others become grass. Earth has no woods and no glades. No tree
   grows above 58° of latitude.
3. **The grass is thin.** One tuft stands on each 45 m² of land. Blossom Haven does not
   call `buildVegetation()`, so it has no grass.
4. **The candy is one mix.** `buildCandyEcosystem()` (`src/candy.ts`, line 8) gives each
   point a kind by its number: two of five are lollipops, one is a candy cane, one is a
   marshmallow, and one is a gumdrop. The result is 359 lollipops, 227 canes, 250
   marshmallows and 703 gumdrops, with the same mix in each place.
5. **Colour repeats.** Earth trees have one colour. A lollipop takes one of four colours
   by its number. The only difference between two plants of a kind is one scale factor.
6. **Nothing moves.** The plants stand still. Near the ground, only the soda bubbles and
   the creatures move.
7. **The contrast on Blossom Haven is low.** The grass is pink (`0xe7a0ba`), and the candy
   is pink, cream and pastel. The name of the planet is Blossom Haven, but only the cottage
   has a flower.
8. **The cost is not the same on the two worlds.** The plants of Earth use three draw
   calls and 233,772 triangles. The candy of Blossom Haven uses seven draw calls and
   774,652 triangles for 1,539 plants, because each lollipop has two spiral tubes of 700
   triangles. Each instanced mesh has no culling: the game draws the plants of the far
   side of the planet too.
9. **Creatures walk around the plants.** `buildVegetation()` adds each tree to
   `CreatureObstacles`, and `candyObstacles()` (line 389) does the same for the candy.

## The plants

Each plant is one geometry. Its parts are merged, so all the plants of one kind on a
planet are one draw call. The colours are vertex colours. Three more values go with each
vertex in the attribute `aFoliage`:

- **x, paint**: 1 on the leaves or the candy, 0 on the trunk. The instance colour paints
  only the parts with 1. One broadleaf tree geometry gives a green tree, a pink tree in
  blossom and a red autumn tree.
- **y, glow**: how much the part glows at night.
- **z, sway**: how far the wind moves the vertex, from 0 at the ground to the `flex` of
  the plant at its top.

| Plant | World | Triangles | Painted part | Notes |
|---|---|---|---|---|
| Pine | Earth | 31 | The needles | Three cones. The tree of today has one cone. |
| Snow pine | Earth | 31 | None | Green at the base of each cone, white at the tip. |
| Broadleaf tree | Earth | 120 | The crown | Three leaf clumps with flat faces. |
| Birch | Earth | 82 | The crown | A thin white trunk. |
| Palm | Earth | 224 | The seven leaves | A bent trunk and three coconuts. |
| Acacia | Earth | 82 | The crown | Two flat crowns, for the savanna. |
| Cactus | Earth | 350 | None | Two arms and a pink flower. |
| Winter tree | Earth | 222 | None | Bare branches with snow. |
| Bush | Earth | 72 | All | |
| Fern | Earth | 56 | All | Seven leaves that bend down. |
| Flower patch | Both | 84 | The six flower heads | White, yellow, red, violet or pink. |
| Grass tuft | Both | 7 | All | Sugar grass on Blossom Haven. |
| Reeds | Earth | 50 | None | On river banks. |
| Rock | Earth | 72 | All | |
| Toadstool | Both | 216 | The cap | Small on Earth. Small and giant on Blossom Haven, where it glows. |
| Spiral lollipop | Blossom Haven | 454 | The disc | The lollipop of today, with a spiral of 180 triangles. |
| Ball lollipop | Blossom Haven | 404 | The ball | |
| Candy cane | Blossom Haven | 448 | None | The cane of today. |
| Cotton candy tree | Blossom Haven | 494 | The six puffs | Pink, blue, lilac or mint. |
| Ice cream tree | Blossom Haven | 436 | The first scoop | |
| Blossom tree | Blossom Haven | 488 | The five puffs | Pink, or white on the hills. |
| Giant flower | Blossom Haven | 540 | The eight petals | The heart glows at night. |
| Gumdrops | Blossom Haven | 105 | All | Three gumdrops. |
| Marshmallows | Blossom Haven | 72 | All | |
| Sugar crystal | Blossom Haven | 72 | All | Four prisms. It glows at night. |

The plants are in `studies/foliage-study/species.ts`.

## The looks and their zones

A **zone** is the theme of one part of a world. It has a list of trees, a list of small
plants, a tree density in a wood and in a glade, and a grass colour. A rule gives the zone
of each place. The rule reads only the direction of the place on the planet, the terrain
sample and four noise fields of the seed. Thus the plants, the grass colour and the unit
tests agree. The zones are in `studies/foliage-study/zones.ts`.

### Earth A: Mixed wood

One zone for all the land below 59° of latitude: broadleaf trees, pines and birches, with
grass, flowers, bushes and rocks. The look has all the levers, but no theme.

### Earth B: Climate belts (recommended)

A place has a value `cold`: the absolute latitude as the y of the unit sphere, plus 0.05
for each metre above 4.5 m, plus a small noise. Mountains are colder, so pines grow on a
high hill in the leaf forest.

| Zone | Rule | Trees | Small plants |
|---|---|---|---|
| Palm beach | `cold` below 0.3, land below 1.4 m | Palm | Dry grass, rock |
| Jungle | `cold` below 0.3, wet | Palm, large broadleaf tree | Fern, bush, red flowers |
| Savanna | `cold` below 0.3, between wet and dry | Acacia | Dry grass, rock, bush |
| Desert | `cold` below 0.3, dry | Cactus | Rock, dry grass |
| Leaf forest | `cold` from 0.3 to 0.56 | Broadleaf tree, birch, pine | Grass, flowers, bush, rock |
| Pine forest | `cold` from 0.56 to 0.74 | Pine, birch, snow pine | Bush, grass, rock, mushroom |
| Snow line | `cold` from 0.74 to 0.86 | Snow pine | Rock, grass |

Wet and dry come from a moisture noise field. On the landscape of the study, the plan has
1,561 trees in the pine forest, 1,542 in the leaf forest, 948 in the jungle, 336 at the
snow line, 199 in the savanna, 198 in the desert and 123 on the beaches.

### Earth C: Four seasons

Four lands around the planet, each a quarter turn: spring (pink and white blossom, tulips),
summer (deep green), autumn (red, orange and gold trees, mushrooms, ochre grass) and
winter (snow pines, bare trees, white ground). This look is a storybook, not the real
Earth. See "The seasons study" below.

### Blossom Haven A: Sweet shop

One zone for all the land: spiral lollipops, ball lollipops, candy canes, cotton candy
trees and ice cream trees, with gumdrops, marshmallows, sugar grass and pastel flowers.

### Blossom Haven B: Four gardens (recommended)

| Zone | Rule | Trees | Small plants | Grass |
|---|---|---|---|---|
| Lollipop grove | Garden field between -0.26 and 0.26, and all the land near the cottage | Spiral lollipop, ball lollipop, candy cane | Gumdrops, sugar grass, flowers | Pink, as today |
| Cotton candy orchard | Garden field above 0.26 | Cotton candy tree, ice cream tree | Marshmallows, sugar grass, gumdrops | Peach |
| Mushroom glade | Garden field below -0.26 | Giant toadstool | Toadstool, bell flowers, sugar grass | Lilac |
| Crystal peaks | Land above 4.6 m | Sugar crystal | Marshmallows, sugar grass | Mint |

The cottage keeps the candy of today around it, to a distance of about 55 m. The plan has
685 trees in the grove, 436 in the glade, 429 in the orchard and 267 on the peaks.

### Blossom Haven C: Blossom orchard

| Zone | Rule | Trees | Small plants | Grass |
|---|---|---|---|---|
| Candy lane | Near the cottage | Spiral lollipop, candy cane, blossom tree | Gumdrops, flowers, sugar grass | Pink |
| Flower meadow | Land below 2 m | Giant flower | Flowers, mint-green grass | Mint green |
| Blossom orchard | Land from 2 m to 4.3 m | Pink blossom tree, giant flower | Flowers, sugar grass | Light pink |
| White blossom hills | Land above 4.3 m | White blossom tree, giant toadstool | White flowers, lilac grass, marshmallows | Light lilac |

## The levers

1. **Woods and glades.** A noise field (`fields.wood`) gives each place a value from glade
   to wood. The chance of a tree goes from the `open` value of the zone to its `wood`
   value. Small plants are more frequent in a glade. Two trees do not stand in the same
   cell of 2.6 m.
2. **Size and colour.** Each plant takes a size in the range of its kind, a lean of at
   most 4°, a turn, and one colour of its palette with a small change of hue and
   lightness. The colour is the instance colour, with no new geometry.
3. **Wind.** The vertex shader moves each vertex by its sway value, with a phase from the
   position of the plant. The cost on the processor is one uniform for each frame.
4. **Ground colours.** The grass vertices of the ground mesh take the colour of their
   zone, and the colours of two zones mix at their border. The sand, the stone and the
   snow of `buildGround()` (line 272) stay.
5. **Night glow.** On Blossom Haven, the fragment shader adds the colour of the glow
   parts as light, in proportion to the night value of `daylightAt()`.

The material is one `MeshStandardMaterial` with three small changes in `onBeforeCompile`
(`foliageMaterial()` in `studies/foliage-study/scene.ts`). The planet shadow of
`src/sun-shading.ts` works with it: that code keeps an earlier `onBeforeCompile`.

## The cost

The numbers are for a computer, from the capture of the clips. "Time to plant" is the time
of `plan()` in the browser. It changes with the load of the computer.

| Look | Trees | Small plants | Draw calls | Triangles | Time to plant |
|---|---|---|---|---|---|
| Earth, today | 5,313 | 21,252 | 3 | 233,772 | - |
| Earth A, Mixed wood | 5,465 | 16,410 | 8 | 1,056,461 | 90 ms |
| Earth B, Climate belts | 4,907 | 11,210 | 14 | 958,972 | 95 ms |
| Earth C, Four seasons | 5,468 | 13,821 | 12 | 1,262,169 | 130 ms |
| Blossom Haven, today | 586 | 953 | 7 | 774,652 | - |
| Blossom Haven A, Sweet shop | 1,887 | 4,505 | 9 | 1,062,716 | 45 ms |
| Blossom Haven B, Four gardens | 1,817 | 4,156 | 11 | 815,905 | 30 ms |
| Blossom Haven C, Blossom orchard | 1,764 | 4,826 | 9 | 1,041,602 | 35 ms |

- **Earth B has four times the triangles of today**, with fewer trees. The small plants
  are the largest part: a bush or a rock has 72 triangles, and the grass tuft of today has
  three.
- **Blossom Haven B costs the same as today**, with four times the plants. The spiral of
  the lollipop went from 700 triangles to 180.
- A whole frame of the clip of Earth B has 97 draw calls and 1.45 million triangles. The
  frame of today has 86 and 0.72 million. The frames include the other worlds, the sky
  and the fairy.
- **A phone gets half the candidate points**, thus half the plants. This is the rule of
  today.

If a phone is slow, split each kind of plant into sectors of the planet (for example the
20 faces of an icosahedron). Each sector is one instanced mesh with its own bounding
sphere. Then three.js does not draw the sectors behind the camera, and the game can hide
the sectors behind the horizon. The draw calls go up, and the triangles go down by more
than half. The study did not build this.

## How the clips were made

The study uses the lab of the feature ideas study
(`studies/feature-ideas-study/lab.ts`): the renderer settings, the worlds, the sky, the
fairy, the camera and the light of the game. The study code then does this:

- **One landscape.** Earth has a new landscape at each visit in the game. The study calls
  `regenerateWorld()` with the seed 23, so each clip is the same at each run. Blossom
  Haven has one landscape in the game too.
- **The plan** (`planting.ts`) has no scene and no renderer. It takes one candidate point
  for each 7.5 m² of the planet, asks the rule for the zone, and gives the position, the
  size and the colour of each plant.
- **The scene** (`scene.ts`) hides the plants of the game, adds one instanced mesh for
  each kind of plant, and paints the grass. When the look changes, it restores all of it.
- **The places** (`places.ts`) of each cut come from a search with a seed: 80 m of dry
  land with no steep hill, in the zone, in a wood. The view from above starts at the place
  with the most land ahead.
- **The camera** of a low cut is the follow camera of the game, but higher above the
  fairy, to show the ground. Before each cut, the planet turns so the Sun is 34° above the
  place. The night cuts of Blossom Haven put the Sun 24° below the horizon.
- **The plant sheets** stand on a flat lawn, because the terrain has no flat place of
  48 m.
- **The capture** (`foliage-study-capture.mjs`) asks the page for each frame, 30 in each
  second, and sends the frames to ffmpeg. It also writes the numbers of each look to
  `public/studies/foliage/stats.json`.

## In the game

The game has look B on both worlds. The changes:

1. **`src/foliage/`** has the plants (`species.ts`), the zones (`zones.ts`), the plan
   (`planting.ts`) and the scene code (`build.ts`). The study reads the same files.
2. **`buildGround()`** (`src/worlds.ts`) calls `buildFoliage()` for Earth and for Blossom
   Haven, in place of `buildVegetation()` and of the candy loop. Each kind of plant is one
   instanced mesh with the name `foliage-<kind>`. The grass vertices take their colour
   from `groundColour()`.
3. **Creatures.** `buildFoliage()` gives `CreatureObstacles` the footprint of each tree,
   bush, rock and candy. Grass, flowers, ferns and reeds are no obstacle.
4. **`buildCandyEcosystem()`** (`src/candy.ts`) keeps the soda bubbles and the pegasus
   foals only.
5. **The loop of `src/main.ts`** sets the time of the wind (it stops with reduced motion)
   and the night glow of Blossom Haven.
6. **The flight panel** names the belt or the garden below the fairy, for example
   "Pine forest" or "Mushroom glade · sparkling soda rivers".
7. **The sparkle rings** (`src/rings.ts`) keep away from tall plants only: a plant below
   1.5 m stays under the rings.
8. **A phone** gets half the plants, with all the kinds and all the levers.

The study keeps the plants from before in `studies/foliage-study/before.ts`.

Not done: the split of each kind into sectors of the planet (see "The cost"), and a
measurement on a phone.

## Limits

- **Creatures.** In the clips, the creatures do not know the new plants. A creature can
  stand in a new tree in a clip. In the game, they walk around the plants.
- **Flight.** The fairy flies through a tree, as in the game of today. The new trees are
  taller: the palm and the ice cream tree reach 7 m.
- **Earth changes at each visit.** The belts stay at their latitudes. The jungle, the
  savanna and the desert follow the moisture field of the seed, so they move.
- **The landing meadow.** `meadowNormal()` puts the first landing of the player between
  27° south and 27° north: in look B, a jungle, a savanna, a desert, a beach or a leaf
  forest.
- **Sticker tasks.** The sticker book study has search tasks, for example "Find a duck".
  The zones make new tasks possible ("Find a cactus"), but no task uses them yet.
- **The time to plant** is 30 ms to 130 ms on a computer. Earth plants again at each
  visit, during the flight in. Measure a phone before the release.

## The seasons study

The seasons study (`docs/seasons-study.md`, field study 19) proposes real seasons: the
time of the year and the latitude give the season. This has two results for this study:

- **Look C of Earth conflicts with it.** Four seasons by place and seasons by time
  cannot both be in the game.
- **Look B works with it.** The leaves take their colour from the instance colour. A
  season can thus repaint the leaf forest (green, then gold, then bare) with a new palette
  and no new geometry. The spring and autumn palettes of look C are ready for that.

## Recommendation

**Climate belts for Earth and four gardens for Blossom Haven, with all the levers.**

- Both give each part of a world its own theme. A flight to a new place shows new plants.
- Earth stays true to the real planet, as the stars and the planets of the game are.
- Blossom Haven keeps its candy near the cottage and gets three gardens to find. The
  mushroom glade gives the night side of the planet a reason to visit.
- Blossom Haven B costs the same triangles as today.

Start with Earth, because it is the first world of the player. Then do Blossom Haven.
Then measure a phone, and add the sectors if the phone is slow.

## Decisions

1. Which look for Earth: A, B, C, or the trees of today?
2. Which look for Blossom Haven: A, B, C, or the candy of today?
3. Which levers: woods and glades, size and colour, wind, ground colours, night glow?
4. What does a phone get: half the plants with all levers, half the plants with no wind,
   or the plants of today?
5. Which plants to remove, to change or to add?

## Checks

- `npx vitest run studies/foliage-study` runs the unit tests: the plants, the rule of
  each zone, the plan (the same each time, on dry land, a free clearing at the cottage,
  half on a phone), the places of the cuts, and the files of the clips.
- `node studies/foliage-study/foliage-study-capture.mjs "path/to/chrome.exe"` against the
  dev server on port 5174 records all the clips and pictures again.
  `node studies/foliage-study/foliage-study-capture.mjs "path/to/chrome.exe" E2,H2`
  records two clips. Do not change a file of the project during a capture: the dev server
  reloads the page.
