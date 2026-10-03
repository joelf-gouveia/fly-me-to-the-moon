# Fewer buttons, more sky: screen study

Status: option C is in the game on 27 September 2026, with one more change: **Guide me
home** is removed. Open `/studies/ui-simplify-study.html` on the Vite server. The study
controls do not change the game or saved game data. The study saves its own answers as
`fairy-ui-study-v1`. The findings, the options and the line numbers below describe the
game before the change.

## What the game now does

| Area | Change |
| --- | --- |
| Toolbar (`src/main.ts`) | Four buttons: **Your fairy**, **Stickers**, **Settings**, pause. **Sound** and **World speed** are gone from the screen |
| Top-left row (`src/adventure.ts`) | **Worlds** only. **Guide me home**, **Star pictures** and **Orbit paths** are gone. While the flower guide is on, **Stop following** and its help line show under **Worlds** |
| Flower guide | The Blossom Haven picture in **Worlds** starts it (`travelTo()` in `src/main.ts`). The flower marker also resumes it. **Stop following** stays, because the guide stays on while the player steers |
| Worlds map | Always shows the orbit paths. The dead **Hide orbital paths** button and the sky credits are gone from the dialog |
| Settings (`src/settings.ts`) | **Sound**; **In the sky** (**Star pictures**, **Orbit paths**, **World speed**); **How to fly**; **Sticker book**; the credits |
| Orbit paths switch | Shows the coloured lines in the sky only (`orbits.paths.visible`) |
| Saved | **Star pictures** and **Orbit paths** in `fairy-settings`. **Sound** is off and **World speed** is 1× at each visit |
| Flight panel | The glide speed only. The keys are in **How to fly**; the welcome card keeps its hint |
| Removed | The hidden **Follow a world** picker and its code, and "· landscape N" in the world panel |
| Phone Menu (`src/mobile-ui.ts`) | **Your fairy**, **Stickers**, **Settings**, then **Stop following** while the guide is on, and the flight details |
| Later | The world book study (`docs/world-book-study.md`) moved **Stickers** into **Worlds**. The toolbar has three buttons, and the phone Menu two |
| Test snapshot | `__fairyTest.snapshot()` adds `destination`, `orbitSpeed`, `orbitPaths`, `sound` and `earthVisit` |
| Smoke scripts | The scripts that used the removed controls now use **Worlds** pictures, the Settings switches and the snapshot. `scripts/settings-smoke.mjs` checks the new Settings |

On a computer the screen now has five buttons: **Worlds** and the four of the toolbar.
Before the change it had ten.

The flight screen has ten buttons on a computer and eight in the phone Menu. The request
is to move the **Orbit paths** toggle and the **Star pictures** toggle (the star map) to
**Settings**. This study checks each control of the screen for more controls that belong
in Settings. It compares three options: **A — Two switches**, **B — Grown-up corner**
and **C — Four buttons**.

## What to review

- **Compare options** shows the game screen for *Today*, A, B or C.
- **Computer**, **Phone** and **Phone · Menu open** change the screen of the drawing.
- **On the meadow** and **In space** change the sky. The star pictures show in space
  only, as in the game.
- **Show what moves** draws each moved control with a dashed line and its new place.
- The buttons of the drawing work. The gear, or **Open Settings**, opens the proposed
  **Settings** of the option. Its switches change the sky of the drawing.
- **01 / Every control, one row** gives the place of each control in each option.
- **04 / Decisions to make** keeps your answers in this browser. **Save study** exports
  them as JSON, with the counts of each option.

The model is in `studies/ui-simplify-study/model.ts`. The drawing uses the labels, the order and the
sizes of the game, but it is not the game.

## Definitions

- **Toolbar** is the row of round buttons at the bottom right of the computer screen
  (`src/main.ts:96`).
- **Top-left row** is `.adventure-tools` of `src/adventure.ts:19`: **Guide me home**,
  **Worlds**, **Star pictures** and **Orbit paths**.
- **Phone Menu** is the **Your flight** dialog of `src/mobile-ui.ts:11`. On a touch
  screen, `setTouch()` moves the toolbar buttons and the top-left row into it.
- **Grown-up control** is a control that changes how the game shows the world, not what
  the child does. **Settings** says "For grown-ups" (`src/settings.ts:24`).

## The screen today

Screenshots on 27 September 2026 at 1440 × 900 (computer) and 390 × 844 (phone), after
**Begin your adventure**:

| Screen | Buttons |
| --- | --- |
| Computer, top-left row | Guide me home, Worlds, Star pictures, Orbit paths |
| Computer, toolbar | Your fairy, Stickers, Settings, Sound, World speed (1×), Pause |
| Phone, on the screen | Menu, Worlds, Pause, four arrows, Boost, Hover |
| Phone Menu | Your fairy, Stickers, Settings, Sound, World speed, Guide me home, Star pictures, Orbit paths |
| Settings | Reset sticker book |

## Findings

### Finding 1: two toggles for space sit on the ground screen

