# Ten ideas, seen in flight: feature ideas study

Status: a study, 3 October 2026. No decision yet. Open `/studies/feature-ideas-study.html`
on the Vite server. The study does not change the game or saved game data. It saves its
own answers as `fairy-feature-ideas-study-v1`. The line numbers below describe the game on
2 October 2026 (commit `380f3e8` with the changes in the working tree).

This study proposes ten features that the game does not have. Each feature has a clip
from the engine of the game: the real worlds, the fairy, the sky and the screen of the
game, with the feature added by study code. The clips show the idea. They are not the
final design.

## What to review

- **The player** shows the clip of the selected idea. The ten chips above it select an
  idea. **Sound** plays the chimes, the voice and the hum of the clip in step with the
  video.
- **Fly it live** runs the same idea in live 3D. **Play again** starts the clip again.
  **Free flight** gives the keys to you: W and S climb and descend, A and D turn, Shift
  boosts. Most ideas work in free flight too, for example the rings, the creature hello
  and the shooting stars at night. A game controller works in F7.
- **01 / How it works** gives the place in the game code and a snippet of the change.
- **02 / The ten ideas** shows a picture of each idea, its size and its new package.
- **03 / Listen** plays the chord of each world of F6.
- **06 / Decisions to make** keeps your answers in this browser. **Copy answers** copies
  them for the chat. **Save study** exports them as JSON.

## How the clips were made

The study has a lab (`studies/feature-ideas-study/lab.ts`) with the parts of
`src/main.ts` that make a picture: the renderer settings, `createWorlds()`,
`createStarSky()`, the Sun light and `createSunShading()`, the fairy rig and the Sky
Dancer animation, the trail, the camera of `updateCamera()` and the sky and fog of
`updateEnvironment()`. The worlds stand still, so each clip is the same at each run.

- A clip moves the fairy on a **rail**: a smooth path at a height above the ground of a
  world. F7 uses scripted keys and the real `stepFlight()` of `src/flight.ts` instead.
- Each idea is one file in `studies/feature-ideas-study/features/`. It adds its objects
  to the scene and its notes to an HTML layer over the canvas, and it removes them when
  the next idea starts.
- The capture page (`?capture`) puts the lab in the screen of the game: the title, the
  nearest-world panel, the speed panel, **Worlds** and the three round buttons, with the
  styles of `src/style.css`.
- `studies/feature-ideas-study/feature-ideas-study-capture.mjs` asks the page for each
  frame, 30 frames in each second, takes a JPEG of each frame and makes a WebM clip with
  ffmpeg. A clip has no sound track. The capture records each sound call with its time in
  `<id>.cues.json`, and the page plays the cues again with the video.

Each clip is 9 to 12 s at 1280 × 720, and each WebM is 3.3 to 4.2 MB (36 MB for the ten
clips and pictures). The clips and the pictures are in `public/studies/feature-ideas/`.
Run the capture again after a change of an idea:

```
node studies/feature-ideas-study/feature-ideas-study-capture.mjs "path/to/chrome.exe" F1,F2
```

## The game today

| Finding | Evidence |
| --- | --- |
| The search stars have data, but no game code | Each sticker in `STICKERS` (`src/stickers.ts:12-27`) has a `search` task with a check kind and a rule. `Book` has a `found` list (`src/stickers.ts:82-84`). Only the sticker book study uses them. The sticker book study recommends them after the hello stickers (`docs/sticker-book-study.md:243-247`) |
| 153 voice lines wait in the repo | `public/voice/manifest.json` lists 153 lines in English and 153 in European Portuguese (5.9 MB). Only `studies/sticker-book-study/main.ts:217` plays them |
| The sound is one hum and one chime | `createAmbience()` (`src/main.ts:600-615`) starts three oscillators at 110, 164.81 and 220 Hz and keeps no reference to them. `playChime()` (`src/main.ts:493`) plays the sticker and home notes |
| No controller, no picture save, no install | A search of `src/` and `index.html` finds no `getGamepads`, no `toBlob`, no `preserveDrawingBuffer` and no web manifest. The renderer (`src/main.ts:188`) clears its picture after each frame |
| Each frame has a place for each idea | `animate()` (`src/main.ts:860-924`) calls `updateNearestWorld()`, `updateFairy()`, `creatures.update()` and `renderer.render()` in a fixed order. `updateFairy()` reads the input only through `keys.has()` (`src/main.ts:716-727`) |
| The creatures keep one model for each resident | `createPopulation()` keeps a map from the resident index to its model (`src/creatures/population.ts:38-60`) |
| Settings saves two switches | `parseSettings()` reads only `stars` and `orbits` (`src/settings.ts:20-23`). `followHome()` starts the flower guide (`src/main.ts:447-454`) |
| The game has no host and no offline cache | `docs/mobile-play.md:34-36`. A service worker needs HTTPS, and the home Wi-Fi address is `http://` |

