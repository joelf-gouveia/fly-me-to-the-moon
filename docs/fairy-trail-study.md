# A trail that stays behind her: fairy trail study

Status: accepted on 4 October 2026. Joel selected four options: 03 Pixie dust, 07 Comet
tail, 08 Sparkle halo and 14 Shimmer from her feet. The game now has these four trails,
and the player selects one in the look menu. See "In the game" below. Open
`/studies/fairy-trail-study.html` on the Vite server. The controls of the study do not
change the game. It saves its own answers as `fairy-trail-study-v1`.

In this document, "today" and the line numbers describe the game before the change, at
commit `8e90b69`. The study page shows the trail of that game as **The trail of today**.

The fairy has a trail of sparkle dots. The trail goes off at an angle, it is not the
same on each screen, and it does not sparkle. This study gives the cause, five rules
that correct it, and fifteen options for the look of the trail. One option removes the
trail. Each clip comes from the engine of the game: the fairy rig, the flight, the
worlds, the light and the flight camera of the game, with the new trails added by study
code.

## What to review

- **The player** shows the clip of the selected option. The chip **The trail of today**
  selects the trail of the game. The chips **01** to **15** select the options. The
  arrows go to the option before and to the next option.
- Each clip shows the same flight of 14 s: a cruise, a turn to the left, a turn to the
  right, a boost, a hover, and the time after a sparkle ring. A label in the picture
  gives the phase of the flight.
- **See it live** runs the option in live 3D. The controls select the flight, the
  camera, day or night and one of the ten sparkle colours of the wing colours of the
  menu. **The world moves** stops the spin and the orbit of the world: then the trail of
  today has no fault. **After a sparkle ring** gives the longer, brighter trail.
  **Reduced motion** stops the twinkle.
- **01 / The fifteen options** shows a picture of each option and its cost.
- **02 / What is wrong today** shows the trail of today in the real game, and four
  pictures of the same flight with and without the rules.
- **04 / Decisions to make** keeps your answers in this browser. **Copy answers** copies
  them for the chat. **Save study** exports them as JSON.

## What the game has today

The trail is one `THREE.Points` object in the scene (`src/main.ts:325` to `:352`). It
has 144 places for dots. On each frame of flight, the game writes one dot at the place
of the fairy, with a random offset in a box of 0.34 m (`src/main.ts:838`). The game
shows the newest 72 dots. After a sparkle ring or in a comet tail it shows 144 dots, and
the dots are larger (`src/main.ts:782`, `:1042`).

1. **The dots stay in space, and the world moves.** Near a world, the game keeps the
   fairy in the frame of that world. On each frame it moves her with the spin and the
   orbit of the world (`src/main.ts:985` to `:1005`). The dots of the trail do not move
   with her. This is the cause of the weird angles.
2. **The angle changes with her heading.** The velocity of the world has one direction
   in space. When she turns, the trail does not turn with her. It can be behind her, at
   one side of her, or in front of her.
3. **In a hover the trail moves away.** A hover adds no dots (`src/main.ts:793`). The
   old dots stay in space, and the world carries her away from them.
4. **The length depends on the screen.** The game adds one dot for each frame, so 72
   dots are 1.2 s at 60 frames in each second, 0.6 s at 120 and 2.4 s at 30.
5. **In space the dots are far apart.** The gap between two dots is the distance of one
   frame. In open space the gap is 16 m at 60 frames in each second. The camera is 8 m
   behind the fairy, so the trail is almost empty.
6. **A boost makes groups of three.** A boost adds three dots in a frame, all at the
   same place (`src/main.ts:838`). The trail lasts one third of the time.
7. **The end of the trail is as bright as its start.** Each dot has the same size and
   the same opacity. The oldest dot goes out in one frame. The colour of a dot follows
   its place in the buffer, not its age (`src/main.ts:369`).
8. **No twinkle, and no colour by day.** The opacity of all the dots changes together,
   on one slow wave (`src/main.ts:1040`). The dots use additive blending, so on a bright
   sky the sparkle colour of the wings goes white.

### The numbers of the fault

