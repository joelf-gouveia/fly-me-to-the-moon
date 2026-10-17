# Let go to stop: technical study

Field study 28. The request: the fairy stops when the player presses no key, and the Hover
button goes. The study looks at the effect on a phone and on a computer, and at what the change
adds to the game and subtracts from it. The study does not change the game.

The page is `studies/let-go-study.html`. The code is in `studies/let-go-study/`. The clips and
the pictures are in `public/studies/let-go/`. References to the game are to commit `8a426c7`.

## Summary

- Today the fairy always flies. There is no key to fly forward: W and S climb and descend, A and
  D turn. Hover (Q, or the Hover button on a phone) is a mode that stops her at once.
- So "stop when no key is down" needs a new rule for the straight flight. The study compares
  three rules with the game of today (**T**):
  - **A · Any key flies.** An arrow or Boost moves her. With no key she glides to a stop.
  - **B · Hold to fly.** A held Fly button (Space on a computer) moves her, and the arrows steer.
    With Fly up she glides to a stop, and the arrows turn her in place. Boost becomes Fast.
  - **C · Rest after a pause.** She flies on as today. After 3 s with no key she glides to a stop.
- Only B stops her where the child lets go (2.5 m later over the meadow) and keeps the look
  around in place and the straight flight at the normal speed. B does not remove the button: Fly
  takes the place of Hover.
- The cost is hands on the controls. The tour of the clips needs 10.5 s of 14 s in A and B, and
  4.8 s today. On a phone B needs two thumbs to steer in flight. A trip from Earth to Neptune is
  31 to 48 s of a held Fly key.
- The recommendation, if the change comes: B, with a Settings switch for Fly by tap (the flight of
  today), guided trips with no keys, a wait pose, and a Fly button that keeps the press when the
  thumb slides.

## The control models

`studies/let-go-study/model.ts` has the four models. Each one calls the flight code of the game:
`stepFlight()` and `hoverFlight()` of `src/flight.ts`. The proposals add one function,
`glideFlight()`: the fairy keeps her heading, and the speed falls by `GLIDE_RATE` (3.5 in each
second, so 3% of the speed is left after 1 s). Near a world she keeps her angle to the ground and
the ground stops her, as in `stepFlight()`. Below 0.3 m/s the glide ends, and she waits with
`hoverFlight()`.

| Option | She flies when | She stops when | In a wait the arrows |
| --- | --- | --- | --- |
| T · Today | Always, until Hover | Hover is tapped: at once | Turn her in place |
| A · Any key flies | An arrow or Boost is down | No key is down: a glide | Move her again |
| B · Hold to fly | Fly or Fast is down | Fly and Fast are up: a glide | Turn her in place |
| C · Rest after a pause | Always, until 3 s with no key | 3 s with no key: a glide | Move her again |

## The clips

Five clips of the engine of the game, 1280 × 720 at 30 frames in each second. Each clip runs in
the lab of the feature ideas study (`studies/feature-ideas-study/lab.ts`). The fairy flies with
the control model of the clip; there is no rail. The lab has a new optional hook for this,
`setStepper()`: it moves the fairy with a different function in place of `stepFlight()`. With
no stepper the lab works as before.

- **T, A, B and C** fly the same tour over the meadow of Earth, 8 m above the ground: fly
  straight (0 to 3 s), turn left (3 to 5 s), stop to look (5 to 8.5 s), look around to the right
  (8.5 to 11 s), and fly on (11 to 14 s). The intent is the same. Each option needs different
  keys for it (`tourKeys()` in `numbers.ts`).
- **S** flies from Earth to the Moon with B: hold Fly, let go and wait, one turn in place (Earth
  goes by), then Fly again.

A card in each clip shows the buttons of a phone and the keys of a computer that are down in each
frame, what the fairy does (flying, gliding to a stop, waiting in the air), and the seconds with
the hands on the controls. In the live view of the page, **Free flight** uses the same model with
the real keys: Space is Fly in B, and Q is Hover in T.

## The numbers

The page computes each table at load with the code of the study. The tests in
`studies/let-go-study/model.test.ts` keep the numbers of this text. The runs use Earth at the size
of the game, with the terrain of seed 1234, at 30 frames in each second.

### The tour

| Option | Hands on | Two thumbs | Presses | The stop | The look | The tour |
| --- | --- | --- | --- | --- | --- | --- |
| T · Today | 4.8 s | 0 s | 4 | At once, 0 m | 110° in place | 82 m |
| A · Any key flies | 10.5 s | 0 s | 4 | 2.5 m in 1.0 s | 110°, and 19 m of flight | 186 m |
| B · Hold to fly | 10.5 s | 2.0 s | 4 | 2.5 m in 1.0 s | 110° in place | 85 m |
| C · Rest after a pause | 4.5 s | 0 s | 2 | No stop before the look | 110°, and 20 m of flight | 147 m |