## The ideas

Size: S is less than one day, M is one to three days, and L is more than three days. The
size includes a smoke script, as for the other features.

| Idea | What the child gets | Ready in the game | Size | New package |
| --- | --- | --- | --- | --- |
| F1 Search stars | A gold star for one small task on each world | Tasks, rules, `Book.found` | M | No |
| F2 Spoken facts | A voice says the fact of each new sticker | 153 recordings | S | No |
| F3 Creature hello | Creatures hop and show hearts | Creature models and places | M | No |
| F4 Sparkle rings | Rings to fly through, a burst and a longer trail | Trail, chime | M | No |
| F5 Postcard camera | A framed picture of the fairy and the world | Renderer, world names | S | No |
| F6 A song for each world | A soft chord for each world | The hum, the near test | S | No |
| F7 Game controller | Fly with a controller | One input object | S | No |
| F8 Comets and shooting stars | A comet with a tail, and shooting stars at night | Orbits, star sky | L | No |
| F9 Bedtime timer | The fairy flies home and says good night | Settings, flower guide | S | No |
| F10 Install and fly offline | A home-screen icon, and play with no Wi-Fi | The build, the icon | M | `vite-plugin-pwa`, or a service worker by hand |

### F1 · Search stars

After the hello sticker, the note gives one small task. Earth: "Find a duck on the
water." When the fairy comes within 12 m of a duck, a gold star pops up, a chime plays,
and the note says "You found a duck!" with a star on the sticker.

- Change: a new `searchDone()` in `src/stickers.ts`, called from `updateNearestWorld()`
  in `src/main.ts`. `stickerBook.find()` saves the world in `Book.found` and shows the
  note.
- Limit: the terrain checks (the craters of Mercury, the dark seas of the Moon) need new
  exports from `src/terrain.ts`. Start with the six altitude checks.
- Clip: the fairy flies low over the water of Earth to a real duck of the population.
  A hint card shows the task. Within 12 m, the gold star pops up over the duck and the
  sticker toast of the game says "You found a duck!". The time of the find changes by
  about 1 s from run to run, because the ducks swim on their own clock.

### F2 · Spoken facts

A new sticker shows, and a soft voice says its name and its fact. The words of the fact
light up with the voice. The voice speaks only when Sound is on.

Status: in the game on 3 October 2026, in English only. `src/spoken-facts.ts` plays the
hello line 0.5 s after the chime (0.9 s after the longer chime of every fourth sticker), with one
audio element. The note in `src/sticker-book.ts` shows the speaker mark and lights each word.
The word times come from the length of the recording, shared by the letters of each word, not
from the loudness. The voice stops at a pause, when the page hides, when Sound goes off and when
the next line starts. A language setting is not part of this change. See the Sticker book part of
`README.md` and `scripts/spoken-facts-smoke.mjs`.

- Change: play `public/voice/en/af_heart/hello-<world>.mp3` from the `chime` action of
  `createStickerBook()` in `src/main.ts`. Stop it in `setPaused(true)` and when the page
  hides.
- Limit: a change of a fact needs a new recording
  (`studies/sticker-book-study/sticker-voice.mjs`).
- Clip: the fairy flies down to the Moon. At the arrival the real sticker toast shows,
  and `hello-moon.mp3` (3.67 s) plays. A small speaker mark moves while the voice speaks,
  and each word lights up in time. The word times come from the loudness of the line.

### F3 · Creature hello

The fairy flies low near a creature. It hops, and small hearts float up. A soft note
plays. Each creature says hello again only after 8 s.

