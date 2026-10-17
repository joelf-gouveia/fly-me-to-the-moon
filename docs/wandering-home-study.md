# The wandering home: wandering home study

Status: a study, 17 October 2026. Open `/studies/wandering-home-study.html` on the Vite server. The
study does not change the game or the saved game data. It saves its own answers as
`fairy-wandering-home-study-v1`. The code places below describe `master` on 17 October 2026
(commit `8a426c7`).

Status of the build: the player answered the decisions, and the hop is in the game since
17 October 2026. See "Built in the game" below. The page and the sections before that one keep
the study as it was.

The player asks for four changes to Blossom Haven:

- "Instead of teleporting every 5 minutes it will teleport every 2 minutes."
- "When the planet teleports it will generate a small but visible nova explosion."
- "The planet should not just orbit the sun but also be able to orbit other planets as a
  satellite at random when it teleports."
- "Whenever the planet teleports it can also grow in size or shrink in size (as small as ceres or
  as big as Jupiter)."

This study answers how each change looks in the game, what limits the game sets on it, and what
the build needs. The result is a recommendation, a plan and twelve decisions.

## What to review

- **Six clips.** The chips select a clip: the three looks of the nova (**A** Blossom nova, **B**
  Star nova, **C** Brighter glow), then **S** a moon of Saturn, **Z** the sizes and **H** a hop
  with the fairy on board.
- **The player** shows the clip. **Sound** plays the chime of the clip in step with the video.
  **Play it live** runs the same clip in live 3D with the worlds of the game.
- **The study of a clip** shows three moments of the clip, and the strong and weak points of a
  look, or the rules of a part.
- **The three looks together**, **Five minutes and two minutes**, **Where Blossom Haven has room
  to be a moon**, **Each size**, the findings, the recommendation and the plan follow.
  **Your answers** has twelve decisions. **Copy answers** copies them for the chat, and **Save
  study** exports them as JSON.

## The rules that bind the design

1. **Blossom Haven is magic.** Earth follows the real world; Blossom Haven gets a magic version of
   each feature (the seasons study, 3 October 2026). The nova of the home is therefore magic.
2. **The flower guide stops the clock.** A trip with the guide never ends with the home gone
   (`homeClock.update()` in `src/main.ts`). A trip by hand does not stop the clock.
3. **The home takes a visiting fairy with it.** In its air plus 12 m (`HOME_CARRY_MARGIN`), the
   fairy, the camera and the trail move with the home (`relocateHome()` in `src/relocation.ts`).
4. **Changes in flight are calm.** The weather of Earth must change slowly and be mostly sunny
   (4 October 2026). In this study, a flash is one soft flash, never a series, and never white
   on the whole view.

## The game today

| Part | Code | Today |
| --- | --- | --- |
| The clock | `HOME_MOVE_SECONDS` in `src/relocation.ts` | 300 s of active play with no guide |
| The new place | `findHomePosition()`, `clearHomePosition()` | 160 tries in the play area, clear of the planets, their air and rings, the belt, the comet path, the path of the Moon and a near fairy (250 m margin), at least 3,500 m from the old place |
| The move | `relocateHome()`, `moveHome()` in `src/main.ts` | Moves the group; the terrain, the cottage and the animals stay |
| The orbit | `rebase()` in `src/orbits.ts` | A new circle around the Sun from the new place |
| The glow | `createRelocationGlow()` | A pink sprite at each place, 3.5 home radii, opacity 0.22, 2.5 s; hidden with reduced motion |
| The seasons | `MAGIC_STEP` in `src/magic-seasons.ts` | Each hop gives the next of four magic seasons: a magic year of 20 minutes |
| The size | `createWorlds()` in `src/worlds.ts` | Radius 110 base units (138 m), air 52 (65 m), clouds 24 (30 m) |
| The landscape | `regenerateWorld()` | One landscape for Blossom Haven: the function returns at the second visit |
| The Worlds map | `src/adventure.ts` | "Blossom Haven wanders every five minutes." |

## The clock

The new clock is `HOME_MOVE_SECONDS = 120`. Three other parts count on the clock:

- **The magic seasons.** Each hop adds `MAGIC_STEP` (one season). With 2 minutes the magic year is
  8 minutes, and each season shows for 2 minutes. The look takes 20 s to change
  (`MAGIC_CHANGE_SECONDS`), so the planet changes its look for a sixth of each stay. The plan gives
  a season at each second hop: a year of 16 minutes. The test "makes a year of 20 minutes" in
  `tests/magic-seasons.test.ts` changes with it.
