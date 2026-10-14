# One friend book: friend book study

Status: a study, 14 October 2026. Open `/studies/friend-book-study.html` on the Vite server. The
study does not change the game or the saved game data. It saves its own answers as
`fairy-friend-book-study-v1`. The code places below describe the branch
`features/f19-fairy-friend` on 14 October 2026 (commit `a75f690`).

Status of the build: design A, with the recommended option of each decision, is built on the
branch `features/f19-fairy-friend` on 14 October 2026. See "Built in the game" below.

The player asks: "I would like to do a study on combining the Fairy friend (F19) with the Animal
book (F11), so the kid can replace the animal they fly with." This study answers how the Animal
book and the friend become one thing, so a child of 5 sees the animals that she met and changes
the animal that flies with her. The result becomes a small set of changes to F19 before it merges.

## What to review

- **Five clips.** The chips select a clip: the three options A, B and C, then two parts that each
  option needs: **The gift** (before the fifth hello) and **The phone** (390 px and 320 px).
- **The player** shows the clip. **Sound** plays the chimes of the clip in step with the video.
  **Fly it live** runs the same clip in live 3D, with a new Earth at each visit.
- **The study of a clip** shows three moments of the clip, and for an option the decisions of
  13 October 2026 that it follows and breaks, and its strong and weak points.
- **The three options together**, **The nine cards**, **Six findings**, **Recommendation**, and
  **The saved data** follow. **Your answers** has eight decisions. **Copy answers** copies them
  for the chat, and **Save study** exports them as JSON.
- A copy of the page can be a private claude.ai artifact. Build it with
  `node studies/friend-book-study/build-artifact.mjs <out folder>`.

## The rules that bind the design

| Rule | Source |
| --- | --- |
| New books are pages in **Worlds**, next to the stickers | Decision 3 of the learn and play study, 13 October 2026 |
| A card has a picture, a name and picture facts. The voice is rejected | Decision 4, 13 October 2026 |
| In the flight only the note of a new card shows. No strip on the flight screen | Decision 5, 13 October 2026 |
| The child selects the friend from the creatures that she met | F19 decision, 13 October 2026 |
| The friend comes after five hellos | F19 decision, 13 October 2026 |
| A phone gets the joined friend model, about 3 draw calls | F19 decision, 13 October 2026 |
| No score, no timer, no fail; the flight is calm | `IDEA.md` |
| Earth makes a new landscape at each visit: nothing on Earth may need a fixed place | The earth landmarks study was not built for this reason |
| Blossom Haven gets magic versions, not copies of Earth | The review of the seasons study, 3 October 2026 |
| Few buttons on the flight screen | `docs/ui-simplify-study.md` |

## The game today

| Finding | Evidence |
| --- | --- |
| The friend code has the book already | `sayHello()` in `src/friend.ts` adds each kind to `met` at its first hello, also before the gift. The record `fairy-friend` has `hellos` (to 5), `met` and `friend` |
| The Friend row shows only after the gift | `renderRow()` in `src/friend-ui.ts` hides `#friend-row` until the fifth hello. Before the gift nothing shows the kinds that she met or the way to the gift |
| A new friend grows at its place | `setKind()` of `createFriend()` disposes the old model at once; the new model grows in 0.4 s. The old friend has no goodbye; the new one has a loop only at the gift (`cheer(still, true)`) |
| Worlds has one page | `src/adventure.ts`: the note with **Fly there**, the solar map and one card for each world. A card is a button that shows its fact in the note |
| The look menu is about her look | `#customizer` in `src/main.ts`: Friend, Hair, Dress, Wings, Sparkle trail, Skin. On a computer the camera comes near (`setViewOffset()` in `updateCamera()`); on a phone the panel covers the view |
| The hello has hearts already | `src/creatures/hello.ts`: a creature hops and two or three pink hearts float up. The five hearts of the gift use the same picture |

## The options

### A · The book in Worlds (recommended)

Worlds gets two tabs: **Worlds** and **Animals**. The Animals page has a note at the top and one
card for each of the nine kinds, in two groups: **Real animals** on Earth (cow, rabbit, sheep,
duck) and **Story creatures** on Blossom Haven (unicorn, dragonling, kitsune kit, Frog Prince,
pegasus foal). A met card is a sticker card in colour; a kind that she did not meet is a soft
shadow with its world and its place. The card of the friend has a gold ring and the mark
"✦ Flies with me". A tap on a met card shows its three picture facts in the note, with
**Fly with me ↗** (the look of **Fly there**). The tap closes Worlds, and the swap plays in the
flight. The Friend row leaves Your fairy.

