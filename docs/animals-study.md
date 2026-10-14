# More animals: animals study

Status: a study, 14 October 2026. Open `/studies/animals-study.html` on the Vite server. The study
does not change the game or the saved game data. It saves its own answers as
`fairy-animals-study-v1`. The code places below describe `master` at `a320c68`.

**Built in the game, 14 October 2026** (branch `features/more-animals`), with the ten recommended
decisions of the player: option B, then the point layer of C, the far model to 170 m, the phone
limit, the four animals of the first game in the leaf forest, the seasons, one creature for each
magic season, the book with a page for each world, the friend from the catalog, and a calm fox and
calm bears. See [Built in the game](#built-in-the-game) at the end for what changed from this study.

The player asks: "I want to do a study to add a lot more animals to both Earth and Blossom Haven.
The animals should fit into biomes better than they do now." This study gives a catalog of animals
for each place, three options that differ in scope and in the way the renderer draws them, clips
from the engine of the game for each option, the draw calls and the frame time measured with the
real renderer, and the changes to the animal book and the friend.

## What to review

- **Seven clips.** A, B and C fly the same route across the belts of Earth, with the fauna of each
  option. **S** is a herd on the savanna, **W** the sea, the shore and the air, **H** the gardens of
  Blossom Haven, **L** Lantern time. A label in each clip gives the draw calls of the animals in the
  view, the number of animals and the draw calls of the frame.
- **The phone budget**: the bench table (four views, three devices, the animals of today and the
  three options) and a phone picture of each option.
- **The catalog**: each kind with its rule, its group, what it does, its hello, why it is right for a
  child of 5, its size and how far it reads.
- **The book and the friend**, **Eight findings**, **Recommendation** with the plan, and ten
  decisions. **Copy answers** copies them for the chat, and **Save study** exports them as JSON.
- A copy of the page can be a private claude.ai artifact. Build it with
  `node studies/animals-study/build-artifact.mjs <out folder>`.

## The rules that bind the design

| Rule | Source |
| --- | --- |
| Earth follows the real world. Blossom Haven gets magic versions, from stories and candy, not copies of Earth | The review of the seasons study, 3 October 2026 |
| No danger, no predator that chases, no animal that eats another, no fail | `IDEA.md` |
| Earth makes a new landscape at each visit: an animal follows rules, never a fixed place | The earth landmarks study was not built for this reason |
| The weather is mostly sunny and changes slowly; a place effect needs regions of about 250 m | The weather study |
| Little text for the child, no spoken voice | Decision 4 of the learn and play study |
| New books are pages in Worlds; a card has a picture, a name and picture facts | The friend book study |

## The game today

| Finding | Evidence |
| --- | --- |
| No animal follows a place | `populateSphere()` in `src/creatures/spherical.ts` spreads 40 of each of the 4 Earth kinds (32 on Blossom Haven) at random points of the whole planet. It checks only land or water, the height and the slope (`SphericalHabitat.safeSegment()`). The first 4 of each land kind start near the meadow |
| The zones exist | `zoneAt()` in `src/foliage/zones.ts` with `GAME_LOOK` (`E2` and `H2` in `src/foliage/build.ts`) gives the belt of Earth (`BELTS`: beach, jungle, savanna, desert, temperate, taiga, tundra; null in the polar snow) and the garden of Blossom Haven (`GARDENS`: grove, orchard, glade, peaks) |
| Many draw calls for each animal | `createCreature()` makes one mesh for each part: cow 28, sheep 18, rabbit 14, duck 8. The fairytale creatures are joined into 14 to 21 meshes. `createPopulation()` draws the nearest 28 (14 on a phone) within 97 m |
| The water is opaque | The water sphere of `buildGround()` in `src/worlds.ts` is a `MeshStandardMaterial` with no transparency |
| The friend bakes models | `bake()` in `src/friend.ts` joins the parts into one mesh and the wings into a second one |
| Seasons are values of a latitude | `seasonAt()`, `snowCover()` in `src/seasons.ts`; `magicAt()` in `src/magic-seasons.ts` |

## The catalog

The largest option (C) has 31 kinds on Earth and 17 on Blossom Haven; B has 27 and 13; A has 14
and 9. The full table with every rule is on the page (`studies/animals-study/catalog.ts`). In short:

| Place | Kinds |
| --- | --- |
| Palm beach and shore | flamingo, sea turtle, seagull, capybara (river banks of the jungle and the beach) |
| Jungle | monkey, parrot (loops over the trees) |
| Savanna | zebra, giraffe, elephant (also the jungle), meerkat (also the desert), stork in winter |
| Desert | camel, meerkat |
| Leaf forest | cow, sheep, rabbit, duck (the four of today), deer, fox, stork in summer, butterflies (spring and summer), fireflies (summer nights), geese (spring and autumn) |
| Pine forest | moose, brown bear and cub, beaver; the sheep, the fox and the arctic hare also live here |
| Snow line | reindeer, arctic hare (white in snow, brown in summer), seal, penguin (south only) |
| The sea | dolphin, whale (deep sea), silver fish (they show by their jumps) |
| Lollipop grove | unicorn, dragonling, gummy bear cubs, pegasus foal (over the cottage) |
| Cotton candy orchard | candy-floss lamb, kitsune kit |
| Mushroom glade | story caterpillar (Alice), kitsune kit |
| Crystal peaks | crystal deer, griffin chick |
| Soda water | Frog Prince, gummy jellyfish, soda serpent |
| Sky | phoenix chick (a warm glow, never fire) |
| One magic season | honey-drop bees (Blossom time), bubble fish (Bubble time), lantern moths (Lantern time), sugar owlets (Crystal time) |

- A rule (`Rule` in `studies/animals-study/rules.ts`) has zone ids of `BELTS` or `GARDENS` (or
  `polar`), surfaces, a half of the planet, the seasons of `src/seasons.ts` or the magic seasons of
  `src/magic-seasons.ts`, and a flight height. `placeAt()` gives the place of a direction from
  `zoneAt()` and the terrain: land (height over 0.65 m), shore (land under 1.6 m with water within
  3 m), river (`river` over 0.5), sea (under -0.5 m) and deep sea (under -4 m, no land within 12 m).
- **Reads from far.** At the game camera (58° field of view), an animal is 16 px tall in a 720 px
  view up to `size × 40.6` m. A whale (9 m) reads to 365 m, a giraffe (3.2 m) to 130 m, a cow
  (1.25 m) to 51 m, a fox (0.6 m) to 24 m, a meerkat (0.45 m) to 18 m. The fairy flies 11 to 32 m/s,
  so a small kind is seen for about one second at each pass: it is a kind for the hello, not for
  the view from the air. The page marks each kind as far, middle or near.
- **Not built.** Six kinds have no model in the study: the story caterpillar, the griffin chick, the
  phoenix chick, the honey-drop bees, the bubble fish and the sugar owlets. The butterflies and the
  fireflies are points. The bench of B on Blossom Haven therefore has three kinds fewer than B
  (one or two draw calls each).

## The options

| | A · A few kinds for each place | B · Herds (recommended) | C · A living layer |
| --- | --- | --- | --- |
| Kinds (Earth / Blossom Haven) | 14 / 9 | 27 / 13 | 31 / 17 |
| How it draws | One mesh for each part, CPU animation | One joined model for each kind, as an InstancedMesh; a far model after 45 m | Joined models for the nearest 12, points for the others and for the small life |
| Animals drawn | 28 (14 on a phone), to 97 m | 260 (130), to 170 m | 12 (6) models, points to 220 m |
| Size | M | L | L |

### The joined model and the rig shader (B and C)

`studies/animals-study/shapes.ts` describes each model as a list of balls, cones and cylinders, each
with a colour, a place, a size, a turn and a moving part (a diagonal pair of legs, the head, the
tail, a wing, a fin). `build.ts` makes three looks from one list:

- `partsModel()`: one mesh for each part in pivot groups, moved by code (option A).
- `joinedGeometry(id, 'near')`: one geometry with a colour and an `aRig` value (part, pivot, side)
  in each vertex. `rigMaterial()` adds a shader to a `MeshStandardMaterial`: it turns the legs, the
  head (a graze nod when the animal rests), the tail, the wings and the fins about their pivots on
  the graphics card. Each instance has an `aMove` value (phase, walking, gait speed). The game
  models of today are baked into the same geometry (`gamePieces()`), with the legs and the head
  found from their places.
- `joinedGeometry(id, 'far')`: fewer faces (spheres of 6 × 4), no small details, no motion.

The faceted look of the Earth animals stays (`flatShading`); the jelly creatures of Blossom Haven are
smooth and shiny. An instance colour gives the gummy bears and the jellyfish their candy colours.

### The fauna

`studies/animals-study/fauna.ts` places and draws the animals of an option on a world of the lab:

1. **A survey** of the world: 40,000 points of a Fibonacci sphere on Earth (about 4.9 m apart) and
   16,000 on Blossom Haven, each with its place (`surveyOf()`).
2. **The groups.** Each kind of the world is placed in the order of its size (the large kinds first),
   with its own random numbers (`seededRandom` of the seed of the world and the id). A group keeps a
   gap to the groups of its own kind (12 m; 30 m in the air) and does not overlap a group of
   another kind. The option then keeps its own kinds, so a kind has the same groups in each option.
3. **Each member** stands on good ground: the vertices of the ground mesh under its footprint are
   in the height range of its surface, with a slope under 1.35 m (the values of
   `SphericalHabitat.safeSegment()`), and clear of the trees and the candy
   (`CreatureObstacles.clearSegment()`). A swimmer needs water deep enough for its size.
4. **The motion.** A herd walks a short route (three points, each good for each member) and rests.
   A flock flies a loop over the highest ground of the loop. A pod of dolphins swims a loop and
   each dolphin leaps (1.3 s in each 3.2 s), and a whale swims a slow loop with its back over the
   water. A school of fish jumps in small arcs.
5. **The hello** of the game for each near animal: a turn to the fairy, a hop (`helloLift()`) and
   the pink hearts of `createHeartPool()`.

The animals of the game are hidden while the fauna lives (`creatures.update` is replaced for that
time) and come back at `dispose()`.

## The measurements

`studies/animals-study/bench.ts` loads four views of the real worlds (Earth with the seed of the
capture page): low over a savanna herd, low over the meadow of the leaf forest, 30 m over the
savanna, and low over the lollipop grove. Each view runs with no animals, with the animals of today,
and with the fauna of A, B and C. After 20 frames, 90 frames are measured: the step of the lab (the
update of the animals, the camera and the render) and `gl.readPixels()` of one pixel, which waits
for the graphics card. The draw calls are `renderer.info.render.calls`; the calls of the animals are
the calls of the view less the calls of the view with no animals.

- **Computer**: 1280 × 720, pixel ratio 1, antialias.
- **Phone page**: 390 × 844 CSS pixels, device scale 3, touch. The lab builds the worlds with
  `mobile` (half the plants and the clouds) and the renderer as a touch device of the game: no
  antialias, a pixel ratio of 1.25 (`createLab(host, { mobile: true })`). The drawing buffer is
  487 × 1055.
- **Phone page, CPU 4 × slower**: the same, with DevTools CPU throttling 4.
- The graphics card is an NVIDIA GeForce RTX 4080 SUPER (ANGLE, Direct3D 11) in headless Chrome.
  **No row is a real phone.**

Draw calls for the animals, and the median frame time:

| View | Device | Today | A | B | C |
| --- | --- | --- | --- | --- | --- |
| Savanna | Computer | 42 · 2.6 ms | 504 · 3.8 ms | 30 · 3.4 ms | 5 · 2.8 ms |
| Savanna | Phone page | 0 · 1.7 ms | 274 · 2.7 ms | 14 · 2.6 ms | 4 · 2.7 ms |
| Savanna | CPU 4 × slower | 0 · 5.3 ms | 274 · 9.6 ms | 14 · 8.3 ms | 4 · 9.0 ms |
| Meadow | Computer | 0 · 1.6 ms | 426 · 2.5 ms | 28 · 2.4 ms | 7 · 2.3 ms |
| Meadow | Phone page | 0 · 1.6 ms | 200 · 1.9 ms | 21 · 2.0 ms | 5 · 2.1 ms |
| Meadow | CPU 4 × slower | 0 · 4.9 ms | 200 · 8.3 ms | 21 · 9.5 ms | 5 · 8.9 ms |
| 30 m over the savanna | Computer | 14 · 1.8 ms | 0 · 2.3 ms | 28 · 2.4 ms | 4 · 2.2 ms |
| 30 m over the savanna | Phone page | 15 · 1.5 ms | 165 · 2.1 ms | 11 · 1.8 ms | 4 · 2.1 ms |
| 30 m over the savanna | CPU 4 × slower | 15 · 5.2 ms | 165 · 8.0 ms | 11 · 7.7 ms | 4 · 9.2 ms |
| Lollipop grove | Computer | 53 · 1.9 ms | 242 · 2.5 ms | 12 · 2.7 ms | 6 · 2.1 ms |
| Lollipop grove | Phone page | 0 · 1.7 ms | 240 · 2.1 ms | 9 · 2.3 ms | 4 · 2.2 ms |
| Lollipop grove | CPU 4 × slower | 0 · 6.4 ms | 240 · 9.4 ms | 9 · 9.0 ms | 4 · 8.3 ms |

With no animals the frame has 95 to 98 draw calls in the lab. B draws 130 to 260 animals.

What the numbers say:

- **Draw calls.** A grows with the animals (165 to 504 for 14 to 28 animals). B grows with the kinds
  in the view (9 to 30). C has 4 to 7. The animals of today are 0 to 53, and they change with each
  Earth (TODO item 4). "A, 30 m over the savanna, computer: 0" is true: the 28 nearest animals were
  under and behind the camera, so the renderer culled them. A draws no far herd.
- **Frame time.** This graphics card hides the draw calls: each option is under 4 ms. With the CPU
  4 times slower, the frame with no animals is 4.7 to 6.4 ms, and each option adds 2.5 to 4.5 ms.
  For A it is the calls; for B and C it is the code that computes the pose of each animal in each
  frame (C computes the poses of all the animals in 220 m for its points). The build must update
  the far herds less often and cache the poses of resting herds.
- The phone budget is a limit of draw calls and of CPU, not of triangles. B on a phone page stays
  under 21 draw calls for the animals.

## The clips

Each clip runs in the lab of the feature ideas study (`studies/feature-ideas-study/lab.ts`) on the
real worlds, with the fixed random seed of the friend book study (`EARTH_SEED` 24 in
`studies/friend-book-study/features/seed.ts`). The capture wrapper runs each clip in a new page.

| Clip | Option | Length | What it shows |
| --- | --- | --- | --- |
| A, B, C · Across the belts | A, B, C | 13 s | The same route through a herd of zebras, deer, a moose and reindeer, going north from the savanna to the snow line (`beltStops()`), from the herds of B. A has no kind at the north snow line |
| S · A herd on the savanna | B | 11 s | A tour of giraffes, zebras and elephants (`bestTour()`), with a camera at the side |
| W · The sea, the shore and the air | C | 10 s | A pod of dolphins (the fairy passes outside their loop), a school of fish, flamingos in the shallow water with hellos, gulls |
| H · The gardens of Blossom Haven | B | 13 s | Four short passes over gummy bear cubs, candy-floss lambs, gummy jellyfish and crystal deer, all within 55 m (`nearStops()`), with a camera behind and over the fairy (`overCamera()`) |
| L · Lantern time | C | 10 s | Night in the mushroom glade in Lantern time (`setMagic()`), lantern moths with their light (additive points), then gummy jellyfish |

The pictures were checked one by one. The fixes: the herds of two kinds could stand on one point
(now each kind keeps a gap to the others); the dolphins swam on the far side of their loop (the
fairy now passes outside the loop); the candy trees lifted the fairy so high over Blossom Haven
that the creatures were too small (now the passes are short and the camera looks down from over the
candy); a pass of the gardens was in the night (now the four stops are within 55 m, under one Sun);
the first route across the belts passed few herds (now it goes through a herd in each belt).

What remains: the camera of H shows big candy at the side of the view at some moments; in the belt
clips some hills hide the view for a second; far small animals are hard to see, as the read
distances say.

## The book and the friend

- **Book.** With B the book has 40 cards. The Animals tab gets one page for each world, with the
  world picture of Worlds, and a row for each place with a small picture of the place: warm to cold
  on Earth, the gardens, the water and the sky on Blossom Haven. A card stays as today: a picture, a
  name and three picture facts; a kind that she did not meet is a shadow with its place. On a phone
  three cards in each row, and the note on top.
- **Friend.** `FRIEND_KINDS` comes from the catalog. Each kind that she met can be the friend,
  except a group (a school of fish, the butterflies, the fireflies, the bees). A kind with wings
  flies; each other kind rides in its soap bubble. `friendSize()` makes each friend the same size,
  so a whale or a giraffe is a baby in a bubble. The friend model is the joined model of the kind.
  `parseFriend()` keeps only known kinds, so the saved data of today loads.

## Recommendation

Build **B**, then add the point layer of C for the small life as a second change. B puts 27 kinds on
Earth and 13 on Blossom Haven for at most 30 draw calls of animals on a computer and 21 on a phone
page, where A needs 504 and 274. The herds read from far, as the real ones do. C keeps the draw calls
lowest, but a far giraffe is a dot.

## Build plan

1. **The catalog and the rules.** Move `catalog.ts` and `rules.ts` to `src/creatures/`. Test
   (`tests/creatures/catalog.test.ts`): each species has a rule with ids of `BELTS` or `GARDENS`,
   valid surfaces and seasons, and no Blossom Haven species has an Earth name.
2. **The joined models.** Move `shapes.ts` and `build.ts` to `src/creatures/`. Test: each model stands
   on y = 0, the rig values are in range, the joined geometry is one draw call.
3. **The herds.** `src/creatures/herds.ts`: the survey, the placement with a random sequence for each
   kind and the gaps, the routes with `SphericalHabitat` and the obstacles. It replaces
   `populateSphere()` for both worlds. Test: each herd fits its rule, no overlap, the same seed gives
   the same herds.
4. **The renderer.** `src/creatures/population.ts` draws one InstancedMesh for each kind and look,
   with the caps of B (260 / 130, near 45 / 32 m, far 170 m). Update the far herds at 10 frames a
   second and cache the poses of resting herds. Keep the hello for an instance.
5. **The seasons.** `src/main.ts` gives the season of Earth and the magic year to the herds.
6. **The book and the friend.** `FRIEND_KINDS` and the cards from the catalog, the pages and rows of
   `src/animal-book-ui.ts`, the card pictures from the joined models. Test the old saved data.
7. **The browser check.** Extend `scripts/wildlife-smoke.mjs`: at 1280 px at most 40 draw calls for
   the animals, at 390 px at most 20; no land animal on the water and no swimmer on land; each kind
   on the screen in a zone of its rule. Close TODO item 4 with the phone limit.
8. **Later: the small life.** The point layer of C: two draw calls.

## Files

| File | Purpose |
| --- | --- |
| `studies/animals-study.html` | Page entry |
| `studies/animals-study/catalog.ts` | The species, their rules, groups, behaviour, hello and read distance |
| `studies/animals-study/rules.ts` | The place of a direction (`placeAt()`) and the test of a rule (`fits()`) |
| `studies/animals-study/shapes.ts` | The prototype models as lists of parts |
| `studies/animals-study/build.ts` | The parts model, the joined geometry, the rig shader, the bake of the game models |
| `studies/animals-study/fauna.ts` | The survey, the placement and the three renderers |
| `studies/animals-study/features/` | The clips (`clips.ts`) and their routes and cameras (`kit.ts`) |
| `studies/animals-study/bench.ts`, `animals-study-bench.mjs` | The bench and its script |
| `studies/animals-study/cards.ts` | The card pictures |
| `studies/animals-study/model.ts`, `main.ts`, `page.css` | The page |
| `studies/animals-study/animals-study-capture.mjs`, `cdp.mjs` | The clips, the moments and the cards |
| `studies/animals-study/build-artifact.mjs` | The claude.ai copy |
| `studies/animals-study/model.test.ts` | The unit tests |
| `studies/feature-ideas-study/lab.ts` | A new option `mobile` of `createLab()` (default off), for the phone bench |

## How to run it

Record from a dev server with no hot reload, for example a config file
`artifacts.local/vite.study.mjs`:
`export default { root: '<the repo>', server: { port: 5192, strictPort: true, hmr: false, host: '127.0.0.1' } }`,
then `npx vite --config artifacts.local/vite.study.mjs`.

```
node studies/animals-study/animals-study-capture.mjs "path/to/chrome.exe"              # the seven clips
node studies/animals-study/animals-study-capture.mjs "path/to/chrome.exe" --moments    # the moment pictures
node studies/animals-study/animals-study-capture.mjs "path/to/chrome.exe" --cards      # the card pictures
node studies/animals-study/animals-study-bench.mjs "path/to/chrome.exe"                # bench.json and the phone pictures
```

The clips go to `public/studies/animals/` (2.2 Mbit/s, 1280 × 720, 30 frames a second, recorded
frame by frame). `npx vitest run studies/animals-study` runs the tests of the study.

## Built in the game

The build follows the build plan above. The study keeps its own files as the record of the study;
the game has its own copies in `src/creatures/`.

| Step | Game files |
| --- | --- |
| 1. Catalog and rules | `src/creatures/catalog.ts` (31 kinds of Earth, 17 of Blossom Haven), `src/creatures/rules.ts`, `tests/creatures/catalog.test.ts` |
| 2. Joined models and rig | `src/creatures/shapes.ts`, `src/creatures/joined.ts`, `tests/creatures/joined.test.ts` |
| 3. Herds | `src/creatures/herds.ts` (`placeHerds()` in place of `populateSphere()`), `tests/creatures/herds.test.ts` |
| 4. Renderer | `src/creatures/population.ts` (`HERD_LIMITS`, the pose cache, the hello of an instance) |
| 5. Seasons | `lifeOf()` in `src/main.ts` gives the year, the magic year, the Sun and the camera to the herds |
| 6. Book and friend | `src/friend.ts` (`BOOK_KINDS`, `FRIEND_KINDS`, `bakeShape()`), `src/animal-book.ts`, `src/animal-book-ui.ts` |
| 7. Browser check | `scripts/wildlife-smoke.mjs`, and the tool `scripts/animals-bench.mjs` |
| 8. Small life | `src/creatures/points.ts` |

The measurements of the game (`scripts/animals-bench.mjs`, the method of the bench above, on the
same graphics card; draw calls of the animals, the animals drawn as models, and the median frame
with the animals and with no animals):

| View | Computer | Phone page | Phone page, CPU 4 × slower |
| --- | --- | --- | --- |
| Start (the meadow) | 17 · 64 · 3.9 ms (4.3) | 9 · 26 · 2.7 ms (2.6) | 7 · 26 · 7.3 ms (6.5) |
| Low over a savanna herd | 15 · 81 · 3.6 ms (2.9) | 7 · 33 · 3.0 ms (2.2) | 10 · 59 · 8.0 ms (6.3) |
| Low over a herd of the leaf forest | 20 · 100 · 3.3 ms (3.2) | 9 · 32 · 3.3 ms (2.5) | 10 · 40 · 8.1 ms (6.6) |
| 30 m over the savanna | 13 · 53 · 3.1 ms (2.7) | 6 · 28 · 2.5 ms (2.6) | 9 · 31 · 8.0 ms (7.5) |
| Lollipop grove | 16 · 51 · 3.2 ms (2.9) | 7 · 17 · 2.4 ms (2.1) | 9 · 26 · 9.0 ms (8.5) |

Each load makes a new Earth, so the numbers change from run to run. The limits of the browser check
are 40 draw calls of the animals on a computer and 20 on a phone. With the CPU 4 times slower the
animals add 0.5 to 1.7 ms to a frame, where B of the study added 2.5 to 4.5 ms: the far herds get a
new pose ten times a second and a resting herd keeps its pose.

Differences from the study, and why:

- **The order of the steps.** The six new models (the story caterpillar, the griffin chick, the
  phoenix chick, the honey-drop bees, the bubble fish, the sugar owlet) came before the book, and the
  butterflies and the fireflies got small models too: each card of the book and each friend needs a
  picture of its model.
- **The book has 48 cards, not 40.** Decisions 2 and 7 add the small life and the four creatures of
  the magic seasons. A school or a swarm (the silver fish, the butterflies, the fireflies, the bees)
  gets a card but is no friend, so 44 kinds can be the friend; its hello adds no heart, so the gift
  always comes from an animal that can be the friend. Earth has a row "The sky" for the stork, the
  seagull and the goose. The magic kinds are in the rows of their gardens.
- **The rules.** The sheep lives only in the leaf forest and the duck only on its rivers (decision
  5). The stork has seasons for each zone: summer in the leaf forest, winter in the savanna; a
  savanna near the equator, which has no season, follows the season of its half at 30°. Each member
  of a herd and each point of its route must be in a place of its rule, not only the middle of the
  herd, so no animal stands across the edge of two belts. A pod, a school, a whale and the soda
  serpent swim a loop that must stay over water deep enough for them; the serpent swims a smaller
  loop, so it finds room in the soda.
- **The start.** A herd of the cow, the sheep, the rabbit, the deer, the fox, the moose and the hare
  starts near the meadow of Earth when its rule allows the place (the meadow is in the leaf forest or
  in the pine forest), and the unicorn, the dragonling, the kitsune kit and the gummy bear cubs near
  the cottage.
- **The renderer.** Each animal is culled against the view, so a kind behind the camera costs no draw
  call; the models of the animals have a hard limit of 37 draw calls (17 on a phone), and three more
  are kept for the hearts and the two point layers. The near animals have empty markers with the names
  `creature-<kind>-<index>`, for the search star, the hello and the checks. The points have the fog
  of the air. The coat of the arctic hare is the colour of its instance. With reduced motion the
  legs, the wings and the fins stand still.
- **Not built.** The spout of the whale, the fizz of the serpent and the bubble rings of the
  caterpillar at a hello are not effects of their own: each hello is the hop and the hearts of
  `hello.ts`.

## Not verified

- No real phone: the phone rows use the desktop graphics card. A real phone can have a slower
  graphics card and a different cost for each draw call.
- The frame time of the slow CPU is DevTools throttling, an estimate only.
- The seasons of Earth are not on in the lab, so the clips show each kind of its belt in all seasons.
- The kinds with no model (six) are not in the clips or the bench.
- No sound of the animals: the clips have no cues.
