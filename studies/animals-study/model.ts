import { SPECIES, readRange, readsFrom, speciesOf } from './catalog'
import type { OptionId, Species } from './catalog'
import { ruleText, ZONE_NAMES } from './rules'
import type { Zone } from './rules'
import bench from '../../public/studies/animals/bench.json'

/**
 * The animals study: more animals for Earth and Blossom Haven, each one where its rules allow. The
 * page (main.ts) shows the catalog, the three options with their clips and their measured cost, the
 * book and the friend, the plan and the decisions. The first option of each decision is the recommendation.
 */
export type ClipId = OptionId | 'S' | 'W' | 'H' | 'L'
export type Size = 'S' | 'M' | 'L'
export const SIZES: Record<Size, string> = { S: 'Less than one day', M: 'One to three days', L: 'More than three days' }

// ---- The measurements ----------------------------------------------------------------------------------

export type BenchRow = { view: string; option: string; calls: number; triangles: number; ms: number; p90: number; shown: number; animalCalls: number }
export type BenchDevice = { gpu: string; width: number; height: number; pixelRatio: number; throttle: number; views: { id: string; name: string }[]; rows: BenchRow[] }
export const BENCH = bench as unknown as { date: string; frames: number; desktop: BenchDevice; phone: BenchDevice; phoneSlow: BenchDevice }
export const DEVICES = [
  { id: 'desktop', name: 'Computer, 1280 × 720' },
  { id: 'phone', name: 'Phone page, 390 × 844' },
  { id: 'phoneSlow', name: 'Phone page, CPU 4 × slower' },
] as const
export type DeviceId = typeof DEVICES[number]['id']
export const BENCH_OPTIONS = ['today', 'A', 'B', 'C'] as const
/** The row of a view, an option and a device. */
export const benchRow = (device: DeviceId, view: string, option: string) => BENCH[device].rows.find(row => row.view === view && row.option === option)!
/** The most draw calls of the animals over the four views, and the longest frame. */
export function worst(device: DeviceId, option: string) {
  const rows = BENCH[device].rows.filter(row => row.option === option)
  return { animalCalls: Math.max(...rows.map(row => row.animalCalls)), ms: Math.max(...rows.map(row => row.ms)), shown: Math.max(...rows.map(row => row.shown)) }
}
/** The longest frame with no animals, over the four views: the cost of the rest of the scene. */
export const baseMs = (device: DeviceId) => Math.max(...BENCH[device].rows.filter(row => row.option === 'none').map(row => row.ms))

// ---- The catalog, by place --------------------------------------------------------------------------------

