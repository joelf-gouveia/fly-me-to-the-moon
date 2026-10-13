# Ten ideas to learn and to come back: learn and play study

Status: a study, 13 October 2026, with the decisions of the player of the same day (see
"Decisions of 13 October 2026"). Open `/studies/learn-and-play-study.html` on the Vite server. The study does not change the game or saved game data. It saves its own
answers as `fairy-learn-and-play-study-v1`. The code places below describe the game on
13 October 2026 (commit `71e50bb`).

This study proposes ten features for a child of 5 and up. Six features teach, and four give a
reason to come back. The numbers F11 to F20 continue the feature ideas study (F1 to F10,
`docs/feature-ideas-study.md`). Each feature has a clip from the engine of the game: the real
worlds, the fairy, the creatures, the sky and the screen of the game, with the feature added by
study code. The clips show the idea. They are not the final design.

The player selected these ten ideas on 13 October 2026 from a list of 15. The five ideas that
the player did not select are: star picture tracing, colour mixing clouds, a daily gift, a
flight with a flock, and helper deliveries.

## What to review

- **One study for each idea.** The ten chips select an idea, and the page then shows the study
  of that idea: three moments of its clip, what the game has today for it, the place in the code,
  three decisions, and the build plan with its checks. The text of each study is in
  `studies/learn-and-play-study/studies.ts`.
- **The player** shows the clip of the selected idea. **Sound** plays the chimes of the clip in
  step with the video.
- **Fly it live** runs the same idea in live 3D. **Play again** starts the clip again.
  **Free flight** gives the keys to you: W and S climb and descend, A and D turn, Shift boosts.
- **The ten together** shows a picture of each idea, its kind (Learn or Play) and its size, the
  recommendation, and five decisions for the ten.
- The page keeps your answers in this browser. **Copy answers** copies them for the chat.
  **Save study** exports them as JSON.
- A copy of the page is a private claude.ai artifact. Build the copy again with
  `node studies/learn-and-play-study/build-artifact.mjs <out folder>`.

## The rules that each idea obeys

| Rule | Source |
| --- | --- |
| No score, no timer and no fail | `IDEA.md`, "Rules to keep" of the search tasks |
| No fixed place on Earth, because each visit makes a new landscape | The Earth landmarks study was not built for this reason |
| Blossom Haven gets a magic version, not a copy of Earth | The review of the seasons study, 3 October 2026 |
| A picture, a colour or a count gives the message; a word comes second | A child of 5 reads little, and the voice (F2) is rejected as built |
| No new sound design | The songs (F6) are rejected as built. The clips use only the chime of the game |

## How the clips were made

The study uses the lab of the feature ideas study (`studies/feature-ideas-study/lab.ts`): the
renderer settings, `createWorlds()`, the star sky, the Sun light, the fairy rig, the follow
camera and the sky and fog of `updateEnvironment()` in `src/main.ts`. The worlds stand still,
so each clip is the same at each run. Each idea is one file in
`studies/learn-and-play-study/features/`.

- **The pictures in the cards come from the engine.** `worldPicture()` in `features/shared.ts`
  puts a camera in space, renders the world on its day side and copies the picture. `portrait()`
  renders one creature model on a plain colour. No picture of a card is a drawing, except the
  five Moon shapes of the diary and the emoji of the picture facts.
- **The pass of a creature.** `creaturePass()` finds one creature near the meadow, reads its
  clock, and makes a path to the place of the creature at a set time. The path stays over the
  right ground (land or water) and away from the trees (`sceneryObstacles()` in `src/rings.ts`).
- **The layer of a feature** has its sizes in `em`, and 1 em is 16 px in the 1280 px wide clip.
  So the layer has the same proportions in the smaller live view.
- **The capture.** `studies/learn-and-play-study/learn-and-play-study-capture.mjs` gives the
  page and the folder of this study to the capture script of the feature ideas study. That script
  asks the page for each frame, 30 frames in each second, and makes a WebM clip with ffmpeg. A
  clip has no sound track; the page plays the recorded chime times (`<id>.cues.json`) with the
  video.

Two small changes in the feature ideas study make this possible: `startCapture()` accepts the
features of a different study, and the capture script reads `STUDY_PAGE` and `STUDY_OUT`. The
capture screen now shows the climate belt of Earth in the nearest-world panel, as the game does.

The clips and the pictures are in `public/studies/learn-and-play/`. Run the capture again after
a change of an idea:

```
node studies/learn-and-play-study/learn-and-play-study-capture.mjs "path/to/chrome.exe" F11,F12
```

## The game today

