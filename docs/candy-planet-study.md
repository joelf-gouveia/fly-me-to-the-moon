# Blossom Haven: candy ecosystem and location study

## Selected for the game

The candy ecosystem and half-Earth diameter are now implemented. The selected
location rule supersedes the original alternatives below: relocate every five
minutes of active unguided play anywhere clear in the compact solar system.
Explicit home navigation pauses the clock; manual approach does not. A visiting
fairy travels with the planet, camera, trail and local scenery. Terrain remains
familiar and the home marker retargets. No outer-rim restriction or doorway was
selected. The interactive study preserves the original 20-minute comparison.

## Original study

Open `/studies/candy-planet-study.html` on the Vite server. This is an adult-facing,
interactive design artifact, not a replacement for the child-facing game.
Its controls and export are review tools only and never override live game state.
The placement alternatives below record the original proposals, not the chosen
five-minute behavior described above.

## Scale and visual direction

“Half the size of Earth” is interpreted as **half the diameter**: Earth radius
220 game metres, home radius 110, diameter 220. This gives one-quarter of Earth's
surface area and one-eighth its volume. A near-surface circumference at a steady
11 m/s takes about a minute, before terrain and altitude effects.

The live 3D preview has pink rolling terrain, a mint-blue soda river with slow
bubbles, spiral lollipops, striped candy canes, cream marshmallow stones, mint
ground cover, flowers, cotton-candy clouds, three ribbon butterflies, and a
flower cottage. Whole-planet and close-up views share one model. Drag to orbit,
zoom, pause motion, and toggle clouds/bubbles. A fixed procedural seed keeps
the scene familiar. The northern garden is deliberately composed as a visual
sample; this is not a finished whole-planet biome distribution system.

Seven selectable field notes cover water, canopy, understory, ground, weather,
creatures, and home. Each explains its fantasy ecosystem role, proposed fly-by
interaction, and child-friendly limits. Reactions described in the notes are
not implemented as gameplay in this artifact.

## Location recommendation

Keep the world **fixed beyond Neptune in the storybook map**, with a flower
doorway near Earth and a permanent Home button. This combines the feeling of
somewhere far away with an easy return. The map is not astronomical scale;
the world's welcoming climate and doorway are explicitly fantasy.

Target a short assisted journey (30–60 seconds is an initial playtest target,
not a countdown or validated attention-span claim). A fully flown outer-rim
route is an alternative, but should offer a shortcut rather than long empty
travel. Arrival should be a broad garden region, not an exact landing.

The optional wandering version uses 20 minutes of **active play**, not wall
clock time or time spent away from the browser. It defers a move while the fairy
approaches or visits; after departure, one move happens and the interval resets.
There are no catch-up jumps. The Home symbol, route, cottage, and landscape seed
survive every move. Never require waiting for the planet to appear. No deadline
or loss of progress. The diagram's “Simulate +20 minutes” button demonstrates
these safeguards without waiting or touching live game state.

## Fit for a four-year-old

Use a large, consistent flower symbol alongside color; no required reading,
collecting, feeding, precise aiming, or boost. Keep effects quiet and sparse,
sound optional, and assistance interruptible. Candy is scenery, not a reward
for consumption. The world continues happily when the child leaves.

NAEYC describes choice, wonder, and delight in play, and encourages predictable,
understandable environments that account for differing stimulation needs.
These are early-childhood education principles, **not validation of this game**.
Our design inference is to preserve a familiar home and avoid surprise loss of
access. Verify by short, adult-supported play: finding the flower, travelling,
returning, and choosing when to pause. Only test roaming after those work well.

Sources checked 25 September 2026:

- [NAEYC: Principles of child development and learning](https://www.naeyc.org/node/3796)
- [NAEYC: Creating a caring, equitable community](https://www.naeyc.org/resources/position-statements/dap/creating-community)

## Implementation and checks

- `studies/candy-planet-study/scene.ts`: code-built 3D visual concept.
- `studies/candy-planet-study/model.ts`: ecosystem brief and pure location-preview model.
- `studies/candy-planet-study/main.ts`: review interface and JSON design export.
- `studies/candy-planet-study/model.test.ts`: scale, fixed home, active time, deferred moves.
- `studies/candy-planet-study/candy-study-smoke.mjs`: browser checks for field notes, location
  comparison, deferred movement, export correctness, and mobile overflow.

Exported JSON records the proposal only. No saved game state is altered.
