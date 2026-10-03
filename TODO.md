# To do

This file records the known faults, the open check results and the open merges of the game.

Mark an item with `[x]` when it is done, and write the commit that closed it.

Last update: 3 October 2026.

## Faults

### 1. The guided flight to Blossom Haven does not always arrive

- [ ] Find the cause and correct it.

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

- [ ] Change the expected radius from 110 to 137.5, or read it from the game data.

Line 89 stops the check when the radius is not 110. The radius is 137.5 since the
proportions change, so the check stops at its first step. This is a fault of the
check script only.

### 3. Some check scripts use a fixed Chrome debug port

- [ ] Change each script to `--remote-debugging-port=0` and read the port from
  `DevToolsActivePort`, as `scripts/sticker-book-smoke.mjs` does.

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

- [ ] Find why `scripts/sparkle-rings-smoke.mjs` shows 146 draw calls at 390 px on
  `master` and 90 on the F4 branch.

The check passes with the two numbers. The cause is not known. The phone budget is in
`docs/mobile-play.md`.

## Open check results

These results are not confirmed faults. Each one needs a new run on a quiet machine.

### 5. `scripts/settings-smoke.mjs` failed one time at the Escape step

- [ ] Run the check three times on `master`. If one run fails, examine the wait after
  the Escape key (line 145: the check looks 100 ms after the key).

The error was "Escape does not close Settings". It came one time on each of three
branches (F1, F2 and F5) while eight agents used the machine, and the next run passed
each time. The probable cause is timing.

### 6. The second run of `scripts/world-songs-smoke.mjs` failed (F6)

- [ ] Run the check again on `features/f6-world-songs` and read the error.

The first run passed in 25 s. The second run failed at line 173, in the last step: the
resume after a hidden page. The error text was not recorded. The check uses the real
graphics card, because the audio clock does not run with software rendering.

### 7. Some unit tests are slow on a busy machine

- [ ] Run `npx vitest run` on each open branch on a quiet machine, with the usual 5 s
  time limit.

With eight agents on the machine, 6 to 10 tests went over the 5 s limit, in
`tests/cotton-candy.test.ts`, `tests/journey.test.ts` and
`tests/creatures/spherical.test.ts`. They build whole worlds. They passed with a
longer limit, and all tests pass on `master` with the usual limit.

### 8. The browser checks did not run on the merged F8 branch

- [ ] Run `scripts/comet-smoke.mjs`, `scripts/sparkle-rings-smoke.mjs` and
  `scripts/postcard-smoke.mjs` on `features/f8-comets`.

The branch contains `master` with F4 and F5 since commit `67ce84c`. The type check,
the 263 unit tests and the build pass. The browser checks stopped before their end.

## Merges into `master`

Five feature branches are complete and not merged. Each branch has a worktree folder
with the same name in `C:\Users\joel_\Documents\GitHub\fly-me-to-the-moon-worktrees\`.
The branches all change `src/main.ts`, so a merge can have a conflict there. Merge
only when the main folder has no uncommitted work.

### `features/f1-search-stars`

- [ ] Run `scripts/settings-smoke.mjs` again (item 5).
- [ ] Run the unit tests with the usual 5 s time limit (item 7).
- [ ] Push the branch.
- [ ] Merge into `master`, then delete the worktree and the branch.

### `features/f2-spoken-facts`

- [ ] Merge into `master`, then delete the worktree and the branch. The branch is on
  GitHub.

### `features/f3-creature-hello`

- [ ] Merge into `master`, then delete the worktree and the branch. The branch is on
  GitHub.

### `features/f6-world-songs`

- [ ] Find why the second run of `scripts/world-songs-smoke.mjs` failed (item 6).
- [ ] Run `scripts/moon-smoke.mjs`.
- [ ] Push the branch.
- [ ] Merge into `master`, then delete the worktree and the branch.

### `features/f8-comets`

- [ ] Run the comet, sparkle rings and postcard browser checks on the branch (item 8).
- [ ] Push the branch.
- [ ] Merge into `master`, then delete the worktree and the branch. The branch already
  contains `master` of 3 October 2026 (commit `b15d508`).

## Housekeeping

- [ ] Push `master` (6 commits ahead of `origin/master`).
- [ ] Delete the remote branch `origin/features/f4-sparkle-rings` after `master` is on
  GitHub. F4 is merged.
- [ ] Delete the local branch `features/base`. It is part of `master`.
- [ ] Give the game its own icon. `public/favicon.svg` is the default Vite logo.