export type PlaceGroup = { id: string; name: string; world: 'earth' | 'fairy'; species: Species[] }
/** The places of the book: a row for each place, in the order of a flight from the warm belt to the snow. */
const EARTH_PLACES: [string, string, (s: Species) => boolean][] = [
  ['beach', 'Palm beach and shore', s => s.rule.zones.includes('beach') && !s.rule.surfaces.includes('deep') && s.move !== 'leap'],
  ['jungle', 'Jungle', s => s.rule.zones[0] === 'jungle'],
  ['savanna', 'Savanna', s => s.rule.zones[0] === 'savanna'],
  ['desert', 'Desert', s => s.rule.zones[0] === 'desert'],
  ['temperate', 'Leaf forest', s => s.rule.zones[0] === 'temperate'],
  ['taiga', 'Pine forest', s => s.rule.zones[0] === 'taiga'],
  ['tundra', 'Snow line', s => s.rule.zones[0] === 'tundra'],
  ['sea', 'The sea', s => s.rule.surfaces.includes('deep') || s.move === 'leap'],
]
const HAVEN_PLACES: [string, string, (s: Species) => boolean][] = [
  ['grove', 'Lollipop grove and the cottage', s => s.rule.zones[0] === 'grove' && s.rule.zones.length < 4 && !s.rule.magic],
  ['orchard', 'Cotton candy orchard', s => s.rule.zones[0] === 'orchard' && !s.rule.magic],
  ['glade', 'Mushroom glade', s => s.rule.zones[0] === 'glade' && !s.rule.magic],
  ['peaks', 'Crystal peaks', s => s.rule.zones[0] === 'peaks' && !s.rule.magic],
  ['soda', 'Soda water', s => !s.rule.zones.length],
  ['sky', 'High sky', s => s.rule.zones.length === 4],
  ['magic', 'One magic season', s => !!s.rule.magic],
]
/** Each species in exactly one place of the book. */
export function placesOf(world: 'earth' | 'fairy', list: Species[] = SPECIES.filter(s => s.world === world)): PlaceGroup[] {
  const placed = new Set<string>()
  return (world === 'earth' ? EARTH_PLACES : HAVEN_PLACES).map(([id, name, test]) => {
    const species = list.filter(s => !placed.has(s.id) && test(s))
    species.forEach(s => placed.add(s.id))
    return { id, name, world, species }
  }).filter(group => group.species.length)
}
export const catalogRow = (s: Species) => ({ ...s, ruleText: ruleText(s.rule), range: readRange(s.size), reads: readsFrom(s.size) })
export const zoneName = (zone: Zone) => ZONE_NAMES[zone]

// ---- The options ---------------------------------------------------------------------------------------

export type Option = {
  id: OptionId
  name: string
  line: string
  /** How the animals are drawn. */
  drawing: string
  child: string
  book: string
  friend: string
  strong: string[]
  weak: string[]
  risks: string[]
  size: Size
  recommended: boolean
}
const count = (option: OptionId, world: 'earth' | 'fairy') => speciesOf(option, world).length
export const SCOPE = Object.fromEntries((['A', 'B', 'C'] as OptionId[]).map(id => [id, { earth: count(id, 'earth'), fairy: count(id, 'fairy') }])) as Record<OptionId, { earth: number; fairy: number }>