- Change: a new `greet()` in `createPopulation()` (`src/creatures/population.ts`).
  `animate()` calls it next to `world.creatures?.update()`.
- Limit: the models are joined into 14 to 21 meshes, so a hop moves the whole creature.
- Clip: on Blossom Haven, the fairy flies 2.3 m up past the fairytale creatures near the
  cottage. Each creature within 4.5 m turns to her, hops two times, and sends up two or
  three hearts.
- Note: `creatures.update()` puts each model back on its route at each frame. The hop
  must come after it: in the game, `greet()` runs after `update()`.

### F4 · Sparkle rings

A short line of glowing rings floats over the meadow. The fairy flies through a ring: a
burst of sparkles, a two-note chime, and a longer trail for 4 s. A ring comes back after
30 s. There is no score and no fail.

- Change: a new `src/rings.ts`. The rings are children of `world.group`, so they turn
  with the world. `updateFairy()` tests each ring.
- Limit: each world needs a safe line of rings, clear of the ground, the trees and the
  cottage. Earth makes a new landscape at each visit, so its rings need a new line each
  time.
- Clip: the fairy flies low over the meadow and the river through six rings in candy
  colours. Each ring gives a burst, a chime and a longer trail.

### F5 · Postcard camera

A camera button, a soft flash, and a postcard with the picture, a frame and the name of
the world. **Save** keeps it on the device; **Share** sends it to Photos on an iPad.

- Change: a fourth round button in the toolbar. `takePostcard()` calls
  `renderer.render()` and then `toBlob()` in the same call, because the renderer clears
  its picture after each frame.
- Limit: the picture never leaves the device unless a grown-up shares it. A fourth round
  button makes the toolbar longer; the screen study chose four buttons.
- Clip: at Blossom Haven at golden hour. A tap on the camera button, a flash, and the
  postcard slides up with the real frame of the flight. A tap on **Save** shows
  "Saved to Photos". The flight goes on behind the postcard.

### F6 · A song for each world

The hum glides to a chord for each world when the nearest world changes. The clip shows
the music as a small card, because a clip has no sound track; **Sound** plays it.

- Change: `createAmbience()` keeps its three oscillators. `updateNearestWorld()` calls
  `playWorldChord()` when the nearest world changes. The chords are `WORLD_CHORDS` in
  `studies/feature-ideas-study/features/f6-world-songs.ts`.
- Limit: each chord needs a listen test on a phone speaker.
- Clip: from the clouds of Earth to the Moon. At about 6.3 s the nearest world changes,
  and the card goes from "♪ Earth" to "♪ Moon". **Sound** plays the hum with the clip;
  **03 / Listen** plays each chord.

| World | Notes | Hz |
| --- | --- | --- |
| Sun | C3 G3 E4 | 130.81, 196, 329.63 |
| Mercury | D3 A3 F♯4 | 146.83, 220, 369.99 |
| Venus | B♭2 F3 D4 | 116.54, 174.61, 293.66 |
| Earth | A2 E3 A3 (the hum of today) | 110, 164.81, 220 |
| Moon | F2 C3 A3 | 87.31, 130.81, 220 |
| Mars | E2 B2 G♯3 | 82.41, 123.47, 207.65 |
| Vesta | G2 D3 B3 | 98, 146.83, 246.94 |
| Ceres | A♭2 E♭3 C4 | 103.83, 155.56, 261.63 |
| Jupiter | C2 G2 E3 | 65.41, 98, 164.81 |
| Saturn | D2 A2 F♯3 | 73.42, 110, 185 |
| Uranus | E♭2 B♭2 G3 | 77.78, 116.54, 196 |
| Neptune | D♭2 A♭2 F3 | 69.3, 103.83, 174.61 |
| Blossom Haven | E3 B3 G♯4 | 164.81, 246.94, 415.3 |

### F7 · Game controller

The left stick steers, A boosts, B pauses and X toggles hover.

- Change: a third input source in `createFlightInput()` (`src/flight-input.ts`).
  `updateFairy()` reads it through `keys.has()` with no other change.
- Limit: a dead zone of 0.4 keeps the steering the same as the keys. Controllers differ
  in their button order.
