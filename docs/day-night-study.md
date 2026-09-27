# When the world turns: day and night study

Status: design proposal and independent visual prototype, 26 September 2026.
Open `/studies/day-night-study.html` on the Vite server. No gameplay lighting or world
placement is changed by this study.

## What to review

The same Blossom Haven garden and fairy are shown at dawn, noon, sunset, and
night. Scrub local solar time, play an accelerated day, visit the cottage,
compare gentle/deep night, and toggle a representative always-day baseline.
Export records the current proposal as JSON; it never writes saved game data.

The preview reuses `src/candy-study/scene.ts` and the game's fairy rig. It adds
a gradient sky, illustrative stars, a Sun disc, direct light, cool fill, warm
windows, fog color, and a single 1024-square shadow map. The garden is an authored
concept scene, not the live game's terrain. The Sun moves in the garden's local
frame to illustrate the equivalent view from a rotating equatorial location.
The diagram and lighting share the same solar angle. This is not a simulation
of the current polar cottage location, orbital motion, eclipses, or axial tilt.
The baseline represents persistent daylight, not a pixel-identical game capture.
The 48-second default preview day is a review speed, not a proposed game speed.
Playback starts paused, respects hidden tabs, and stops when time is scrubbed.

## What the code currently does

| Area | Current behavior | Consequence |
| --- | --- | --- |
| `src/main.ts`, `axialSpinPeriods` | Rotates world groups around Y; Earth 240 s, home 300 s | Terrain, residents and attached fairy already move with the world |
| `src/orbits.ts` | Every world orbits once per 3,600 active seconds | Sun direction changes with orbital position too |
| `src/main.ts`, `updateEnvironment()` | Places a directional light above/near the fairy; hemisphere intensity 1.1–2.1 | Surface stays broadly lit on either side of the world |
| Same environment function | Background and fog use `world.sky`; stars use `1 - density` | Sky stays day-colored and stars disappear inside the atmosphere at night |
| `src/worlds.ts`, `addAtmosphere()` | Density-integrated shell uses an unlit uniform tint | Night atmosphere would remain bright if only surface lighting changed |
| `src/worlds.ts`, `homeCottageNormal()` | Cottage at `(0, -1, 0)`, exactly on spin axis | Daily spin does not move the cottage into/out of sunlight |

The last point is a design decision, not a lighting bug. With the current axis,
moving the cottage to a mid-latitude would allow a daily cycle; tilting the axis
alone still leaves a pole fixed during each spin. An alternative is an explicitly
magical cycle around home. Recommend keeping the geometry-based system for all
worlds, then deciding whether a daily sunrise at the cottage merits relocating
its clearing, approach normal, scenery and population exclusions together.
Changing the normal alone would break terrain and navigation assumptions.

## Visual direction

| Phase | Sky and distance | Landscape and light |
| --- | --- | --- |
| Dawn | Peach horizon into pale blue; stars gradually disappear | Soft warm grazing light, long shadows, slowly returning color |
| Noon | Clear blue with pale haze | Existing colorful, welcoming daytime look; short shadows |
| Sunset | Apricot horizon, lavender upper sky | Warm edges and long shadows; cottage windows gain presence |
| Night | Navy/lilac, visible stars | Readable silhouettes and terrain, cool fill, warm windows and existing fairy glow |

Recommend **gentle night** as the first playtest direction. Deep night is a
comparison option. These are art choices, not measured child-accessibility
claims. Check terrain/fairy readability on a dim phone and at gameplay camera
distance. Do not introduce waiting, sleeping requirements, danger, or tasks
that only work in daylight. Keep exposure fixed while reviewing palettes.
The purple fill is an artistic visibility aid; it does not imply an unseen moon.

## Proposed implementation

### 1. Derive sunlight from geometry

Create a pure `src/daylight.ts` model, initially promoting the study's
`solarElevation()` and `lightingAtElevation()` functions. After the existing
spin, orbit, visitor-carry, relocation and player-position updates, compute:

```ts
const up = playerPosition.clone().sub(worldCenter).normalize()
const toSun = sunPosition.clone().sub(playerPosition).normalize()
const elevation = Math.asin(clamp(up.dot(toSun), -1, 1))
```

All inputs are world-space. Do not rotate `up` twice. A stored local surface
normal must first be transformed by the world's world quaternion; if parenting
is introduced, obtain centers with `getWorldPosition`. Use the fairy location
for gameplay solar elevation and camera altitude for atmospheric density.
Rotation, flying across longitude, orbit and relocation then work without a
second gameplay time accumulator. A displayed local clock is optional and
should not drive the system. The star Sun itself needs a separate environment
path; do not calculate a surface day/night cycle for an emissive Sun.

The existing orbit and spin have opposite angular directions in the XZ plane:
positive Y spin carries +X toward -Z, while increasing orbital phase carries
+X toward +Z. At 1× orbit speed, an equatorial location on Earth therefore has
an approximate solar period of `1 / (1/240 + 1/3600) = 225 s`, and home about
`1 / (1/300 + 1/3600) = 277 s`, absent teleport and small finite-distance effects.
At 64× orbital speed, these become about 46 s and 47 s. Do not assume a
four/five-minute solar day or multiply axial spin by the orbit-speed control.
Review accelerated twilight with the existing speed control before shipping.

### 2. Replace the following light without breaking distant planets