export const OPTIONS: Option[] = [
  {
    id: 'A', name: 'A few kinds for each place', recommended: false, size: 'M',
    line: `${SCOPE.A.earth} kinds on Earth and ${SCOPE.A.fairy} on Blossom Haven, drawn as today: one mesh for each part of each animal.`,
    drawing: 'Each animal is a group of 12 to 40 meshes, and code on the CPU turns its legs, head and tail (as src/creatures/models.ts). Only the nearest 28 animals are drawn (14 on a phone), up to 97 m.',
    child: 'Each belt and each garden has one or two new kinds: a camel in the desert, zebras and a giraffe in the savanna, a monkey and parrots in the jungle, a deer in the leaf forest, a moose in the pine forest, penguins at the snow line in the south, dolphins in the sea; gummy bear cubs, candy-floss lambs, crystal deer and gummy jellyfish on Blossom Haven.',
    book: `${SCOPE.A.earth + SCOPE.A.fairy} cards: the two groups of today, with more cards in each.`,
    friend: 'Each new kind can be a friend: the friend bakes the parts into one mesh, as it does today.',
    strong: ['The smallest change: the population, the hello and the models stay as they are.', 'Each animal moves its parts with code, so a special hello (a giraffe that bends its neck) is easy.'],
    weak: ['The draw calls grow with each animal: the bench measured up to 504 draw calls for the animals on a computer and 274 on a phone page, against 0 to 53 today.', 'Only 28 animals near the camera: a herd far away is not drawn, so the places look empty from the air.'],
    risks: ['A phone with many draw calls loses frames. TODO item 4 already asks for a limit.', 'Herds of zebras or penguins are not possible inside the limit of 28.'],
  },
  {
    id: 'B', name: 'Herds', recommended: true, size: 'L',
    line: `${SCOPE.B.earth} kinds on Earth and ${SCOPE.B.fairy} on Blossom Haven. Each kind is one joined model, drawn as instances: one draw call for each kind in the view.`,
    drawing: 'All the parts of a kind are one geometry with a colour and a rig value in each vertex. A shader turns the legs, the head, the tail and the wings on the graphics card, so one InstancedMesh draws a whole herd. After 45 m (32 m on a phone) a simple far model with fewer faces and no details. At most 260 animals in the view (130 on a phone), up to 170 m.',
    child: 'Herds that she sees from far: zebras, giraffes and elephants on the savanna, a row of penguins, reindeer on the snow, flamingos in the shallow water, dolphins that leap, a whale that blows, parrots and gulls in loops. On Blossom Haven gummy bear cubs in five candy colours, candy-floss lambs, crystal deer, gummy jellyfish and the soda serpent.',
    book: `${SCOPE.B.earth + SCOPE.B.fairy} cards, in one page for each world, with a row for each place.`,
    friend: 'The joined model of a kind is the friend model: the same bake, with the wings of a flier as their own mesh.',
    strong: ['The draw calls depend on the kinds in the view, not on the animals: 9 to 30 for 130 to 260 animals.', 'Herds of 4 to 9 animals read from far, as in the real world.', 'One joined model gives the herd, the far model, the friend and the picture of the card.'],
    weak: ['A new population, a new shader and a new hello for instances: the most new code of the three.', 'The pose of each animal is code on the CPU in each frame: on a CPU 4 times slower the bench measured 7.7 to 9.5 ms against about 5 ms with no animals. The build must update far herds less often.'],
    risks: ['A shader on the instance model must keep the look of the faceted Earth animals; the clips show that it does.', 'Two kinds near each other must not overlap: the study places each kind with a gap to the others.'],
  },
  {
    id: 'C', name: 'A living layer', recommended: false, size: 'L',
    line: `${SCOPE.C.earth} kinds on Earth and ${SCOPE.C.fairy} on Blossom Haven. Only the nearest 12 animals are models (6 on a phone); each other animal is a point, and the small life (fish, butterflies, fireflies, geese, moths, bees) is points or tiny instances.`,
    drawing: 'The joined models of B for the nearest animals, then one draw call of points for all the far animals and the small life, and one of additive points for the lights of the fireflies and the moths.',
    child: 'The sea and the sky are alive: schools of fish jump, butterflies over the meadows in spring and summer, a V of geese in autumn, fireflies on summer nights; on Blossom Haven honey-drop bees in Blossom time, bubble fish in Bubble time, lantern moths in Lantern time and sugar owlets in Crystal time. Far animals are soft dots.',
    book: `${SCOPE.C.earth + SCOPE.C.fairy} cards: the cards of B, and a row of small life and of the magic seasons.`,
    friend: 'The kinds with a model can be friends. A school of fish or a swarm is not a friend; a lantern moth can be.',
    strong: ['The fewest draw calls: 4 to 7 for the animals.', 'Many small animals for almost no cost, and they make the seasons and the night alive.'],
    weak: ['A far animal is a dot: a giraffe at 60 m has no long neck. The far silhouette is lost.', 'Only 12 models near the fairy: a herd that she flies over shows models and dots together.'],
    risks: ['Dots that change into models when she comes near can catch the eye.', 'The CPU cost is the same as B: the poses of all the animals in 220 m are computed.'],
  },
]
export const optionById = (id: OptionId) => OPTIONS.find(option => option.id === id)!

// ---- The clips -----------------------------------------------------------------------------------------

