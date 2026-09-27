# Into the air, out to the stars: planet transition study

Status: parked on 27 September 2026, with no decision. The game keeps its flight of
today. [When you come back](#when-you-come-back) tells how to start again. Open
`/studies/planet-transition-study.html` on the Vite server. The study controls do not
change the game or saved game data.

The flight into a world and out of it feels jarring, and the keys do not always seem
to work. This study measures why. It runs the flight code of the game on the Earth of
the game, and it compares three ways to fix the transition: **A — Retune**,
**B — One sky** and **C — Cloud door**.

## What to review

- **Compare options** flies the live view with *Today*, A, B or C.
- **Moment** plays one of six scripted moments. The same keys go to each option.
- **Fly it yourself** starts free flight from the meadow or from space. Click the
  view, then use W / S, A / D and Shift.
- **Build the new landscape** runs the real `regenerateWorld()` when the rule of the
  option says so. The readout shows its time in milliseconds.
- **Show the shells** draws the height where the steering rule changes (*Today*, A)
  or where the sky turns (B, C).
- **01 / The same moment, four ways** shows the altitude, the largest turn in one frame
  and the speed of the four options, with a table of all six moments.
- **Save study** exports the constants and the results of all moments as JSON.

*Today* in the study calls `stepFlight()` of `src/flight.ts` and `journeyHeading()` of
`src/journey.ts` without changes. It copies the guided flight of `updateFairy()` in
`src/main.ts`. The options are in `studies/planet-transition-study/model.ts`.

## Definitions

- **Turn in one frame** is the largest angle that the heading or the up of the fairy
  turns in one step of 1/60 s. The steering keys turn the fairy 0.75° in one frame. A
  turn of more than about 2° shows as a snap.
- **Steering shell** is the height where `turnFlight()` changes its rule:
  1.55 × the height of the air, and 85 m or more. On Earth it is 151 m.
- **Sky up** (option B) is the direction that W climbs toward and that A and D turn
  around.
- **Carry** is the planet frame: `animate()` in `src/main.ts` moves the fairy with the
  spin and the orbit of the world.

All heights are above sea level on the Earth of the game: radius 275 m, air 97.5 m,
clouds 42.5 m (base units × 1.25, `src/proportions.ts`).

## What the code does today

- `turnFlight()` (`src/flight.ts:28`) has two rules. Below the steering shell
  (line 31), W and S change the angle of climb, with a limit of 1.35 rad (77°)
  (line 37). With no pitch key, the angle goes back to level (line 38). The fairy is
  then oriented with the up of the world in one call (line 43). Above the shell, W and S
  turn the fairy around her own side axis (line 45). Nothing stops that turn.
- A heading straight down has no horizontal part. Then line 40 uses a fixed axis.
- `stepFlight()` sets the speed from the altitude: a smoothstep from the top of the air
  to 1,000 m (line 64). A lower speed takes effect in the same frame (line 67).
- On the ground, line 80 turns the fairy to level + 5° in one frame.
- The guide aims at the centre of the world (`src/journey.ts:17`). At 12 m above the
  ground, `updateFairy()` in `src/main.ts` turns the fairy to an east–west heading in
  one frame.
- `animate()` in `src/main.ts` carries the fairy with the world when she is in its air
  (clearance at or below the height of the air). Above it, no carry.
- `updateNearestWorld()` in `src/main.ts` calls `regenerateWorld()` at 80 m on the
  way in (`visitTransition()` in `src/terrain.ts`).

## Findings

### Finding 1: W and S have two meanings

Below 151 m, W and S set an angle of climb. Above 151 m, they turn the fairy over. A
fairy that holds W from the meadow goes up to 267 m, turns a loop and comes back upside
down. At the shell she turns 169° in one frame. A fairy that holds S 1,200 m above
Earth turns away from it. She never comes lower than 1,000 m. This is the largest cause
of "the controls do not work".

### Finding 2: let go above the clouds, and you stay

"Release to cruise" levels the fairy at every height below the steering shell. A fairy
that lets go at 70 m cruises at 114 m, above the air, with no end. The flight panel says
*Edge of space*. To leave Earth, a child must hold W for 7.3 s and let go above 151 m.
With Shift, the time is 3.9 s.

### Finding 3: no keys, no landing

A fairy that flies straight at Earth with no key levels out at 101 m. The air starts at
97.5 m. She never comes into the air. A shallower approach levels out higher: 108 m to
133 m.

### Finding 4: snaps at the steering shell

At 151 m the up of the fairy changes to the up of Earth in one frame. In every approach
test the turn is 90°, and it is up to 170°. A dive steeper than 77° also turns up to
13.7° in one frame at the pitch limit. A straight dive gets its heading from the fixed
axis of line 40, so the heading can change in any direction. The camera up follows at a
rate of 3/s, so the view rolls for about one second after the snap.

### Finding 5: a hard brake

The speed follows the altitude with no limit. It falls from 968 m/s to about 32 m/s in
the last 900 m above the air. The peak is 1,015 m/s², about 100 g. The field of view
changes only for Shift, so no picture tells the child about the brake.

### Finding 6: the guided arrival snaps

The guide aims at the centre of Earth. The pitch limit holds the fairy at −77° for about
5 s. Then, at 12 m, her heading turns 77° to 102° in one frame to an east–west heading.
There is also a 12° step at the steering shell.

### Finding 7: ten heights that do not agree

| Height | Rule | Code |
| --- | --- | --- |
| 24 m | Sky fully blue (camera) | `updateEnvironment()`, `src/main.ts` |
| 42.5 m | Cloud layer | `buildClouds()`, `src/worlds.ts` |
| 80 m | New landscape on the way in | `visitTransition()`, `src/terrain.ts` |
| 97.5 m | The world carries the fairy (from the ground) | `animate()`, `src/main.ts` |
| 97.5 m | Speed starts to rise | `stepFlight()`, `src/flight.ts` |
| 105 m | Sky starts to go blue (camera) | `updateEnvironment()`, `src/main.ts` |
| 146 m | Visit re-arms on the way out | `visitTransition()`, `src/terrain.ts` |
| 146 m | Flight panel says "near"; sticker | `updateNearestWorld()`, `src/main.ts` |
| 151 m | Steering rule changes | `turnFlight()`, `src/flight.ts` |
| 1,000 m | Full space speed | `stepFlight()`, `src/flight.ts` |

Between 97.5 m and 151 m, the fairy steers as near Earth, but Earth does not carry her.
Finding 3 puts a fairy with no key in this band.

### Finding 8: the carry of Earth stops in one frame

At the top of the air the fairy loses the orbital speed of Earth in one frame:

| Orbital speed of the game | Jump |
| --- | --- |
| 1× | 14 m/s |
| 8× | 115 m/s |
| 16× | 230 m/s |
| 32× | 461 m/s |
| 64× | 922 m/s |

The fairy cruises at about 32 m/s at that height. At 8× and more, Earth jumps away from
her on the way out, and it jumps under her on the way in. At 64×, Earth moves nearly as
fast as the space speed of 968 m/s. The spin of Earth adds 9.8 m/s at the top of the air.
The study sandbox does not move Earth, so this finding is from the formula of
`src/orbits.ts`.

### Finding 9: the new landscape stops a frame

`regenerateWorld()` builds all of a world in one frame. Measured on 27 September 2026 in
a desktop browser with 20 cores, CPU time only:

| World | Build time |
| --- | --- |
| Earth | 100–111 ms |
| Mars | 25–26 ms |
| Mercury | 25–27 ms |
| Jupiter | 21 ms |
| Venus | 17–18 ms |
| Ceres | 3 ms |

For Earth that is 6 to 7 frames at 60 frames each second, in the middle of the descent.
The upload to the graphics card comes after this time. A phone takes longer. This study
did not measure a phone.

### Also found, outside the transition

Ctrl turned hover on and off (the `keydown` handler of `src/main.ts`). Ctrl+W closes the
browser tab, and a browser cannot block it. Ctrl+D and Ctrl+S open browser dialogs, and
the game pauses on blur. Fixed on 27 September 2026: Q turns hover on and off now (see
Decision 5).

## The options

### A — Retune

Keep the two steering rules. Remove the snaps, the brake and the trap.

- At the steering shell, the roll turns to the up of the world at a rate of 3/s, not in
  one frame.
- The pitch limit eases the fairy back to 77°. A straight dive takes its heading from
  the head of the fairy.
- "Release to cruise" levels the fairy inside the air only.
- The speed falls on a curve: `sqrt(base² + 2 × 240 × height above the air)`. A straight
  dive brakes at 240 m/s² or less (about 25 g). The brake starts at about 2,000 m.
- The guide flies a 25° glide into the air. At 30 m it stops, keeps its heading, and
  "release to cruise" levels the fairy.
- The fairy pulls up before the ground: the lowest angle rises from −90° at 30 m to
  level at 3 m.
- The landscape build runs in slices over many frames (proposal only; the study builds
  in one frame).

What stays: W and S keep two meanings. In space, a held W or S still turns a loop. Work:
small. Risk: low, but the main complaint stays.

### B — One sky

One steering rule everywhere, with a sky up that turns slowly.

- W and S set the angle of the climb or the dive against the sky up, with the 77° limit.
  A and D turn around the sky up. Nothing turns a loop.
- The sky up is the up of the plane of the orbits far away. It is the up of the world
  when the world has a half angle of 20° in the view, and it starts to turn at 8°. On
  Earth that is 529 m and 1,700 m. The rule uses the angle, so each world gets the same
  feel: on Jupiter the heights are larger, on the Moon they are smaller.
- The sky up follows its goal at a rate of 4/s. The fairy rolls with it, so the world
  turns into the floor over several seconds.
- "Release to cruise" levels the fairy below the clouds + 12 m (54.5 m on Earth; 40 m on
  a world with no clouds). Above that height, she keeps her climb or her dive.
- The carry of the planet frame uses the same weight as the sky. The orbital speed of
  Earth changes over about 1,170 m, not in one frame (proposal; the sandbox does not move
  Earth).
- It includes the brake curve, the glide, the pull-up and the sliced build of A. The
  brake curve ends at the level ceiling, not at the top of the air.

What stays: free flight. The fairy steers at every moment. Work: medium. Risk: the fairy
cannot point straight up or straight down in space. Near Earth and the Moon, the sky
blends between two worlds. The rate limit of the sky up prevents a step, but this needs
a test in the game.

### C — Cloud door

Option B, plus two short scenes.

- Down: when the fairy goes below the steering shell with a dive of 10° or more, a
  3.2 s glide takes her to 30 m above the ground. The curve is a quintic Hermite curve
  in along-track distance and altitude, so it starts and ends with no step. It ends at
  the cruise speed of that height.
- The camera pulls back and up during the scene, and a cloud veil fills the view. The
  new landscape builds when the veil is thick, so no stop and no change of the ground
  shows. The brake curve of C ends at the steering shell, so the glide starts at about
  32 m/s.
- Up: when the fairy climbs through the level ceiling at 20° or more, a 2.5 s lift takes
  her to 390 m (4 × the air) at 200 m/s and a 40° climb. Then B continues.
- During a scene, only Shift acts. It makes the scene 1.4 times faster.

Work: large. Risk: the child loses the steering for 2.5 to 3.2 s at each crossing. A
fairy that flies up and down at the edge of the air sees the scenes again and again.

## Comparison

Largest turn in one frame and the result of each moment (from the model, Earth standing
still, 60 steps each second):

| Moment | Today | A — Retune | B — One sky | C — Cloud door |
| --- | --- | --- | --- | --- |
| Climb above the clouds, then let go | 1.1°, stays at 114 m | 1.1°, space at 11.2 s | 1.4°, space at 7.9 s | 0.9°, space at 9.7 s |
| Hold W to space | 169°, loops back, stays at 112 m | 8.8°, loops, 1,027 m at 25 s | 1.8°, space at 7.9 s | 1.6°, space at 8.3 s |
| Fly straight at Earth, no keys | 13.7°, stays at 101 m | 1.3°, air at 3.1 s | 1.1°, air at 2.7 s | 1.0°, air at 4.4 s |
| Hold S above Earth | 0.6°, never below 1,000 m | 7.0°, air at 5.8 s | 5.1°, air at 3.9 s | 5.1°, air at 5.4 s |
| Worlds → Earth from space | 77°, air at 5.4 s | 0.9°, air at 3.6 s | 0.7°, air at 2.9 s | 1.4°, air at 4.7 s |
| Worlds → a far world | 1.4°, space at 14.1 s | 1.4°, space at 10.3 s | 1.6°, space at 8.6 s | 2.2°, space at 8.5 s |

The approach brake is 1,015 m/s² today, and about 240 to 260 m/s² in A, B and C. The
5° to 7° turns of *Hold S above Earth* come from the ground rule of `stepFlight()` when
the player holds S on the ground. The 2.2° of C in *Worlds → a far world* comes after the
lift: the guide turns the fairy at the rate of today (1.5/s).

The table uses one Earth landscape (seed 1234). The page flies the live Earth of the game,
which gets a new landscape at each load, so its numbers differ by a few tenths of a degree.

| | A — Retune | B — One sky | C — Cloud door |
| --- | --- | --- | --- |
| Snaps at the shell and the arrival | Removed | Removed | Removed |
| Hard brake | Removed | Removed | Removed |
| Trap at the edge of space | Removed | Removed | Removed |
| Loop when W or S is held in space | Stays | Removed | Removed |
| Frame stop of the landscape build | Sliced build | Sliced build | Hidden in the veil |
| Jump of the planet frame | Stays | Spread over the sky shell | Spread over the sky shell |
| Steering lost | Never | Never | 2.5–3.2 s each crossing |
| Work | Small | Medium | Large |

## Recommendation

**Option B, One sky.** The cause of the jarring transition is two steering rules and
ten heights that do not agree. Option A removes the snaps, but a child who holds W in
space still turns a loop and comes back to Earth. Option B removes the cause with a
medium change, and it keeps the steering free at every moment. Option C adds a gift, but
it takes the steering away at each crossing. Play C in the study before a decision.

## Changes to make

1. Replace the two branches of `turnFlight()` in `src/flight.ts` with the sky-up rule of
   `stepOneSky()` in `studies/planet-transition-study/model.ts`. Keep the turn rates of today.
2. Keep the sky up in the flight state. `hoverFlight()` also uses it.
3. Replace the speed smoothstep of `stepFlight()` with the brake curve.
4. Add the 25° glide to `journeyHeading()` in `src/journey.ts`. Remove the heading snap
   at the arrival in `updateFairy()` in `src/main.ts`.
5. Make the carry in `animate()` of `src/main.ts` a part carry by the sky weight.
6. Build the new landscape in slices after the fairy leaves. Swap it in at the top of
   the air.
7. Align the flight panel, the sticker and the visit rule with the heights of B, or
   record why each one differs.
8. Update `tests/flight.test.ts`: the test for a full circumnavigation, and new tests for
   the moments of this study.

## Decisions to make

Decisions 1 to 3 change how the game feels. Decision 4 is smaller. Decision 5 is done. Values marked
"estimate" are not model results.

### Decision 1: what is up in space?

Up is the direction that W climbs toward. A and D turn around it. Near a world, up is the
up of the world. Far from all worlds, option B needs a second up.

| Choice | How it feels | Cost |
| --- | --- | --- |
| The up of the plane of the orbits (B) | The worlds are on the horizon. W and S go above or below them. The same after each visit. | The fairy rolls up to 90° on the way out when she leaves from the side of a world: on Earth, between 529 m and 1,700 m. |
| The up of the last world | No roll on the way out. | Up differs after each visit, so the same key turns another way. |

The study has only the first choice. Recommendation: the up of the plane of the orbits.

### Decision 2: keep loops in space?

Today W and S turn the fairy freely in space (Finding 1). Option B limits the climb and the
dive to 77°, so no loop is possible.

| Choice | Result |
| --- | --- |
| No loops (B) | A held W always climbs away. With W held, B reaches space at 7.9 s. |
| A loop as a trick | A separate input does one loop, then B continues. A separate card. |
| Free turn far from worlds only | The two meanings of W and S come back. Not recommended. |

With no loops, the fairy cannot point straight up or straight down in space. The worlds
are near one plane, and Blossom Haven is about 3,000 m above it, so this rarely matters
(estimate). Recommendation: no loops, and a trick later if players miss them.

### Decision 3: a scene at the clouds?

| Choice | Gain | Loss |
| --- | --- | --- |
| None (B only) | The fairy steers at every moment. | The new landscape appears at once at the top of the air. The sliced build removes the stop, but it is not built. |
| Glide down only | The veil hides the build: no stop and no change of the ground shows. | 3.2 s without steering at each arrival. |
| Both | A camera moment on the way out. | 2.5 s more without steering, for no gain in time (C 8.3 s, B 7.9 s to 1,000 m with W held). |

A fairy that flies up and down at the edge of the air starts the scenes again and again.
The study has no wait time between scenes. Test: play *Fly straight at Earth, no keys* with
B and C, and dive from space several times. Recommendation: B first, then maybe the glide
down.

### Decision 4: the sky angles

The up of B turns when the half angle of the world in the view grows from 8° to 20°:

| World | Turn starts | Turn complete |
| --- | --- | --- |
| Moon | 464 m | 144 m |
| Blossom Haven | 850 m | 265 m |
| Mars | 1,121 m | 349 m |
| Earth | 1,701 m | 529 m |
| Jupiter | 3,634 m | 1,130 m |

A larger start angle starts the turn nearer and makes the roll faster. A straight dive at
Earth at the speed of the brake curve crosses the turn in about 2 s (estimate). From the
ground of the Moon, Earth has a half angle of 16.6°, so the up can jump between the two
worlds when the nearest world changes. The rate limit of the up prevents a snap, but the
sandbox does not test it. Change `SKY_ANGLES` in `studies/planet-transition-study/model.ts` to try
other values. Recommendation: keep 8° to 20°, and test near the Moon.

### Decision 5: the Ctrl key (done)

Decided and done on 27 September 2026: Q turns hover on and off, and Ctrl does nothing.
Q with Ctrl, Alt or Meta does nothing. The hints in `src/mobile-ui.ts` and
`src/settings.ts` and the README say Q. The rest of this section records the choice.

Ctrl turned hover on and off. Ctrl+W closes the tab, and a browser cannot block it. Ctrl+D
and Ctrl+S open browser dialogs, and the game pauses.

| Choice | Result |
| --- | --- |
| Move hover to a letter key, for example H | The problem goes away. Change the hints in `src/main.ts` and `src/mobile-ui.ts`, and the README. |
| Keep Ctrl, block the browser keys | Ctrl+D and Ctrl+S are fixed. Ctrl+W still closes the tab. |

The UI study (`docs/ui-simplify-study.md`) lists the flight panel with the Ctrl hint.

## When you come back

1. Run `npx vitest run studies/planet-transition-study`. The tests of *Today* check the problems of
   the flight code of today. If one fails, the flight code changed: read the finding
   again before you trust the numbers.
2. Open the study and play the six moments with *Today*. Compare the results with the
   comparison table.
3. Take decisions 1 to 4 above. Then use [Changes to make](#changes-to-make).
4. Not built yet, for a better decision: the "last world" up of Decision 1, a slider for
   the sky angles, and a wait time between the scenes of C.

## Limits of this study

- The worlds stand still in the sandbox. The carry of the planet frame (Finding 8 and
  the part carry of B) is from the formula only.
- The sandbox has one world. The blend of the sky between Earth and the Moon is not
  tested.
- The landscape build times are CPU times on one desktop. The upload to the graphics
  card and the phone times are not measured.
- The sliced build of A and B is a proposal. The study builds in one frame.
- The model tests use one Earth landscape (seed 1234). Hills on other landscapes can
  change the ground steps.

## Verification

- `npx vitest run studies/planet-transition-study` runs 15 model tests. They check each finding for
  *Today* and each fix for A, B and C.
- `node studies/planet-transition-study/transition-study-smoke.mjs "path/to/chrome.exe"` against the Vite server
  (port 5174) opens the page on a computer and a phone width, plays each moment for each
  option, and checks for errors.