| Measurement | Value |
|---|---|
| Flight speed in the cruise of the clip, 12 m above the ground | 11.4 m in each second |
| Speed of Earth on its orbit (one orbit in 3600 s) | 14.4 m in each second |
| Speed of the ground of Earth at its equator (one turn in 240 s) | 7.2 m in each second |
| Speed of the fairy in space in the clip, before her own flight | 19.5 m in each second |
| Speed of the fairy in space in a hover, at the start of the game | 18.6 m in each second |
| Largest angle between the trail of today and her path over Earth | 60° |
| Speed of Blossom Haven on its orbit | 58.7 m in each second |
| Largest angle between the trail of today and her path over Blossom Haven | 80° |
| Length of the trail of today at 11 m in each second, at 30, 60 and 120 frames in each second | 26.4 m, 13.2 m and 6.6 m |
| Gap between two dots in open space at 60 frames in each second | 16 m |

The speed of 18.6 m in each second is from the real game: the browser check moves the
fairy in a hover for 1 s and reads her position. In 3 s of cruise she flies 33 m, and
she moves 37 m in space. The picture `G-game.jpg` on the page is the real game after
these 3 s: the trail goes up to a corner of the picture.

The world moves faster than the fairy flies. So the trail of today shows the motion of
the world more than it shows her flight. Blossom Haven is farther from the Sun than
Earth, so the fault is larger there.

## The rules

Options 02 to 15 follow these rules. Rules 1 to 3 correct the trail. Rules 4 and 5 make
it sparkle.

1. **The trail belongs to the world below her.** The points are children of the group of
   the world that carries the fairy. They turn and move with the world, so the trail is
   always on the path that she flew. In open space, no world carries her, and the points
   stay in the scene.
2. **Time makes the points, not frames.** Each option makes a number of points in each
   second (`emitCount()` in `model.ts`). The trail has the same length and the same
   density at each frame rate. A new point starts at a random place between the place of
   the fairy in the frame before and her place now, so a slow frame makes no gap.
3. **A limit on the length.** A point moves away from her at 12 m in each second at
   most. Above that speed, a new point keeps a part of her velocity: `1 - 12 / speed`
   (`inherit()` in `model.ts`). The trail has the same length in a boost and in open
   space.
4. **Each point fades with its age.** A point grows in its first sixth, then it becomes
   smaller. Its opacity goes to zero in the second half of its life.
5. **Each point twinkles alone, in the sparkle colour.** Each point has its own flash
   rate. With reduced motion, the points keep one brightness. A point covers a part of
   the picture behind it, so its colour shows by day and it shines at night.

Option 02 uses rules 1 to 4 on the dots of today, with additive blending and no twinkle.
It shows the correction alone.

## The fifteen options

"Stays with" gives the thing that holds the points of the trail.

| No. | Option | Family | Stays with | What the child sees |
|---|---|---|---|---|
| 01 | No trail | No trail | None | The fairy and her wings, and no trail. The glitter of the wings stays. |
| 02 | Today, repaired | Dots | The world | The same round dots as today, in a line behind her. The oldest dots fade. |
| 03 | Pixie dust | Sparkles | The world | Small points of light that flash, become smaller and fall slowly. One point in four is a small star. |
| 04 | Star glints | Sparkles | The world | About 25 large four-point stars that flash and turn slowly. |
| 05 | Ribbon of light | Ribbon | The world | A soft band of light, wide at her back and thin at its end. It bends in each turn. |
| 06 | Wing-tip streams | Ribbon | The world | Two thin lines of light, one from each wing, with small sparkles on them. |
| 07 | Comet tail | On the fairy | The fairy | A short tail of stars straight behind her. It is longer in a boost. |
| 08 | Sparkle halo | On the fairy | The fairy | Small stars come and go around her body and her wings. No trail. |
| 09 | Ribbon and stars | Ribbon | The world | A thin band of light on her path, with star glints along it. |
| 10 | Rainbow dust | Sparkles | The world | Pixie dust that goes through the colours of the rainbow as it becomes older. |
| 11 | Blossom confetti | Magic | The world | Small hearts, flowers and stars in pink, lemon, mint and lilac, with a little dust. |
| 12 | Only when it counts | Sparkles | The world | No trail in a cruise. A burst of stars at the start of a boost, and dust in a boost and after a ring. |
| 13 | Shimmer to sparkle | Sparkles | The world | A few small, faint points in a cruise. A boost makes more points, larger points and brighter points. |
| 14 | Shimmer from her feet | Sparkles | The world | The shimmer of option 13, as one line of points from each foot. |
| 15 | Shimmer from her wings | Sparkles | The world | The shimmer of option 13, from many places on the surface of her wings: a wide, soft cloud. |