export type Moment = { t: number; caption: string }
export type Clip = { id: ClipId; name: string; option: OptionId; question: string; length: number; moments: [Moment, Moment, Moment] }
export const CLIPS: Clip[] = [
  {
    id: 'A', name: 'A · Across the belts', option: 'A', length: 13,
    question: 'With a few kinds and the models of today, does each place of Earth get its own animals?',
    moments: [
      { t: 1.5, caption: 'The savanna: a herd of zebras. The label counts the draw calls of the animals in the view: 279 for 28 animals, because each part of each animal is a mesh.' },
      { t: 5.5, caption: 'The leaf forest: deer at the edge of the wood. Still about 180 draw calls.' },
      { t: 11.5, caption: 'The snow line is empty: A has no kind for the north of the snow line (the penguins live in the south).' },
    ],
  },
  {
    id: 'B', name: 'B · Across the belts', option: 'B', length: 13,
    question: 'With herds of 27 kinds, does the flight from the savanna to the snow show the right animals in each belt?',
    moments: [
      { t: 1.5, caption: 'The same route as A and C. The savanna: zebras, and cows at the edge of the leaf forest behind. 28 draw calls for 260 animals.' },
      { t: 5.5, caption: 'The leaf forest: deer near the wood, and a fox that says hello with hearts.' },
      { t: 11.5, caption: 'The snow line: a herd of reindeer on the snow.' },
    ],
  },
  {
    id: 'C', name: 'C · Across the belts', option: 'C', length: 13,
    question: 'With few models and a living layer, what does the same flight look like?',
    moments: [
      { t: 1.5, caption: 'The same savanna: two zebras near the fairy are models; the rest of the herd are white dots. 6 draw calls.' },
      { t: 5.5, caption: 'The leaf forest: the fox and the near deer are models, the far animals are dots.' },
      { t: 11.5, caption: 'The snow line: the reindeer near the fairy are models. 5 draw calls for all the animals.' },
    ],
  },
  {
    id: 'S', name: 'A herd on the savanna', option: 'B', length: 11,
    question: 'Does a herd of zebras with giraffes and elephants read as a savanna for a child of 5?',
    moments: [
      { t: 4.5, caption: 'A herd of zebras with elephants and giraffes on the savanna, each one on its own ground.' },
      { t: 6.5, caption: 'An elephant family with a calf, near the edge of the jungle.' },
      { t: 10.5, caption: 'Giraffes and zebras by the river. The giraffe reads from the farthest, as its 3.2 m says.' },
    ],
  },
  {
    id: 'W', name: 'The sea, the shore and the air', option: 'C', length: 10,
    question: 'Can fish and dolphins show in water that is not clear, and do flamingos and gulls fit the shore?',
    moments: [
      { t: 3, caption: 'A pod of dolphins leaps next to her; one says hello with hearts. Under the water they are not seen, so they show by their leaps.' },
      { t: 6, caption: 'Flamingos stand in the shallow water at the shore, and a flock of gulls loops in the sky.' },
      { t: 7, caption: 'The flamingos say hello: hearts over the pink birds.' },
    ],
  },
  {
    id: 'H', name: 'The gardens of Blossom Haven', option: 'B', length: 13,
    question: 'Are the new creatures magic and sweet, and does each one fit its garden?',
    moments: [
      { t: 2.8, caption: 'Gummy bear cubs in their candy colours between the lollipops say hello.' },
      { t: 6, caption: 'Candy-floss lambs in the cotton candy orchard: puffs of pink and blue on small legs.' },
      { t: 11, caption: 'Crystal deer on the crystal peaks, with antlers of sugar crystal.' },
    ],
  },
  {
    id: 'L', name: 'Lantern time', option: 'C', length: 10,
    question: 'Can a creature of one magic season make the night friendly?',
    moments: [
      { t: 2, caption: 'Lantern time in the mushroom glade at night: lantern moths glow around the toadstools.' },
      { t: 4, caption: 'The moths circle near the fairy, each one with a soft warm light.' },
      { t: 9.5, caption: 'Gummy jellyfish on the soda water say hello to her.' },
    ],
  },
]
export const clipById = (id: ClipId) => CLIPS.find(clip => clip.id === id)!

// ---- The findings --------------------------------------------------------------------------------------

