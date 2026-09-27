# Once upon a meadow: fairytale creature study

Status: in the game since 26 September 2026. Open `/studies/fairytale-creature-study.html`
on the Vite server. The study controls do not change the game or saved game data.
[Game integration](#game-integration) describes what the game does.

## The request

Blossom Haven is a fairytale home. Its residents today are ordinary animals:
rabbits, sheep, ducks and cows (`src/creatures/`), and five ribbon butterflies
(`src/candy.ts`). The study replaces every one of these creatures with a cute
fairytale creature. Earth keeps its animals.

## The replacements

Each fairytale creature takes one existing slot. The slot keeps its habitat,
footprint, speed and population count. Thus the habitat checks, the obstacle
checks and the route planner of the game do not change.

| Today | Fairytale | Habitat | Footprint | Speed | Behavior |
| --- | --- | --- | --- | --- | --- |
| Cow | Unicorn | Land | 1.4 m | 0.38 m/s | Stroll → graze → turn back |
| Sheep | Dragonling | Land | 0.95 m | 0.52 m/s | Waddle → rest → puff |
| Rabbit | Kitsune kit | Land | 0.7 m | 0.85 m/s | Hop → pause → turn back |
| Duck | Frog Prince | Water | 0.9 m | 0.65 m/s | Drift → rest → hop |
| Ribbon butterfly | Pegasus foal | Air | 0.9 m | Hovers | Hover → bob → circle |

The mapping is in `src/creatures/fairytale.ts` (`replacements`).

## The five creatures

| Creature | Look | Signature detail | Magic |
| --- | --- | --- | --- |
| Unicorn | Round cream pony, large head, twisted golden horn | Rainbow crest and tail | The horn glows; small gold sparkles rise from it |
| Dragonling | Mint baby dragon, cream belly, small pink wings, soft horns | Back spikes and a heart tail tip | Pink candy-floss puffs while it rests |
| Kitsune kit | Apricot fox cub, tall ears, fluffy cheeks | Three wish tails (one tail when off) | Soft glow on the tail tips; two fox-fire lights |
| Frog Prince | Chubby lime frog on a lily pad | Golden crown and a pink lotus | Wishing bubbles rise from the pad |
| Pegasus foal | Small winged pony, periwinkle mane, lilac wings | Gold stars in the mane and on the forehead | A sparkle trail behind it |

Why these five:

- **Unicorn.** The request names it. It is the largest creature, so it takes the largest slot.
- **Dragonling.** A baby dragon is a common fairytale creature. A round body and small herds fit the sheep slot.
- **Kitsune kit.** The fox with many tails comes from Japanese folk tales. It hops, so it fits the rabbit slot.
- **Frog Prince.** The frog from the Grimm tale lives on water. The duck slot is the only water slot.
- **Pegasus foal.** The winged horse is the only flying creature in the set. It takes the place of the butterflies.

## Design rules

1. **One for one.** A creature fits inside the footprint of the creature it replaces.
   `tests/creatures/fairytale-models.test.ts` checks the body at four animation times.
   Magic effects are not part of the body, because they do not collide.
2. **Cute proportions.** Large heads, short legs, large dark eyes with a white highlight, and pink cheeks.
3. **Colors from the planet.** The colors come from the candy palette in `src/candy.ts`.
   Each body color is different from the pink grass (`0xe7a0ba`) and the mint water (`0x73c4c8`).
4. **Gentle magic.** Glow and sparkles are small. At night they help the player find the residents.
5. **Same building blocks.** The models use spheres, cones and a few special shapes, as the current animals do.
   The model interface is the same: `root`, `animate(time, moving, features)` and `dispose()`.

## What to review

- **Before / Fairytale** switches the meadow and the line-up between the old animals and the fairytale creatures.
- **Day / Night** uses the Blossom Haven sky and a gentle lilac night, as in `src/daylight.ts`.
- **New residents** makes a new population on the real home terrain (`HOME_SEED`).
- Select a creature to see a close-up. **Show the creature it replaces** puts the old animal beside it.
- The three switches turn off the signature detail, the magic, and the animation of each creature.
- **Close / Flight distance** shows the fairy and the cast in a row.
  *Flight distance* puts the cast about 30 m from the camera.
  The creatures have the same size in pixels as in a 900 px tall game window.
- **Save study settings** downloads the replacements, the switch settings, the light, and the population seed as JSON.

## Cost

Each full model has more meshes than the animal it replaces. The study uses
the full models, because its switches change each part. The game builds each
model with `createFairytaleCreature(kind, { merge: true })`. This option keeps
every detail on. It joins the static parts of each moving group (body, head,
legs, tail, wings) into one mesh for each shading style. Vertex colors keep the
original colors. Glow parts, transparent parts, effects, and the throat of the
frog stay separate, because they change in each frame.

| Model | Full (study) | Merged (game) | Animal before |
| --- | --- | --- | --- |
| Unicorn | 46 | 14 | Cow: 28 |
| Dragonling | 42 | 14 | Sheep: 18 |
| Kitsune kit | 37 | 14 | Rabbit: 14 |
| Frog Prince | 37 | 18 | Duck: 8 |
| Pegasus foal | 46 | 21 | Ribbon butterfly: 3 |

The game shows at most 28 creatures near the camera (14 on mobile). The four
ground and water creatures have 14 to 18 meshes when merged. Thus the worst case
is about 500 draw calls (28 Frog Princes). Before the change, the worst case was
about 800 (28 cows).

## Game integration

- `createPopulation` (`src/creatures/population.ts`) builds the fairytale
  model of each slot when `fairy` is true. Earth uses `createCreature(kind, false)`.
- The residents keep their species keys (`cow`, `sheep`, `rabbit`, `duck`).
  Thus spawns, routes, spacing, habitat checks, obstacle checks, culling and
  pause do not change. Each model root has `userData.fairytale` with its creature.
- `buildCandyEcosystem` (`src/candy.ts`) puts five pegasus foals in a group
  named `pegasus-foals`, at the five hover positions of the old butterflies.
  Each foal flies a slow 1.2 m circle, bobs, and faces along its path. The
  circles stay at least 10 m from the cottage axis.
- The development diagnostics (`/?test`) give `fairytale` for each visible
  creature, and `candy` includes `pegasus-foals`.
- The magic is always on in the game. The glow has the same strength by day and by night.

The habitat code (`src/creatures/habitat.ts`, `src/creatures/spherical.ts`)
does not change. The creature study (`/studies/creature-study.html`) still shows the
pastel animals; it records the design before this change.

## Decisions

- The names stay as in the study.
- Five pegasus foals fly in the game, one for each old butterfly. The three foals
  over the meadow in the study are for the study only.

## Files

| File | Purpose |
| --- | --- |
| `studies/fairytale-creature-study.html` | Page entry |
| `src/creatures/fairytale.ts` | Mapping, names, notes and labels |
| `src/creatures/fairytale-models.ts` | The five models, the merged build, and the ribbon butterfly for comparison |
| `tests/creatures/fairytale-models.test.ts` | Mapping, footprint, ground contact, mesh count, merged build and switches |
| `src/creatures/population.ts` | Chooses the fairytale models for Blossom Haven |
| `src/candy.ts` | The pegasus foals over the cottage garden |
| `studies/fairytale-creature-study/main.ts` | Meadow, close-up, line-up, table and export |
| `studies/fairytale-creature-study/fairytale-study-smoke.mjs` | Browser check of the study and screenshots |
| `scripts/wildlife-smoke.mjs` | Browser check of the game, including the arrival at Blossom Haven |

## Verification

- `npm test` runs the model tests with the other tests. `tests/creatures/spherical.test.ts`
  checks that Blossom Haven shows only fairytale creatures and Earth only animals.
- `npm run build` builds the study page.
- With the dev server on port 5174, run
  `node studies/fairytale-creature-study/fairytale-study-smoke.mjs "path/to/chrome.exe"`.
  It checks the five creatures, the three habitats, the switches, the
  comparison, the line-up, the night light, the export, the new residents,
  the pause, and the layout at 390 px and 320 px. The screenshots go to
  `artifacts.local/fairytale-study/`. Set `FAIRY_TEST_URL` for another server origin.
- `node scripts/wildlife-smoke.mjs "path/to/chrome.exe"` flies to Blossom Haven.
  It checks that the visible residents are fairytale creatures and that the pegasus
  foals exist. It saves `artifacts.local/wildlife-blossom-fairytale.png`.