| Finding | Evidence |
| --- | --- |
| The game has one book | `Book` in `src/stickers.ts` has `arrived` (13 hello stickers) and `found` (13 search stars). No other part of the game gives the child a thing to keep |
| The creatures say hello, and the game does not count it | `greet()` in `src/creatures/population.ts` returns the number of new hellos. `src/main.ts:1052` uses it only for the chime |
| The flight panel names the belt as small text | `zoneNameAt()` in `src/foliage/build.ts`, used in `updateNearestWorld()` in `src/main.ts`. `BELTS` in `src/foliage/zones.ts` has seven belts, and `GARDENS` has four gardens |
| The Moon has real phases | `src/moon.ts`: a lunar month is 300 s (`MOON.synodic`), and the night side is dark from far away |
| The sizes in the flight are not real | `WORLD_DATA` in `src/worlds.ts`: Jupiter has radius 470 and Earth 220 (2.1 times). The real proportion is 11 times |
| Each look is open from the start | `lookOptions` in `src/customization.ts` has no lock |
| The postcard leaves the game | `src/postcard-camera.ts` downloads a PNG or opens the share sheet. The game keeps no picture |
| The text of the game needs a reader | The facts and the tasks of `STICKERS` are text. `IDEA.md` records that F2 (the voice) and F6 (the songs) are rejected as built |

## The ideas

Size: S is less than one day, M is one to three days, and L is more than three days. The size
includes unit tests and a browser check, as for the other features. No idea needs a new package.

| Idea | Kind | What the child gets | Ready in the game | Size |
| --- | --- | --- | --- | --- |
| F11 Animal book | Learn | A card for each kind of animal, at its first hello | The hello, nine creature kinds, their models | M |
| F12 Count and shape rings | Learn | The rings count from one to five | The lines of sparkle rings, the chime | S |
| F13 Size line-up | Learn | Two worlds at their real proportions, and a count | The cards of Worlds | S |
| F14 Moon shapes diary | Learn | A place for each shape of the Moon | The real phases of the Moon | M |
| F15 Nature stamps | Learn | A stamp for each belt, garden and season | `zoneNameAt()`, the seasons, the magic seasons | M |
| F16 Picture thermometer | Learn | A level, a colour and a face for hot and cold | The nearest-world panel | S |
| F17 Cottage garden | Play | A flower of each world next to the cottage | The cottage, the saved book, the flower guide | M |
| F18 Looks to earn | Play | A new look as a gift for each search star | The look menu, the search stars | M |
| F19 Fairy friend | Play | A small friend that flies with the fairy | The creature models, the hello | L |
| F20 Postcard album | Play | The postcards stay in the game, with pictures to find | The postcard camera, the search checks | M |

### F11 · Animal book

The first hello to a kind of animal puts its card in a book. The card has a picture of the
animal, its name and three picture facts. Earth has four animals (cow, rabbit, sheep, duck).
Blossom Haven has five story creatures (unicorn, dragonling, kitsune kit, Frog Prince, pegasus
foal), with the mark "story creature" in place of "real animal".

- Change: `greet()` returns the kind of each creature that says hello. A new
  `src/animal-book.ts` keeps the book, and `animate()` in `src/main.ts` shows the card at the
  first hello of a kind.
- Limit: nine cards are a small book. More animals need new models.
- Clip: the fairy flies to a sheep on Earth. The card shows with a picture from the sheep model,
  and the book goes from 1 of 4 to 2 of 4.

### F12 · Count and shape rings

A line of sparkle rings has dots: one, two, three, four, five. When the fairy flies through a
ring, its number shows large with the same dots, and one note of a rising scale plays.

- Change: a count for each line in `createSparkleRings()` (`src/rings.ts`). The count follows the
  order in which she takes the rings, so it is correct from each end of the line.
- Limit: a line has three to seven rings. The dots over a ring must be easy to read from behind
  the fairy. Shape lines (circle, triangle, square, star) need new ring geometry.
- Clip: five rings over the meadow. Each ring gives a burst, its number and a note: C, D, E, G
  and the high C.

### F13 · Size line-up

A card in Worlds puts two worlds side by side. The small world starts as large as the other
one, then takes its real proportion. A row of the small world then goes across the large one,
and the row counts.

| Pair | Real diameters | The row |
| --- | --- | --- |
| The Moon and Earth | 3,475 km and 12,742 km | 4 Moons across Earth |
| Earth and Jupiter | 12,742 km and 139,820 km | 11 Earths across Jupiter |
| Jupiter and the Sun | 139,820 km and 1,392,700 km | 10 Jupiters across the Sun |

- Change: the real diameters in `src/stickers.ts`, and a new part of the card of a world in
  `src/adventure.ts`.
- Limit: the sizes in the flight are not real. The card must say "real size".
- Clip: the three pairs, with pictures of the four worlds from the engine.

### F14 · Moon shapes diary