**Star pictures** and **Orbit paths** are in the top-left row with **Guide me home** and
**Worlds**. On the ground, **Star pictures** shows nothing. The labels need a sky
visibility above 0.05 (`src/sky-labels.ts:63`), and the sky is blue. **Orbit paths**
draws thin lines through the day sky and the clouds. A screenshot on the meadow with
both toggles on shows this.

### Finding 2: the Worlds map hides its own paths

The map says "The planets follow their coloured paths" (`src/adventure.ts:28`).
`src/adventure.ts:63` hides the paths at the start. The **Orbit paths** button
(line 83) is the only way to show them. If the button moves to **Settings**, the map
loses its paths for most players.

### Finding 3: nothing is saved

**Star pictures** (`src/adventure.ts:55`), **Orbit paths** (line 82) and **World speed**
(`src/main.ts:415`) start again at each load. The look of the fairy, the home and the
sticker book are saved in `localStorage`. A grown-up who sets a switch in **Settings**
expects it to stay.

### Finding 4: "1×" is a grown-up control with no name

The computer toolbar shows only "1×" (`src/main.ts:103`). The name is in the tooltip.
Each click goes to the next step: 8×, 16×, 32×, 64×, then 1× again. At 64× the carry of
Earth jumps 922 m/s when the fairy leaves the air (`docs/planet-transition-study.md`,
Finding 8). A child can press it by accident.

### Finding 5: a hidden picker still runs

`src/adventure.css:18` hides **Follow a world** with `display: none`. `src/main.ts:164`
still builds it, and lines 685 to 796 still write its status text. Seven smoke scripts
use the picker. Six of them use `#journey-world option` as the sign that the game loaded:

- `scripts/blossom-smoke.mjs`
- `scripts/browser-smoke.mjs` (also clicks `#journey-go` and reads `#journey-status`)
- `scripts/mobile-audit.mjs`
- `scripts/moon-smoke.mjs` (reads `#journey-status` only)
- `scripts/play-modes-smoke.mjs`
- `scripts/sky-dancer-smoke.mjs`
- `scripts/star-sky-smoke.mjs`

The **Hide orbital paths** button of the Worlds markup (`src/adventure.ts:28`) is also
dead: line 62 removes it, and line 56 makes the **Orbit paths** button in its place.

### Finding 6: a developer number shows to the child

On Earth the world panel says "Below the clouds · landscape 1" (`src/main.ts:724`). The
number is `World.visit`, the count of visits. A child cannot use it.

### Finding 7: the keys are told in four places

| Place | Code |
| --- | --- |
| Welcome card, `#steering-hint` | `src/main.ts:161`, `src/mobile-ui.ts:56` |
| Flight panel, `.controls-copy` | `src/main.ts:90`, with the Ctrl note of line 199 |
| Phone Menu, `.touch-help` | `src/mobile-ui.ts:14` |
| Hidden picker, `#journey-status` | `src/main.ts:167` |

On a computer the flight panel shows the keys at all times.

### Finding 8: the phone Menu has eight buttons in three groups

The Menu shows five action buttons, then **Guide me home**, then **Star pictures** and
**Orbit paths**. The two toggles are the smallest buttons of the Menu.

## The options

### A — Two switches

The request, and nothing more.

- A new **In the sky** section in **Settings**, above **Sticker book**, with two
  switches: **Star pictures** and **Orbit paths**.
- Remove `#show-stars` and `#show-orbits` from the top-left row.
- The Worlds map always shows its paths (Finding 2). The switch controls the lines in
  the sky only.

Result: 8 buttons on the computer screen, 6 in the phone Menu. What stays: "1×", the
dead parts and the debug number. The switches start again at each load. Work: small.

### B — Grown-up corner

A, plus the other grown-up parts.

- **World speed** moves to **In the sky** as five steps: 1×, 8×, 16×, 32× and 64×. The
  row says what the speed does.
- **Settings** saves **Star pictures** and **Orbit paths** in one `localStorage` key,
  `fairy-settings`. **World speed** starts at 1× at each load, as today.
- The sky credits move from **Worlds** to a **Credits** section in **Settings**, next
  to the switch of the pictures that they credit. The caption of each Webb picture keeps
  its own credit (`src/sky-labels.ts`).
- Remove "· landscape N" from the world panel.
- Remove the hidden **Follow a world** picker and the dead `#toggle-orbits` markup.
  Give the six smoke scripts a new sign that the game loaded, for example
  `#settings-toggle`. `browser-smoke.mjs` and `moon-smoke.mjs` read `#journey-status`
  today. They need a new field, for example `destination`, in `__fairyTest.snapshot()`
  (`src/main.ts:981`). `browser-smoke.mjs` sets
  a destination with a **Worlds** picture.

Result: 7 buttons on the computer screen, 5 in the phone Menu. The toolbar keeps a quick
**Sound** button. Work: small to medium, mostly in the smoke scripts.

### C — Four buttons

B, plus **Sound** and the keyboard help.

- **Sound** moves to a **Sound** section at the top of **Settings**.
- The keyboard help moves to a **How to fly** section. The flight panel shows the glide
  speed only. The welcome card keeps its hint.

