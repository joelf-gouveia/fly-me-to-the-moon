# A fairy in one piece: fairy body study

Status: C is in the game since 27 September 2026. Open `/studies/fairy-body-study.html`
on the Vite server. The study controls do not change the game or saved game data.
In the study, *Today* is the body of the game before this change.
[Game integration](#game-integration) describes what the game does.

## The request

Study how to improve the fairy model. Today she looks like a set of shapes that do
not connect. Make her more like a fairy, more connected, and better articulated.

## The body of the game before the change

`createFairyRig` in `src/fairy.ts` builds the body from 26 separate meshes (the
hair cap is a 27th):

| Part | Shape |
| --- | --- |
| Torso, neck, head, hands, feet | Scaled spheres (ellipsoids) |
| Upper arms, forearms, thighs, shins | Cylinders with flat ends, `CylinderGeometry(0.82 r, r)` |
| Skirt | An open cylinder (`tunic`) and 7 ellipsoid petals |
| Ears | Cones with 5 sides |
| Back | A thin gold capsule (`back-seam`) |

`pose()` does not turn bones. It moves the end points of each limb, then it
stretches a cylinder between the two points. The hands do not turn: they stay
level in the body frame. The feet only tilt forward and back.

In flight, the camera is 2.8 m above and 8 m behind the fairy. With the menu open,
it comes to 3.4 m behind. Thus the player sees her back, her shoulders, her legs
and the roots of her wings most of the time. The face is rarely seen.

## Five causes of the loose look

1. **The arms start outside the body.** Each shoulder point is at x = ±0.23.
   At that height (y = 0.71) the torso is only 0.16 wide. The flat end of each
   arm stands in the air: 43% and 52% of a ball at the shoulder is inside the body.
2. **Flat ends open at a bend.** Two cut cylinders meet at one point. When the
   joint bends, a wedge opens on the outer side. The right elbow is 79% filled.
3. **The bones stretch.** The pose moves the joints, not the bones. The forearm
   is between 0.28 and 0.52 long through cruise and boost: a change of 60% of its
   mean length. The left thigh is between 0.24 and 0.42.
4. **The wings float behind her.** The root of each upper wing is at
   (±0.19, 0.61, 0.17). The back of the torso is 0.10 nearer the middle.
5. **She looks at the ground, with still arms.** The head leans with the body. The
   face is 32° below the flight line in cruise and 66° in boost. In cruise the
   arm targets do not change with time, so the hands do not move on the body.

## The three options

Every option keeps the head, the hair cap, the ears, the nine hair styles, the three
wing shapes, the colors of the customization and the Sky Dancer pose. The study
builds each option on a rig from `createFairyRig`, so the wings, the hair and
`applyLook` are the code of the game.

| Option | What changes |
| --- | --- |
| **A — Joined joints** | Every shape of today stays. A ball fills each shoulder, elbow, wrist, knee and ankle. Puff sleeves cover the shoulders. The hands and feet turn with the limb. A petal bow joins the wing roots to the back. |
| **B — One smooth body** | A new body in the same pose. The torso, the waist and the hips are one lathe surface, with a gold sash. Each limb is a tapered capsule with a fixed length. The capsules share the radius at each joint, so the joint has no seam at any angle. A petal skirt starts at the waist. Mitten hands, slippers, a face, and the bow of A. |
| **C — Storybook fairy** | B with fairy proportions and more joints. A smaller waist, legs 12% longer, slimmer and shorter arms that float, pointed petals that move with the wingbeat, pointed petal sleeves, soft wrists, pointed toes, curled slippers with a gold pom, and a head that looks where she flies. |

### Fixed bones: the two-bone solve

B and C keep each bone at one length. For each limb, the target is the hand or
foot of today, and the pole is the elbow or knee of today. The solve puts the
middle joint on the side of the pole. Thus the pose design of the Sky Dancer study
stays, and only the stretch goes. The bone lengths are the mean lengths of today,
made a little longer when the longest reach needs it. A test checks that the hands
of B stay within 0.02 of the hands of today. C has its own arm pose (see below).

### The arms of C

The first version of C used the arm targets of today. The arms looked stiff, for
three reasons:

- In cruise, the targets do not change with time. The hands were locked in place on the body.
- The bones reached the hips, so the arms were long. With a bent elbow, the upper
  arm went out almost level, and the elbow made a sharp corner.
- In boost, today's targets point forward in the body frame. At 66° of lean, that
  direction points to the ground in front of her.

The arms of C now have their own pose:

| Part | Cruise | Boost |
| --- | --- | --- |
| Bones | Upper arm 0.34, forearm 0.30 (today: about 0.46 and 0.40) | The same |
| Hand | Low and a little out: (±0.26, −0.44, −0.06) from the shoulder | Ahead along the flight line, diagonally out; the arm is almost straight |
| Elbow | Points down, out and back | Points out |
| Motion | A slow wave of two frequencies (1.55 and 2.6 rad/s). The left and right arms are out of step | The same wave, 35% as large |

The hand follows the elbow 0.45 s later, and it trails the body bob. The wrist
bends 0.8 s after the elbow. Thus the arm bends and flows from the shoulder to the
fingers. The two-bone solve keeps the bones at one length, so every joint stays closed.
A test checks that each hand of C reaches ahead in boost.

### The head of C

The head, the hair cap, the ears, the face and the hair turn about the top of the
neck (y = 0.9). The head lifts by half the lean, to a maximum of 30°. Thus the face
is 16° below the flight line in cruise and 36° in boost. The head also turns
against 80% of the body sway, so it stays level.

A strand of long hair hangs from the head. When the head lifts, the root of each
strand turns back by the same angle. Thus the long hair keeps the line of the body,
as in the hair study. A test checks that the ponytail of C points within 8° of
the ponytail of B.

## Measurements

The page measures each body when it loads. `studies/fairy-body-study/bodies.test.ts` runs
the same measurements.

- **Filled**: at each joint, the study puts 160 fixed points in a ball with 0.85
  times the limb radius. *Filled* is the part of the points inside the body, at
  the worst step of 8 cruise steps and 8 boost steps. A joint with less than 90%
  is open. The hips are under the skirt in every body, so the study does not
  measure them.
- **Bone stretch**: the largest change of a bone length through the same steps,
  as a part of its mean length.
- **Wing roots**: the distance from the root of each upper Petal wing to the body.
- **Face below the flight line**: the angle of the face in cruise and in boost.
- **Hand motion**: the largest distance between two positions of the right hand
  in the body frame, through 4 s of cruise.
- **Joints that turn**: the joints that the pose moves or turns.

| Body | Open joints | Bone stretch | Wing roots | Face in cruise | Face in boost | Hand motion | Joints that turn | Meshes | Triangles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Today | **3 of 12** | **60%** | **0.10 away** | 32° | 66° | **Still** | 4 | 26 | 5,294 |
| A — Joined joints | None | **60%** | Attached | 32° | 66° | **Still** | 6 | 41 | 10,574 |
| B — One smooth body | None | 0% | Attached | 32° | 66° | **Still** | 6 | 47 | 16,188 |
| C — Storybook fairy | None | 0% | Attached | 16° | 36° | 0.20 | 7 | 55 | 18,332 |

| Joint · filled | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Neck base | 100% | 100% | 100% | 100% |
| Neck top | 100% | 100% | 100% | 100% |
| Shoulders | **43%** | 100% | 100% | 100% |
| Elbows | **79%** | 100% | 100% | 100% |
| Wrists | 100% | 100% | 100% | 100% |
| Knees | 91% | 100% | 100% | 100% |
| Ankles | 100% | 100% | 100% | 100% |

## Findings

1. **A closes the joints but keeps the stretch.** The balls hide every gap, and
   the puff sleeves read well from behind. The limbs still grow and shrink, and
   the balls give a doll look at the knees.
2. **B fixes the cause, not only the look.** Fixed bones and shared radii give a
   body with no seams in every pose. The waist and the petal skirt read at flight
   distance. The pose of the Sky Dancer study does not change.
3. **C makes her a fairy.** The lifted head, the floating arms, the pointed toes
   and the petals that move with the wings make her look light. From the side, the lifted head is the
   largest change. From behind, the waist, the bow and the pointed skirt are the
   largest change.
4. **The bow joins the wings.** It closes the 0.10 gap and gives the rear camera
   a clear centre between the wings. In B and C it replaces the gold back seam.
5. **The face matters less than the back.** The game camera is behind her. The
   face shows in the Front view, in turns, and in the line-up only.
6. **Hair and ears stay valid.** The head, the hair cap and the ears do not move
   in A and B. In C they turn together, so every hair style stays on the cap.
7. **The cost is small.** There is one fairy in the game. C draws 29 more meshes
   and about 13,000 more triangles than today. Parts with one material can merge
   into one mesh, as the fairytale creatures do.

## Decision

The game uses **C — Storybook fairy**. The study first recommended two steps (the
body of B, then the parts of C). The game took C in one change, because the
body of B and the parts of C share one builder. The customization and the saved
looks do not change.

## What to review

- **Choose a body** shows the body on a fairy with the Sky Dancer animation of the game.
- **Menu view** and **Flight view** use the two cameras of the game. **¾**, **Side**
  and **Front** turn around the fairy. Drag to turn; scroll to zoom.
- **Cruise / Boost** uses the transition of the game (0.25 s into boost, 0.4 s back).
- **Show the joints** draws the bones and a dot at each joint: green when the
  joint is closed, red when it is open.
- **Beside Today** shows Today on the left and the chosen body on the right.
- **Backdrop** (meadow, sky, night) and **Silhouette** change the close-up and the line-up.
- The hair style, the hair color, the dress, the skin and the wing shape use the
  options of the game.
- **The line-up** shows all four bodies from the rear, the side and the front.
  *Flight distance* gives each fairy the same size in pixels as in a 900 px tall
  game window.
- **The tables** show the measurements.
- **Save study settings** downloads the pick, the preview settings and the
  measurements as JSON.

## Game integration

- `src/fairy-body.ts` builds the body. `buildBody` takes a set of options:
  `storybookBody` is C, the body of the game. The study builds B from the same
  builder with its own options (`smoothBody` in `studies/fairy-body-study/bodies.ts`).
  The module also has the two-bone solve (`solveLimb`), the capsule geometry
  (`taperedCapsule`) and the pose targets of the flight directions (`poseTargets`).
- `createFairyRig` in `src/fairy.ts` builds the head, the hair cap, the ears and
  the hair in a head frame (`fairy-head`) inside a head pivot (`fairy-head-pivot`)
  at the top of the neck. The head frame uses body coordinates, so the hair
  styles of `src/fairy-hair.ts` do not change.
- `pose()` computes the pose targets, then the body places the limbs, the hands,
  the feet, the head and the petals. The flight transform does not change.
- `animateHair` turns the root of each long strand back by the head lift, so the
  long hair keeps the line of the body. `pose()` calls it with the gentle motion.
- The rig returns `joints` (the joints of the body), `targets` (the pose targets)
  and `materials`. `createFairyRig({ body: false })` leaves out the body below the
  head. The study uses it for Today, A and B.
- The body of the game before the change is in `studies/fairy-body-study/classic-body.ts`.
  The study shows it as Today and builds A on it.
- The body has 55 meshes and about 18,000 triangles, against 26 meshes and 5,300
  triangles before. There is one fairy in the game.

### Effects on other parts

- **The hair study** finds the cap, the ears and the head skin by name, in the head
  frame. The head of C lifts 16° in cruise, so the measurements changed a little
  (see [the hair study](hair-style-study.md#game-integration)). All six newer
  styles still pass every rule. **Bob** now touches the Flutter wings too, not only
  the Luna wings. Bob keeps its first shape; the test records the new contact.
- **The flight pose study** uses the game rig. Its three directions still change
  the lean, the legs and the wingbeat. The arms use the floating arm pose of C in
  every direction.
- **The other studies** that show the fairy (asteroid belt, candy planet, cotton
  candy, fairytale creatures, Moon, planet look) now show the Storybook fairy.

## Files

| File | Purpose |
| --- | --- |
| `src/fairy-body.ts` | The body builder, the options of C, the two-bone solve and the pose targets |
| `src/fairy.ts` | The rig: head frame and pivot, the body, the strand correction, `joints`, `targets` and `materials` |
| `tests/fairy.test.ts` | The parts of the body, the head lift, fixed bones, and the rig without a body |
| `studies/fairy-body-study/classic-body.ts` | The body of the game before the change, for Today and A |
| `studies/fairy-body-study.html` | Page entry |
| `studies/fairy-body-study/bodies.ts` | The four bodies, the two-bone solve, and the measurements |
| `studies/fairy-body-study/bodies.test.ts` | Open joints of today, closed joints of A, B and C, fixed bones, the hand targets of B, the arm motion and boost reach of C, the head lift, the hair and look, and the strand correction |
| `studies/fairy-body-study/main.ts` | Close-up, joints view, Beside Today, line-up, tables and export |
| `studies/fairy-body-study/style.css` | Page styles |
| `studies/fairy-body-study/body-study-smoke.mjs` | Browser check of the study and screenshots |

## Verification

- `npm test` runs the rig tests and the study tests with the other tests.
- `node scripts/sky-dancer-smoke.mjs "path/to/chrome.exe"` and
  `node scripts/browser-smoke.mjs "path/to/chrome.exe" --customization` check the
  flight and the customization in the game.
- `npm run build` builds the study page.
- With the dev server on port 5174, run
  `node studies/fairy-body-study/body-study-smoke.mjs "path/to/chrome.exe"`. It checks the
  measurements, the camera views, the joints view, Beside Today, boost, night, the
  line-up, the export, the pause, and the layout at 390 px and 320 px. The
  screenshots go to `artifacts.local/body-study/`. Set `FAIRY_TEST_URL` for another
  server origin.