The diary has five places: new Moon, crescent, half Moon, almost full and full Moon. A shape
that the child sees from Earth gets its place.

- Change: the angle between the Moon and the Sun, seen from the fairy, gives the shape. A new
  `src/moon-diary.ts` keeps the diary.
- Limit: a new Moon is near the Sun in the day sky and is almost invisible. Decide the rule for
  it. Clouds hide the Moon.
- Clip: the evening sky from the meadow, with the Sun 7° below the horizon. The clip moves the
  Moon away from the sunset in 11 s, so three shapes show: crescent, half Moon and almost full.
  In the game the Moon needs 300 s for one cycle. The Moon of the clip is at its real size in the
  sky; the camera has a narrow view (26°).
- Status: F14 is in the game code on the branch `features/f14-moon-diary`, with the
  recommendation of its study for each open decision: a shape counts when the fairy is in the
  air of Earth, the Moon is in the view, and the sky is clear; the new Moon fills its place when
  the Moon is next to the Sun, with the line "The Moon hides today"; the diary has five shapes.
  The diary is a block in Worlds below the cards, and only the note of a new shape shows in the
  flight. See the Moon diary part of `README.md` for the rule and the measured numbers.

Three things in the game are different from the study:

- The shape comes from the lit part of the disc that the fairy sees, not from the angle
  between the Moon and the Sun. The orbit of the Moon leans 28°, so in some months the new Moon
  stays 28° from the Sun. The limits are 10%, 35%, 65% and 88% lit, and each month has each shape.
- "The sky is clear" has three parts: the cloud cover, the air and the eclipse. The air of the
  game hides a Moon on the horizon from near the ground, and the shadow of Earth is on 8 of the
  12 full Moons of a game year, for 21 s to 39 s. These Moons give no shape.
- By day the dark side of the Moon shows as a grey ball, so a shape is hard to read by day, and
  the new Moon does not hide in the picture. The diary counts the day and the night the same.
  This is an open decision for the player.

### F15 · Nature stamps

The first flight over a climate belt of Earth gives its stamp: palm beach, jungle, savanna,
desert, leaf forest, pine forest, snow line. The four seasons of Earth give four stamps.
Blossom Haven gives a stamp for each of its four gardens and each of its four magic seasons:
19 stamps for the two worlds.

- Change: `updateNearestWorld()` in `src/main.ts` has the belt name for the flight panel. A new
  `src/stamp-book.ts` keeps the stamps.
- Limit: this idea includes "a sticker for each season" of `TODO.md`. The stamps follow a rule,
  not a place, so each new Earth has them.
- Clip: a fast flight from the equator to 68° north, over the line with the most belts. A stamp
  shows over each new belt.

### F16 · Picture thermometer

A thermometer with a face shows hot or cold near each world. It has no numbers.

- Change: a level for each world in `src/stickers.ts`, and a small part in the nearest-world
  panel.
- Limit: the screen study removed parts from the flight screen. The other place is the card of
  a world in Worlds.
- Clip: the fairy comes to Venus, and the level goes up to red. Then she comes to Uranus, and
  the level goes down to blue.
- Note: Uranus is below Neptune in the table, as the fact of the Uranus sticker says.

### F17 · Cottage garden

Each new sticker gives a seed. At the cottage, the seed falls to its bed and a flower grows.
The middle of the flower is the world, and the flower of Saturn has a ring.

- Change: a new `src/cottage-garden.ts`, with one flower for each sticker of the saved book.
- Limit: the lollipop grove is around the cottage. Thirteen flowers need a clear bed that is not
  in the path of a creature.
- Clip: four flowers stand next to the cottage. The fairy comes home, the seed of Saturn falls,
  and the fifth flower grows with sparkles. The clip tips Blossom Haven toward the Sun, because
  the cottage is at the pole; the game does not do this.

### F18 · Looks to earn

A search star opens a new look that comes from its world. Each look of today stays open.

- Change: a `gift` field for a look in `src/customization.ts`. The look menu shows a closed
  gift, and `stickerBook.find()` opens it.
- Limit: thirteen gifts are thirteen new looks. A first list is `GIFTS` in
  `features/f18-looks-to-earn.ts`: five trails, three wings, three dresses and two hair styles.
- Clip: the fairy flies over the rings of Saturn. A gift opens, and her trail becomes the Ring
  trail: small gold rings that grow and fade. The camera keeps the rings flat; the follow camera
  of the game has its up direction away from the planet.

### F19 · Fairy friend

After five hellos, a small friend flies with the fairy. It has no task and no health.

- Change: a new `src/friend.ts`, updated after `updateFairy()`.
- Limit: one creature is 14 to 21 draw calls. The friend must keep up in open space, and must
  stay out of the ground and out of the camera. A friend for Earth needs a bird model.