A small local experiment can place the existing directional light at
`playerPosition + toSun * 500` with its target at the player. Three.js uses the
position-to-target vector, not the light's rotation. Its target must be in the
scene. [DirectionalLight documentation](https://threejs.org/docs/pages/DirectionalLight.html)

However, a single directional light gives all planets the same direction, and
globally dimming it because the fairy is at night would darken unrelated worlds.
For the full system, use a solar source at the actual Sun (evaluate one unshadowed
PointLight with constant stylized attenuation), or a shared Sun-position uniform
in world material shaders that computes direction per fragment. Keep solar
output stable. Apply a radial day-side mask per world/material so trees on the
far side cannot receive sunlight through the planet when global shadows are off.
Use `dot(normalize(fragmentWorldPosition - planetCenter), toSun)` for that mask;
the terrain's detailed shading normal is still used for slopes and features.
This mask models planet occlusion approximately, not mountain shadows.
Scope masks to planet scenery; separately handle the fairy and high flight.

Near-surface ambient and artistic fill should follow the local surface up and
solar elevation. Avoid making all distant worlds inherit the nearest world's
night palette. A separate world material fill term or rendering layers may be
needed; validate this architecture before expanding the local experiment.
HemisphereLight supplies sky/ground fill and does not cast shadows.
[HemisphereLight documentation](https://threejs.org/docs/pages/HemisphereLight.html)

### 3. Blend sky, fog, stars and atmosphere together

Starting proposal, in degrees (tune by eye):

```text
day        = smoothstep(-6, 14, elevation)
directSun  = smoothstep(-1, 8, elevation)
stars      = 1 - smoothstep(-14, -3, elevation)
gentleFill = lerp(0.85, 2.1, day)
```

These are stylized thresholds, not a physical atmosphere model. Use world.sky
as the daytime palette, add planet-specific night/horizon colors, and blend in
linear color space. Preserve altitude and cloud density; change fog color with
the light. FogExp2 exposes color and density separately.
[FogExp2 documentation](https://threejs.org/docs/pages/FogExp2.html)

For the existing star system, a starting fade is
`1 - atmosphereDensity * (1 - nightStars)`. Keep stars behind opaque terrain
and attenuate them in cloud layers/dense atmospheres; Venus should not reveal
a crisp star field through thick clouds. Airless Mercury keeps a space sky at
all times. Mars gets restrained dusty twilight; gas giants get lit cloud decks,
not invented ground. Blossom gets lilac night; Earth gets deeper blue.

The atmosphere shell needs `sunPosition` and night/day colors as uniforms.
At each existing density sample, compute the radial normal, solar direction
and twilight factor, then accumulate lit color with density. A single camera
factor on the whole shell would make the entire planet change color at once.
Update the center/Sun uniforms after relocation. Match the surface fog and shell
at atmosphere exit; avoid two visibly different horizons during ascent.

At altitude, the Sun can remain visible below the sea-level horizon. A later
pass should use a ray/sphere occlusion test or horizon dip based on radius and
altitude instead of applying the surface cutoff to all flight. Other-world
eclipses, scattering and ring shadows are outside the first implementation.

### 4. Add gentle local details

Reuse the fairy's existing point light and emissive wings. Increase cottage
window emission at night while respecting `lightCottage()` and discovery state.
Emissive windows look bright but do not light nearby ground; a small, unshadowed
local point light is an optional later enhancement. No bloom pass is needed.

The preview enables one small shadow map to show long shadows. For gameplay,
profile before enabling it: bound one map around the nearby fairy, cull distant
casters, tune normal bias, and keep a mobile fallback. It is not a solar-system
shadow solution and must not be the only way to hide sunlight behind a planet.
Reuse vectors/colors in the hot path and update uniforms without shader rebuilds.

### 5. Preserve the existing time and travel rules

Reuse the current pause/customization/hidden-tab gates. Note that the world map
freezes axial spin/player flight but allows orbits to advance. Consequently the
Sun's bearing can change behind the map. Preserve that behavior initially and
review it explicitly; do not silently introduce a different pause policy.

Blossom relocation can move a visitor from day to night immediately. Recompute
the geometric target from the destination. If this is jarring, blend the local
presentation over roughly 2–3 seconds with the relocation glow. Keep geometry,
navigation and destination illumination correct; do not delay the planet move.
Ordinary rotation already produces smooth twilight. Start with no extra lag,
especially near a visible Sun disc. A reduced-motion setting should start the
study paused; it should not secretly halt live planetary mechanics.

## Delivery sequence and acceptance checks

1. Pure geometry model and unit checks: noon/midnight, horizons, world translation,
   rotated equatorial position, pole invariance, and moved home.
2. Local Earth/Blossom surface lighting: stand still and let rotation carry the
   fairy; fly across the terminator without waiting. No independent phase reset
   when landing, regenerating terrain or returning to a world.
3. Full-system light and atmosphere shell: inspect opposite planets from space;
   the lit hemispheres face the Sun regardless of the nearest world's phase.
   Ascend at sunset and descend at night; fog, stars and shell agree.
4. World profiles and polish: airless Mercury, thick Venus, dusty Mars, giant
   cloud decks, poles, cottage discovery, visitor relocation, accelerated orbits.
5. Desktop/mobile readability and performance: compare daytime frame time and
   draw calls, test optional shadows separately, confirm no material recompiles
   during the cycle. No performance claim is made by this study.

## Artifact files and validation

- `src/day-night-study/model.ts`: solar geometry, art thresholds, preview clock.
- `src/day-night-study/scene.ts`: lighting wrapper around the existing garden.
- `src/day-night-study/main.ts`: timeline, comparison, explanation and export.
- `src/day-night-study/model.test.ts`: geometry and transition checks.
- `scripts/day-night-study-smoke.mjs`: desktop/mobile, controls, export, screenshots.
- `studies/day-night-study.html`: separate Vite build entry.

Run `npm test` and `npm run build`. With Vite on port 5174, run
`node scripts/day-night-study-smoke.mjs "path/to/chrome.exe"`.
The existing candy study retains its original default lighting.
