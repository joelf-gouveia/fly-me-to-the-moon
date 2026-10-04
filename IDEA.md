# Ideas

This file records the ideas for the game: the ideas that have code on a branch, the
ideas that have a study only, and the new ideas. Update it when an idea starts, when
it merges into `master`, and when a new idea comes.

The feature study is the source of F1 to F10:
[docs/feature-ideas-study.md](docs/feature-ideas-study.md) and
`/studies/feature-ideas-study.html`.

Last update: 4 October 2026.

## State of each idea

| Idea | State | Branch |
| --- | --- | --- |
| F1 Search stars | In `master` | Merged in `c83f7d7` |
| F2 Spoken facts | Built, tested and rejected on 4 October 2026. Needs a new design | Deleted |
| F3 Creature hello | In `master` | Merged in `00af6ea` |
| F4 Sparkle rings | In `master` | Merged, branch closed |
| F5 Postcard camera | In `master` | Merged, branch closed |
| F6 A song for each world | Built, tested and rejected on 4 October 2026. Needs a new design | Deleted |
| F7 Game controller | Dropped | None |
| F8 Comets and shooting stars | In `master` | Merged in `30561c9` |
| F9 Bedtime timer | Study only | None |
| F10 Install and fly offline | Study only | None |
| Weather on Earth and Blossom Haven | Earth: steps 1 to 4 in `master`; step 5 is in `TODO.md` | Merged, branch closed |

No idea has an open branch.

## Open features

Each open feature is complete on its branch, with unit tests, a browser check, a
README part and a status note in the study document.

### F1 · Search stars

- **Branch:** `features/f1-search-stars`. In `master` since merge `c83f7d7` of 4 October 2026.
- **What it does:** after the hello sticker of a world, the note gives one small
  task, for example "Find the big red storm." When the fairy does it, a gold star
  pops up in the world, a chime plays, and the sticker gets a star. **Worlds** shows
  the task, the star and the count. **Reset sticker book** removes the stars.
- **Tasks in the game:** one for each of the 13 worlds. On 4 October 2026 nine
  worlds got a task that uses their own scenery, because the first tasks had six
  tasks of the kind "fly low".

  | World | Task |
  | --- | --- |
  | Sun | Fly through a loop of fire. |
  | Mercury | Find a crater with bright rays. |
  | Venus | Fly all the way around Venus. |
  | Earth | Find a rainbow. |
  | Moon | Find the dark seas on the Moon. |
  | Mars | Fly along the long canyon. |
  | Vesta | Find the giant hole at the bottom. |
  | Ceres | Find the bright white spots. |
  | Jupiter | Find the big red storm. |
  | Saturn | Fly over the rings. |
  | Uranus | Find the thin rings of the planet that lies on its side. |
  | Neptune | Find the dark storm and its white cloud. |
  | Blossom Haven | Pop a soda bubble. |

- **Files:** `src/search-stars.ts`, `src/search-places.ts`, `src/stickers.ts`,
  `src/planet-paint.ts`, `scripts/search-stars-smoke.mjs`.
- **Decisions to confirm:**
  - "Low" is less than 20 m for Mercury, the Moon and Mars. The ring plane of
    Saturn and of Uranus is less than 40 m away. A search does not count as an
    arrival.
  - A rainbow needs rain, sunshine and a low Sun. The weather is mostly sunny, so
    the task of Earth can take some time. Decide if this is acceptable.
  - The soda bubbles are small and clear. They pop when the fairy touches them.
    Decide if they must be larger or brighter for the task.
- **To check on a real phone:** the 3D star, the chime and the note colours.

### F2 · Spoken facts

- **State:** rejected as built. The player tested it on 4 October 2026 and does not want
  it in this form. The branch is deleted (last commit `7cc7214`). The text below is the
  first version, as a record for a new design.
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
- **Note:** F1 adds task and found lines to the note. The recordings
  (`task-<world>.mp3`, `found-<world>.mp3`) are for the first tasks. Nine worlds
  have new tasks since 4 October 2026: the Sun, Mercury, Venus, Earth, Mars,
  Jupiter, Uranus, Neptune and Blossom Haven. These need new recordings, in English
  and in Portuguese, before the voice can say them.

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

- **State:** rejected as built. The player tested it on 4 October 2026 and does not want
  it in this form. The branch is deleted (last commit `5a063f9`). The text below is the
  first version, as a record for a new design.
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

### More search tasks on each world

Each world has one search task (F1). Add more tasks to each world, until a world
is a place to explore: a "Where is Waldo" for small children. The child looks at
the world, finds a thing, and gets a star.

Points for the study:

- **Tasks that exist as options.** The player saw these on 4 October 2026 and
  did not select them. Each one is a task for a second or third star:
  - Sun: fly close to feel the warm light.
  - Mercury: find a crater.
  - Venus: fly under the golden clouds.
  - Earth: find a duck on the water; find the snow.
  - Moon: find the crater with the bright rays; fly through a sparkle ring.
  - Mars: fly low over the red dust; find the white ice at the top.
  - Vesta and Ceres: fly all the way around.
  - Jupiter, Uranus and Neptune: dive into the clouds.
  - Saturn: fly through the dark gap in the rings; find the six-sided storm at
    the top.
  - Blossom Haven: say hello to a unicorn; find the flying foals over the garden.
- **Things to find.** Hide small things for the child to look for: one creature
  with a hat, a golden flower, a lost balloon, a gift at the cottage. A hidden
  thing must be easy to see when the fairy is near it.
- **The book.** The card of a world shows each task and its star, and a count
  for the world, for example 2 of 5. A world that is complete gets a mark.
- **The order.** Decide if a world gives its tasks one at a time or all
  together. One at a time is easier for a small child.
- **The code.** `Sticker.search` becomes a list, and `Book.found` records each
  task, not each world. A saved book of today must stay correct. The creature
  check of `searchProbe()` exists (`SEARCH_CREATURE`), and no task uses it now.
- **The voice.** Each task has a task line and a found line. Each line needs a
  recording for the spoken facts (F2), in each language.
- **Rules to keep:** no score, no timer and no fail. Earth gets a new landscape
  at each visit, so a task on Earth must not need a fixed place.

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