- Clip: the fairy flies with the real `stepFlight()` and a scripted stick: left, right,
  a climb and a boost. A drawing of a controller shows the stick and the buttons. In
  **Fly it live**, **Free flight** reads a real controller; X has no effect, because the
  lab has no hover.

### F8 · Comets and shooting stars

A comet with a tail that always points away from the Sun, and shooting stars in the
night sky of Earth.

- Change: a new `src/comet.ts`, updated next to `orbits.update()`. The shooting stars use
  `skyVisibility` of `updateEnvironment()`, so they show only in a dark sky.
- Limit: a comet on a long orbit crosses the paths of the planets. Relocation must keep
  Blossom Haven clear of it. A comet sticker needs a 14th sticker.
- Clip: 0 to 6 s, a comet with a dust tail and a blue ion tail crosses the view near
  Earth, and the fairy flies through the tail. 6 to 12 s, the meadow at night with four
  shooting stars.

### F9 · Bedtime timer

A grown-up sets **Time to rest** in Settings. After that time of active flight, a note
says "Time to fly home and rest", the flower guide takes the fairy to the cottage, and
the game shows "Good night" and stops. There is no countdown on the screen.

- Change: a `rest` field in `parseSettings()` (`src/settings.ts`), a row in Settings, a
  clock of active flight in `animate()`, and `followHome()`.
- Limit: a child can stop the guide with the arrows. The timer must start the guide
  again after a short time.
- Clip: a small Settings card shows **Time to rest · 20 min**. Then the note, the guide
  fireflies, the fairy at the cottage door, a soft dimming and the **Good night** card.
- Note: the cottage is at the south pole of Blossom Haven, on the axis of its spin, so the
  Sun is always about 5° up there. The clip tips the world to get a dusk. In the game a
  night at the cottage comes only after a move of the home.

### F10 · Install and fly offline

An icon on the home screen of the iPad. The game opens full screen and plays with no
Wi-Fi.

- Change: a web manifest and a service worker, for example with `vite-plugin-pwa` in
  `vite.config.ts`. The 5.9 MB voice stays out of the first cache.
- Limit: a service worker needs HTTPS, so this needs an HTTPS host. `docs/mobile-play.md`
  says that the game has no public host and no offline cache; this changes that
  decision. The clip draws an iPad around the real game, because a real install cannot
  be filmed.
- Clip: an iPad home screen in airplane mode, a tap on the game icon, the splash, and the
  real game in the screen with the note "No Wi-Fi · still flying".
- Note: `public/favicon.svg` is the default Vite logo. The game needs its own icon before
  an install. The clip draws a simple icon: a night sky, a gold moon and wings.

## Recommendation

Start with F1, F2, F3 and F5. They give the most to a young player for the least new
code. F1 and F2 have their data and their recordings in the repo, and the sticker book
study designed them. F3 and F5 use parts that the game has.

The others are good later. F6 and F9 are small. F7 is for a TV. F8 is large. F10 needs a
host.

## Decisions to make

1. Which ideas do you want in the game?
2. How do we start each idea: straight into the game for F1 and F2 and a study for the
   others (recommended), a study for each, or straight into the game for each?
3. Which idea comes first? The recommendation is F1.

## Limits of this study

- The clips use study code, not game code. The game code needs its own design, tests and
  smoke scripts.
- The worlds stand still in the clips. In the game they turn and move on their orbits.
- F3 and F9 tip Blossom Haven toward the Sun for the clip, because the cottage is at the
  pole. The game does not do this.
- The Webb pictures and the voice line load from the server. The live view needs a
  graphics card with WebGL 2.
- F10 is a drawing of an iPad around the real game. The install and the offline play are
  not tested.
- The snippets show the main idea of each change. They leave out the imports, the
  styles and the tests.

## Verification

- `npx tsc --noEmit -p .` passes.
- `npx vitest run studies/feature-ideas-study` passes: ten ideas, a chord of three rising
  notes for each world with the hum of today on Earth, and a clip, a picture and a cue
  list for each idea.
- The capture script made the ten clips and pictures with no page errors. Each picture
  was checked by eye.
- After each clip, free flight ran for 12 s, and the next idea loaded with a clean scene.