- Follows each binding decision. Adds no button to the flight screen.
- The friend changes after Worlds closes, not while she looks at the card.

### B · The book next to the fairy

The Friend row of Your fairy grows into the Animal book: nine round pictures in two rows, the
met kinds in colour, the others as shadows, then one line with the name and the facts of the
friend, and **No friend**. A tap changes the friend at once, next to the fairy: the camera is near,
so the bubble of the old friend pops softly and the new friend grows at its place with the loop.

- On a computer the child sees the new friend before she flies.
- Breaks "new books are pages in Worlds". On a phone the panel covers the view, so the live
  change does not show there. The panel gets long before the hair and the wings.

### C · Choose in flight

After the gift, a hello to a kind that she met (and that is not the friend) shows a round offer
over the creature: its picture, "Fly with me?", a ✓ button and the Enter key. One tap: the old
friend waves and flies home, and a small one of that kind rises from the place of the creature in
its bubble, flies to her side and makes the loop. The book in Worlds keeps the cards and also
allows a change, because a friend of Blossom Haven can only be offered on Blossom Haven.

- The hello gets a purpose, and the friend comes from its own kind.
- Breaks "in the flight only the note of a new card shows". A tap on a moving creature while she
  steers is hard at 5; the creature leaves the view in about 2 s at 11 m/s. An offer at each hello
  makes the flight busy: it needs a limit, for example one offer for each kind in each visit. It
  is the most code, because it includes A.

## The swap

Each clip uses the real friend of the game (`createFriend()`, `createFriendModel()`,
`friendPlace()`, `friendSize()` in `src/friend.ts`): the follow rule, the joined model, the
bubble, the dust and the happy loop. The leave and the arrival are study code on top of the place
that the follow rule gives (`studies/friend-book-study/features/stage.ts`).

| Part | Time | What happens |
| --- | --- | --- |
| Wave | 0.9 s | The old friend turns to her (the look of the menu), rocks from side to side and makes a small hop |
| Flight home | 2.1 s | It flies up, forward and out to her right, faster and faster, 34 m for a kind with wings and 20 m for a bubble. It gets small at the end and goes in a small puff of sparkles |
| Pop (B) | 0.4 s | The bubble swells a little, then the friend shrinks to nothing in a small soft burst |
| Arrival from the sky (A, gift) | 1.5 s, starts 1.5 s after the wave starts | A puff of sparkles 15 m ahead and 5.5 m up; the new friend flies from it to its place and grows from 35% to its size |
| Rise (C) | 1.8 s | The new friend starts 1.2 m over the creature on the ground and flies to its place |
| Grow (B) | 0.45 s | The grow of the game (`setKind(kind, true)`) |
| Happy loop | 1.6 s | `cheer(still, true)` when the new friend is at its place, with the two-note chime |

The positions are in the frame of the fairy, so the swap works at each speed. For about 3 s two
friends are in the scene: 6 draw calls on a phone. With reduced motion the game can skip the
wave, the flight and the loop, and change the model at once, as F19 does now.

## The cards

| Card | Group | Picture facts | Hint before she meets it | How it flies |
| --- | --- | --- | --- | --- |
| Cow | Real animal | 🌿 Eats grass, 🥛 Gives milk, 🏡 Lives on a farm | Earth · 🌾 In the meadow | Bubble |
| Rabbit | Real animal | 🥕 Eats carrots, 👂 Long ears, 🕳️ Lives in a burrow | Earth · 🌾 In the meadow | Bubble |
| Sheep | Real animal | 🌿 Eats grass, 🧶 Gives wool, 🏡 Lives on a farm | Earth · 🌾 In the meadow | Bubble |
| Duck | Real animal | 💧 Swims, 🥚 Lays eggs, 🪶 Has feathers | Earth · 💧 On the water | Wings |
| Unicorn | Story creature | 🌈 Rainbow mane, ✨ Golden horn, 🌿 Grazes in the meadow | Blossom Haven · 🌾 In the meadow | Bubble |
| Dragonling | Story creature | 🪽 Tiny wings, 🍬 Puffs candy floss, 👣 Waddles in a herd | Blossom Haven · 🌾 In the meadow | Wings |
| Kitsune kit | Story creature | 🦊 A fox cub, ✨ Three wish tails, 🐾 Hops and stops | Blossom Haven · 🌾 In the meadow | Bubble |
| Frog Prince | Story creature | 👑 Golden crown, 🪷 Rides a lily pad, 🫧 Wishing bubbles | Blossom Haven · 🫧 On the soda water | Bubble |
| Pegasus foal | Story creature | 🪽 Flies on wings, ⭐ Starry mane, 🏡 Over the cottage | Blossom Haven · 🏡 Over the cottage | Wings |

