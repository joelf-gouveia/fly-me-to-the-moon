# Ideas

This file records the ideas for the game: the ideas that have code on a branch, the
ideas that have a study only, and the new ideas. Update it when an idea starts, when
it merges into `master`, and when a new idea comes.

The feature study is the source of F1 to F10:
[docs/feature-ideas-study.md](docs/feature-ideas-study.md) and
`/studies/feature-ideas-study.html`.

Last update: 3 October 2026.

## State of each idea

| Idea | State | Branch |
| --- | --- | --- |
| F1 Search stars | Code complete, not merged | `features/f1-search-stars` |
| F2 Spoken facts | Code complete, not merged | `features/f2-spoken-facts` |
| F3 Creature hello | In `master` | Merged in `00af6ea` |
| F4 Sparkle rings | In `master` | Merged, branch closed |
| F5 Postcard camera | In `master` | Merged, branch closed |
| F6 A song for each world | Code complete, not merged | `features/f6-world-songs` |
| F7 Game controller | Dropped | None |
| F8 Comets and shooting stars | In `master` | Merged in `30561c9` |
| F9 Bedtime timer | Study only | None |
| F10 Install and fly offline | Study only | None |
| Weather on Earth and Blossom Haven | Earth: steps 1 to 4 in `master`; step 5 is in `TODO.md` | Merged, branch closed |

