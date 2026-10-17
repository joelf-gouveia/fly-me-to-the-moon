# The fairy home: fairy home study

Status: a study, 17 October 2026, built in the game the same day (see "Built in the game"). Open `/studies/fairy-home-study.html` on the Vite server. The
study does not change the game or the saved game data. It saves its own answers as
`fairy-home-study-v1`. The code places below describe `master` on 17 October 2026 (commit
`8a426c7`).

The player asks for a "build mode". In a simple way, the home of the fairy has sections. Each
section changes through options ("maybe walls, yard and roof"), and the fairy can change the
colours. The study answers three questions:

1. How do fairy homes look?
2. Which parts make sense for a build mode?
3. How does the build mode look and work in the game, and what does it need?

The result is a set of parts that the engine of the game builds (`parts.ts`), seven clips, a live
build mode, a recommendation, a plan and nine decisions.

## What to review

- **Seven clips.** The chips select a clip: **B** build mode, **R** roofs, **W** walls, **D**
  doors, **Y** yards, **C** colours and **G** eight homes.
- **Build it yourself** runs the build mode live in the player, with the worlds of the game. The
  panel at the side changes the home. A drag turns the camera.
- **The study of a clip** shows three moments of the clip and the rules of the part.
- **How fairy homes look** shows eight homes of stories, gardens and games, each made from the
  parts. **Which parts make sense** gives the verdict for ten possible parts.
- **Each option**, **Each roof on each walls**, the findings, the recommendation and the plan
  follow. **Your answers** has nine decisions. **Copy answers** copies them for the chat, and
  **Save study** exports them as JSON with the home of the live build mode.

## How fairy homes look

The fairy homes of picture books, garden crafts and games have the same marks:

| Mark | What it is | In the parts |
| --- | --- | --- |
| The outline | One clear shape from far away: a cap, a crown, a hat | The roof |
| The materials | Things of nature or of the kitchen at a big size: a mushroom, bark, a pumpkin, a teapot, straw, pebbles | The walls |
| The face | A low round door and two round windows that glow at night | The door, and the windows of the walls |
| The ring | A circle of flowers, mushrooms, stones, a fence, lights or water | The yard |

The study makes eight known homes from the parts:

| Home | Roof | Walls | Door | Yard | Where the idea comes from |
| --- | --- | --- | --- | --- | --- |
| Flower cottage (today) | Petal crown | Flower cottage | Round door | Flower ring | Fairies of the flowers |
| Toadstool house | Toadstool | Flower cottage | Plank arch | Fairy ring | The fly agaric of picture books, and the fairy ring of old stories |
| Tree stump house | Leaf thatch | Tree stump | Plank arch | Path and fence | Homes in hollow trees and roots |
| Teapot house | Acorn cap | Teapot | Star door | Lantern garden | Garden fairy houses made from teapots |
| Pumpkin house | Leaf thatch | Pumpkin | Round door | Path and fence | The pumpkin coach of Cinderella |
| Star tower | Star spire | Pebble tower | Star door | Lantern garden | The towers of fairy tales |
| Honey hive | Petal crown | Honey hive | Round door | Flower ring | The straw hives of old gardens |
| Candy house | Frosting swirl | Flower cottage | Heart door | Candy garden | The gingerbread house; Blossom Haven is a candy planet |

Games with a home to change often use the same split: a roof, the walls, a door and the things
outside. Blossom Haven is magic (the seasons study, 3 October 2026), so the options are magic
versions: a frosting swirl, a star spire, a candy garden.

## Which parts make sense

| Possible part | Verdict | Why |
| --- | --- | --- |
| Roof | A part | It makes the outline; she sees it first, from the air |
| Walls | A part | They tell what the home is, and they give the socket |
| Door | A part | It is the face of the home; it is small and cheap |
| Yard | A part | It fills the clearing and marks the home from the air |
| Windows | In the walls | A window must follow the shape of its wall |
| Chimney, star, cherry | In the roof | A topper fits one roof only |
| Path, fence, lights | In the yard | They are kinds of yard; two yards cover each other |
| Colours | One for each part | Four colours from twelve |
| Inside of the home | Later | The fairy does not go in; a room needs a new scene |
| Free placement | No | Hard for a young child; it breaks the limits of the clearing |

The request names walls, yard and roof. The study adds the door as a fourth part, because the
door is the face of the home and the part that she sees when she lands.

## The parts: `studies/fairy-home-study/parts.ts`

### The socket

The parts fit together with one rule. The walls give their **socket**:

