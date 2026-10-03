# Every world, one book: world book study

Status: option D is in the game on 27 September 2026, with the recommended answers to
decisions 2 to 4, and the next door in the book order. Open
`/studies/world-book-study.html` on the Vite server. The study controls do not change the
game or saved game data. The study saves its own answers as `fairy-world-book-study-v1`.
The findings and the line numbers below describe the game before the change.

## What the game now does

| Area | Change |
| --- | --- |
| `src/stickers.ts` | `BOOK_ORDER`, `KNOWN_AT_START` (Earth, Blossom Haven, the Sun), `ALWAYS_OPEN` (Earth, Blossom Haven), `nextDoor()`, `isKnown()` and `canFly()` |
| `src/adventure.ts` | **Worlds** is the book: the progress dots, a note with **Fly there**, the map, and 13 cards in the book order. A tap on a card shows its fact or a hint. A mystery is a grey "?" on the map, with no path, and a "Mystery world" card |
| `src/sticker-book.ts` | The book, the save, the reset, the new-sticker note and `canFly()`. No dialog and no toolbar button. The note says "A new world is waiting in Worlds!" when a sticker opens a door |
| `src/main.ts` | The book comes first, and **Worlds** gets it. `travelTo()` flies only to an open world. `bookOpen` is gone. The test snapshot adds `openWorlds` |
| Toolbar and Menu | **Stickers** is gone: three toolbar buttons (**Your fairy**, **Settings**, pause) and two Menu buttons. The **Worlds** button shows the count, for example "3/13" |
| `src/settings.ts` | The gear is beside **Your fairy**. **Reset sticker book** also closes the worlds again |
| Smoke scripts | A card tap, then `#world-fly`. `asteroid-belt-smoke.mjs`, `sun-smoke.mjs` and `mobile-play-smoke.mjs` start with the stickers of the worlds they visit. `sticker-book-smoke.mjs` checks the book in **Worlds**; `settings-smoke.mjs` checks the locks after a reset |

**Worlds** and **My space stickers** show the same 13 worlds with the same pictures. This
study merges them into one book. It also compares three ways to open the solar system as
the fairy discovers it. Two of them lock "Fly here" until the child finds a world. The
options are **A — One book**, **B — The map fills in**, **C — Earn the way** and
**D — Next door**.

## What to review

- **Compare options** shows the dialog for *Today*, A, B, C or D. *Today* has two tabs:
  **Worlds** and **My space stickers**.
- **Computer** and **Phone** change the width of the drawing.
- Tap a card to see its fact or its hint. **Fly there ↗** acts as a pretend guided
  flight: the fairy arrives at once and gets the sticker.
- **Pretend free flight** finds a world with no guide. Each chip gives the gap and the
  size of the world in the view, from the nearest open world.
- **Start again** empties the book. **Fill the book** gives all 13 stickers.
- **01 / The same book, five ways** compares the options. **02 / How far, how big** gives
  the distances and the sizes that decide if a child can find a world with no guide.
- **05 / Decisions to make** keeps your answers in this browser. **Save study** exports
  them as JSON, with the numbers of each option.

The model is in `studies/world-book-study/model.ts`. It reads the world table of the
game (`WORLD_DATA` in `src/worlds.ts`), the orbit of the Moon (`moonOffset()` in
`src/moon.ts`), the space speed (`SPACE_SPEED` in `src/flight.ts`) and the stickers
(`src/stickers.ts`).

## Definitions

- **Guided flight**: a flight that the guide flies after a tap on "Fly here" or
  "Fly there" (`travelTo()` in `src/main.ts`).
- **Free flight**: a flight with the keys or the arrows and no guide.
- **Open world**: a world that the child can choose for a guided flight.
- **Mystery world**: a world that the map and the book show as a grey "?". The name, the
  picture and the path show after the first arrival.
- **Next door**: the empty space that the "Next" note of the sticker book suggests today
  (`suggestNext()` in `src/stickers.ts`, with the Earth rule of `suggestion()` in
  `src/sticker-book.ts`).
- **Size in the view**: the angle of a world, seen from the start of a flight. The full
  Moon in a real sky is 0.5°.

## The game today

