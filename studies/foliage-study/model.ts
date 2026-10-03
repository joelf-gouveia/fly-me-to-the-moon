import type { OptionId } from '../../src/foliage/zones'

/**
 * The text of the foliage study: the options of each world, the levers, the findings in the
 * game of today, and the decisions. The page (main.ts) shows them. The plants are in
 * species.ts, the zones in zones.ts, and the clips in shots.ts.
 */
export type WorldId = 'earth' | 'haven'
export type Option = {
  id: OptionId
  world: WorldId
  /** The label of the option in its world: Before, A, B or C. Before is the game before look B came to it. */
  label: string
  name: string
  /** One line for the card. */
  line: string
  /** What the child sees. */
  child: string
  /** A limit or a risk to know before the work starts. */
  limit: string
  proposed: boolean
}

export const WORLDS: Record<WorldId, string> = { earth: 'Earth', haven: 'Blossom Haven' }

export const OPTIONS: Option[] = [
  {
    id: 'E0', world: 'earth', label: 'Before', name: 'One tree', proposed: false,
    line: 'One cone tree and one grass blade, the same in each place.',
    child: 'A green cone on a short trunk, 5,313 times. The trees stand at the same density from the equator to the edge of the snow. The grass is one thin tuft for each 45 m² of land.',
    limit: 'A child cannot tell one place of Earth from a different place. The trees give no reason to explore.',
  },
  {
    id: 'E1', world: 'earth', label: 'A', name: 'Mixed wood', proposed: false,
    line: 'More kinds of plants, in woods and glades. The same mix in each place.',
    child: 'Pines, round leaf trees and white birches grow in woods. Between the woods are glades with flowers, bushes, rocks and grass. Reeds grow on the river banks. Each tree has its own size and its own green.',
    limit: 'Variety with no theme. The equator and the north look the same, as today.',
  },
  {
    id: 'E2', world: 'earth', label: 'B', name: 'Climate belts', proposed: true,
    line: 'The plants follow the climate: palms at the equator, pines near the snow.',
    child: 'A flight from the equator to a pole goes through jungle with palms and ferns, dry savanna with flat acacia trees, a desert with cactus, leaf forest with flowers, dark pine forest, and snow pines at the snow line. The grass has the colour of its belt, so the belts show from space.',
    limit: 'Earth has a new landscape at each visit. The belts stay at their latitudes, but the jungle and the desert move, because they follow a noise field of the seed.',
  },
  {
    id: 'E3', world: 'earth', label: 'C', name: 'Four seasons', proposed: false,
    line: 'Four lands around the planet: spring, summer, autumn and winter.',
    child: 'Spring has trees in pink blossom and tulips. Summer has deep green trees. Autumn has red, orange and gold trees with mushrooms below. Winter has snow pines, bare trees and white ground. A flight around the equator goes through the four seasons.',
    limit: 'Not true to the real Earth, where a season comes with the time of the year and the latitude. The seasons study (field study 19) proposes real seasons; this look cannot be in the game together with them.',
  },
  {
    id: 'H0', world: 'haven', label: 'Before', name: 'Candy grove', proposed: false,
    line: 'Spiral lollipops, candy canes, marshmallows and gumdrops, the same in each place.',
    child: '359 lollipops, 227 candy canes, 250 marshmallow stones and 703 gumdrops, with the same mix on all the planet. The ground has no grass. Pink candy stands on pink ground.',
    limit: 'The planet has the name Blossom Haven, but only the cottage has a flower. The candy has a low contrast with the ground.',
  },
  {
    id: 'H1', world: 'haven', label: 'A', name: 'Sweet shop', proposed: false,
    line: 'More kinds of candy, in groves and glades, with sugar grass.',
    child: 'Cotton candy trees, ice cream trees and ball lollipops join the spiral lollipops and the candy canes. Gumdrops, marshmallows, pastel flowers and pink sugar grass cover the ground between them.',
    limit: 'Variety with no theme. Each place has the same mix.',
  },
  {
    id: 'H2', world: 'haven', label: 'B', name: 'Four gardens', proposed: true,
    line: 'Four themed gardens: lollipop grove, cotton candy orchard, mushroom glade, crystal peaks.',
    child: 'Each part of the planet is a garden with its own plants and its own ground colour. The lollipop grove is the candy of today. The cotton candy orchard is peach with pastel trees. The mushroom glade is lilac, with toadstools as tall as trees that glow at night. Sugar crystals grow on the high ground.',
    limit: 'The glow needs the night side of the planet. The cottage is at the south pole, where the Sun stays low; the gardens near it are in soft light.',
  },
  {
    id: 'H3', world: 'haven', label: 'C', name: 'Blossom orchard', proposed: false,
    line: 'The name comes true: blossom trees, giant flowers and flower meadows.',
    child: 'Pink blossom trees grow on the middle ground, and white ones on the hills. Flowers as tall as trees stand in mint-green meadows by the water. The candy stays in a lane around the cottage.',
    limit: 'The planet changes from candy to flowers. The README, the flight panel ("Candy groves") and the sticker of Blossom Haven speak of candy.',
  },
]

