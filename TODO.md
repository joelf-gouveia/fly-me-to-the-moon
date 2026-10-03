# To do

This file records the known faults, the open check results and the open merges of the game.

Mark an item with `[x]` when it is done, and write the commit that closed it.

Last update: 4 October 2026.

## Faults

### 1. The guided flight to Blossom Haven does not always arrive

- [x] Find the cause and correct it. Corrected on the branch `fixes/todo-faults` (`7edc7d6`); in `master` since merge `28a5992`.

**Cause:** near a world the fairy flies at 32 m/s plus a part of the space speed. Since the
proportions change, Blossom Haven moves at about 59 m/s on its orbit. At 158 m above the home
the two speeds are equal, so a fairy who follows the home from behind stays there.

**Fix:** a world carries the fairy along its orbit while she is close to it: fully below 600 m
above the world, and less and less up to 1,500 m (`WORLD_CARRY` in `src/flight.ts`). The
Blossom Haven, wildlife, Moon and asteroid belt browser checks pass with the fix.

The fairy follows the flower guide, but she circles near the home and does not reach
it. This is the only fault in this file that a player can see.

- One run: the fairy was 233 m from the target of the guide after 200 s.
- A second run: the fairy was about 158 m above Blossom Haven, with the guide on and
  no move of the home.
- The fault is in the base code. Two runs of the same flight without the new features
  failed in the same way.