- `topY` and `topRadius`: the height and the radius of the top. The roof sits there.
- `frontAt(y)`: the radius of the front (+z) at the height `y`. The door sits there.

A roof is drawn for a top of radius 1. It scales by `topRadius` across. It scales by the same
value up, unless the home then goes over `MAX_TOP` (7.5 m). Then the roof gets lower, not
narrower (`roofScale()`). A topper (the star, the cherry, a stem) keeps its shape.

A door and a window are flat, and most walls are round. `onWall()` places a flat piece on a
round wall. The piece leans with the wall between its bottom and its top. Then the rule moves
it out until its front is 3 cm before the wall at each height (65 samples). Thus no part of the
wall comes through a door or a window. A door uses the front of its leaf, not of its knob. The
bark of the stump is smooth at the door and at the windows. The door and the windows of the
pebble tower and of the honey hive stand before the pebbles and the rings. A yard is a ring from 4.5 m (`YARD_START`) to 11 m (`YARD_REACH`) on the round
ground of the clearing (`groundAt()`).

Thus each roof fits each walls, and each door fits each walls. The game needs no table of pairs.

### The options

| Part | Options (the first is today) |
| --- | --- |
| Roof | Petal crown, Toadstool, Acorn cap, Star spire, Frosting swirl, Leaf thatch |
| Walls | Flower cottage, Tree stump, Teapot, Pumpkin, Pebble tower, Honey hive |
| Door | Round door, Plank arch, Heart door, Leaf curtain, Star door |
| Yard | Flower ring, Fairy ring, Path and fence, Lantern garden, Lily pond, Candy garden |

There are 6 × 6 × 5 × 6 = 1,080 shapes of home before the colours.

### The colours

`HOME_COLORS` has twelve colours: cream, honey, apricot, cherry, berry, rose, lilac, periwinkle,
sky, mint, fern and cocoa. Each part has one colour. The cream, honey, berry and rose of the list
are the colours of the cottage of today. Each option has its own first colour (a cherry toadstool,
an apricot pumpkin). A new colour changes the colour of one material (`paint()`); nothing builds
again. The details have fixed paints: gold, white spots, dark wood, leaves, stones and water.

### The build

Each part collects its pieces with a paint. At the end, the pieces of one paint merge into one
mesh (`mergeGeometries()`), so a part has one draw call for each paint. The fixed paints have one
material for the whole home.

`createHomeBuilder()` puts the built home in place of the group `flower-cottage`. It keeps that
name, and it keeps the window material of the old cottage, which `src/main.ts` lights after
sunset. A new walls part builds the roof and the door again, because they sit on the walls.

`parseHomeLook()` reads a saved look as `parseFairyLook()` reads the fairy look: an unknown value
gives the value of today.

## The numbers

Each roof on each walls, the height of the top of the home in metres (built with `parts.ts`).
A "↓" marks a roof that got lower to stay under 7.5 m.

| Walls | Top of the walls | Petal crown | Toadstool | Acorn cap | Star spire | Frosting swirl | Leaf thatch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Flower cottage | 4.55 m · r 3.10 m | 6.59 | 7.49 ↓ | 7.27 | 7.38 ↓ | 7.41 ↓ | 7.47 ↓ |
| Tree stump | 4.35 m · r 3.00 m | 6.33 | 7.28 | 6.98 | 7.38 ↓ | 7.40 ↓ | 7.47 ↓ |
| Teapot | 4.45 m · r 2.60 m | 6.15 | 6.98 | 6.73 | 7.39 ↓ | 7.39 ↓ | 7.27 |
| Pumpkin | 4.20 m · r 2.97 m | 6.15 | 7.10 | 6.81 | 7.39 ↓ | 7.39 ↓ | 7.43 |
| Pebble tower | 5.25 m · r 2.60 m | 6.95 | 7.48 ↓ | 7.44 ↓ | 7.39 ↓ | 7.42 ↓ | 7.48 ↓ |
| Honey hive | 4.55 m · r 2.75 m | 6.36 | 7.23 | 6.96 | 7.39 ↓ | 7.40 ↓ | 7.46 ↓ |

The cost of each part (the most for one option of the part):

| Part | Draw calls | Triangles | The option with the most triangles |
| --- | --- | --- | --- |
| Roof | 3 | 5,856 | Frosting swirl |
| Walls | 4 | 14,200 | Pebble tower (about 130 pebbles) |
| Door | 4 | 2,232 | Heart door |
| Yard | 6 | 9,216 | Flower ring (the pond has 6 paints) |
| A whole home | 17 or less | about 31,500 or less | |