export const optionById = (id: string) => OPTIONS.find(option => option.id === id)!

/** The design levers. Each one is a change that works with each option. */
export const LEVERS: { id: 'clusters' | 'variation' | 'wind' | 'ground' | 'glow'; name: string; text: string }[] = [
  { id: 'clusters', name: 'Woods and glades', text: 'A noise field makes dense woods and open glades. Trees stand close in a wood, and flowers fill the glades. The number of trees stays almost the same.' },
  { id: 'variation', name: 'Size and colour', text: 'Each plant has its own size, a small lean and a colour from the palette of its kind. One geometry gives a pink, a blue and a lilac cotton candy tree.' },
  { id: 'wind', name: 'Wind', text: 'The top of each plant moves a little in the wind. The graphics card does it in the vertex shader, with no work on each frame for the processor.' },
  { id: 'ground', name: 'Ground colours', text: 'The grass takes the colour of its zone. The themes show from the cloud layer and from space, where a tree is too small to see.' },
  { id: 'glow', name: 'Night glow', text: 'On Blossom Haven, the toadstools, the crystals and the hearts of the giant flowers glow on the night side.' },
]

export const FINDINGS: [string, string][] = [
  ['Earth has one tree', '<code>buildVegetation()</code> in <code>src/worlds.ts</code> makes one cone on a trunk, in one green. The count is 5,313 on a computer and half on a phone.'],
  ['The spread is even', 'A plant can grow on dry land between 1.1 m and 8.5 m, away from a river. Inside these limits, each place has the same chance. Earth has no woods and no glades.'],
  ['The grass is thin', '21,252 tufts of three triangles for all of Earth: one tuft for each 45 m² of land. Blossom Haven has no grass.'],
  ['The candy is one mix', '<code>buildCandyEcosystem()</code> in <code>src/candy.ts</code> gives each fifth point the same kind. Lollipops, canes, marshmallows and gumdrops have the same share on all the planet.'],
  ['Colour repeats', 'Earth trees have one colour. A lollipop takes one of four colours, by its number. No plant has its own size range or lean, apart from one scale factor.'],
  ['Nothing moves', 'The trees, the grass and the candy stand still. Only the soda bubbles and the creatures move near the ground.'],
  ['The cost of today is low', 'Earth draws its plants in three draw calls and 233,772 triangles. The candy of Blossom Haven uses seven draw calls and 774,652 triangles, because each spiral of a lollipop is a fine tube. Each plant is drawn for the whole planet, also behind the horizon.'],
  ['Creatures walk around trees', '<code>CreatureObstacles</code> keeps the creatures out of the trees and the candy. New plants must add their footprints, or a cow walks through an oak.'],
]

export type Decision = { id: string; title: string; why: string; options: string[]; multi?: boolean }
export const DECISIONS: Decision[] = [
  {
    id: 'earth', title: '1. Which look for Earth?',
    why: 'The recommendation is B. It gives a reason to fly from the equator to a pole, and it is true to the real planet.',
    options: ['A — Mixed wood', 'B — Climate belts (recommended)', 'C — Four seasons', 'Keep the trees of today'],
  },
  {
    id: 'haven', title: '2. Which look for Blossom Haven?',
    why: 'The recommendation is B. It keeps the candy of today as one garden, and it adds three new gardens to find.',
    options: ['A — Sweet shop', 'B — Four gardens (recommended)', 'C — Blossom orchard', 'Keep the candy of today'],
  },
  {
    id: 'levers', title: '3. Which levers?', multi: true,
    why: 'Each lever works with each option. The recommendation is all five.',
    options: LEVERS.map(lever => lever.name),
  },
  {
    id: 'phone', title: '4. What does a phone get?',
    why: 'A phone has half the trees of today. The new plants have more triangles for each plant.',
    options: ['Half the plants, all kinds and all levers (recommended)', 'Half the plants and no wind', 'The plants of today on a phone'],
  },
  {
    id: 'plants', title: '5. Which plants to change?',
    why: 'Section 01 shows each plant. Write the plants to remove, to change or to add in the notes.',
    options: ['The plants are good as they are', 'Change some plants (see the notes)'],
  },
]
