# Little lives — creature study

Open `/creature-study.html` with the development server running. This is a
separate interactive design sandbox for Earth and Blossom Haven. All four
approved creatures are now in the flight game too, using the same models with
their details enabled. Study switches affect only the preview.

Since 26 September 2026, the game uses these animals on Earth only. On Blossom
Haven, fairytale creatures take the same four slots with the same habitat rules.
See [the fairytale creature study](fairytale-creature-study.md). The Blossom
Haven view of this study still shows the pastel animals from before that change.

## First residents

| Animal | Habitat in this study | Simple silhouette | Optional detail | Movement |
| --- | --- | --- | --- | --- |
| Rabbit | Dry ground | Oval body, round head, long ears | Pink ear centers, round tail | Small hops and pauses |
| Sheep | Dry ground | Woolly oval, dark muzzle, four legs | Wool tufts, little tail | Slow steps and grazing pauses |
| Duck | Water surface | Floating oval, round head, broad bill | Wing patches, tail | Gentle paddling and drifting |
| Cow | Dry ground | Sturdy oval, broad pink muzzle, small horns, four hooves | Coat spots, swishing tail | Slow strolling and grazing pauses |

Ducks are deliberately water-only in this first version, though real ducks can
also walk on land. Four primitive-based models keep the visual scope small.
Blossom Haven uses softer pink and lavender colors with the same silhouettes.

## Review controls

- Switch worlds; use **New terrain** for another landscape and fresh residents.
- **Shuffle residents** keeps the terrain and changes the animal positions/routes.
- Select an animal, toggle details/tail/animation, and inspect the live close-up.
- **Find a…** moves the landscape camera to a resident of that species.
- Show or hide routes, pause life, drag to orbit, scroll to zoom, or reset Overview.
- **Save study settings** downloads features, seeds, and local routes as JSON.
  It is a review handoff, not an automatic game import.

Feature choices are independent per species and apply to both world previews
for the current page visit. Reduced-motion preferences start the study paused.

## Habitat and path rules

The study samples a 48-unit local patch of the same spherical terrain field
used by the game, flattened into a readable diorama. It seeks a shore with both
habitats; it never adds artificial water to force a spawn. Water level is zero.
The game home remains fixed; generating alternate Haven terrain is study-only.

Terrain rendering and animal elevation use the same triangle interpolation.
The complete mesh-vertex rectangle surrounding each route segment and animal
footprint must pass habitat checks. This is conservative: some usable areas
are skipped. It prevents a path from crossing a narrow inlet hidden between
otherwise safe endpoints, and includes the head/bill/tail footprint at any yaw.

Land requires height above 0.45, below 8, and no more than 1.15 units of height
variation across the checked region. Water requires the seabed below -0.35
throughout. Edges of the survey are excluded. Maximum footprints are checked
before applying the randomized, slightly smaller creature scales.

Each creature follows two or three short verified segments, pauses at waypoints,
and retraces the same path. It does not spline across corners or find unchecked
shortcuts. If a safe spawn plus route cannot be found within the bounded search,
that resident is omitted and the skipped count is displayed. Random placement
happens when terrain/residents are generated, not on every animation frame.

This first study avoids scenery on route corridors. It does not implement
animal-to-animal collision, flocking, breeding, sounds, interaction, or feeding.

## Game integration

`src/creatures/spherical.ts` plans short routes on the actual displaced planet
mesh. A spherical cap covers the entire route segment plus the creature's
maximum footprint. All mesh vertices covering that cap must satisfy the habitat
and slope limits; margins account for sphere faceting. Positions intersect the
rendered triangles directly. Ducks use the water mesh elevation. Creature up
and forward directions follow the planet surface, including near the home pole.

`src/creatures/population.ts` attaches a planet-local population only to Earth
and Blossom Haven. Earth attempts up to 40 of each species (160 total), a 25%
increase; Blossom Haven remains at 32 per species (128 total). Unsuitable
locations are still skipped, and starting positions remain at least four metres
apart. Some land spawns favor the initial meadow/home area.
Static obstacle checks avoid Earth trees, candy trees/canes/stones/flowers, and
the cottage garden. Animal-to-animal collision is not implemented.

Only the nearest 28 creatures within approximately 97 metres of the camera
have visible models. Models are created as needed and disposed beyond 180
metres. Route phases advance with game time; pause, customization, map, and
hidden-tab suspension hold the animals still. A returning creature resumes
the same route rather than spawning in a different place.

Earth disposes its old population before terrain regeneration and generates
new habitat-valid residents. Blossom Haven randomizes its population once per
page load, then preserves it with the fixed terrain across return visits and
world relocation. All positions are local to the planet's group.

The study's flat survey and exported routes remain design artifacts; its local
coordinates are not used as world positions. The game enables all visual
features by default.

Implementation: `src/creatures/habitat.ts` handles terrain, placement and paths;
`models.ts` builds the four animals; `study.ts` connects the interactive artifact.

## Verification

`npm test` includes both worlds across multiple seeds, 120 seconds of sampled
motion per resident, missing habitats, map edges, whole-body shore buffers, and
water/land barriers between valid endpoints. `npm run build` builds the study.

`node scripts/creature-smoke.mjs "path/to/chrome.exe"` checks the browser UI,
feature export, both worlds, terrain regeneration, resident shuffling and mobile
layout. Set `FAIRY_TEST_URL` to the server origin if it is not port 5174.

The spherical tests also compare surface placement to raycast intersections,
test seams and polar regions, check body-edge clearance over 120 seconds of
motion across multiple seeds, and exercise regeneration, culling, pause and
home relocation. `scripts/wildlife-smoke.mjs` checks both game populations,
movement, pause and desktop/mobile rendering through read-only development
diagnostics (`/?test`), which are absent from production builds.