A presses Boost for the straight parts: no other key goes straight. So its tour is more than two
times longer. C rests at 8 s, 3 s after the child let go. The look starts at 8.5 s and starts her
again.

### The stop, and 10 s with no key

The fairy flies 6 s level at the height of the row, then all keys go up (T taps Hover).

| Where | Speed | T: stop | A and B: stop | C: stop | T: 10 s | A and B: 10 s | C: 10 s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Over the meadow, 8 m up | 11 m/s | At once | 2.9 m · 1.0 s | 36 m · 4.0 s | 113 m | 2.9 m | 36 m |
| Below the clouds, 30 m up | 15 m/s | At once | 3.9 m · 1.1 s | 48 m · 4.1 s | 166 m | 3.9 m | 48 m |
| In open space, 1.5 km up | 967 m/s | At once | 261 m · 2.3 s | 3.2 km · 5.3 s | 9.7 km | 261 m | 3.2 km |
| In open space with Boost | 2,225 m/s | At once | 599 m · 2.6 s | 3.2 km · 5.3 s | 9.7 km | 599 m | 3.2 km |

With C and Boost, the speed falls to 967 m/s at once when Boost goes up (`stepFlight()` slows at
once). So the C rows of open space are the same.

### Up to open space

From the meadow, 8 m up, to 1,000 m above the ground, where the flight reaches the speed of open
space. Each option climbs with W (with Fly in B) to 10 m above the steering shell of Earth
(161 m). Above the shell a held W turns her over and back to the ground
(docs/planet-transition-study.md), so the child must change keys there.

| Option | Keys | Time | Hands on | Presses |
| --- | --- | --- | --- | --- |
| T · Today | Hold W, then let go | 11.9 s | 7.4 s | 1 |
| A · Any key flies | Hold W, then hold Boost | 9.9 s | 9.9 s | 2 |
| B · Hold to fly | Hold Fly and W, then hold Fly | 11.9 s | 11.9 s | 2 |
| C · Rest after a pause | Hold W, then tap W before each rest | 11.9 s | 7.6 s | 2 |

### Trips in open space

A trip starts 10 m above the steering shell of Earth and ends at the steering shell of the
target, on a straight line, with the flight of the game. The worlds stand still. The first time
is the nearest place of the two orbits. The second time adds the extra way of the farthest place
at the speed of open space.

| Trip | Ground to ground | No keys (T), or Fly held (B) | Boost held (A) | Taps (C) |
| --- | --- | --- | --- | --- |
| Earth to the Moon | 613 m | 5.3 s | 2.7 s | 1 |
| Earth to Mars | 2.5 to 19.0 km | 9.4 to 26.4 s | 4.7 to 12.1 s | 3 to 8 |
| Earth to Jupiter | 6.6 to 23.1 km | 11.6 to 28.6 s | 5.8 to 13.2 s | 3 to 9 |
| Earth to Neptune | 25.1 to 41.6 km | 31.4 to 48.4 s | 14.4 to 21.8 s | 10 to 16 |

A guided trip (a world on the Worlds map, or "Follow the flower") needs no key with each option,
if the plan keeps that rule.

## Findings

1. **No key flies forward.** W and S climb and descend, A and D turn (`updateFairy()` in
   `src/main.ts`). A stop on release needs a key for the straight flight.
2. **The stop is a mode.** One button, with a label that changes from Hover to Fly
   (`toggleHover()`, `src/main.ts:613`). On a computer the key is Q.
3. **Let go, and she flies on.** In 10 s with no key: 113 m over the meadow, 9.7 km in open space.
4. **Hover stops her in one frame.** `hoverFlight()` sets the speed to 0, also at 967 m/s.
5. **A hover keeps the flight pose.** The hover branch of `updateFairy()` plays the cruise pose
   (`fairyAnimation.update(delta, false)`, `src/main.ts:841`), with no motion.
6. **A hover changes the hop of the home.** `moveHome()` carries the fairy only when
   `!hoverHeld` (`src/main.ts:558`). A fairy that hovers near Blossom Haven stays behind.
7. **Guided trips need no keys.** An arrow ends a trip (`src/main.ts:847`).
8. **A thumb that slides off lets go.** The `pointermove` handler of the touch buttons
   (`src/main.ts:651`) ends the press when the finger leaves the button.

Also: Space pauses (`src/main.ts:634`), eight browser checks turn the hover on and off (25 lines
in `scripts/`), and the test hooks `approach()` and `faceMoon()` of `__fairyTest` use it.

## What the change adds

