# Hair that flies with her: fairy hair study

Status: in the game since 26 September 2026. Open `/studies/hair-style-study.html` on the
Vite server. The study controls do not change the game or saved game data.
[Game integration](#game-integration) describes what the game does.

## The request

Study more hair styles for the fairy, and show how they would look.

## The game before the change

- `hairOptions` in `src/customization.ts` listed three styles: Bun, Bob and Tails.
- `createFairyRig` in `src/fairy.ts` built each style once, as a group of scaled
  spheres on top of a shared hair cap. A change of style changes only the
  visibility of the groups. A change of color changes the shared `hair` material.
- The *Make her yours* panel showed the styles in one row of three, with a
  CSS icon for each style (`.hair-preview` in `src/style.css`).
- In flight, the camera is 2.8 m above and 8 m behind the fairy, with a 58° view
  (`src/main.ts`). With the menu open on a wide screen, it comes to 3.4 m behind.
  Thus the player sees the top and the back of the head most of the time.

## The eight candidates

The study adds eight styles to the same rig. It uses the same method as the game:
scaled spheres, the rig hair material, and the gold accent material.

| Style | Family | Look | Motion |
| --- | --- | --- | --- |
| Pixie | Short | Small tufts at the crown and the nape, a swept fringe at the front | Still |
| Space buns | Up | Two buns high on the head, each with a gold band | Still |
| Cloud curls | Short | A full cloud of round curls; the ears stay out of the cloud | Still |
| Ponytail | Up | A gold band high on the back of the head, and a tail behind the nape | Swings |
| Crown braid | Up | A braid around the head, higher at the front, with three gold pearls | Still |
| Long braid | Down | One braid down the middle of the back, with a gold tie | Swings |
| Twin braids | Down | Two braids from the nape to the shoulder blades | Swings |
| Long waves | Down | Three wavy columns that narrow between the wing roots | Swings |

Cloud curls gives the set a textured-hair style. The ten skin colors of the game
include deep tones, and the three styles of today have no curls.

## Hair motion

The styles that swing are chains of segments. Each segment is a child of the one
before, so one swing bends the whole strand.

- **The direction in flight.** In the body frame of the fairy, gravity plus the
  air stream points along the body to the feet, at cruise (32°) and in boost (66°).
  Thus a strand straightens toward that line as boost grows. An early version bent
  the strands further back in boost. In the side view, the ponytail then pointed up.
- **The swing.** The swing follows the body bob of the Sky Dancer pose (2.3 rad/s).
  The swing is shared between the segments of a strand. Without this rule, the
  8 segments of the long braid added up to a swing of about 1 rad at the tip.
- **Levels.** *Still*, *Gentle* and *Lively* (0, 1 and 1.8 times the base swing).

## Measurements

The page measures each style on the real rig when it loads. `src/hair-study/styles.test.ts`
runs the same measurements.

- **Seen from behind**: the hair area that the flight camera sees (19° above, the
  cruise pose). The skin of the head, the neck and the hands hides hair behind it.
  The bare cap is 100%.
- **Outside the cap**: the part of that area that is not over the cap.
- **Wings**: the study samples each wing surface (triangle corners, centers and edge
  midpoints) through a full wingbeat, in cruise and in boost, with *Lively* motion.
  A sample inside a hair part is a contact. The check runs for all three wing shapes.
- **Ears**: the outer half of each pointed ear, from the middle to the tip, must stay
  outside every hair part.
- **Attached**: every hair part must join the cap, directly or through other parts.

| Style | In game | Seen from behind | Outside the cap | Wings | Ears | Meshes |
| --- | --- | --- | --- | --- | --- | --- |
| Bun | Yes | 128% | +28% | Clear | Visible | 2 |
| Bob | Yes | 169% | +64% | **Touches Luna** | **Inner half covered** | 2 |
| Tails | Yes | 183% | +82% | **Touches all three** | Visible | 4 |
| Pixie | No | 115% | +15% | Clear | Visible | 7 |
| Space buns | No | 141% | +41% | Clear | Visible | 4 |
| Cloud curls | No | 159% | +59% | Clear | Visible | 15 |
| Ponytail | No | 110% | +4% | Clear | Visible | 7 |
| Crown braid | No | 108% | +8% | Clear | Visible | 19 |
| Long braid | No | 136% | +30% | Clear | Visible | 8 |
| Twin braids | No | 141% | +34% | Clear | Visible | 14 |
| Long waves | No | 166% | +51% | Clear | Visible | 15 |

## Findings

1. **Tails and Bob touch the wings.** The tail tips of Tails go into all three
   wing shapes during the wingbeat. The sides of Bob go into the Luna wings, and they
   cover the inner half of each ear. The wings are transparent, so the contact is not
   strong. The two styles keep their first shape (see [Bob and Tails](#bob-and-tails)).
2. **The wing line.** Each wing root is at x = ±0.19 in the body frame. A wing only
   goes out from its root, so hair below the ears that stays inside x = ±0.19 does
   not touch a wing. The first twin braids hung from behind the ears and touched
   all three wing shapes. The final twin braids start at the nape and stay inside the line.
3. **The rear camera hides some styles.** Pixie (+15%) and Crown braid (+8%) add the
   least outside the cap. At flight distance, they are near to the bare cap.
   Crown braid also has the most meshes (19).
4. **Motion makes the ponytail clear.** From behind, the ponytail covers the cap
   (+4% outside the cap). Its swing, and its straight line in boost, make it clear
   in flight and in turns.
5. **The long styles read at flight distance.** Long braid, Twin braids and Long waves
   put a new shape of hair color on the back of the dress.
6. **Dark hair at night.** On the night backdrop, Midnight hair has a weak outline.
   This is true for all styles. It is not a reason to choose one style.
7. **A beaded look.** The ponytail and the long waves are chains of spheres, so they
   look a little like braids. A production version can use a smooth tube along
   the same chain.

## Decisions

- The game adds six styles: **Space buns, Cloud curls, Ponytail, Long braid, Twin
  braids and Long waves**. The menu has 9 hair styles in 3 full rows. The panel is
  150 px taller (each button is 68 px tall with a 7 px gap), and it scrolls when it
  is taller than the screen.
- Pixie and Crown braid stay in the study. They change the rear view the least.
- The game uses the *Gentle* hair motion.
- Bob and Tails keep their first shape and their contact with the wings.

## What to review

- **Choose a style** shows the style on a fairy with the Sky Dancer animation of the game.
- **Menu view** and **Flight view** use the two cameras of the game. **¾**, **Side** and
  **Front** turn around the head. Drag to turn; scroll to zoom.
- **Cruise / Boost** uses the transition of the game (0.25 s into boost, 0.4 s back).
- **Hair motion**, **Backdrop** (meadow, sky, night) and **Silhouette** change the close-up and the line-up.
- The hair color, skin and wing shape use the options of the game.
- **The line-up** shows all eleven styles. *Flight distance* gives each fairy the same
  size in pixels as in a 900 px tall game window. *Side* shows the strands in profile.
- **The table** shows the measurements. Its check boxes make the shortlist.
- **How the menu would look** shows the hair group of the panel with the shortlist.
- **Save study settings** downloads the shortlist, the preview settings and the
  measurements as JSON.

## Cost

The rig builds all styles once, and the renderer draws only the visible group. The
largest recommended style adds 15 meshes (Cloud curls and Long waves). There is one
fairy in the game, so the draw cost is small. The swing costs one rotation update for
each segment in each frame: at most 15 segments (Long waves).

## Game integration

- `hairOptions` (`src/customization.ts`) lists the nine styles. The new ids are
  `spaceBuns`, `cloudCurls`, `ponytail`, `braid`, `twinBraids` and `longWaves`.
  `parseFairyLook` keeps valid saved styles and uses the default for other values,
  so saved looks stay valid. A look saved with `pixie` loads as the default look.
- `buildHairStyles` (`src/fairy-hair.ts`) builds all nine styles. `createFairyRig`
  calls it with the shared `hair` and `gold` materials.
- `pose()` in `src/fairy.ts` swings the long styles with the gentle amount, so every
  view of the rig gets the same motion. `animateHair(time, boost, amount)` on the rig
  sets another amount; the study uses it for *Still* and *Lively*.
- The study builds Pixie and Crown braid with `createHairKit` from the same module.
  Thus the study and the game have one geometry.
- The menu icons are `.hair-preview--<id>` in `src/style.css`. Each icon has two
  drawing elements (`<i></i><i></i>` in `src/main.ts`).

### On the Storybook body

Since 27 September 2026 the game uses the Storybook body of the
[fairy body study](fairy-body-study.md). The head, the hair cap, the ears and the
hair are in a head frame that lifts 16° in cruise and 30° in boost.
`animateHair` turns the root of each long strand back by the same angle, so the
long hair keeps the line of the body. The measurements find the cap, the ears and
the head skin by name in the head frame. The table above is the measurement on the
body from before; this is the measurement on the Storybook body:

| Style | Seen from behind | Outside the cap | Wings | Ears |
| --- | --- | --- | --- | --- |
| Bun | 124% | +24% | Clear | Visible |
| Bob | 163% | +61% | **Touches Luna and Flutter** | **Inner half covered** |
| Tails | 178% | +78% | **Touches all three** | Visible |
| Pixie | 108% | +5% | Clear | Visible |
| Space buns | 138% | +38% | Clear | Visible |
| Cloud curls | 156% | +56% | Clear | Visible |
| Ponytail | 110% | +7% | Clear | Visible |
| Crown braid | 111% | +11% | Clear | Visible |
| Long braid | 134% | +31% | Clear | Visible |
| Twin braids | 138% | +35% | Clear | Visible |
| Long waves | 164% | +57% | Clear | Visible |

All six newer styles still pass every rule. When the head lifts, the sides of Bob
move back to the wing roots, so Bob now also touches the Flutter wings. Bob keeps
its first shape, and `src/hair-study/styles.test.ts` records the new contact.

### Bob and Tails

A first version of the integration moved Bob and Tails forward of the wings. A
position search checked only the wings and the ear tips, and it broke both styles:

- The tails did not join the cap. They hung from the ears, with the gold ties on the ears.
- The sides of Bob covered almost all of each ear.

The study now checks that every part joins the cap, and it checks the outer half of
each ear. A new search with all checks found positions clear of the wings, but they
kept only about 60% of the shape of Tails and 65% of Bob outside the cap. Tails then
hung behind the head. Thus both styles are back in their first shape.
`src/hair-study/styles.test.ts` records their known contact, so a change to them shows.

## Files

| File | Purpose |
| --- | --- |
| `src/fairy-hair.ts` | The hair styles of the game, the parts, and the swing |
| `src/fairy.ts` | Builds the hair with the rig and swings it in `pose()` |
| `src/fairy.test.ts` | Nine styles, one visible at a time, and the swing |
| `studies/hair-style-study.html` | Page entry |
| `src/hair-study/styles.ts` | Pixie, Crown braid, the style notes, and the measurements |
| `src/hair-study/styles.test.ts` | Order, visibility, colors, boost straightening, and the attachment, ear, wing and mesh checks for all eleven styles |
| `src/hair-study/main.ts` | Close-up, line-up, table, menu preview, shortlist and export |
| `src/hair-study/style.css` | Page styles and the style icons |
| `scripts/hair-study-smoke.mjs` | Browser check of the study and screenshots |

## Verification

- `npm test` runs the study tests with the other tests. The attachment, ear and
  wing checks cover all nine game styles; Bob and Tails keep their recorded contact.
- `node scripts/browser-smoke.mjs "path/to/chrome.exe" --customization` and
  `node scripts/sky-dancer-smoke.mjs "path/to/chrome.exe"` check the menu and the
  flight in the game.
- `npm run build` builds the study page.
- With the dev server on port 5174, run
  `node scripts/hair-study-smoke.mjs "path/to/chrome.exe"`. It checks the
  measurements, the wing and ear rules, the camera views, boost, night, the
  line-up, the shortlist, the menu preview, the export, the pause, and the layout
  at 390 px and 320 px. The screenshots go to `artifacts.local/hair-study/`.
  Set `FAIRY_TEST_URL` for another server origin.