- **The trips by hand.** `handTrips()` in `studies/wandering-home-study/numbers.ts` makes 4,000
  trips from a planet to a home place of `findHomePosition()`, straight, at the space speed of
  `src/flight.ts` (967.5 m/s). A trip takes 28 s on average and 71 s at most. The clock has a
  random phase at the start of a trip, so the chance that the home hops before she arrives is the
  time of the trip over the clock: 9% with 5 minutes, 23% with 2 minutes. A real trip has turns
  and a slow approach, so the real chance is higher. The plan lets the hop wait while she is
  nearer than 3 km and outside the air of the home.
- **The text.** The Worlds map and the README say "five minutes".

## The nova

### The three looks

Each look is a prototype in `studies/wandering-home-study/features/nova.ts`. A nova has the size
of the home: its parts are in units of the home radius.

| | A · Blossom nova | B · Star nova | C · Brighter glow |
| --- | --- | --- | --- |
| Parts | A lilac halo, a pink core, a gold ring and a pink ring that grow, 160 petals in the four season colours | A shell with a bright edge that grows, a white core, a sprite with four spikes, 70 sparkles | The pink sprite of today at 0.55, 48 gold sparkles |
| Largest size | Rings to 4.4 radii | Shell to 6.4 radii | 3.5 radii |
| Length | 3.4 s | 4.2 s | 2.6 s |
| Draw calls for each nova | 5 | 4 | 2 |

The recommendation is A. It is magic, and its rings mark the place well from far away. B is the
easiest to see, but it is a real nova and the brightest of the three. C is calm, but it is not a
nova and it is hard to see from far away.

### The rules of the nova

1. **Two places.** A nova at the old place and a nova at the new place, at the same time. The
   home moves at the peak of the flash (0.25 s). From far away, the second nova shows the child
   where her home went.
2. **A smallest size.** A nova keeps 14 px on a screen of 720 px (the core about 36 px). Without
   it, a nova of today's home is 36 px at 10 km and 9 px at 40 km (`novaPixels()`).
3. **One soft flash.** The flash comes in 0.3 s and goes in about 1.5 s. On the home, the flash of
   the sky is pink at half strength (clip H). It is one flash, so it is far from the limit of
   three flashes in each second of WCAG 2.3.1.
4. **Reduced motion.** Only a soft glow, with no rings and no petals. Today the glow does not show
   at all with reduced motion.
5. **Sound.** A soft rising chime (four notes at 0.04), only when she is nearer than 3 km or on
   the home.
6. **The note.** The note of the hop (`adventure.notifyMove()`) says the new size and the planet:
   "Blossom Haven is as big as Mars now, a moon of Saturn!"

## A moon of a planet

### The rule

`moonSlot()` in `numbers.ts` finds the nearest clear path for a moon home of a size around a
planet:

- The nearest distance is the larger of: the occupied radius of the planet (air, or rings for
  Saturn and Uranus, as `occupiedRadius()`), plus the extent of the home, plus 250 m; and 2 radii
  of the planet. Around Earth the path is also outside the path of the Moon.
- The path is tilted 20° to the plane of the planets.
- Each of 48 points of the path must pass the tests of `clearHomePosition()`: clear of the Sun,
  the belt (`touchesBelt()`), the comet path (`touchesCometPath()`) and the circle of each other
  planet (the planets turn, so a path that reaches a circle meets the planet one day).
- If the nearest distance fails, the test goes out in steps of 25 m, up to 8 radii.

### The table

The distance from the middle of the planet, in metres of the game. "stay" is the other rule for
the comet (below), with the part of the hops that pass it.