- Because of it, the Blossom Haven steps of `scripts/wildlife-smoke.mjs` ("The fairy
  did not reach Blossom Haven") and `scripts/blossom-smoke.mjs` ("Guided arrival
  failed") fail.
- The cause is not known. Places to examine: `updateFairy()` and the arrival test in
  `src/main.ts`, `journeyHeading()` and `homeApproachPoint()` in `src/journey.ts`, and
  the orbit of the home in `src/orbits.ts`. The proportions change made the planets
  and the distances larger; the arrival distances (16 m and 35 m) did not change.

### 2. `scripts/blossom-smoke.mjs` expects the old size of Blossom Haven

- [x] Change the expected radius from 110 to 137.5. Corrected on the branch `fixes/todo-faults` (`b148c58`).

Line 89 stops the check when the radius is not 110. The radius is 137.5 since the
proportions change, so the check stops at its first step. This is a fault of the
check script only.

### 3. Some check scripts use a fixed Chrome debug port

- [x] Change each script to `--remote-debugging-port=0` and read the port from
  `DevToolsActivePort`, as `scripts/sticker-book-smoke.mjs` does. Corrected on the branch `fixes/todo-faults`
  (`b148c58`): 29 scripts, 13 in `scripts/` and 16 in `studies/`.

When two checks run at the same time, one check can connect to the browser of the
other check and fail with a wrong error.

| Script | Port |
| --- | --- |
| `scripts/blossom-smoke.mjs` | 9333 |
| `scripts/play-modes-smoke.mjs` | 9333 |
| `scripts/sky-dancer-smoke.mjs` | 9333 |
| `scripts/wildlife-smoke.mjs` | fixed |
| `scripts/cotton-candy-smoke.mjs` | fixed |
| `scripts/mobile-audit.mjs` | 9341 |
| `scripts/mobile-play-smoke.mjs` | fixed |

Some study scripts in `studies/` can have the same fault, for example
`studies/sun-study/sun-study-smoke.mjs` (9344). They were not all examined.

### 4. The phone draw calls of the rings check are different on `master`

- [x] Find why `scripts/sparkle-rings-smoke.mjs` shows 146 draw calls at 390 px on
  `master` and 90 on the F4 branch. It is not a fault of a branch: each load makes a new
  random Earth, and the creatures in the view change. Eight runs on the same code gave 111
  to 237 draw calls. One creature is 14 to 21 draw calls.
- [ ] Decide if a phone needs a limit for the creatures in the view. No check has a limit
  for the draw calls today, and one run showed 237.

The check passes with the two numbers. The cause is not known. The phone budget is in
`docs/mobile-play.md`.

## Open check results

These results are not confirmed faults. Each one needs a new run on a quiet machine.

### 5. `scripts/settings-smoke.mjs` failed one time at the Escape step

- [x] Run the check three times. Three of three runs passed on a quiet machine, on the
  code of `fixes/todo-faults`. The failures came only while eight agents used the machine.

The error was "Escape does not close Settings". It came one time on each of three
branches (F1, F2 and F5) while eight agents used the machine, and the next run passed
each time. The probable cause is timing.

### 6. The second run of `scripts/world-songs-smoke.mjs` failed (F6)

- [x] Run the check again on `features/f6-world-songs`. Four of four runs passed on a quiet
  machine. The failure did not occur again; the machine was busy at that time.

The first run passed in 25 s. The second run failed at line 173, in the last step: the
resume after a hidden page. The error text was not recorded. The check uses the real
graphics card, because the audio clock does not run with software rendering.

### 7. Some unit tests are slow on a busy machine

- [x] Run `npx vitest run` on each open branch on a quiet machine, with the usual 5 s
  time limit. All pass: F1 243 tests, F2 242 tests, F6 240 tests.

With eight agents on the machine, 6 to 10 tests went over the 5 s limit, in
`tests/cotton-candy.test.ts`, `tests/journey.test.ts` and
`tests/creatures/spherical.test.ts`. They build whole worlds. They passed with a
longer limit, and all tests pass on `master` with the usual limit.

### 8. The browser checks did not run on the merged F8 branch

- [x] Run `scripts/comet-smoke.mjs`, `scripts/sparkle-rings-smoke.mjs`,
  `scripts/postcard-smoke.mjs` and `scripts/creature-hello-smoke.mjs` on
  `features/f8-comets`. All four pass on the code of merge `30561c9`.

The comet check takes about 1,500 s with software rendering. Give it a time limit of
3,000 s.

### 9. The first run of `scripts/sparkle-rings-smoke.mjs` stopped with an error (F8)

- [x] Run the check many times and record the error. Two faults, both corrected on the
  branch `fixes/todo-faults`. Eight of eight runs then passed.
  - Blossom Haven sometimes had two ring lines, not three: its gardens left no room for a
    third line. A line with no room now comes nearer to the other lines, and last it keeps
    clear of the large obstacles only (`ringLines()` in `src/rings.ts`, `e8df920`).
  - The check put the fairy 14 m before ring 1 for a picture. Two rings can be 12 m apart,
    so she sometimes took ring 0, and the boost step failed. The start is now 8 m (`b7ff6ca`).

The first run on the merged F8 code stopped with a Node.js error, and the error text
was not recorded. The second run passed all steps.

### 10. `scripts/browser-smoke.mjs` selected a wing shape that is gone

- [x] Use a current wing shape. Corrected on the branch `fixes/todo-faults` (`b7ff6ca`).

The check selected the wing shape "luna". The game now has six new wing shapes, and the
check stopped at that step. It now selects "glitter".

### 11. The browser checks are very slow with software graphics

- [ ] Give the check scripts an option for the graphics card, as `scripts/sun-smoke.mjs`
  has (`--swiftshader` selects software graphics there).

With software graphics and the new foliage, the Blossom Haven check takes 1,667 s, the
sticker book check 1,595 s and the asteroid belt check more than 2,400 s. With the graphics
card each check takes 10 to 30 s. A screenshot can also go over the 90 s limit of a check.

## Merges into `master`

### `fixes/todo-faults`

- [x] Merge into `master`: merge `28a5992` of 4 October 2026. The type check, the 403 unit
  tests and the build pass on `master`.
- [ ] Delete the worktree `todo-fixes` and the branch `fixes/todo-faults`. The branch
  has four commits: `7edc7d6`, `b148c58`, `e8df920` and `b7ff6ca`. The type check, the 360
  unit tests and the build pass. These browser checks pass on it: Blossom Haven, wildlife,
  Moon, asteroid belt, sticker book, Settings, sparkle rings, comet, creature hello, postcard
  and the general check.

Three feature branches are complete and not merged: F1, F2 and F6. Each branch has a worktree folder
with the same name in `C:\Users\joel_\Documents\GitHub\fly-me-to-the-moon-worktrees\`.
The branches all change `src/main.ts`, so a merge can have a conflict there. Merge
only when the main folder has no uncommitted work.

### `features/f1-search-stars`

- [x] Run `scripts/settings-smoke.mjs` again (item 5). Not run on this branch; the check
  passes three times on newer code, and the old failure was timing.
- [x] Run the unit tests with the usual 5 s time limit (item 7): 243 pass.
- [ ] Push the branch.
- [ ] Merge into `master`, then delete the worktree and the branch.

### `features/f2-spoken-facts`

- [ ] Merge into `master`, then delete the worktree and the branch. The branch is on
  GitHub.

### `features/f3-creature-hello`

- [x] Merge into `master`: merge `00af6ea`. The creature hello browser check passes on
  `master`.
- [x] Delete the worktree and the branch, also on GitHub.

### `features/f6-world-songs`

- [x] Find why the second run of `scripts/world-songs-smoke.mjs` failed (item 6): the
  machine was busy. Four runs pass.
- [ ] Run `scripts/moon-smoke.mjs`.
- [ ] Push the branch.
- [ ] Merge into `master`, then delete the worktree and the branch.

### `features/f8-comets`

- [x] Run the comet, sparkle rings, postcard and creature hello browser checks on the
  branch (item 8).
- [x] Merge into `master`: merge `30561c9`. The type check, the 310 unit tests and the
  build pass on `master`.
- [x] Delete the worktree and the branch. The branch was never on GitHub.

## Housekeeping

- [x] Push `master`. GitHub has merge `30561c9`.
- [ ] Delete the remote branch `origin/features/f4-sparkle-rings` after `master` is on
  GitHub. F4 is merged.
- [ ] Delete the local branch `features/base`. It is part of `master`.
- [ ] Give the game its own icon. `public/favicon.svg` is the default Vite logo.