- The picture of a card is a render of the joined friend model with a clear background
  (`kindPicture()` in `features/kit.ts`, from `friendPicture()`). The shadow of a kind that she
  did not meet is the same render in one soft lilac colour.
- The hint uses the world picture of Worlds (`worldPicture()` in `src/sticker-book.ts`) and one
  icon for the place. The hint names a kind of place, not a fixed place, so it is true on each
  new Earth.
- The facts of the story creatures come from their notes in `src/creatures/fairytale.ts`.
- **The mark "✦ Flies with me"** takes the place of the facts on the card of the friend, with a
  gold ring. The note at the top of the page says "✦ FLIES WITH YOU" and the name.
- **No friend** is a small button in the note when she taps the card of the friend. After it the
  note shows the empty bubble of F19 (`friend-preview--none`). A met card brings a friend back.

## Before the fifth hello

- The book fills from the first hello. The first hello of a kind shows a note at the place of the
  friend note (`#friend-note`): the picture, "NEW IN YOUR ANIMAL BOOK", the name, the three
  picture facts and five hearts. The hearts count the hellos to five: the same pink hearts that
  float over a creature at its hello. The new heart swells.
- A hello to a kind that she met adds a heart and shows no note, so the flight stays calm.
- Two notes do not show at the same time. A note waits until the note before it is gone (2.2 s
  and a fade of 0.6 s), as the friend note waits for a sticker note today.
- At the fifth hello the gift note shows: "A NEW FRIEND", the name, "A friend flies with you now"
  and five full hearts. At the fifth hello of a new kind, the gift note takes the place of the
  card note; the card is in the book. The friend comes with its note, out of the sky, with a loop.
- The Animals page shows the same five hearts and the empty bubble in its note until the gift. A
  met card has no **Fly with me** before the gift.

The clip **The gift** starts with three hellos. On its Earth the fairy meets a rabbit (a new card,
the fourth heart) and a cow (the fifth hello, the gift).

## The phone

The clip **The phone** shows the Animals page in a phone of 390 × 844 px and of 320 × 640 px. Each
phone is a screen of the game with the class `touch-ui`, so the rules of `src/mobile.css` and the
narrow rules of `src/adventure.css` apply.

- Three cards in each row, as the cards of the worlds. The tabs share the width.
- The note wraps: **Fly with me** takes the full width, as **Fly there** does on a phone.
- New: the note stays at the top of the dialog while the cards scroll (`position: sticky`). Without
  it a tap on a low card changes a note that is out of view. The cards of the worlds have the same
  problem today; the same rule can help them.
- At 320 px the title takes two lines and each fact takes one line. The buttons of the note go to
  their own row.

## The saved data

The recommendation keeps the record of F19. The `met` list is the book.

```
// localStorage "fairy-friend": the book and the friend in one record
{
  "hellos": 5,                                  // 0 to 5; it stops at 5. Not a score
  "met": ["cow", "sheep", "pegasus", "duck"],   // the book: the kinds in the order of the first hello
  "friend": "pegasus"                           // the friend, or null for "No friend"
}
```

- Old data loads with no change: `parseFriend()` reads it today. A missing or broken value gives
  an empty book and no friend.
- The book shows the cards in its own order (real animals, then story creatures), so the order of
  `met` is not used.
- **Reset sticker book** in Settings removes the book and the friend, as today.
- A new key (`fairy-animal-book`) would need a copy of the old data at the first start and gives
  nothing more. Two keys could disagree.

## Recommendation

Build option A. It is the only option that follows each decision of 13 October 2026, and it keeps
the flight screen calm. The card is the book and the choice. The swap plays in the flight, where
the child sees it on a computer and on a phone. Take the five hearts from the gift clip and the
note that stays on top from the phone clip. C can come later as a test, if the child asks for a
choice at the animal.

## The changes to F19

1. **The Animals page in Worlds.** `src/adventure.ts` gets two tabs, Worlds and Animals. A new
   `src/animal-book.ts` draws the nine cards (picture, name, three picture facts; a shadow with its
   world and its place; the mark "✦ Flies with me").