| Size | Mercury | Venus | Earth | Mars | Jupiter | Saturn | Uranus | Neptune |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ceres (33 m) | stay: 475, 95% | stay: 687, 97% | 1,394 | no: the asteroid belt | stay: 1,175, 99% | 1,380 | 1,086 | 831 |
| the Moon (75 m) | stay: 534, 95% | stay: 746, 96% | 1,453 | no: the asteroid belt | stay: 1,184, 99% | 1,439 | 1,145 | 890 |
| Mercury (119 m) | stay: 590, 94% | stay: 802, 95% | 1,509 | no: the asteroid belt | stay: 1,240, 99% | 1,495 | 1,201 | 946 |
| Today (138 m) | stay: 613, 94% | stay: 826, 95% | 1,532 | no: the asteroid belt | stay: 1,263, 99% | 1,518 | 1,225 | 970 |
| Mars (181 m) | stay: 667, 94% | stay: 879, 95% | 1,585 | no: the asteroid belt | stay: 1,317, 99% | 1,572 | 1,278 | 1,023 |
| Venus (213 m) | stay: 704, 92% | stay: 917, 94% | 1,623 | no: the asteroid belt | no: the asteroid belt | 1,609 | 1,316 | 1,060 |
| Earth (275 m) | stay: 778, 89% | stay: 990, 94% | no: Venus | no: the asteroid belt | no: the asteroid belt | 1,683 | 1,389 | 1,134 |
| Neptune (344 m) | stay: 857, 87% | stay: 1,070, 94% | no: Venus | no: the asteroid belt | no: the asteroid belt | 1,762 | 1,469 | 1,214 (equal size) |
| Saturn (488 m) | no: Venus | no: Mercury | no: Mars | no: the asteroid belt | no: the asteroid belt | 1,926 (bigger) | 1,632 (bigger) | 1,377 (bigger) |
| Jupiter (588 m) | no: Venus | no: Earth | no: Mars | no: the asteroid belt | no: the asteroid belt | 2,038 (bigger) | 1,744 (bigger) | 1,489 (bigger) |

What the table shows:

- With the rule of today for the comet (the whole path), four planets have room: Earth, Saturn,
  Uranus and Neptune. Earth has room up to the size of Venus.
- Mars never has room. The belt starts 875 m outside the orbit of Mars, and the smallest home
  needs more.
- The comet path reaches Mercury, Venus and Jupiter at some time. A rule that tests the comet only
  for the stay (2 minutes and 30 s, the planet turning on its orbit) gives them room in 87% to 99%
  of the hops (`stayClearOfComet()`, 200 random pairs of planet angle and comet time for each
  cell; 80 on the page). This rule needs one more test: while the guide stops the clock the stay
  is longer, so the game must test the comet again and hop when it comes near.
- With the rule "a moon is smaller than its planet", a home as big as Saturn or Jupiter always
  goes around the Sun.

### The orbit

`src/orbits.ts` has one moon today (`syncMoon()`). A moon home needs a second kind of orbit: the
home follows the position of its planet plus a point of its path, as the Moon follows Earth. The
line of its path moves with the planet (`moonPathLine()` in `features/home.ts` draws it).

A turn in 4 minutes is half a turn in each stay. Around Saturn at 1,518 m that is 40 m/s. The Moon
goes at 18 m/s and Neptune at 59 m/s on its orbit; the fairy can catch both (`worldCarry()` in
`src/flight.ts`), so 40 m/s is in the same range.

### The planet in the sky

The Moon has `fog: false` (`createMoonMaterial()` in `src/moon.ts`) so that it shows from the
ground of Earth. The planets have fog. From the ground of a moon home, the fog of its air paints
the planet pink: the first record of clip H showed Saturn as a flat pink disc. Clip H turns the fog
off for the materials of Saturn, and Saturn shows with its bands and rings. The game needs the same
for the planet of a moon home, while the home is its moon.

## The sizes

### Ten sizes

Each size is the size of a world of the game, so the note can say "as big as Mars". Base units are
the units of `WORLD_DATA`; the game multiplies them by `PROPORTIONS.size` (1.25).

| Size | Base radius | Radius | Air | Clouds | A lap at 11 m/s |
| --- | --- | --- | --- | --- | --- |
| Ceres | 26 | 33 m | 32 m | 15 m | 19 s |
| the Moon | 60 | 75 m | 48 m | 22 m | 43 s |
| Mercury | 95 | 119 m | 60 m | 28 m | 68 s |
| Today | 110 | 138 m | 65 m | 30 m | 79 s |
| Mars | 145 | 181 m | 75 m | 34 m | 104 s |
| Venus | 170 | 213 m | 81 m | 37 m | 121 s |
| Earth | 220 | 275 m | 92 m | 42 m | 157 s |
| Neptune | 275 | 344 m | 103 m | 47 m | 196 s |
| Saturn | 390 | 488 m | 122 m | 56 m | 278 s |
| Jupiter | 470 | 588 m | 134 m | 62 m | 336 s |

The air and the clouds grow with the square root of the radius (`homeAtSize()`). With the ratio
of today, a home as big as Ceres has 15 m of air and clouds at 7 m, in the lollipops.

### The size walk