### The limits of each option

- **01 No trail.** A sparkle ring and a comet tail have no trail to make longer. They
  need a different reward, for example a flash on the wings.
- **02 Today, repaired.** It is not more sparkly.
- **03 Pixie dust.** In a hover, a little dust continues to fall from her.
- **04 Star glints.** It reads as a row of stars, not as a line.
- **05 Ribbon of light.** It has no sparkle.
- **06 Wing-tip streams.** The lines start at a fixed place near each wing tip. They do
  not follow each wing beat.
- **07 Comet tail.** The tail does not bend in a turn: it turns with her as one piece.
- **08 Sparkle halo.** It does not show where she came from.
- **09 Ribbon and stars.** It is the brightest option on a dark sky.
- **10 Rainbow dust.** It uses the wing colour only at the start of the trail.
- **11 Blossom confetti.** It has its own colours, not the wing colour. It is a magic
  trail for Blossom Haven.
- **12 Only when it counts.** In a cruise it is the same as option 01.
- **13 Shimmer to sparkle.** The trail is always there, so it is not as clean as
  option 12 in a cruise. In a hover the shimmer continues.
- **14 Shimmer from her feet.** The trail is lower in the picture than in option 13.
  The points start at the ankle joints of the rig, so the two lines move with her legs.
- **15 Shimmer from her wings.** The cloud is as wide as her wings, so it shows her
  path less clearly than a line. The points start on the shape of the four wing panels
  of the rig, not on the outline of each wing design.

## The recommendation

The study recommends **03 Pixie dust**.

- It is the nearest to the trail of today, so the fairy keeps her look.
- It is more sparkly: each point twinkles, and the points have different sizes.
- It follows all five rules, so it is the same on each screen, at each speed and on each
  world.
- It costs one draw call.

Option 09 is the second choice, if you want a trail that shows the path more clearly.
Option 11 can go with each of the other options as the trail near Blossom Haven.

## The method

### The frame of the trail

In the study, each trail is a child of `world.group`. The emitter changes the place of
the fairy to the frame of that group with `worldToLocal()`. A rotation of the group
changes the velocity that a point keeps. The game does the same work for the fairy
(`planetLocalOffset`, `src/main.ts:993`).

In the game, the frame is `attachedToWorld` (`src/main.ts:986`). When the fairy goes
out of the air of a world, `attachedToWorld` becomes `null`. Then the trail must change
its parent to the scene, and the points that are alive must keep their place on the
screen. `Object3D.attach()` of three.js does that for the object. The study does not show
this change of frame: each clip stays near one world.

### Sparkles

A sparkle trail is one `THREE.Points` object with a `ShaderMaterial` (`createSparkles()`
in `trails.ts`). Each point has four attributes: its start, its velocity, and one vector
with its time of birth, its life, a random number and its size. The CPU writes a point
one time, when the point starts. The vertex shader moves the point, makes it fall to the
ground and gives its size. The fragment shader draws the shape: a soft disc, a
four-point star, a five-point star, a heart or a flower. No picture file is necessary.

A point near the camera has a limit on its size, and it fades below 3.6 m from the
camera. So the trail does not cover the view when it goes below the camera.

### Ribbons

A ribbon keeps 40 samples of the place of the fairy (`ribbon()` in `trails.ts`). On each
frame, the CPU writes two corner points for each sample, across the line of sight of the
camera. The fragment shader fades the band to its edges and to its end.

### The trail of today in the study

`today()` in `trails.ts` is a copy of the trail of the game: the same buffer, the same
material, the same random offset, three dots in a boost, no dots in a hover. The study
adds 60 dots in each second, as a screen of 60 Hz does.

### The flight of the clips