| | Worlds | My space stickers |
| --- | --- | --- |
| Code | `src/adventure.ts`, `src/adventure.css` | `src/sticker-book.ts`, `src/sticker-book.css` |
| Button | **Worlds**, top left (phone: top) | **Stickers**, toolbar (phone: Menu) |
| Worlds | 13 pictures, `.planet-picture` | 13 slots, `.planet-picture` |
| Order | Blossom Haven, Mercury … Neptune, the Sun | The Sun, Mercury … Neptune, Blossom Haven |
| Tap | Flies there | Shows the fact or a hint |
| Travel | "Fly here ↗" on each picture | "Fly there ↗" in the note |
| Also | The live solar map | The progress dots, the new-sticker note |

## Findings

### Finding 1: two dialogs, one set of worlds

Both dialogs draw the same 13 planet pictures with the same `.planet-picture` styles.
Each one has its own travel button. A child must learn two dialogs for one idea: the
worlds of the game.

### Finding 2: each dialog reaches into the other

`render()` in `src/sticker-book.ts` writes a ★ on each Worlds picture that has its
sticker (`.world-picture.has-sticker`). The note of the book offers a guided flight, as
Worlds does.

### Finding 3: two orders for the same worlds

Worlds starts with Blossom Haven (`.home-picture` in `src/adventure.css`) and ends with
the Sun. The book starts with the Sun and ends with Blossom Haven.

### Finding 4: the book fills with taps

All 13 worlds are open from the start. A full book takes 13 guided flights and no
exploration. The map also shows every world and its name before the first flight.

### Finding 5: the gaps between the worlds do not change

`sync()` in `src/orbits.ts` moves every world around the Sun in the same hour
(`SOLAR_ORBIT_SECONDS`). So the gap between two planets is always the same. Only the Moon
goes around Earth, and Blossom Haven moves after five minutes of flight with no guide
(`HOME_MOVE_SECONDS` in `src/relocation.ts`).

### Finding 6: most worlds are easy to see

From Earth, at the full space speed of 968 m/s:

| World | Gap | Time | Size in the view |
| --- | --- | --- | --- |
| Moon | 0.6 km | 1 s | 8.91° |
| Mercury | 4.5 km | 5 s | 2.79° |
| Sun | 7.0 km | 7 s | 13.27° |
| Venus | 7.1 km | 7 s | 3.21° |
| Vesta | 14.0 km | 14 s | **0.18°** |
| Mars | 16.2 km | 17 s | 1.24° |
| Saturn | 18.9 km | 20 s | 2.84° |
| Ceres | 20.1 km | 21 s | **0.18°** |
| Jupiter | 20.6 km | 21 s | 3.13° |
| Neptune | 26.7 km | 28 s | 1.44° |
| Blossom Haven | 27.3 km | 28 s | **0.57°** |
| Uranus | 34.8 km | 36 s | 1.15° |

The times do not include the climb out of the air or the brake.

### Finding 7: Ceres and Vesta are nearly invisible

From Earth, Ceres and Vesta are 0.18° wide: less than half of the full Moon in a real
sky. From Mars, the nearest planet, Vesta is 0.38° and Ceres is 0.59°. Without the
guide, a child can miss them. They are also inside the asteroid belt, among its rocks.

### Finding 8: two worlds must stay open

- **Earth** is the way home. Its sticker needs a return from space (`earnsSticker()` in
  `src/stickers.ts`).
- **Blossom Haven** is the goal of the flower guide. After the screen study, its picture
  in **Worlds** is the only way to start the guide (`travelTo()` in `src/main.ts`). It
  also wanders, so a child cannot find it by eye.

## The options

All four options merge the dialogs. The one book is the Worlds dialog, with the progress
dots and the note of the sticker book above the map, and one card for each world below
it. A card with its sticker looks like a sticker (white, tilted). The **Stickers** button
goes away. The book order is Blossom Haven first, then the Sun and the worlds outward.
Tap a card to see its fact or its hint, then **Fly there ↗** to fly.

### A — One book

The merge, and nothing more. All worlds stay open and named.

What stays: the book fills with taps (Finding 4). Work: medium, mostly the merge.

### B — The map fills in

A, plus mystery worlds. At the start, the map and the book show Earth, Blossom Haven and
the Sun. The other ten worlds are grey "?" dots with no path, and "Mystery world" cards.
The first arrival shows the name, the picture, the path and the fact. The guide still
flies to any mystery: "A mystery world. Fly to it and find out what it is!"

