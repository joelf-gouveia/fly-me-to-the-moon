# Spun-sugar skies: cotton candy cloud study

Status: option B is implemented in the game on 26 September 2026. This page
keeps the original proposal. [What the game now does](#what-the-game-now-does)
lists the implementation. Open `/studies/cotton-candy-study.html` on the Vite server.
The study controls do not change the game or saved game data. In the study,
**Before** is the clouds of Blossom Haven before option B.

Blossom Haven, the fairy world, has pale pink clouds. This study gives three
options to make them into cotton candy. The live 3D preview shows each option
over the real Blossom Haven terrain, with the cost of each option and the
changes that every option needs.

## What to review

- **Compare options** switches between **Today** (the game now) and the options
  A, B and C in the same scene.
- **View** shows the clouds from three places:
  - **From the garden**: from the ground beside the cottage, looking up.
  - **In the cloud layer**: behind the fairy at 28 m, where the mist is thickest.
  - **Whole planet**: from space.
- **Light** puts the Sun at 48° (day), 5° (golden hour) or −22° (night) above
  the garden.
- **The fairy in the cloud layer** flies the fairy at 15 m/s, the game speed at
  cloud height, or holds her still so that you can turn the camera.
- **Device** shows the phone budget: half of the puffs and a coarser puff.
- **Pink mist in the cloud layer** changes the mist color from the white of
  the game to candy pink.
- **Cost in the game** gives the budget of the selected option. The last row
  measures the draw calls of the whole preview scene.
- **Save study** exports the settings, the budgets, the palette and the
  recommendation as JSON.

The preview uses the game code: the terrain, candy, creatures and cottage from
`regenerateWorld()`, the sun shading from `createSunShading()`, the fairy from
`createFairyRig()`, and the light, sky and mist formulas of `updateEnvironment()`
in `src/main.ts`. The preview has no atmosphere shell, so the sky from space is
black.

## What the code does today

| Area | Current behavior | Consequence for cotton candy |
| --- | --- | --- |
| `src/worlds.ts`, `buildClouds()` | One `InstancedMesh` of 300 icosahedrons (80 triangles each) for Blossom Haven, 150 on a phone | One draw call and 24,000 triangles |
| `buildClouds()`, placement | Clusters of seven flat ellipsoids, 24 to 32 m above sea level | The clouds are thin and flat, not round |
| `buildClouds()`, material | `MeshStandardMaterial`, color `0xffe4f4`, 65% opaque, `depthWrite: false` | One pale color. The puffs are see-through, so they add overdraw |
| `buildClouds()`, cottage | No rule for the cottage | 14 of the 300 puffs come near the column above the cottage |
| `src/main.ts`, `cloudWhite` | Mist color `0xf0f3ed` in the cloud layer of every world | Pink clouds, white mist |
| `src/main.ts`, `ambient` | `HemisphereLight` ground color `0x65794e` (olive) on every world | Seen from below, the cloud bases on Blossom Haven are olive grey |
| `src/sun-shading.ts`, `prepare()` | Patches only built-in lit materials | A `ShaderMaterial` cloud stays bright on the night side and in an eclipse |
| `src/terrain.ts`, `createTerrain()` | The fairy terrain is at most 8 m high | Clouds at 24 m never touch the ground |

## Finding 1: few clouds are in view at one time

Blossom Haven has a radius of 110 m, and the clouds are 24 to 32 m above sea
level. The planet curves away fast. From the ground, a cloud is above the
horizon only when it is less than about 0.5 rad (55 m) away. In that area there
are only about three tufts. Each cloud is thus large in the view, and its shape
is more important than the number of clouds.

The garden view looks toward azimuth 70° from the cottage. In that direction,
the clouds of every layout are near the cottage.

## Finding 2: the material must stay a built-in lit material

`createSunShading()` keeps a fragment on the night side of a planet out of
sunlight, and gives eclipses. It patches only `MeshStandardMaterial`,
`MeshPhysicalMaterial`, `MeshLambertMaterial`, `MeshPhongMaterial` and
`MeshToonMaterial`. It keeps an existing `onBeforeCompile` and its program key.

Thus the cotton candy look must go into `onBeforeCompile` on a
`MeshStandardMaterial`, as the water ripples do in `buildGround()`. A
`ShaderMaterial` does not get the planet shadow. The study uses the game sun
shading on its own sun, and the tufts of B and C go dark on the night side.

The spun-sugar change of B has four parts. All are in `flossMaterial()` in
`studies/cotton-candy-study/scene.ts`:

1. **Strands**: a noise pattern that turns around the vertical axis of each
   puff, as sugar does on the spinning head of a machine.
2. **Blush**: the base of a puff is darker, and the top is lighter.
3. **Bright edge**: the edge of a puff is lighter, as light passes through thin floss.
4. **Breath**: each puff grows and shrinks by 3.5%, out of step with its
   neighbors. This uses `gl_InstanceID`. The game already needs WebGL 2.

The shape is a sphere with 18 × 12 segments (12 × 8 on a phone), pushed in and
out by noise, with a flatter base. Merged vertices keep the normals smooth.

## Finding 3: the mist is white on every world

In the cloud layer, `updateEnvironment()` mixes the fog color toward
`cloudWhite`. At 28 m the fog density is about 0.012, so the mist is the main
thing that the player sees in a cloud. With pink clouds, the mist must be pink
too. Give Blossom Haven its own mist color, `0xffd3ea`. Earth and the other
worlds keep `cloudWhite`. This change is one line and works with every option,
also with the clouds of today.

## Finding 4: the cloud bases get the ground color

The hemisphere light of the game has an olive ground color (`0x65794e`) for
every world. A cloud seen from below gets that color, so the base of a cloud
over the cottage is olive grey today. B and C bend the puff normals toward the
sky in `beginnormal_vertex`. The base of a puff then gets sky light. A pink
ground color for Blossom Haven is a larger change, because it also changes
the terrain and the creatures. This study does not propose it.

## Finding 5: clouds over the cottage

The flower marks the cottage at the south pole. With round, opaque tufts, a
cloud over the cottage can hide the flower and the cottage from above. B and C
keep the column within 0.15 rad of the cottage (20 m at cloud height) free of
puffs. Today 14 puffs come into that column on a computer, and none on a phone,
because a phone builds only the first 150 puffs.

## The options

| Option | What changes | Cost on a computer |
| --- | --- | --- |
| A · Candy tint | The same 300 puffs. Each cluster gets pink, blue or lilac with `setColorAt()` | No change: 1 draw call, 24,000 triangles |
| B · Spun-sugar puffs | 50 tufts of six round, opaque puffs, with the material of Finding 2 | 1 draw call, 118,800 triangles, one time value each frame |
| C · Floss on a cone | B, with a striped paper cone under one tuft in five and 12 sugar sparkles for each tuft | 3 draw calls, 123,600 triangles, 600 points |

B and C keep the same number of instances as today: 300 on a computer and 150
on a phone. On a phone, B has 25,200 triangles, about as many as the clouds of
today on a computer.

B and C are opaque. They add no overdraw. The camera sees nothing of a puff
from inside it, so the mist gives the feeling of a cloud there.

The sparkles of C use a `PointsMaterial`, which the sun shading does not patch.
They twinkle on the night side too.

## Recommendation

1. **B with the pink mist.** B makes the clouds look like cotton candy with
   one draw call and the same number of instances. Ship the mist color with it.
2. **A as a fallback.** If B is too slow on a phone, A keeps the colors at no
   cost.
3. **C only after a test with children.** The ground already has literal
   candy: lollipops, candy canes and marshmallow stones. C puts the same joke
   in the sky. Some players can find the cones silly.

## Files to change for B

| File | Change |
| --- | --- |
| `src/cotton-candy.ts` (new) | The tuft layout from `tuftLayout()`, the puff geometry and `flossMaterial()`, moved from the study |
| `src/worlds.ts`, `buildClouds()` | For `world.kind === 'fairy'`, call the new module. Other worlds do not change |
| `src/main.ts`, `updateEnvironment()` | Use the mist color of Blossom Haven when the nearest world is Blossom Haven. Keep `cloudWhite` for other worlds |
| `src/main.ts`, `animate()` | Set the time value of the floss material. Use 0 when `reducedMotion` is on |
| `tests/cotton-candy.test.ts` (new) | Move the layout tests from `studies/cotton-candy-study/model.test.ts` |
| `scripts/blossom-smoke.mjs` | Check the cloud mesh and the mist color on arrival |

## What the game now does

- `src/cotton-candy.ts` has the tuft layout (`candyTufts()`), the puff shape
  (`puffGeometry()`), the floss material (`flossMaterial()`) and
  `buildCottonCandyClouds()`. The study imports the same functions, so option B
  in the study is the game.
- `buildClouds()` in `src/worlds.ts` calls `buildCottonCandyClouds()` for
  Blossom Haven only. Other worlds keep their clouds.
- `updateEnvironment()` in `src/main.ts` uses `CANDY_MIST` in the cloud layer
  of Blossom Haven, and `cloudWhite` on other worlds.
- `animate()` in `src/main.ts` sets `flossTime`. It is 0 when reduced motion is
  on, so the puffs do not breathe.
- `tests/cotton-candy.test.ts` checks the puff count on a computer and a phone,
  the material, the clear column, the height above the terrain, and that Earth
  keeps its clouds.
- The test diagnostics of the game (`?test`) give the number of cloud puffs,
  the mist color and the fog density.
- `scripts/cotton-candy-smoke.mjs` follows the flower home on a computer and a
  phone. It checks the puffs, the pink mist in the cloud layer, the white mist
  on Earth, and that no shader error occurs.

## What this study does not know

- **Speed on a real phone.** The browser check uses SwiftShader, which does
  not measure game speed. Run `scripts/mobile-play-smoke.mjs` on a device.
- **What children think of the cones.** This needs a test with players.
- **The look through a puff.** The change from puff to mist is not reviewed
  on a phone.

## How to check

- `npx vitest run studies/cotton-candy-study` checks that the Today layout is the
  same as the instances of `buildClouds()`, that all clouds stay above the
  terrain, the clear column, the phone budget and the cost of each option.
- `node studies/cotton-candy-study/cotton-candy-study-smoke.mjs "path/to/chrome.exe"` checks the
  page in a browser: four options in two views, the cloud layer with both
  mists, golden hour and night, the phone budget, export, this document, and
  390 px and 320 px layouts. An optional second argument sets the server
  origin, for example a server without file watching.