At a hop the size goes 2 steps down, 1 step down, stays, 1 step up or 2 steps up, with the weights
1, 2, 2, 2, 1. A step past an end stops at the end. Over 20,000 hops (`sizeShares()`), 65% of the
hops change the size, and each size gets 8% to 13% of the hops (the two ends a little more). The
other walk, "any size at each hop", changes the size at 90% of the hops and jumps from Ceres to
Jupiter in one hop.

### The build

`regenerateWorld()` keeps one landscape for Blossom Haven. A new size needs a forced build:
`resizeHome()` in `features/home.ts` sets the new radii, sets `visit` to 0 and calls
`regenerateWorld()`. The shell of the air is outside that function (`addAtmosphere()`), so
`resizeHome()` gives it a new sphere and new radii. The terrain has the same seed, so the hills
keep their places on the sphere; their height in metres stays, so a big home looks flatter.

The bench (`studies/wandering-home-study/bench.ts`) builds each size three times and gives the
median. The computer is an NVIDIA GeForce RTX 4080 SUPER in headless Chrome.

| Size | Build: computer | Build: phone page | Build: slow phone page | Plants and candy (computer) | Animals | Triangles from space (computer) |
| --- | --- | --- | --- | --- | --- | --- |
| Ceres | 535 ms | 361 ms | 1,684 ms | 1,593 | 415 | 1.8 M |
| the Moon | 498 ms | 253 ms | 1,159 ms | 4,979 | 790 | 2.0 M |
| Mercury | 391 ms | 199 ms | 920 ms | 9,259 | 811 | 2.4 M |
| Today | 346 ms | 200 ms | 952 ms | 10,904 | 818 | 2.6 M |
| Mars | 297 ms | 206 ms | 960 ms | 15,238 | 823 | 3.2 M |
| Venus | 292 ms | 209 ms | 902 ms | 19,096 | 803 | 3.8 M |
| Earth | 327 ms | 227 ms | 1,070 ms | 28,737 | 813 | 5.1 M |
| Neptune | 383 ms | 272 ms | 1,255 ms | 41,931 | 833 | 6.9 M |
| Saturn | 543 ms | 329 ms | 1,609 ms | 79,507 | 826 | 12.2 M |
| Jupiter | 681 ms | 389 ms | 1,929 ms | 113,823 | 795 | 16.9 M |

What the bench shows:

- **A build stops the flight.** 0.3 to 0.7 s on the computer and 0.9 to 1.9 s on the slow phone
  page. The game must build the new home before the hop, in parts over many frames, and swap the
  two groups at the flash. The next size and place are known at the start of a stay, so there are
  2 minutes to build. The plan of the plants (`plan()` in `src/foliage/planting.ts`) is pure
  math, so a worker can make it.
- **The plants grow with the area.** At Jupiter size there are 10 times the instances and 6.5
  times the triangles of today. The plan keeps the density of today up to the count of an
  Earth-size home (28,737 on the computer), then fewer: a big home has bigger meadows.
- **The animals stay at about 800.** The herd limits of `src/creatures/population.ts` set the
  count. A home as big as Ceres has room for about 420.
- **Small homes build slower.** Ceres and the Moon take longer than today, with fewer plants. The
  cause is not measured; the placement of the herds on a small sphere is a likely cause.
- **The frame time is low on this computer** (2 to 4 ms) and says little about a phone. The
  triangle count is the better number for a phone.

### The carry at a new size

When she is on the home at the hop, she keeps her direction from the middle and her height over
the ground. Her place in the world is then the new middle, plus that direction times the new
ground radius plus her height. The camera, the trail and the guide move with her, as today.

## The hop with her on board

Clip H shows the full hop: she flies over the flower cottage, a soft pink flash fills her sky,
petals rise, and the home is as big as Earth on a path around Saturn. Saturn rises in front of
her. In the clip the home also turns, so that Saturn is in front of her and the Sun is behind her;
the game keeps the turn of the home, so the sky after a hop can be any sky.

The new home has new animals: a herd that she follows is gone after the hop. Decision 9 asks if a
size change waits until she leaves the home.

## Recommendation

Build the hop of 2 minutes with look A, the Blossom nova, at the old place and at the new place,
with a smallest size of 14 px. Make the home a moon in one hop of two, around Earth, Saturn,
Uranus or Neptune, with the rule of the whole path, and only when the home is smaller than the
planet. Change the size by one or two of the ten steps. Keep the plants at the density of today up
to the count of an Earth-size home. Build the new home before the hop, in parts. Give a magic
season at each second hop, and let the hop wait while she is nearer than 3 km.