Each open branch has a worktree folder with the same name in
`C:\Users\joel_\Documents\GitHub\fly-me-to-the-moon-worktrees\`. To see an idea, run
`npm run dev` in its folder.

## Open features

Each open feature is complete on its branch, with unit tests, a browser check, a
README part and a status note in the study document.

### F1 · Search stars

- **Branch:** `features/f1-search-stars` (`a60c7a3`). Not on GitHub.
- **What it does:** after the hello sticker of a world, the note gives one small
  task, for example "Find a duck on the water." When the fairy does it, a gold star
  pops up in the world, a chime plays, and the sticker gets a star. **Worlds** shows
  the task, the star and the count. **Reset sticker book** removes the stars.
- **Checks in the game:** all 13 worlds. Altitude (Sun, Venus, Mars, Jupiter,
  Uranus, Neptune), place (Vesta, Ceres, the rings of Saturn), creature (a duck on
  Earth, a unicorn on Blossom Haven) and terrain (a crater on Mercury, a dark sea
  on the Moon).
- **Files:** `src/search-stars.ts`, `src/stickers.ts`, `src/terrain.ts`,
  `scripts/search-stars-smoke.mjs`.
- **Decisions to confirm:** "low" is less than 20 m for Mercury and the Moon. The
  ring plane of Saturn is less than 40 m away. A search does not count as an
  arrival.
- **To check on a real phone:** the 3D star, the chime and the note colours.

### F2 · Spoken facts

- **Branch:** `features/f2-spoken-facts` (`7cc7214`). On GitHub.
- **What it does:** with **Sound** on, a recorded English voice says the name and
  the fact of each new sticker, 0.5 s after the chime. A speaker mark moves in the
  note, and each word lights up in time. The voice stops at a pause, when the page
  hides, when **Sound** goes off, at a book reset and when the next line starts.
  The Sound switch reads "Music, chimes and voice".
- **Files:** `src/spoken-facts.ts`, `src/sticker-book.ts`,
  `scripts/spoken-facts-smoke.mjs`.
- **Open decisions:**
  - The voice keeps speaking while **Worlds** or **Settings** is open. Decide if
    it must stop there.
  - English only. The 153 Portuguese lines are in `public/voice/pt/`. A language
    setting is a new idea.
- **To check on a real device:** the sound unlock on iOS, and the voice after a
  phone call.
- **Note:** F1 adds task and found lines to the note. The recordings for them
  exist (`task-<world>.mp3`, `found-<world>.mp3`). After F1 and F2 are both in
  `master`, the voice can say them too.

### F3 · Creature hello

- **Branch:** closed. In `master` since merge `00af6ea` of 3 October 2026.
- **What it does:** a creature near the path of the fairy turns to her, hops two
  times (a duck or a Frog Prince bobs on the water), and pink hearts float up. A
  soft chime plays when **Sound** is on. Each creature says hello again after 8 s.
- **Fixes of 3 October:** the hearts are the right way up, and the hello starts
  before the fairy arrives. A creature looks 1.1 s ahead on her path, to a maximum
  of 16 m, and says hello when she or that point is 6 m or nearer.
- **Files:** `src/creatures/hello.ts`, `src/creatures/population.ts`,
  `scripts/creature-hello-smoke.mjs`.
- **To tune by feel:** `lead` and `distance` in `src/creatures/hello.ts`.
- **Limits:** the whole creature hops, because its model is joined meshes. The
  hearts have no fog, so they stay bright in thick mist.

### F6 · A song for each world

- **Branch:** `features/f6-world-songs` (`5a063f9`). Not on GitHub.
- **What it does:** each of the 13 worlds has a chord of three notes. The hum
  glides to the chord of a world in about 2 s when the fairy comes near it. Earth
  keeps the hum of today. In open space the hum keeps the chord of the last world.
- **Files:** `src/world-songs.ts` (the chord table; the study imports it),
  `scripts/world-songs-smoke.mjs`.
- **To check by ear:** each chord on a phone speaker. The deep chords of Jupiter,
  Saturn, Uranus and Neptune (down to 65 Hz) can be almost silent there. The
  open-space rule.

### F8 · Comets and shooting stars

- **Branch:** closed. In `master` since merge `30561c9` of 3 October 2026.
- **What it does:** a comet goes around the Sun in 600 s at 1×, with a dust tail
  and a blue ion tail that point away from the Sun. A flight through a tail gives
  sparkles, a larger trail for 4 s and a chime; the flight panel says "Comet
  tail". Shooting stars cross the night sky inside the air of a world. Blossom
  Haven never moves into the path of the comet.
- **Files:** `src/comet.ts`, `src/comet-sky.ts`, `src/shooting-stars.ts`,
  `src/relocation.ts`, `scripts/comet-smoke.mjs`.
- **Open decisions:**
  - **Orbit paths** and the **Worlds** map do not show the path of the comet.
  - Near the Sun the dust tail reaches the orbit of Mercury. The nucleus stays
    250 m or more from each world.
  - A comet sticker needs a 14th sticker.

## Ideas with a study only

### F7 · Game controller (dropped)

Dropped on 3 October 2026. The study clip and the snippet stay in the feature
study. An unfinished draft of the game code was removed. Start again from the
study if the idea comes back: a third input source in `src/flight-input.ts`.

### F9 · Bedtime timer

A grown-up sets **Time to rest** in Settings (off, 10, 20 or 30 minutes of active
flight). Then a note says "Time to fly home and rest", the flower guide takes the
fairy to the cottage, and the game shows "Good night". No countdown shows.
Size: small. Not started.

### F10 · Install and fly offline

A home-screen icon, full screen, and play with no Wi-Fi (a web manifest and a
service worker). It needs an HTTPS host, and `docs/mobile-play.md` says that the
game has no public host and no offline cache. The game also needs its own icon:
`public/favicon.svg` is the default Vite logo. Size: medium. Not started.

## New ideas

### Weather on Earth and Blossom Haven

A weather system for the two worlds with clouds, air and life. Earth has a study:
[docs/weather-study.md](docs/weather-study.md) and `/studies/weather-study.html`. The
decisions are in the study document: a weather map, six kinds of weather and new
clouds. The game has steps 1 to 4 of the study; the next steps are in `TODO.md`.
Blossom Haven has no study.

Points for the study:

- **Earth:** rain, snow near the poles and on high ground, wind, mist in the
  morning, a rainbow after rain, a calm thunderstorm far away. The weather can
  follow the climate belts and the seasons, if the seasons study goes into the
  game.
- **Blossom Haven:** candy weather, for example sugar snow, sprinkle rain, bubble
  showers from the soda rivers, and a candy rainbow.
- **What changes with the weather:** the clouds, the fog and the light of
  `updateEnvironment()` in `src/main.ts`, the hum or a soft rain sound, the
  creatures (shelter, puddles), and the flight panel text.
- **Rules to keep:** calm, no danger and no fail. Weather must not hide the way
  home or the flower guide. The cottage sky stays clear, as with the cotton candy
  clouds.
- **Phone budget:** rain and snow as one particle draw call, half the particles
  on a phone, and no weather motion with reduced motion.
- **Links to other ideas:** a search task ("Fly through a rainbow"), a postcard
  with a rainbow, shooting stars only in a clear night sky.