Result: 6 buttons on the computer screen, 4 in the phone Menu: **Your fairy**,
**Stickers**, **Settings** and **Guide me home**. What is lost: a quick mute. A grown-up
in a shared room must open **Settings**, and the flight waits while it is open. A
player who forgets the keys must also open **Settings**. Work: medium.

## Comparison

| | Today | A — Two switches | B — Grown-up corner | C — Four buttons |
| --- | --- | --- | --- | --- |
| Buttons on the computer screen | 10 | 8 | 7 | 6 |
| Buttons in the phone Menu | 8 | 6 | 5 | 4 |
| Sections in Settings | 1 | 2 | 3 | 5 |
| Star pictures, Orbit paths | Top-left row | Settings | Settings | Settings |
| World speed | Toolbar, "1×" | Toolbar, "1×" | Settings, five steps | Settings, five steps |
| Sound | Toolbar | Toolbar | Toolbar | Settings |
| Keyboard help | Flight panel | Flight panel | Flight panel | Settings |
| Switches kept after a reload | No | No | Yes | Yes |
| Debug number, hidden picker | Stay | Stay | Removed | Removed |
| Work | — | Small | Small to medium | Medium |

## Recommendation

**Option B, Grown-up corner.** A does the request, but it leaves "1×" on the screen. A
child can press it, and the high speeds make the largest jumps of the transition study.
B moves it with the two switches, and it removes the dead and the debug parts in the
same change. C also takes **Sound** off the screen, and a quick mute is useful in a
shared room. **Guide me home**, **Worlds**, **Your fairy**, **Stickers** and **Pause**
stay on the screen in all options: they are the play of the child.

## Changes to make

1. `src/settings.ts`: add the **In the sky** section above **Sticker book**. Give
   `createSettings()` three new actions: `stars`, `orbits` and `speed`. Use switches
   (`role="switch"`) with a note under each title.
2. `src/adventure.ts`: remove `#show-stars` and the `orbitButton` code (lines 56 to 63
   and 77 to 88). Remove the `toggle-orbits` markup of line 28. Always show the paths on
   the map: remove line 63 and the `.hide-orbit-paths` rule of `src/adventure.css:38`.
   Keep `actions.stars` and `actions.orbits` in `src/main.ts`, and call them from
   **Settings**.
3. `src/main.ts`: remove `#orbit-speed-toggle` (line 103) and its handler (lines 595 to
   605). Set `orbitSpeedFactor` from the **World speed** steps of **Settings**.
4. `src/mobile-ui.ts`: remove `#orbit-speed-toggle` from `moves` and from the labels
   (lines 21 and 30).
5. Save **Star pictures** and **Orbit paths** in `fairy-settings`, with the guarded
   read and write of `src/sticker-book.ts:18`.
6. Move the `.sky-credits` details (`src/adventure.ts:37`) to a **Credits** section of
   **Settings**.
7. Remove "· landscape N" (`src/main.ts:724`).
8. Remove the `.journey-picker` markup (`src/main.ts:164` to 168), its code (lines 685
   to 796) and the CSS of `src/style.css:523` and `src/adventure.css:18`.
9. Update the seven smoke scripts of Finding 5, `scripts/settings-smoke.mjs` (new
   switches) and `scripts/star-sky-smoke.mjs` (`#show-stars` becomes the switch in
   **Settings**).

## Decisions to make

1. **Which option?** A, B or C.
2. **Keep the settings after a reload?** Save the two switches and start **World speed**
   at 1× (recommended), save all three, or save nothing as today.
3. **The paths on the Worlds map?** Always show them (recommended), or follow the
   **Settings** switch as today.
4. **How does a child find the star pictures?** **Settings** says "For grown-ups". A
   child who liked the button loses it. The choices: **Settings** only (recommended, as
   requested), also a note the first time the fairy is in space, or also a small button
   that shows in space only.

## Limits of this study

- The drawing is not the game. It uses the labels and the sizes of the game, but the
  sky, the fairy and the Settings dialog are drawings.
- The button counts are from the screenshots of one computer width (1440 px) and one
  phone width (390 px). A short landscape phone was not checked for this study.
- No child played the options. The choice between B and C depends on who uses the
  sound, and this is not determined from the code.
- The screenshot of Finding 1 is from one Earth landscape at one time of day. At night
  the paths can show more.

## Verification

- `npx vitest run studies/ui-simplify-study` runs 6 model tests. They check the counts of each option,
  the sections of **Settings**, and that the game code follows option C without **Guide me
  home**.
- `tests/settings.test.ts` checks the saved switches of `fairy-settings`.
- `node scripts/settings-smoke.mjs "path/to/chrome.exe"` checks the four toolbar buttons, the
  removed controls, the paths of the Worlds map, the sky switches, World speed, the sound,
  the saved switches after a reload, **How to fly** and the phone Menu.
- `node studies/ui-simplify-study/ui-study-smoke.mjs "path/to/chrome.exe"` against the Vite server
  (port 5174) checks that the game follows option C, then opens the study at a computer
  width and at 390 px and 320 px. It checks each option, **Settings** of B, the sky of
  the drawing, the phone Menu, a kept answer, the export and the link to this doc. It
  saves screenshots in `artifacts.local/ui-study/`.