The cottage of today has 14 meshes. Built from the parts, it has 7 draw calls and 12,672
triangles, and its top is at 6.59 m (6.65 m today: the roof sits 5 cm lower on the walls).

## The rules that bind the design

1. **The flower of the guide is at 8 m.** `homeMarkerPosition()` in `src/journey.ts` marks a
   point 8 m over the cottage. Each home stays under 7.5 m.
2. **The creatures keep 12 m free.** `obstacles.add(homeCottageNormal(), world.radius, 12)` in
   `src/worlds.ts`. The pegasus foals circle about 15 m from the cottage, 2.8 m high
   (`src/candy.ts`). The ring obstacles keep 24 m around `flower-cottage` (`sceneryObstacles()`
   in `src/rings.ts`). The yard stays inside 11 m.
3. **The ground is round and flat to about 15 m.** The clearing has the height
   `HOME_CLEARING_HEIGHT` (3) to about 0.11 of the radius from the south pole (`src/terrain.ts`).
4. **Two names stay.** `flower-cottage` (`src/rings.ts`) and `cottage-window` (`src/main.ts`).
5. **Blossom Haven is magic.** The options are magic versions, not a copy of an Earth house.

## The game today

| Part | Code | Today |
| --- | --- | --- |
| The cottage | `buildFlowerCottage()` in `src/worlds.ts` | A cream cylinder, seven pink petals, a gold heart, a pink door, a knob, two windows and 32 gold flowers. It does not change. |
| The place | `homeCottageNormal()` | The south pole of Blossom Haven, (0, -1, 0) |
| The windows | `cottageWindow` in `src/main.ts` | One material; brighter after local sunset |
| The fairy panel | `#customizer` in `src/main.ts` | Option grids and colour dots; the look saves as `fairy-look` (`parseFairyLook()`) |
| The hop | `relocateHome()` in `src/relocation.ts` | Moves the whole group of the home; the cottage goes with it |

## Findings

1. **One fixed cottage.** Nothing of the cottage changes after `buildFlowerCottage()`.
2. **Two names that other code reads.** A new home must keep `flower-cottage`, `cottage-window`
   and one window material.
3. **The flower of the guide is at 8 m.** The cottage of today is 6.65 m high.
4. **The creatures keep 12 m free.** The yard stays inside 11 m.
5. **The ground is flat for 15 m**, and it is round: the yard follows its curve.
6. **The Sun stays low at the cottage.** The cottage is at the south pole, and Blossom Haven
   turns about its pole. The Sun is near the horizon there: about 5° at the start place of the
   lab. The clips turn the planet so that the Sun is 38° over the home; the game does not. Build
   mode can add a soft light of its own, so the colours show as she picks them. This is not
   tested in the study.
7. **The fairy panel is the model.** The option grid, the colour dots and the automatic save can
   serve build mode.
8. **The home moves with its planet.** A built home needs no more work for the hop.

## The clips

The clips come from the lab of the feature ideas study (`studies/feature-ideas-study/lab.ts`),
with the real worlds of the game. `homeOf()` in `features/kit.ts` puts the home of `parts.ts` in
place of the cottage. Each clip turns Blossom Haven so that the Sun is 38° over the home
(`lightHome()`). A change of a part pops the new part with a small bounce (0.5 s) and a puff of
44 petals in its colour (1.3 s).

| Clip | Length | What it shows |
| --- | --- | --- |
| B | 22 s | She flies home; the button shows; the panel opens; roof, walls, door, yard and a colour; Done; she flies away |
| R | 12.4 s | The six roofs on the flower cottage |
| W | 12.4 s | The six walls, with the toadstool roof and the round door on them |
| D | 10 s | The five doors, near |
| Y | 13 s | The six yards, from higher |
| C | 12.2 s | Nine new colours on one home, with a panel of the colours of the four parts |
| G | 18.3 s | The eight homes of the stories |

The panel of the clip B uses the classes of the fairy panel of the game (`customizer`,
`option-grid`, `swatch-grid` in `src/style.css`). The pictures of its options are the pictures
of the sheet P.

### To record the clips

The capture uses the script of the feature ideas study. Use a second Vite server with no hot
reload and its own cache folder, because other sessions can edit the same tree:

```
// vite.fh.mjs (outside the repo)
export default { root: '<repo>', cacheDir: '<scratch>/vite-cache', server: { port: 5207, strictPort: true, hmr: false } }
```

```
npx vite --config vite.fh.mjs
node studies/fairy-home-study/fairy-home-study-capture.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe" --sheets
node studies/fairy-home-study/fairy-home-study-capture.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe"
node studies/fairy-home-study/fairy-home-study-capture.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe" --moments
```