- A stop with no mode: let go, and she waits (A, B, and C after 3 s).
- She is where the child left her: 2.9 m in 10 s over the meadow in A and B, against 113 m today.
- A stop near a thing to see: an animal, a sparkle ring, the friend, a view for a postcard.
- A soft stop in open space: a glide of 2.3 s from 967 m/s, against one frame today.
- One button less on a phone and one key less on a computer (A and C).
- The usual rule of a game controller: stick to move, let go to stop (idea F7).
- Simpler browser checks: a check lets go of the keys.

## What the change subtracts

- The drift: the flight with no hands over the meadow and among the planets (A and B). The welcome
  card says "Drift beyond the blue".
- Free hands: 10.5 s of the 14 s tour with hands on the controls, against 4.8 s today (A and B).
- One thumb at a time on a phone: B needs two thumbs to steer in flight.
- The look around in place (A and C).
- Straight flight at the normal speed (A).
- Long trips with no hands: 31 to 48 s of a held key to Neptune in B.
- A way to play with no held button. The
  [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/avoid-provide-alternatives-to-requiring-buttons-to-be-held-down/)
  and the [Xbox Accessibility Guidelines 107](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/107)
  ask for an alternative to held buttons, such as a choice of hold or toggle. Today the cruise is
  that alternative.

## On a phone

- Today the tour needs a finger for 4.8 s of 14 s, and never two.
- With B the right thumb holds Fly for each second of flight, and the left thumb steers. A child
  who holds the phone in one hand and taps with the other cannot steer in flight.
- With A one thumb is enough, but the straight parts are at Boost speed.
- The Fly button must keep the press until the thumb lifts, also when the thumb slides off.
- The Fly button is the button that the thumb holds most. Make it at least 92 × 56 px, the size of
  Boost and Hover today.

## On a computer

- B needs a Fly key. Space is the usual key to go, but Space pauses today. Pause can move to P and
  stay on the pause button.
- Some keyboards do not see a third or fourth key that is held at the same time. The study did not
  measure this. Test Space, Shift and two arrows on a cheap keyboard.
- When a panel opens, the flight stops and the game clears the keys (`clearInput()`). When the
  panel closes, today she flies on; with A and B she waits until the next press.

## The plan for B

1. **The glide and the Fly state (S).** Add `glideFlight()` to `src/flight.ts`. In
   `updateFairy()`: Fly or Fast held, `stepFlight()`; else the glide, then `hoverFlight()`.
2. **The Fly key and the Fly button (S).** Space flies. Pause moves to P and stays on the pause
   button. The Hover button becomes a held Fly button. Boost becomes Fast: it flies fast with no
   Fly.
3. **Remove the hover (S).** Remove `hoverHeld`, `toggleHover()` and Q. A waiting fairy takes its
   place in `moveHome()`, the trail and the test hooks.
4. **The guided trips (S).** They fly with no keys. Fly and Fast do not end them; an arrow ends
   them.
5. **The thumb on the Fly button (S).** Keep the press until the finger lifts.
6. **A wait pose (M).** An upright pose with slow wings in `src/fairy.ts`, with a soft change.
7. **Fly by hold or by tap (S).** A Settings switch. Tap mode is the flight of today.
8. **The texts and the checks (M).** The welcome hint, the touch help, How to play, the README,
   eight browser checks and `scripts/mobile-play-smoke.mjs`.

Sizes: S is less than one day, M is one to three days.

## Decisions

The page has ten decisions. The first choice of each is the recommendation.

1. The control model: B, A, C, or keep today.
2. The Fly key on a computer: Space (pause moves to P), F, or E.
3. Fast flight on a phone: two held buttons Fly and Fast, one Fly button that goes faster after
   2 s, or no fast flight.
4. The stop: a glide of about 1 s, a stop at once, or a glide of about 3 s.
5. Guided trips: no keys, or the Fly key.
6. A way to play with no held button: a Settings switch, or none.
7. The pose in a wait: a new wait pose, or the flight pose.
8. A thumb that slides off Fly: keep the press, or let go.
9. A hop of the home while she waits near it: the home takes her, or she stays behind.
10. The start of a flight: she waits for the first press, or she glides a short way first.

## How to run it again

The capture needs a dev server with no hot reload: a different session can change files in the
same working tree, and a reload stops a clip. Use a Vite config with `server.hmr: false` on a
different port (5197 is the default of the script), then:

```
node studies/let-go-study/let-go-study-capture.mjs "path/to/chrome.exe"
node studies/let-go-study/let-go-study-capture.mjs "path/to/chrome.exe" --moments
```

The first command records the five clips; the second makes the three moment pictures of each
clip. Run `npx vitest run studies/let-go-study` for the tests of the numbers.

## When you come back

- The tests in `model.test.ts` fail if the flight code of the game changes the numbers of this
  text. Run them first, and record the clips again if they fail.
- Start the work from "The plan for B", or from the option that the decisions choose.