## The plan

| Step | Change | Files | Size |
| --- | --- | --- | --- |
| 1. The clock and the seasons | `HOME_MOVE_SECONDS = 120`; a season at each second hop; the text of the map | `src/relocation.ts`, `src/main.ts`, `src/adventure.ts`, `tests/magic-seasons.test.ts`, `README.md` | S |
| 2. The nova | Look A at both places, the 14 px floor, reduced motion, the chime | new `src/hop-nova.ts`; `createRelocationGlow()` goes | S |
| 3. The sizes | The size walk; `rebuildHome()` with the air shell; the plant cap; the note | `src/relocation.ts`, `src/worlds.ts`, `src/foliage/planting.ts`, `src/adventure.ts` | L |
| 4. Build before the hop | Choose the next size and place at the start of a stay; build in parts or in a worker; swap at the flash | `src/worlds.ts`, `src/main.ts` | L |
| 5. The moon home | The moon slot; a second kind of orbit; the path line; no fog on the planet | `src/relocation.ts`, `src/orbits.ts`, `src/adventure.ts` | M |
| 6. The carry and the checks | Her direction and height at a new size; the guide point; browser checks and tests | `src/relocation.ts`, `src/main.ts`, `scripts/blossom-smoke.mjs`, `tests/` | M |

The grace of decision 11 (the hop waits while she is nearer than 3 km) is a small change in
`createRelocationClock()`: `update()` gets one more condition.

## Decisions to make

The first option of each decision is the recommendation.

| Decision | Options |
| --- | --- |
| 1. The look of the nova | A Blossom nova · B Star nova · C Brighter glow |
| 2. Where the nova shows | Both places · Only the new place · Only the old place |
| 3. A nova far away | A smallest size of 14 px · The real size only |
| 4. How often the home is a moon | One hop in two · One hop in three · Each hop with room |
| 5. The rule for the comet | The whole path (4 planets) · The stay (7 planets) |
| 6. A home bigger than its planet | Not a moon · A moon also when it is bigger |
| 7. How the size changes | One or two steps · Any size · Only Mercury to Earth |
| 8. The plants on a big home | Density of today up to an Earth-size count · Density of today · Count of today |
| 9. A hop with her on the home | The full hop · A new place; the size waits · No hop |
| 10. The magic seasons | A season each two hops (16 min) · Each hop (8 min) |
| 11. A trip to the home by hand | The hop waits within 3 km · No change |
| 12. The turn of a moon home | 4 minutes · 327 s, as the Moon · 2 minutes |

## Built in the game

The player answered the decisions on 17 October 2026. The hop is in the game with these answers:

| Decision | Answer | In the game |
| --- | --- | --- |
| 1. The look of the nova | B · Star nova | `src/hop-nova.ts`: the flash, the four spikes, the shell and 70 sparkles of the prototype |
| 2. Where the nova shows | Both places | `planNextHop()` in `src/main.ts` fires a nova at the old place and at the new place |
| 3. A nova far away | 14 px | `NOVA_MIN_PIXELS`, with the field of view and the height of the view |
| 4. How often the home is a moon | "Randomize it" | `planHop()`: the Sun and each planet with room for the size have the same chance. With four planets of room, a hop goes to a moon at most 4 times in 5 |
| 5. The rule for the comet | The whole path | `MOON_HOME.hosts`: Earth, Saturn, Uranus and Neptune |
| 6. A home bigger than its planet | A moon also when bigger | No size test for the planet |
| 7. How the size changes | Any size at each hop | `pickHomeSize()`: each of the ten sizes has the same chance, also the size of now |
| 8. The plants on a big home | Density up to an Earth-size count | `PLANT_AREA_RADIUS` in `src/foliage/planting.ts` |
| 9. A hop with her on the home | The full hop | `moveHome()` keeps her direction and her height over the ground |
| 10. The magic seasons | A season each hop | No change: `MAGIC_STEP` at each hop, a year of 8 minutes |
| 11. A trip by hand | No change | The hop does not wait |
| 12. The turn of a moon home | 4 minutes | `MOON_HOME.turnSeconds` |

The other changes:

- `HOME_MOVE_SECONDS` is 120. The clock plans the hop 0.15 s (`NOVA_PEAK`) before the move, so
  the novae start first and the home moves at the peak of the flash. The flower guide drops a
  planned hop.