2. **"Fly with me" and "No friend" in the note.** After the gift, a tap on a met card shows
   **Fly with me ↗**; the card of the friend shows **No friend**. Before the gift the note shows
   the five hearts and the empty bubble.
3. **The Friend row leaves Your fairy.** Remove `#friend-row` from `src/main.ts`, `renderRow()`
   from `src/friend-ui.ts` and the row styles from `src/friend.css`.
4. **A swap with a goodbye and a loop.** `setKind()` of `createFriend()` keeps the old model for
   its leave (wave 0.9 s, flight home 2.1 s); the new friend comes from the sky ahead in 1.5 s and
   makes the happy loop. With reduced motion the change is at once.
5. **The note of a new card.** The first hello of a kind shows its card note, with the five hearts
   before the gift. Notes wait for each other. The gift note takes the place of the card note.
6. **Pictures with no background.** `friendPicture()` gets an option for a clear background, so a
   card can show the shadow of a kind. This is a small change in `src/friend.ts`.
7. **The same saved record.** `fairy-friend` keeps `{ hellos, met, friend }`.
8. **Tests and checks.** `tests/friend.test.ts` for the card states and the swap;
   `scripts/friend-smoke.mjs` uses the Animals page in place of the row; the README part and the
   status in `docs/learn-and-play-study.md`.

## Decisions to make

Each decision has its recommendation as the first option.

1. How do the book and the friend become one thing? **A** (recommended), B, C, or A now and C
   later as a test.
2. How does the old friend leave? A wave and a flight home (recommended), a soft pop, or at once.
3. How does the new friend come? Out of the sky, then the loop (recommended), a grow at its place,
   or from its kind in the world (C only).
4. What shows the way to the gift? Five hearts on the card note and on the Animals page
   (recommended), nothing, or words.
5. How does the book show a kind that she did not meet? A soft shadow with its world and its
   place (recommended), a "?" card, or no card.
6. Where is "No friend"? In the note of the friend card (recommended), a tenth card, or no
   "No friend".
7. What stays in Your fairy? Nothing (recommended), a small link, or the Friend row.
8. What is the saved data? Keep `fairy-friend` (recommended), a new key with a copy, or two keys.

## How the clips were made

The study uses the lab of the feature ideas study (`studies/feature-ideas-study/lab.ts`): the
renderer, `createWorlds()`, the sky, the Sun light, the fairy, the follow camera and
`updateEnvironment()` of `src/main.ts`. The capture page puts the lab in the real screen of the
game at 1280 × 720 (`studies/feature-ideas-study/capture.ts`). Each clip is one file in
`studies/friend-book-study/features/`.

- **The friend is the game code.** `features/stage.ts` makes two friends with `createFriend()`:
  the friend now, and the friend that leaves.
- **The panels are DOM with the real CSS of the game.** `scope-css.mjs` puts `src/style.css`,
  `src/adventure.css`, `src/sticker-book.css`, `src/friend.css` and `src/mobile.css` under the
  class `.fb-game` and makes each `@media (max-width…)` rule a container query on that screen. So
  the Worlds dialog, Your fairy and the notes have the CSS of the game in the clip and in the live
  view, and a phone frame of 390 px gets the phone rules on a wide screen. A transition or an
  animation of the game CSS runs on the clock of the page, so the clips move each panel from the
  clip time (`noteAt()`, `panelAt()` in `features/kit.ts`) and turn the CSS motion off.
- **The new parts** (the tabs, the cards, the hearts, the offer of C, the phone frames) are in
  `features/features.css`, in the look of the game.
- **A layer of 1280 × 720 px** holds the panels and scales to the live view, so a panel has the
  same place in the clip and in the live view.
- **The same Earth at each run.** The game makes a new Earth at each visit with `Math.random()`.
  The capture page gives `Math.random()` a fixed seed at its start and at the load of each clip
  (`features/seed.ts`), so a clip and its moment pictures show the same frames. The live view of
  the page keeps a new Earth at each visit.
- **The passes.** C and the gift use `creaturePass()` of the learn and play study for the side view
  at the hello. After the hello a chase camera behind or beside the fairy shows the swap.
- **The capture.** Run a dev server with no hot reload, for example a config file with
  `server: { port: 5191, strictPort: true, hmr: false }`, then:

```
node studies/friend-book-study/friend-book-study-capture.mjs "path/to/chrome.exe" A,B,C,G,P http://127.0.0.1:5191
node studies/friend-book-study/friend-book-study-capture.mjs "path/to/chrome.exe" --moments A,B,C,G,P http://127.0.0.1:5191
```

  The first command records the clips (`<id>.webm`), the posters (`<id>.jpg`) and the chimes
  (`<id>.cues.json`) in `public/studies/friend-book/`. The second takes the three moment pictures
  of each clip (`<id>-0.jpg` to `<id>-2.jpg`) at the times in `MOMENTS`. The script runs each clip
  in a new page: in one page the creatures of a world walk on during the clip before, so a later
  clip would differ from its moment pictures. The script sets
  `STUDY_BITRATE` to 2.2M, so each clip is about 3 MB. `STUDY_BITRATE` is a new option of the
  capture script of the feature ideas study; its default is 3M as before.

## Built in the game

On 14 October 2026 the player selected the recommended option of each decision. Design A is in
the game code on the branch `features/f19-fairy-friend` (14 October 2026). See the Fairy friend part
of `README.md`. The code is in `src/animal-book.ts`, `src/animal-book-ui.ts`, `src/animal-book.css`,
`src/friend.ts` (the swap, `swapAt()`, `helloNotes()` and the clear and shadow pictures of
`friendPicture()`), `src/friend-ui.ts` and the tabs in `src/adventure.ts`. The tests are
`tests/animal-book.test.ts` and `tests/friend.test.ts`; the browser check is
`scripts/friend-smoke.mjs`.

The game follows the study, with these differences:

- **The picture facts are drawings of the game**, not emoji, as the faces of the thermometer
  (F16). Each fact is a small SVG.
- **The time of a note.** A card note shows for 4 s of flight and the gift note for 6 s. The clips
  used 2.2 s and 3.6 s; that is short for a grown-up who reads the facts aloud. The time of a note
  runs only in the flight.
- **The notes wait for each other.** The note of the friend also waits for the Moon note and the
  thermometer note, and these two notes wait for the note of the friend. On a phone they are near
  each other at the top of the view.
- **The puff of sparkles** is the fairy dust of the model: it has 28 points in a puff and 10 points
  in the flight, in the same draw call. The clips used a separate burst of 60 points.
- **The first friend** comes out of the sky with the gift note, as in clip A. In the gift clip the
  arrival is the same, so the game has one arrival.
- **"No friend" closes Worlds**, as "Fly with me" does, so the child sees the friend fly home.
- **Worlds opens at its Worlds tab** each time. Both tabs are in the Tab order, and the arrow keys
  also go from one tab to the other.
- **A shadow card** shows "Who is it?" in the note, with the picture of its world and of its place.
- **The pictures of the cards** render one at a time when the Animals page opens for the first
  time, so the page opens at once. A shadow is the clear render in one soft lilac colour.
- **`?friend=all`** on the dev server fills the book with no note, and the friend is there at once.

Measured in the browser check (`scripts/friend-smoke.mjs`), with the friend at her side and in a
swap: 3 draw calls for one friend on a computer and on a phone of 390 px, and 6 in the middle of a
swap on both. Two friends are in the scene for 1.5 s of the 3 s of a swap.

## Limits of this study

- The clips use study code for the leave, the arrival, the notes and the panels. The game code
  needs its own design, tests and browser checks.
- The worlds stand still in the clips. Blossom Haven is turned to the Sun in B (`tipToSun()`), as
  in the F19 clip of the learn and play study. The game does not do this.
- In the clips the flight stops while Worlds or Your fairy is open, as in the game. The taps are
  rings at the place of the buttons; the clips have no pointer.
- The picture facts use emoji. An emoji has a different look on each device; the game needs its
  own small pictures.
- The Worlds page in clip A is short: it leaves out the solar map.
- In the live view the hellos of the gift clip depend on the new Earth, so the gift can come late
  or not at all.
- Option C is shown with one hello. Its limit of one offer for each kind in each visit is a
  proposal and is not shown.

## Verification

- `npx tsc --noEmit -p .` passes.
- `npx vitest run studies/friend-book-study` passes: three options with one recommended, eight
  decisions with one recommendation each, nine cards with three facts, the saved example loads
  with `parseFriend()`, a clip, a poster, a cue list and three moment pictures for each clip at the
  times of the capture script, and the scoped CSS.
- The capture script made the five clips and the fifteen moment pictures with no page errors. Each
  picture was checked by eye.