What stays: nothing asks the child to explore. Work: A, plus the mystery state.

### C — Earn the way

B, plus a lock. "Fly there" works only for a world with its sticker, and for Earth and
Blossom Haven. The child finds each other world in free flight.

The shortest plan starts each free flight at the nearest open world, because the guide
flies there first:

| Free flight | Gap | Time | Size at the start |
| --- | --- | --- | --- |
| Earth → Moon | 0.6 km | 1 s | 8.91° |
| Earth → Mercury | 4.5 km | 5 s | 2.79° |
| Mercury → Sun | 2.4 km | 3 s | 30.68° |
| Mercury → Venus | 4.1 km | 4 s | 5.52° |
| Venus → Vesta | 7.3 km | 8 s | **0.34°** |
| Vesta → Mars | 6.6 km | 7 s | 3.06° |
| Mars → Ceres | 6.1 km | 6 s | **0.59°** |
| Sun → Jupiter | 14.2 km | 15 s | 4.27° |
| Ceres → Uranus | 15.9 km | 16 s | 2.51° |
| Jupiter → Saturn | 17.0 km | 18 s | 3.09° |
| Saturn → Neptune | 20.3 km | 21 s | 1.86° |

What it asks: eleven free flights. Each one is short, but two targets are smaller than
the full Moon. A child who cannot find Vesta or Ceres cannot open the worlds after them
in this plan. Free flight in space also has the problems of
`docs/planet-transition-study.md`: a held W or S turns a loop above the steering shell,
and a fairy with no key can stay above the air. Work: B, plus the lock and a hint.

### D — Next door

B, plus a gentle lock. "Fly there" works for a world with its sticker, for Earth and
Blossom Haven, and for one mystery: the next door. Each new sticker opens the next
door. A free flight still gets any sticker early, and that world opens too.

The chain of next doors, all guided:

| Guided flight | Gap | Time |
| --- | --- | --- |
| Earth → Moon | 0.6 km | 1 s |
| Moon → Venus | 7.9 km | 8 s |
| Venus → Mercury | 4.1 km | 4 s |
| Mercury → Sun | 2.4 km | 3 s |
| Sun → Mars | 10.1 km | 10 s |
| Mars → Vesta | 6.6 km | 7 s |
| Vesta → Ceres | 13.0 km | 13 s |
| Ceres → Jupiter | 20.0 km | 21 s |
| Jupiter → Saturn | 17.0 km | 18 s |
| Saturn → Uranus | 41.7 km | 43 s |
| Uranus → Neptune | 59.5 km | 62 s |
| Neptune → Earth | 26.7 km | 28 s |

The next door follows the order of the book, not the nearest world. So the last two
legs are long: 43 s and 62 s at space speed.

What it asks: nothing that a child cannot do. The surprise stays, and the book tells the
child where to go. Work: B, plus `canFly()` and `nextDoor()`.

## Comparison

| | Today | A — One book | B — The map fills in | C — Earn the way | D — Next door |
| --- | --- | --- | --- | --- | --- |
| Dialogs | 2 | 1 | 1 | 1 | 1 |
| Computer toolbar buttons | 4 | 3 | 3 | 3 | 3 |
| Phone Menu buttons | 3 | 2 | 2 | 2 | 2 |
| Open worlds at the start | 13 | 13 | 13 | 2 | 3 |
| Mystery worlds at the start | 0 | 0 | 10 | 10 | 10 |
| Guided flights to fill the book | 13 | 13 | 13 | 2 | 13 |
| Free flights needed | 0 | 0 | 0 | 11 | 0 |
| Longest free flight needed | — | — | — | 20.3 km, 21 s | — |
| Can a child get stuck? | No | No | No | Yes, at a world that she cannot find | No |

The toolbar and Menu counts start from the game after the screen study
(`docs/ui-simplify-study.md`): **Your fairy**, **Stickers**, **Settings** and pause.

## Recommendation