export const FINDINGS: [string, string][] = [
  ['No animal follows a place today', '<code>populateSphere()</code> in <code>src/creatures/spherical.ts</code> puts each of the 4 kinds at random points of the whole planet; it only checks land or water, the height and the slope. A cow can stand on the snow line or in the desert. Only the first 4 of each land kind start near the meadow.'],
  ['The zones are ready', '<code>zoneAt()</code> in <code>src/foliage/zones.ts</code> gives the climate belt of each point of Earth (look E2) and the garden of each point of Blossom Haven (look H2). The plants use it today. The rules of the study read the same function, so an animal and its plants always agree.'],
  ['Earth is new at each visit', '<code>regenerateWorld()</code> makes a new Earth with a new seed. The study places each kind by rules on a survey of the planet (40,000 points on Earth, 16,000 on Blossom Haven), never at a fixed place, and each kind has its own random numbers, so a kind has the same places in each option.'],
  ['One animal is many draw calls', 'The Earth animals of today are one mesh for each part (cow 28, sheep 18, rabbit 14, duck 8); the fairytale creatures are joined into 14 to 21 meshes. The bench measured 0 to 53 draw calls for the animals of today in the four views, and TODO item 4 saw 111 to 237 draw calls for the whole frame at 390 px.'],
  ['The water is not clear', 'The water of Earth and Blossom Haven is an opaque sphere. A fish under the water is not seen. The study shows the sea by leaps (dolphins, fish) and by animals on the top of the water (whale, ducks, jellyfish).'],
  ['The friend bakes any model', '<code>bake()</code> in <code>src/friend.ts</code> joins the parts of a model into one mesh and its wings into a second one. The joined geometry of the study is the same idea, so each new kind can be a friend with no new friend code.'],
  ['Seasons and magic seasons are values of a place', '<code>seasonAt()</code> and <code>snowCover()</code> in <code>src/seasons.ts</code> and <code>magicAt()</code> in <code>src/magic-seasons.ts</code> give the season of a latitude. A rule can read them: storks in summer, a white hare in snow, lantern moths in Lantern time.'],
  ['The CPU is the cost of many animals', 'With the CPU 4 times slower, the frame with no animals took about 5 ms. B and C took 7.7 to 9.5 ms, A 8 to 9.6 ms. In B and C the extra time is the code that computes the pose of each animal in each frame, not the draw calls.'],
]

// ---- The book and the friend ------------------------------------------------------------------------------

export const BOOK_RULES: [string, string][] = [
  ['One page for each world', 'The Animals tab of My book gets two pages: Earth and Blossom Haven, with the world picture of Worlds on each tab. A child of 5 finds the cow on the Earth page and the unicorn on the other page.'],
  ['A row for each place', 'On each page a row for each place, with a small picture of the place (a palm, an acacia, a pine, a lollipop) and its name for the grown-up. A row has 1 to 6 cards. The rows follow a flight: warm to cold on Earth, the gardens then the water and the sky on Blossom Haven.'],
  ['The same card', 'A card stays as today: the picture, the name and three picture facts. A kind that she did not meet is a shadow with its place. The count on the tab is the size of the book, for example "12/40", never a score.'],
  ['On a phone', 'Three cards in each row, as today. The place picture is the head of the row, so the rows stay short. The note at the top stays on top while the cards scroll.'],
]
export const FRIEND_RULES: [string, string][] = [
  ['Each kind that she met', 'FRIEND_KINDS comes from the catalog. A kind with wings or fins flies with its wings (parrot, stork, gull, penguin flippers, pegasus foal, griffin chick, phoenix chick, lantern moth); each other kind rides in a soap bubble.'],
  ['A small one of a big kind', 'friendSize() makes each friend the same size, so a whale or a giraffe is a baby in its bubble. The friend model is the joined model of the kind, baked as today.'],
  ['The old data stays', 'parseFriend() keeps only the known kinds, so a saved friend of today loads with no change. The new kinds add to the met list at their first hello.'],
  ['Not a friend', 'A school of fish, the butterflies, the fireflies and the bees are a group, not one animal: they get a card in the book but no "Fly with me".'],
]