- `planHop()` gives no moon path that is nearer than 3,500 m to the old place. A planet whose
  path cannot be that far (the home is its moon now) has no room for that hop.
- `orbits.moonOf()` in `src/orbits.ts` puts the home on its moon path; the plane of the path
  turns with the planet, so a path that is clear at one place of the planet is clear at each
  place. The line of the path is in the orbit paths of Settings.
- `resizeHome()` in `src/worlds.ts` builds the home at the new size and gives the shell of the
  air its new radii. The cottage window light, the sparkle rings and the guide point follow.
- A small home gets fewer cotton candy tufts, down to a fifth below the size of the Moon:
  50 tufts fill the sky of a home as big as Ceres. A big home keeps 50.
- While the fairy is at a moon home, the materials of the planet have no fog.
- The note of a hop with her on board says the size and the planet. The Worlds map says
  "every two minutes".

What is not built:

- **The build before the hop** (step 4 of the plan). The new size is built at the peak of the
  flash: on the bench computer the hop takes 0.35 to 0.45 s, and the view stops for that time.
  A slow phone can stop for 1 to 2 s. A build in parts or in a worker is the next step if the
  stop is a problem.
- **Blossom Haven seen from the ground of its planet.** The home has fog, so from the ground of
  Earth a moon home 1.5 km away is in the fog of Earth. Only the other direction (the planet seen
  from the home) has the rule of the Moon.
- **The map** shows the home on a circle around the Sun also when it is a moon.

## How the clips and the numbers were made

- **The lab.** Each clip runs in the lab of the feature ideas study
  (`studies/feature-ideas-study/lab.ts`), with the worlds, the renderer, the camera and the
  environment of the game. The lab does not turn the planets, so a clip moves Blossom Haven
  itself. The capture page has a fixed seed for `Math.random()` (seed 26).
- **The clips.** `features/clips.ts` has the six clips. A, B and C are the same hop: the fairy
  waits 900 m from the home on its day side, and the home moves 5.7 km. S puts the home on its
  path around Saturn (1,518 m) and runs the second half 13 times faster. Z keeps the camera 2.6 km
  from the home and changes the size four times; the gold circle is the size of today. H flies the
  fairy on a rail 8 m over the ground, then hops the home to a path around Saturn at the size of
  Earth, with the fog of Saturn off.
- **The capture.** `wandering-home-study-capture.mjs` gives the page and the folder of this study
  to the capture script of the feature ideas study, which asks for each frame (30 in each second)
  and makes a WebM clip with the ffmpeg of Playwright. The clips are in
  `public/studies/wandering-home/`.
- **The numbers.** `numbers.ts` reads the values of the game: `WORLD_DATA`, `PROPORTIONS`, the
  belt, the comet, the Moon, `findHomePosition()`, `SPACE_SPEED` and `MAGIC_SEASONS`. Its tests
  (`model.test.ts`) fail when the game changes them.
- **The bench.** `bench.ts` and `wandering-home-study-bench.mjs` (with the browser driver of the
  animals study, `studies/animals-study/cdp.mjs`). One build first is not kept: the first frame of
  the page compiles the shaders.

Run against a dev server with no hot reload, on port 5196:

```
node studies/wandering-home-study/wandering-home-study-capture.mjs "path/to/chrome.exe"            # the six clips
node studies/wandering-home-study/wandering-home-study-capture.mjs "path/to/chrome.exe" --moments  # the moment pictures
node studies/wandering-home-study/wandering-home-study-bench.mjs "path/to/chrome.exe"              # bench.json
```

## Limits of this study

- The phone numbers come from a phone page on a computer, with a CPU 4 times slower. None of the
  runs is a real phone.
- The trips by hand are straight lines at the space speed. They do not include the turn, the
  search or the slow approach, so the real chance to lose the home is higher than 23%.
- The comet test for the stay uses five points of the comet (the coma and four points of the
  longest tail), as `touchesCometPath()` does for the whole path. It tests a stay of 2 minutes
  and 30 s. A longer stay (the guide stops the clock) needs a new test.
- The clips do not show the build in parts: in the capture each frame waits for the build.
- The nova look is a prototype. The game look needs a review on a phone screen.

## Verification

- `npx vitest run studies/wandering-home-study` for the numbers.
- `npx tsc --noEmit -p .` with no error in `studies/wandering-home-study/`.
- The page loads on the dev server with no error, and each clip plays.