The lab of the feature ideas study has worlds that do not move. For this study,
`shots.ts` turns the world on its axis and moves it on its orbit, with the periods of the
game. It carries the fairy with the world as the game does. Then `stepFlight()` or
`hoverFlight()` of `src/flight.ts` moves her. The camera is the flight camera of the
game.

## The cost

| Option | Points at most | Draw calls |
|---|---|---|
| The trail of today | 144 | 1 |
| 01 No trail | 0 | 0 |
| 02 Today, repaired | 160 | 1 |
| 03 Pixie dust | 520 | 1 |
| 04 Star glints | 90 | 1 |
| 05 Ribbon of light | 80 | 1 |
| 06 Wing-tip streams | 300 | 3 |
| 07 Comet tail | 260 | 1 |
| 08 Sparkle halo | 160 | 1 |
| 09 Ribbon and stars | 170 | 2 |
| 10 Rainbow dust | 520 | 1 |
| 11 Blossom confetti | 360 | 2 |
| 12 Only when it counts | 480 | 1 |
| 13 Shimmer to sparkle | 560 | 1 |
| 14 Shimmer from her feet | 560 | 1 |
| 15 Shimmer from her wings | 560 | 1 |

A ribbon counts its corner points. Each option is small for a phone. The sparkle
options write only the new points of a frame to the buffer.

## In the game

The game has the four selected trails.

- **The module.** `src/fairy-trail.ts` holds the rules, the sparkles and the four trails.
  The study uses the same code for options 03, 07, 08 and 14.
- **The menu.** The look has a new part, `trail`, in `src/customization.ts`. The look
  menu has a group **Sparkle trail** with four buttons: Pixie dust, Comet tail, Sparkle
  halo and Shimmer steps. Each button shows a small picture of its trail in the sparkle
  colour of the wing colour. A look that was saved with no trail gets Pixie dust.
- **The frame.** Near a world, the points of Pixie dust and of Shimmer steps are
  children of the group of that world. When the fairy goes out of the air of the world,
  the points go to the scene with `Object3D.attach()`, so the points that are alive keep
  their places. Above the air, the orbit of a world still carries her a little; a new
  point keeps that velocity. Comet tail and Sparkle halo are children of the fairy.
- **The reward.** A sparkle ring and a comet tail make the trail stronger for 4 s: more
  points, larger points and a longer life.
- **Jumps.** A teleport removes the points of the trail. A move of Blossom Haven with the
  fairy moves the points with her.
- **The checks.** `scripts/sparkle-rings-smoke.mjs` and `scripts/comet-smoke.mjs` read
  `trailBonus` in place of `trailShown` and `trailSize`. `tests/customization.test.ts`
  checks the four trails and the default.
- **The look menu.** The menu stops the flight, but the trail of the look continues as
  in a cruise. Its points move slowly behind the fairy, and the points near the camera of
  the menu do not fade. So the player sees each trail when the player selects it.
- **Not done.** The cost on a phone is not measured.

## What the study proposed for the game

For a sparkle option:

1. A new module `src/fairy-trail.ts` holds the sparkles and the rules. `model.ts` and
   `trails.ts` of the study are the start of it.
2. `src/main.ts` removes the trail buffer, `trimTrail()` and the three loops that move
   the dots at a teleport and at a new origin (`src/main.ts:519`, `:1208`).
3. On each frame, the game gives the trail the place of the fairy, her velocity in the
   frame of `attachedToWorld`, the boost, the hover and `sparkleLevel()`.
4. The trail changes its parent when `attachedToWorld` changes.
5. `scripts/sparkle-rings-smoke.mjs` and `scripts/comet-smoke.mjs` read `trailShown` and
   `trailSize`. They need the new numbers of the trail.
6. `studies/feature-ideas-study/lab.ts` has a copy of the trail of today. It stays, as
   the look of the game at the time of that study.

For option 01, only step 2 is necessary, and the sparkle ring and the comet tail need a
new reward.

## Limits of the study

- The clips show Earth and Blossom Haven. The study does not show the trail in open
  space or at the change from a world to open space.
- The study does not measure the cost on a phone.
- The Blossom Haven clip flies over a place at a low latitude, not over the cottage.
- The wing-tip streams start at a fixed place in the frame of the body.
- The fog of the game does not change the new trails.