// ---- The plan ------------------------------------------------------------------------------------------

export const PLAN: [string, string][] = [
  ['The catalog and the rules', 'Move <code>catalog.ts</code> and <code>rules.ts</code> of the study to <code>src/creatures/</code>. Test: each species has a rule with zone ids of <code>BELTS</code> or <code>GARDENS</code>, a valid surface, and no Blossom Haven species has an Earth name.'],
  ['The joined models', 'Move <code>shapes.ts</code> and <code>build.ts</code> to <code>src/creatures/</code> (the far model, the rig shader, the parts model for the friend). Test: each model stands on y = 0, has its rig values, and its joined geometry has one draw call.'],
  ['The herds', 'A new <code>src/creatures/herds.ts</code>: the survey, the placement of each kind with its own random numbers and a gap to the other kinds, the routes checked with <code>SphericalHabitat</code> and the obstacles. It replaces <code>populateSphere()</code> for both worlds. Test: each herd fits its rule, no two herds overlap, and a seed gives the same herds.'],
  ['The renderer', '<code>src/creatures/population.ts</code> draws one InstancedMesh for each kind and look, with the caps of B. Update the far herds at 10 frames a second and cache the poses of resting herds: the slow-CPU bench shows that this code is the cost. Keep the hello: a hop and hearts for an instance.'],
  ['The seasons', '<code>src/main.ts</code> gives the season of Earth and the magic year to the herds: the storks and the hare coat on Earth; the seasonal creatures on Blossom Haven after the layer of C.'],
  ['The book and the friend', 'FRIEND_KINDS and the cards from the catalog; the book pages and rows of <code>src/animal-book-ui.ts</code>; the picture of a card from the joined model. Test the old saved data with <code>parseFriend()</code>.'],
  ['The browser check', 'Extend <code>scripts/wildlife-smoke.mjs</code>: at 1280 px the animals have at most 40 draw calls and at 390 px at most 20; no land animal is on the water, no swimmer on land; each species on the screen is in a zone of its rule. Close TODO item 4 with the limit of the phone.'],
  ['The small life (later)', 'The point layer of C for fish, butterflies, fireflies, geese and the creatures of the magic seasons: two draw calls. A second change, after B is in the game.'],
]

// ---- The decisions -------------------------------------------------------------------------------------

