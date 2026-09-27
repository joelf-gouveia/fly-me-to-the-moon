# Here comes the Sun: Sun study

Status: option B is implemented in the game on 27 September 2026, with every part of option A.
[What the game now does](#what-the-game-now-does) lists the implementation. The rest of this page keeps
the study. Open `/sun-study.html` on the Vite server. The study controls do not change the game or saved
game data.

The planet look study gave the seven planets the look of their pictures, but the Sun was one flat
colour. This study finds six causes, compares three options to make the Sun look like our star, and
measures their cost. "Today" in the findings and the tables is the Sun before this study.

## What to review

| Control | What it does |
| --- | --- |
| **Compare options** | Switches between **Before**, **A — Retune**, **B — Living Sun** (the game now) and **C — Camera light**. |
| **View** | **From space**: 4.4 radii from the centre, from the side of Earth. **At the edge**: 1.5 radii from the centre, with the limb as the horizon and a prominence on it. **In flight above it**: the fairy 40 m above the surface, with the game camera. **From Earth's meadow**: the meadow of the game start. |
| **Sun height at the meadow** | 50°, 25° or 4° above the meadow. Earth turns to give the height; the Sun and Earth do not move. |
| **Side by side with before** | Shows Before on the left and the selected option on the right, with one camera. |
| **Motion** | Turns the Sun and animates the granules, the corona and the prominences. It is off at the start when the system asks for reduced motion. |
| **Phone shader** | Uses the phone version of option B and C: fewer noise cells per pixel. |
| **01 / The real Sun** | Colour strips from the disc centre to 3 radii for each option and for a photograph with a solar filter, and the real values. |
| **02 / Numbers** | The disc centre on the screen, the edge against the centre, the Sun against a sunlit cloud, the width from Earth, the draw calls of the preview, and a measure of the frame time of the four options. |
| **Save study** | Exports the settings, the measures, the budgets, the frame times and the recommendation as JSON. |

The preview uses the game code where it can: `createWorlds()` with the painted planets, the renderer,
the tone mapping and the lights of `src/main.ts`, the planet shadow of `createSunShading()`, and a copy
of the rules of `updateEnvironment()` for the fog, the sky and the light. Option B is the Sun of
`createWorlds()`. The Before option is a copy of the old code (`src/sun-study/legacy.ts`): the sphere of
one colour, with fog, and the glow sprite. Differences from the game:

- The worlds do not orbit, and only Earth turns (for the meadow view).
- The preview does not move the fairy. Each view is a fixed pose.
- In the side-by-side view of option C, the bloom is wider across the screen than up and down, because
  the bloom targets have the size of the full canvas.

## What the code did before this study

| Area | Current behavior | Consequence |
| --- | --- | --- |
| `src/worlds.ts`, `createWorlds()` | The Sun is a 64 × 40 sphere of radius 960 m with `MeshBasicMaterial({ color: 0xffd78d })` | One colour from the centre to the edge, with fog |
| `src/main.ts`, `sunGlow` | One additive sprite, 3,920 m wide, opacity 0.4, with a canvas gradient that fades in a straight line | A glow that stops at 2.04 radii |
| `src/main.ts`, renderer | `ACESFilmicToneMapping`, exposure 1.15 | A colour of 1 or less comes out as a pale colour, not as a bright light |
| `src/main.ts`, `updateEnvironment()` | Fog of 0.00144 at Earth's ground; `world.kind === 'sun'` gives full day | The fog also applies to the Sun |
| `src/worlds.ts`, `addAtmosphere()` | The air shell draws after the opaque Sun, with alpha up to 0.96 | The sky covers the Sun from the ground |
| `src/main.ts`, `animate()` | Every world except the Sun and the Moon turns about its axis | The Sun does not move |
| `src/flight.ts`, `stepFlight()` | The fairy can fly down to 2.3 m above the Sun | The player can see the surface from very close |

## Finding 1: one colour, edge to edge

Each pixel of the disc has the same colour: `#e8dab4` on the screen. A real disc is darker and redder at
the edge. This is limb darkening: near the limb the line of sight goes through the cooler, higher layers
of the photosphere.

Hestroffer and Magnan (1998) give the limb darkening as I(μ) / I(1) = μ^α, with
α = −0.023 + 0.292 / λ (λ in µm, for λ above about 417 nm). μ is the cosine of the angle between the
surface normal and the line of sight. The study uses 612 nm, 549 nm and 465 nm for red, green and blue:

| Channel | α | Brightness at r = 0.99 |
| --- | --- | --- |
| Red (612 nm) | 0.454 | 41% |
| Green (549 nm) | 0.509 | 37% |
| Blue (465 nm) | 0.605 | 31% |

Without this curve a sphere of one colour looks like a flat circle. This is the main cause of the flat
look.

## Finding 2: dimmer than a cloud

Before tone mapping the disc has a linear luminance of 0.72. A white cloud of Earth that faces the Sun at
noon gets the sunlight (2.4 in `0xffebcc`) and the sky light (2.1 in `0xd9efff`); three.js divides by π,
so the cloud has 1.07. On the screen the Sun is `#e8dab4` and the cloud is `#e8e9e6`. The Sun is not the
brightest thing in its own sky, and the tone mapping makes it pale.

## Finding 3: a glow with an edge

The glow is one sprite. Its gradient keeps the colour to 0.18 of the sprite radius, then fades in a
straight line to 0 at 2.04 radii of the Sun. The inner part is behind the disc. At the limb the sprite adds
only 0.10 of linear light, mostly red. The end of the straight fade shows as a soft ring. The glare of an
eye or a camera falls off as a power of the distance and has no edge.

## Finding 4: hidden from the meadow

From the meadow, the surface of the Sun is 7,975 m away. The fog at the ground replaces
1 − exp(−(0.00144 × 7,975)²) of its colour: more than 99.99%. The air shell of Earth draws after the
opaque Sun, and covers it with up to 96% of sky colour. The pixel at the centre of the Sun in the meadow
view is `(150, 203, 228)`: sky blue. The Sun that makes the day is not in the day sky. The Moon study
found the same (`docs/moon-study.md`).

## Finding 5: nothing moves

Every planet turns about its axis. The Sun does not turn and has no surface detail: no granules, no
sunspots, no corona and no prominences. It is the only still body in a Solar System that moves.

## Finding 6: a flat floor up close

The fairy can fly 2.3 m above the Sun. At the scale of the game (radius 960 m for 695,700 km), a real
granule of 1,000 km is 1.4 m wide, and a typical prominence of 40,000 to 50,000 km is 55 to 69 m high.
Today the surface has none of this. With one colour under the fairy, the player sees no height and no
speed.

## The real Sun at the scale of the game

| Feature | Real value | At the game scale | Option B |
| --- | --- | --- | --- |
| Radius | 695,700 km | 960 m | 960 m |
| Width from Earth | 0.53° | 13.8° from the meadow | No change |
| Photosphere temperature | 5,772 K | – | The core colour |
| Limb darkening | μ^α, α 0.45 to 0.61 | – | The real α per channel |
| Granules | About 1,000 km, several minutes | 1.4 m | 20 m (1/48 radius), a new pattern every 8 s |
| Supergranules | Up to 30,000 km, up to 24 h | 41 m | Mottling at two scales |
| Sunspot umbra | About 4,300 K | – | 25%, 21% and 16% of the red, green and blue light |
| Sunspot penumbra | About 5,000 K | – | 52%, 50% and 44% of the red, green and blue light |
| Rotation | 25.1 days at the equator, 34.4 at the poles | – | 720 s at the equator, 988 s at the poles |
| Chromosphere | About 2,500 km thick | 3.5 m | A red rim of about 6 m |
| Prominences | Typically 40,000 to 50,000 km high | 55 to 69 m | 67 to 144 m |
| Corona | A million times fainter than the disc | – | Visible from space; hidden by the blue sky |

The sunspot values are Planck ratios at the three wavelengths (`coolerRatio()` in the model). The
rotation uses the rate of the NASA fact sheet, 14.37 − 2.33 sin² L − 1.56 sin⁴ L degrees per day.

## The options

### A — Retune

The same two parts with real light. No texture.

1. **Limb darkening.** A shader on the Sun sphere (96 × 64): the core colour (2.8, 1.45, 0.35) in linear
   light, times μ^α per channel. μ stops at 0.1 (r = 0.995), so the last pixels of the polygon edge do
   not go black.
2. **A brighter core.** The core has 1.55 times the luminance of the sunlit cloud. After tone mapping the
   centre is cream (`#faf0d0`) and the edge is gold. The edge has 76% of the brightness of the centre on
   the screen: the tone mapping compresses the real curve.
3. **A glare with no edge.** A back-side shell of 4.2 radii replaces the sprite. For each view ray it finds
   the nearest point to the Sun, at b radii. The glare is 0.3 exp(−(b − 1) / 0.045) + 0.14 b^−2.6, and it
   fades out between 2.9 and 4.1 radii. The halo just outside the limb is fainter than the limb. The glare
   shows only from far away; close by, the disc fills the view.
4. **The Sun in the sky of Earth.** No fog on the Sun parts. The disc is in the transparent pass with
   `renderOrder` −1, after the air shells (−2). It takes the colour of the sunlight there: the colour that
   `updateEnvironment()` already gives to the point light, divided by the colour in space, and 55% of the
   brightness when the Sun is low. At the meadow the centre of the Sun is `(250, 239, 208)` at 25° and
   `(253, 196, 106)` at 4°.

### B — Living Sun

A, plus a surface that moves, all made on the graphics card. No texture and no download.

- **Granules.** Worley cells of 1/48 radius with moving points: bright cells, soft dark lanes, a
  brightness for each cell. A second, smaller layer on a computer. They fade where a cell is smaller than
  about two pixels (`fwidth`), so there is no shimmer from far away.
- **Mottling.** Simplex noise at two larger scales, so the disc has a texture from far away too.
- **Sunspots.** Eight spots in the two belts of activity (8° to 30° from the equator). Umbra and penumbra
  at their real temperature ratios, radial filaments, and bright faculae near the limb around them. Each
  spot turns at the rate of its latitude.
- **Rotation.** The surface turns once in 720 s at the equator.
- **Corona.** In the glare shell: a smooth part as b^−5, streamers near the equator and plumes at the
  poles. The pattern depends on the direction only, so each streamer is a ray. In the air of a world the
  corona fades out, as in the real sky. Close to the surface, a warm gold sky that is brightest at the
  horizon.
- **Chromosphere.** A thin red rim at the limb, with spicules.
- **Prominences.** Five loops of three strands each, 0.07 to 0.15 radii high, in one mesh. Knots of
  plasma flow along each loop. Normal blending gives bright loops against space and dark red filaments
  against the disc, as in the pictures. They hide in the air of a world. The fairy can fly through them.
- **Phone version.** A 2 × 2 × 2 cell search and no second granule layer: 11 noise evaluations for each
  disc pixel, not 57.

### C — Camera light

B, plus two screen effects of a camera.

- **Bloom.** `EffectComposer` with `RenderPass`, `UnrealBloomPass` (threshold 3, strength 0.55,
  radius 0.35) and `OutputPass`. The disc is 2.2 times brighter (luminance 3.65), so only the Sun
  blooms. The shell adds no glare: the bloom is the glare.
- **Lens flare.** Four ghosts on a screen overlay, on the line from the Sun through the middle of the
  view. They show when the centre of the Sun is in view and no world is in front of it.
  The `Lensflare` of three.js is not used: it tests occlusion with a colour pattern, and that test fails
  in the half-float target of the bloom.

From Earth the bloom also touches the clouds near the Sun and the fairy. From space it washes out the
sunspots.

## Cost

| Measure | Today | A | B | C |
| --- | --- | --- | --- | --- |
| Draw calls of the Sun | 2 | 2 | 3 | 7 |
| Triangles | 4,994 | 15,072 | 30,432 | 30,440 |
| Noise per disc pixel, computer · phone | None | None | 57 · 11 | 57 · 11 |
| Passes after the scene | None | None | None | 14 |
| Render targets, 1920 × 1080 | None | None | None | 54 MB |
| Render targets, phone (780 × 1688) | None | None | None | 34 MB |
| Textures | 1 | None | None | 2 |

`budget()` in the model gives these values. The render targets of C: two half-float frame targets and a
depth buffer (20 bytes a pixel), and the bloom mips (7.3 bytes a pixel). C runs its passes in every
frame, also when the Sun is not in view.

Frame time, measured with **Measure the four options**: 20 frames after 3 frames to warm up, then a
read of one pixel to wait for the graphics card. Headless Chrome, Windows 11, NVIDIA GeForce RTX 4080
SUPER, canvas 983 × 600, five runs:

| View | Today | A | B | C |
| --- | --- | --- | --- | --- |
| In flight above it | 0.53 to 0.72 ms | 0.56 to 0.85 ms | 0.93 to 2.10 ms | 1.09 to 2.35 ms |
| From space | 0.52 to 0.78 ms | 0.58 to 0.83 ms | 0.86 to 2.15 ms | 0.85 to 1.74 ms |

The times include the work of the preview on the processor. On this graphics card every option costs
less than 2.4 ms. The times change much from run to run: in some runs C is faster than B, and a run with
the phone shader gave A faster than Today. Thus the table shows only that B and C cost more than Today
and A in most runs. It does not give a reliable difference between B and C. A phone was not measured. The noise of B runs on every pixel of the disc, and in flight above the Sun
the disc fills the screen. This is the case to test on a real phone.

## Recommendation

**Do option A now, then option B with its phone shader. Keep option C out of the game.**

- A fixes four of the six causes (findings 1 to 4) at no cost: two draw calls, as today, and no
  texture.
- B fixes the last two. It gives the Sun the life of the other worlds, in the storybook style of the
  painted planets. It needs no texture and no download.
- C adds 14 passes and 54 MB of render targets to every frame of the game for an effect of a camera. It
  also changes the look of the scene near the Sun, and it washes out the surface detail of B. The glare
  of A and B gives most of its effect.

## Into the game

1. `src/worlds.ts`, `createWorlds()`: replace the `MeshBasicMaterial` of the Sun with the look of
   `createSunLook()` in `src/sun-study/looks.ts`. Move it to a game file, for example `src/sun-look.ts`.
2. `src/main.ts`: remove `sunGlow` and `makeSoftDiscTexture()`. The glare shell replaces them.
3. `src/main.ts`, `updateEnvironment()`: give the look the air density at the camera and the sunlight
   colour against `sunColor`, as `environment()` in `src/sun-study/scene.ts` does.
4. `src/main.ts`, `animate()`: give the look the game time, or 0 when `reducedMotion` matches.
5. For B on a touch device, build the look with `phone = true`.
6. Keep `frustumCulled = false` on the glare shell, because the camera can be inside it.

## Decisions

- **How large from Earth?** The Sun is 13.8° wide from the meadow; the real Sun is 0.53°. The
  proportions study chose this size. This study does not change it.
- **A corona in an eclipse?** From Earth the blue sky hides the corona. When the Moon covers the Sun, the
  game could show it, as the real sky does. This is a later step.
- **How large are the granules?** The study uses 20 m, 14 times the real scale, so the fairy sees them.
  Real granules would be 1.4 m: too small to see from 40 m.

## Limits of this study

- The frame times come from one fast graphics card in five runs, and they are noisy. A phone was not measured.
- The colours of the options are hand-tuned for the tone mapping of the game. They need an art review.
- The limb darkening law is valid for about 417 to 1,100 nm. The blue channel at 465 nm is near the
  lower limit.
- The preview does not test the Sun behind a planet with air: the Sun draws after the air shells, so the
  air rim of a planet in front of the Sun does not show.
- The meadow view uses the rules of `updateEnvironment()`. The cloud colours and the sky are the game
  colours. The study does not change them.

## What the game now does

| Change | Where |
| --- | --- |
| The numbers of the look: the limb darkening, the core colour, the glare, the rotation, the sunspots and the prominences | `src/sun-look.ts` |
| The disc shader, the glare and corona shell, and the prominence mesh. The study builds options A and C from the same code | `createSunLook()` in `src/sun-paint.ts` |
| The living Sun replaces the sphere of one colour. A touch device gets the phone shader | `createWorlds()` in `src/worlds.ts`; `World.sunLook` |
| No glow sprite: the glare shell replaces it. `makeSoftDiscTexture()` stays for the fireflies and the relocation glow | `src/main.ts` |
| Each frame: the game time (0 with reduced motion), the air at the camera, and the colour of the sunlight there, dimmer when the Sun is low | `updateEnvironment()` in `src/main.ts` |
| The Sun shaders compile in the background at the start (`renderer.compileAsync()`). The first frame with the living Sun took 0.45 to 0.52 s on the test computer with an empty shader cache, for the computer and the phone shader | `src/main.ts` |
| The planet look study has no glow sprite either, so its Sun is the game Sun | `src/planet-look-study/scene.ts` |
| `NOISE` is exported, so the Sun uses the same simplex noise as the painted planets | `src/planet-paint.ts` |

`src/sun-look.test.ts` checks the real values, the built look and its place in the game.
`node scripts/sun-smoke.mjs "path/to/chrome.exe"` checks the game: the living Sun, the white morning Sun in
the sky of the meadow, the motion, a guided trip to the Sun, and the phone shader. It writes screenshots to
`artifacts.local/sun/`.

## Sources

- Radius, temperature, rotation and chromosphere: [NASA Sun fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html).
- Limb darkening: D. Hestroffer and C. Magnan, [Wavelength dependency of the Solar limb darkening](https://www.physics.hmc.edu/faculty/esin/a101/limbdarkening.pdf),
  Astronomy and Astrophysics 333, 338 (1998), from the data of Pierce and Slaughter (1977) and Neckel
  and Labs (1994).
- Limb darkening coefficient of about 0.6 in SOHO and SDO images: [Journal of Astronomy and Space Sciences 34, 99](https://www.janss.kr/archive/view_article?pid=jass-34-2-99).
- Granules and supergranules: [Las Cumbres Observatory](https://lco.global/spacebook/solar-system/sun/)
  and [Photosphere](https://en.wikipedia.org/wiki/Photosphere).
- Sunspot temperatures: [Montana State University](https://solar.physics.montana.edu/YPOP/Spotlight/SunInfo/Sunspots.html).
- Prominence heights: [Solar prominence](https://en.wikipedia.org/wiki/Solar_prominence).
- Corona brightness: [Britannica](https://www.britannica.com/place/Sun/Corona).
- Tone mapping: `ACESFilmicToneMapping` of three.js 0.186, copied in `acesFilmic()` in the model.
- Noise: webgl-noise by Ian McEwan and Stefan Gustavson (Ashima Arts), MIT license. Hash: "Hash without
  Sine" by Dave Hoskins, MIT license.

## Verification

- `npx vitest run src/sun-study` checks the Sun values against `src/worlds.ts`, `src/main.ts` and
  `src/flight.ts`, the limb darkening against the table of Hestroffer and Magnan, the tone mapping, the
  cloud comparison, the glow edge and the glare, the fog, the width from Earth, the real values at the
  game scale, the places of the sunspots and the prominences, and the cost.
- `node scripts/sun-study-smoke.mjs "path/to/chrome.exe"` against port 5174 draws four views in four
  options, checks the camera distances, the Sun height at the meadow, the pixel at the centre of the Sun
  (sky today, Sun in option A, orange when low), motion, the split view, the phone shader, the frame
  times, the export, this document link and the 390/320 px layouts. It writes screenshots to
  `artifacts.local/sun-study/`. It uses the graphics card; add `--swiftshader` for software rendering.
  An optional second argument sets the server origin.