**Option D, Next door.** A removes a dialog and a button, but the book still fills with
taps. B adds the surprise, but nothing asks the child to explore. C is the request as
written, but it asks for eleven free flights, and two of them are to worlds smaller than
the full Moon in the view. A child who cannot find Vesta cannot go on. D keeps the
surprise and the lock, and one door is always open. A child who explores still gets any
sticker early.

## Changes to make

1. `src/stickers.ts`: add `canFly(book, id)` and `nextDoor(book)`. Move the Earth rule of
   `suggestion()` from `src/sticker-book.ts` into `nextDoor()`. Test them in
   `tests/stickers.test.ts`.
2. `src/adventure.ts`: the Worlds dialog becomes the book. Add the progress dots and the
   note with **Fly there**. Draw one card for each world in the book order. A tap on a
   card selects it. Draw a map dot and a path only for an open or visited world; draw a
   grey "?" for a mystery.
3. `src/sticker-book.ts`: keep the book, `arrive()`, the save, the reset and the
   new-sticker note. Remove its dialog and its toolbar button. Give the book to
   `createAdventure()`.
4. Remove `#stickers-toggle`. `src/settings.ts` puts the gear after `#customize-toggle`
   (line 39). `src/mobile-ui.ts` removes it from `moves`, the labels and the close list
   (lines 20, 29 and 79). The **Worlds** button shows the count: "◉ Worlds · 3/13".
5. `travelTo()` in `src/main.ts` calls `canFly()`. The flower marker still resumes the
   flower guide.
6. The new-sticker note says what opened: "Next: a new world is waiting!"
7. **Reset sticker book** in **Settings** also closes the worlds again (decision 4).
8. Tests. Four smoke scripts fly the guide to a world that D keeps closed from a new
   book: `scripts/asteroid-belt-smoke.mjs` (Ceres, Vesta), `scripts/mobile-play-smoke.mjs`
   (Mars), `scripts/sticker-book-smoke.mjs` (Mars) and `scripts/sun-smoke.mjs` (the Sun).
   Give them a saved book, or a `?test` flag that opens every world.
   `scripts/sticker-book-smoke.mjs` and `scripts/settings-smoke.mjs` also use
   `#stickers-toggle`.

## Decisions to make

1. **Which option?** A, B, C or D (recommended).
2. **What does the map show at the start?** Earth, Blossom Haven and the Sun
   (recommended), Earth and Blossom Haven only, or all the names with the pictures hidden.
3. **One tap or two to fly?** Tap for the fact, then **Fly there** (recommended), or tap
   to fly with a small "i" for the fact. Worlds flies on one tap today; the book shows a
   fact on one tap. One card cannot do both on the same tap.
4. **Does Reset sticker book close the worlds again?** Yes (recommended), or no. In C
   and D, the stickers open the worlds. A reset that keeps the map open makes a book
   that disagrees with the map.

Also to decide in D: the next door can follow the book order (today's `suggestNext()`,
with the long last legs) or the nearest mystery (shorter legs, but the planets do not
come in their order from the Sun).

## Limits of this study

- The drawing is not the game. The pretend flight arrives at once.
- Distances and sizes use the places of the game at time 0. Only the Moon moves against
  the others; its gap to another world changes by up to 1 km either way.
- Blossom Haven starts at `HOME_START_POSITION`. After it moves, its gaps change.
- A size in the view does not say how easy a world is to find. The colour, the
  background stars, the asteroid belt and the light of the Sun also matter. No child
  tested the free flights.
- Three smoke scripts of the flower guide fail on the game before the screen study
  (commit `7565b96`) and after it: `scripts/play-modes-smoke.mjs`, `scripts/cotton-candy-smoke.mjs` and
  `scripts/wildlife-smoke.mjs` stop before Blossom Haven. This study did not find out if
  the guide or the scripts are at fault. The options keep the flower guide as it is.

## Verification

- `npx vitest run studies/world-book-study` runs 6 model tests. They check the two
  dialogs of today, the open worlds of each option, the free-flight plan of C, the chain
  of D with one open mystery at a time, the Earth rule, and the counts.
- `node studies/world-book-study/world-book-study-smoke.mjs "path/to/chrome.exe"` against
  the Vite server (port 5174) checks the tables, D, C, B, A and *Today*, a kept answer,
  the export, the link to this doc, and 390 px and 320 px layouts. It saves screenshots
  in `artifacts.local/world-book-study/`.