- Clip: a pegasus foal follows the fairy over Blossom Haven, and makes one loop around her.

### F20 · Postcard album

The album keeps the postcards in the game, and it asks for pictures: the Moon, a duck, a
rainbow, a unicorn, the rings.

- Change: a **Keep** button in `src/postcard-camera.ts`, and a new `src/album.ts` with a store in
  IndexedDB. The test "the picture shows a duck" uses the creature check of `searchProbe()`.
- Limit: a small copy of each picture (640 px) and a maximum of 24 pictures. The album stays on
  the device.
- Clip: the fairy flies to a duck. A flash, and the postcard shows with the real picture of the
  view. The postcard gets small and goes into its place in the album.

## Recommendation

Start with F12, F15, F11 and F17.

- F12 is the smallest, and it uses the rings that the game has.
- F15 uses a name that the game calculates now, and it follows the rule for a new Earth.
- F11 uses the hello that the game has, and gives the creatures a purpose.
- F17 gives the stickers a second life, and gives a reason to fly home.

F13 and F16 are small and can follow. F14 needs a rule for the new Moon. F18 needs thirteen new
looks. F19 adds draw calls on a phone. F20 needs a picture store.

## Decisions to make

The five decisions below are for the ten ideas together. Each study has three more decisions
for its idea: 30 decisions in `studies.ts`, each with a recommendation as its first option.

| Idea | The three decisions of its study |
| --- | --- |
| F11 | What starts a card. What a card shows. How the book shows real animals and story creatures |
| F12 | How far the count goes. What shows the number. What occurs when she enters a line in the middle |
| F13 | The place of the size card. The worlds that a card compares. How the card agrees with the flight |
| F14 | When a shape counts. The rule for the new Moon. The number of shapes |
| F15 | The stamps that come first. When a belt counts. What Blossom Haven gives |
| F16 | The place of the thermometer. What gives the answer. One level or a day and a night level |
| F17 | When a flower grows. The place of the 13 beds. What a flower does |
| F18 | What opens a gift. The number of gifts that come first. How the look menu shows a closed gift |
| F19 | Who the friend is. When the friend comes. What a phone gets |
| F20 | How a picture gets into the album. How the game knows the subject. The number of pictures |

1. Which ideas do you want in the game?
2. Which idea comes first? The recommendation is F12.
3. Where do the new books go: pages in Worlds (recommended), a new "My books" button, or the
   cottage?
4. How much text can a card have: a picture, a name and picture facts (recommended), pictures
   only, or full sentences after a new voice study?
5. Does a book show during the flight: only the note of a new card (recommended), a strip for a
   few seconds, or a strip that stays?

## Decisions of 13 October 2026

| Decision | Answer |
| --- | --- |
| The ideas for the game | F12, F14, F16 and F19 |
| The first idea | F12 |
| The place of the new books | Pages in Worlds, next to the stickers |
| The text of a card | A picture, a name and picture facts |
| A book in the flight | Only the note of a new card |
| F19: the friend | The child selects a friend from the creatures that she met |
| F19: the time | After five hellos |
| F19: a phone | A friend model with its parts joined, about 3 draw calls |

The three decisions of F12, of F14 and of F16 have no answer.

F12 is in the game code on the branch `features/f12-count-rings`, with the recommendation of its
study for each open decision: each line counts to its own length (5 to 7 rings), dots over the
ring and the numeral at the pass, and a count that follows the order of the rings she takes.
One rule is more exact than the study: the number of a ring is the count that she gets when she
flies to it, so the dots and the count always agree. See the Sparkle rings part of `README.md`.
The shape lines are not built.

## Limits of this study

- The clips use study code, not game code. The game code needs its own design, tests and
  browser checks.
- The worlds stand still in the clips. In the game they turn and move on their orbits.
- The Earth of the lab has no weather step and no season step, so its sky is the fair sky.
- Each clip shows its book as a strip at the bottom of the screen, to make the idea clear. The
  place of the books is decision 3.
- F14 moves the Moon by hand, F17 and F19 tip Blossom Haven toward the Sun, and F18 uses its own
  camera. The game does not do these things.
- The picture facts use emoji. An emoji has a different look on each device; the game needs its
  own small pictures.
- The snippets show the main idea of each change. They leave out the imports, the styles and
  the tests.

## Verification

- `npx tsc --noEmit -p .` passes.
- `npx vitest run studies/learn-and-play-study` passes: ten ideas with four proposed, the real
  proportions of F13, the five Moon shapes, a stamp for each belt, the order of the thermometer,
  a gift for each world, a study for each idea with three moment pictures and three decisions,
  and a clip, a picture and a cue list for each idea.
- The capture script made the ten clips and pictures with no page errors. Each picture was
  checked by eye.