export type Decision = { id: string; title: string; why: string; options: string[] }
export const DECISIONS: Decision[] = [
  { id: 'option', title: '1 / Which option?', why: 'B shows herds from far for 9 to 30 draw calls. A costs hundreds of draw calls for 28 animals. C loses the far shapes.', options: ['B · Herds (recommended)', 'A · A few kinds for each place', 'C · A living layer', 'A now, B later'] },
  { id: 'small', title: '2 / The small life: fish, butterflies, fireflies, geese, moths, bees', why: 'Points cost two draw calls and make the sea, the seasons and the night alive. They are a second change.', options: ['After B, add the point layer of C (recommended)', 'With B, at once', 'No small life'] },
  { id: 'far', title: '3 / Animals far away', why: 'A giraffe reads to about 130 m. Today nothing is drawn after 97 m.', options: ['A simple far model to 170 m, as B (recommended)', 'A dot, as C', 'Nothing after 97 m, as today'] },
  { id: 'phone', title: '4 / The limit of a phone (TODO item 4)', why: 'The bench gave 9 to 21 draw calls for 130 animals on the phone page with B.', options: ['130 animals, near model to 32 m, at most 20 draw calls (recommended)', 'The same limits as a computer', '60 animals'] },
  { id: 'today', title: '5 / The four animals of today', why: 'A cow on the snow line does not follow the real world.', options: ['Cow, sheep and rabbit to the leaf forest, the duck to its rivers (recommended)', 'They stay everywhere, as today'] },
  { id: 'seasons', title: '6 / Seasons on Earth', why: 'Earth has real seasons. A few animals can show them; no animal must be missing for long.', options: ['A few kinds follow the season: storks, geese, butterflies, fireflies and the coat of the hare (recommended)', 'Each kind all year'] },
  { id: 'magic', title: '7 / Creatures of the magic seasons', why: 'Each magic season has its own plants and air. A creature of its own makes it a small event.', options: ['One creature for each magic season: bees, bubble fish, lantern moths, sugar owlets (recommended)', 'No seasonal creatures'] },
  { id: 'book', title: '8 / The book with 40 cards', why: 'Nine cards fit one page. Forty need an order that a child of 5 can follow.', options: ['One page for each world, a row for each place with its picture (recommended)', 'One long page in two groups, as today', 'Only the met kinds, with no shadows'] },
  { id: 'friend', title: '9 / Which kinds can be the friend?', why: 'The joined model of each kind is a friend model with no new code.', options: ['Each kind that she met, except a group (school, swarm) (recommended)', 'Only the small kinds', 'Only the nine of today'] },
  { id: 'calm', title: '10 / The fox and the bears', why: 'In the real world they hunt. In the game they never chase or eat another animal.', options: ['Keep them calm: the fox trots and sits, the bears pick berries (recommended)', 'Leave them out'] },
]

/** The rows of the comparison table. */
export const COMPARE: { row: string; values: Record<OptionId, string> }[] = [
  { row: 'Kinds (Earth / Blossom Haven)', values: { A: `${SCOPE.A.earth} / ${SCOPE.A.fairy}`, B: `${SCOPE.B.earth} / ${SCOPE.B.fairy}`, C: `${SCOPE.C.earth} / ${SCOPE.C.fairy}` } },
  { row: 'How it draws', values: { A: 'One mesh for each part', B: 'One instanced joined model for each kind, a far model', C: 'Few joined models, points for the rest' } },
  { row: 'Animals drawn (computer / phone)', values: { A: '28 / 14', B: 'Up to 260 / 130', C: '12 / 6 models, and points' } },
  { row: 'Draw calls for the animals, computer (most of 4 views)', values: { A: `${worst('desktop', 'A').animalCalls}`, B: `${worst('desktop', 'B').animalCalls}`, C: `${worst('desktop', 'C').animalCalls}` } },
  { row: 'Draw calls for the animals, phone page', values: { A: `${worst('phone', 'A').animalCalls}`, B: `${worst('phone', 'B').animalCalls}`, C: `${worst('phone', 'C').animalCalls}` } },
  { row: 'Longest frame, computer', values: { A: `${worst('desktop', 'A').ms} ms`, B: `${worst('desktop', 'B').ms} ms`, C: `${worst('desktop', 'C').ms} ms` } },
  { row: 'Longest frame, phone page / CPU 4 × slower', values: { A: `${worst('phone', 'A').ms} / ${worst('phoneSlow', 'A').ms} ms`, B: `${worst('phone', 'B').ms} / ${worst('phoneSlow', 'B').ms} ms`, C: `${worst('phone', 'C').ms} / ${worst('phoneSlow', 'C').ms} ms` } },
  { row: 'Far animals', values: { A: 'None after 97 m', B: 'A simple model to 170 m', C: 'Dots to 220 m' } },
  { row: 'Cards in the book', values: { A: `${SCOPE.A.earth + SCOPE.A.fairy}`, B: `${SCOPE.B.earth + SCOPE.B.fairy}`, C: `${SCOPE.C.earth + SCOPE.C.fairy}` } },
  { row: 'Size of the work', values: { A: 'M', B: 'L', C: 'L (B and the layer)' } },
]