Record the sheets first: the panel of the clip B shows the pictures of the sheet P. The files go
to `public/studies/fairy-home/`.

## Tests

`tests/home.test.ts` (in the study: `parts.test.ts`) checks:

- the default look is the cottage of today, in the group `flower-cottage`;
- each roof on each walls stays under 7.5 m, inside 6.2 m across, and covers the top;
- each walls has one window mesh with the window material of the game;
- each door on each walls stands on the ground, against the front, under the top, with its leaf
  before the wall;
- `onWall()` puts the front of a flat piece before each point of three round walls;
- each yard stays inside 11 m;
- a whole home has at most 18 draw calls;
- `parseHomeLook()` gives the look of today for an unknown value;
- the builder swaps a part in place and keeps the window material.

`studies/fairy-home-study/model.test.ts` checks the text of the page against the clips and the
parts.

## Recommendation

Build a home of four parts (roof, walls, door, yard) and twelve colours, from a Build button
near the cottage. One colour for each part. A new shape comes in its own colour. All options are
open from the start. The camera turns slowly around the home, and a drag turns it. A change pops
with a puff of petals; with reduced motion it changes at once.

## The plan

1. **A home of four parts** (S). Move the cottage to `src/home.ts` with the parts and the socket
   of `parts.ts`. The default look is the cottage of today.
2. **The options and the colours** (M). The 23 options and the 12 colours of the study.
3. **The save** (S). `fairy-home` with `parseHomeLook()`.
4. **Build mode** (M). The button near the cottage, the stop of the flight, the camera, the panel
   (at the side on a computer, at the bottom on a phone), Done.
5. **The change** (S). The pop, the puff and a chime; no motion with reduced motion.
6. **Keep the neighbours** (S). The names, the window material, the top under 7.5 m and the yard
   inside 11 m, with the tests of `tests/home.test.ts`.
7. **Checks in the browser** (S). Build mode on a computer page and a phone page.

## What the study does not know

- The study does not measure the frame time of build mode on a phone. The largest home has about
  31,500 triangles and 17 draw calls; the cottage of today has about 12,700 and 14.
- The study does not test a light of its own for build mode (finding 6).
- The study does not test the panel on a phone. The panel of the clip B has the size of the fairy
  panel of a computer.

## Built in the game

The player answered three decisions and took the recommendation for the six others (17 October
2026): four parts, one colour for each part from twelve, a new shape in its own colour, a Build
button near the cottage, all options open, a slow turn of the camera that a drag turns, a puff
and a bounce (none with reduced motion), all 23 options, and a Surprise button.

| File | What it does |
| --- | --- |
| `src/home.ts` | The parts, the socket, `onWall()`, the twelve colours, the eight homes (`HOME_PRESETS`), the look of the game (`homeLook()`, `setHomeLook()`), the save (`fairy-home`, `loadHomeLook()`, `saveHomeLook()`) and `surpriseLook()` |
| `src/worlds.ts` | `buildFlowerCottage()` builds `homeLook()`: a new size of Blossom Haven builds the same home |
| `src/home-build.ts` | Build mode: the Build button, the panel, the camera, the soft light, the pop and the puffs |
| `src/main.ts` | Loads the saved home before the first build, stops the flight in build mode, and gives the camera to build mode |
| `src/style.css`, `src/mobile.css` | The button and the panel (the look of the fairy panel) |
| `public/home/` | The 23 pictures of the panel, 240 × 150 px, from the sheet P of the study |
| `tests/home.test.ts` | The tests of the parts (they were `parts.test.ts` of the study), the save, the look and the surprise |
| `scripts/home-build-smoke.mjs` | The browser check `home-build` of `npm run checks` |

`studies/fairy-home-study/parts.ts` now exports `src/home.ts`, so the study and the game build the
same home.

Two things differ from the study:

- **A soft light in build mode.** The Sun is low at the cottage (finding 6), so the colours were
  dark in the panel. Build mode adds a soft directional light from the camera (intensity 1.4).
  It fades in and out in about a second.
- **A camera that goes back on a narrow screen.** On a phone held upright, the camera is up to
  1.7 times farther, so the yard shows above the panel.

The browser check `home-build` checks, on a computer page and on a phone page: no button far
from the cottage; the button near it, clear of the buttons of the flight; build mode stops the
flight and the panel fits the screen; a roof, walls, a door, a yard and a colour change and save;
the parts keep their names and the lit window; Surprise gives a new home; Escape closes build
mode; and a new page builds the saved home.
