import type { Rule } from './rules'

/**
 * The catalog of the animals study: each species that an option puts on Earth or on Blossom Haven.
 * Earth follows the real world. Blossom Haven gets creatures from stories and candy, not copies of
 * the animals of Earth. Nothing hunts, chases or eats another animal; each species walks, hops,
 * swims, flies a loop or rests, and says hello.
 */
export type OptionId = 'A' | 'B' | 'C'
/** How the species moves. */
export type Move = 'walk' | 'hop' | 'waddle' | 'swim' | 'leap' | 'fly' | 'float' | 'crawl'
/**
 * The layer that draws the species. A herd and a flock are 3D models. Small life is the layer of
 * option C: small animals that come in large numbers (fish, butterflies, moths), drawn as points.
 */
export type Layer = 'herd' | 'flock' | 'small'

export type Species = {
  id: string
  name: string
  world: 'earth' | 'fairy'
  rule: Rule
  /** The animals of one group: the smallest and the largest count. */
  herd: [number, number]
  move: Move
  layer: Layer
  behaviour: string
  /** What the species does at a hello, before the pink hearts float up. */
  hello: string
  /** Why it is right for a child of 5. */
  why: string
  /** The height (or the length of a swimmer) in metres, in the game's scale: a cow is 1.25 m. */
  size: number
  /** The options that have the species. */
  options: OptionId[]
  /** The game has the species today (src/creatures/). */
  existing?: boolean
  /** The study has a 3D model of it (shapes.ts). */
  prototype: boolean
  /** A friend with wings flies; each other friend rides in a soap bubble (src/friend.ts). */
  friend: 'wings' | 'bubble'
  /** The main colour, for a far dot of option C and for the page. */
  colour: string
}

const ABC: OptionId[] = ['A', 'B', 'C']
const BC: OptionId[] = ['B', 'C']
const C: OptionId[] = ['C']

const earth = (zones: Rule['zones'], surfaces: Rule['surfaces'], more: Partial<Rule> = {}): Rule => ({ world: 'earth', zones, surfaces, ...more })
const haven = (zones: Rule['zones'], surfaces: Rule['surfaces'], more: Partial<Rule> = {}): Rule => ({ world: 'fairy', zones, surfaces, ...more })
const WARM = ['beach', 'jungle', 'savanna', 'desert'] as const
const ALL_GARDENS = ['grove', 'orchard', 'glade', 'peaks'] as const

export const SPECIES: Species[] = [
  // ---- Earth: the leaf forest and its meadows (the four animals of today move here) ----------------
  { id: 'cow', name: 'Cow', world: 'earth', rule: earth(['temperate'], ['land']), herd: [3, 5], move: 'walk', layer: 'herd', size: 1.25,
    behaviour: 'Stroll, graze, turn back', hello: 'Lifts its head and hops', why: 'A farm animal that she knows from books', options: ABC, existing: true, prototype: true, friend: 'bubble', colour: '#e9e1cf' },
  { id: 'sheep', name: 'Sheep', world: 'earth', rule: earth(['temperate', 'taiga'], ['land']), herd: [4, 7], move: 'walk', layer: 'herd', size: 1,
    behaviour: 'Amble in a flock, graze', hello: 'Hops, and the flock looks up', why: 'Soft, round and white: easy to see on green grass', options: ABC, existing: true, prototype: true, friend: 'bubble', colour: '#f3e9d3' },
  { id: 'rabbit', name: 'Rabbit', world: 'earth', rule: earth(['temperate'], ['land', 'shore']), herd: [2, 4], move: 'hop', layer: 'herd', size: 0.7,
    behaviour: 'Hop, pause, hop', hello: 'Sits up, ears high, then hops', why: 'Hops are fun to copy', options: ABC, existing: true, prototype: true, friend: 'bubble', colour: '#b78b6b' },
  { id: 'duck', name: 'Duck', world: 'earth', rule: earth(['temperate', 'taiga', 'jungle'], ['river', 'sea']), herd: [3, 5], move: 'swim', layer: 'herd', size: 0.6,
    behaviour: 'Paddle in a row, drift', hello: 'Bobs and flaps its wings', why: 'A duck family in a row on a river', options: ABC, existing: true, prototype: true, friend: 'wings', colour: '#e6bb77' },
  { id: 'deer', name: 'Deer', world: 'earth', rule: earth(['temperate'], ['land']), herd: [2, 4], move: 'walk', layer: 'herd', size: 1.35,
    behaviour: 'Walk at the edge of the wood, stop and look', hello: 'Lifts its head, flicks its white tail', why: 'Gentle and shy; the fawn is the baby', options: ABC, prototype: true, friend: 'bubble', colour: '#c08a5a' },
  { id: 'fox', name: 'Fox', world: 'earth', rule: earth(['temperate', 'taiga'], ['land']), herd: [1, 2], move: 'walk', layer: 'herd', size: 0.6,
    behaviour: 'Trot, sit, curl the bushy tail', hello: 'Sits and wags its tail', why: 'An orange fox with a white tail tip, as in her picture books. It never hunts in the game', options: BC, prototype: true, friend: 'bubble', colour: '#e8833a' },
  { id: 'stork', name: 'Stork', world: 'earth', rule: earth(['temperate', 'savanna'], ['land', 'shore'], { air: [8, 14] }), herd: [2, 4], move: 'fly', layer: 'flock', size: 1,
    behaviour: 'Summer in the leaf forest, winter in the savanna: it travels with the seasons', hello: 'Clatters its beak and circles once', why: 'Shows that birds go away and come back', options: BC, prototype: true, friend: 'wings', colour: '#f4f1ea' },
  // ---- Earth: the pine forest ----------------------------------------------------------------------
  { id: 'moose', name: 'Moose', world: 'earth', rule: earth(['taiga'], ['land', 'shore']), herd: [1, 2], move: 'walk', layer: 'herd', size: 2,
    behaviour: 'Walk slowly near the water, eat leaves', hello: 'Nods its big antlers', why: 'Very big and very calm; the antlers read from far', options: ABC, prototype: true, friend: 'bubble', colour: '#6e4c35' },
  { id: 'bear', name: 'Brown bear and cub', world: 'earth', rule: earth(['taiga'], ['land']), herd: [2, 2], move: 'walk', layer: 'herd', size: 1.4,
    behaviour: 'Amble, sit and pick berries', hello: 'The cub sits up and waves a paw', why: 'A mother and her cub, like the teddy bear. They eat berries in the game', options: BC, prototype: true, friend: 'bubble', colour: '#8a5a3a' },
  { id: 'beaver', name: 'Beaver', world: 'earth', rule: earth(['taiga', 'temperate'], ['shore']), herd: [1, 2], move: 'waddle', layer: 'herd', size: 0.5,
    behaviour: 'Waddle on the river bank, slap the flat tail', hello: 'Slaps its tail on the ground', why: 'The flat tail is funny; it builds with sticks', options: BC, prototype: true, friend: 'bubble', colour: '#8b5e3c' },
  // ---- Earth: the snow line ------------------------------------------------------------------------
  { id: 'reindeer', name: 'Reindeer', world: 'earth', rule: earth(['tundra'], ['land']), herd: [4, 7], move: 'walk', layer: 'herd', size: 1.35,
    behaviour: 'Walk in a herd over the snow', hello: 'Shakes its antlers', why: 'The winter animal of the stories', options: BC, prototype: true, friend: 'bubble', colour: '#8b6a4e' },
  { id: 'hare', name: 'Arctic hare', world: 'earth', rule: earth(['tundra', 'taiga'], ['land']), herd: [1, 3], move: 'hop', layer: 'herd', size: 0.6,
    behaviour: 'Hop; the coat is white in winter and brown in summer (snowCover() of src/seasons.ts)', hello: 'Sits up on its long feet', why: 'It changes colour with the season: a small surprise', options: BC, prototype: true, friend: 'bubble', colour: '#f4f6f8' },
  { id: 'penguin', name: 'Penguin', world: 'earth', rule: earth(['tundra', 'polar'], ['shore', 'land'], { hemisphere: 'south' }), herd: [5, 9], move: 'waddle', layer: 'herd', size: 0.7,
    behaviour: 'Waddle in a line to the water, slide on the belly', hello: 'Flaps both flippers', why: 'The waddle makes children laugh. Only in the south, as on the real Earth', options: ABC, prototype: true, friend: 'bubble', colour: '#2f3a4a' },
  { id: 'seal', name: 'Seal', world: 'earth', rule: earth(['tundra', 'polar', 'taiga'], ['shore']), herd: [2, 4], move: 'crawl', layer: 'herd', size: 0.6,
    behaviour: 'Rest on the shore, roll, slide into the sea', hello: 'Claps its flippers', why: 'A round grey seal that claps', options: BC, prototype: true, friend: 'bubble', colour: '#9aa4ad' },
  // ---- Earth: the savanna and the desert ---------------------------------------------------------
  { id: 'zebra', name: 'Zebra', world: 'earth', rule: earth(['savanna'], ['land']), herd: [4, 8], move: 'walk', layer: 'herd', size: 1.35,
    behaviour: 'Walk and graze in a herd', hello: 'Shakes its mane', why: 'Stripes: the clearest pattern of all', options: ABC, prototype: true, friend: 'bubble', colour: '#f2f0ea' },
  { id: 'giraffe', name: 'Giraffe', world: 'earth', rule: earth(['savanna'], ['land']), herd: [2, 4], move: 'walk', layer: 'herd', size: 3.2,
    behaviour: 'Walk slowly between the acacias, eat from the tops', hello: 'Bends its long neck down to her', why: 'The tallest animal: she sees it from far', options: ABC, prototype: true, friend: 'bubble', colour: '#f0c76a' },
  { id: 'elephant', name: 'Elephant', world: 'earth', rule: earth(['savanna', 'jungle'], ['land']), herd: [2, 4], move: 'walk', layer: 'herd', size: 2.2,
    behaviour: 'A family walks, the calf in the middle', hello: 'Lifts its trunk', why: 'A big gentle family with a calf', options: BC, prototype: true, friend: 'bubble', colour: '#9aa3ad' },
  { id: 'camel', name: 'Camel', world: 'earth', rule: earth(['desert'], ['land']), herd: [1, 3], move: 'walk', layer: 'herd', size: 2,
    behaviour: 'Walk slowly in a line, rest on the knees', hello: 'Turns its long neck and blinks', why: 'The hump says "desert" at once', options: ABC, prototype: true, friend: 'bubble', colour: '#d9a96a' },
  { id: 'meerkat', name: 'Meerkat', world: 'earth', rule: earth(['desert', 'savanna'], ['land']), herd: [3, 6], move: 'hop', layer: 'herd', size: 0.45,
    behaviour: 'Stand up and look, run a little, stand up again', hello: 'Stands very tall', why: 'A row of little lookouts', options: BC, prototype: true, friend: 'bubble', colour: '#d9b98a' },
  // ---- Earth: the jungle and the palm beach ----------------------------------------------------
  { id: 'monkey', name: 'Monkey', world: 'earth', rule: earth(['jungle'], ['land']), herd: [2, 4], move: 'hop', layer: 'herd', size: 0.7,
    behaviour: 'Hop on four legs, sit, swing the tail', hello: 'Sits up and claps', why: 'Playful and a little silly', options: ABC, prototype: true, friend: 'bubble', colour: '#8a5a3a' },
  { id: 'parrot', name: 'Parrot', world: 'earth', rule: earth(['jungle'], ['land', 'shore'], { air: [6, 12] }), herd: [3, 5], move: 'fly', layer: 'flock', size: 0.55,
    behaviour: 'Fly a loop over the trees in a small flock', hello: 'Loops around her once', why: 'Red, blue and yellow: the bright colours of the jungle', options: ABC, prototype: true, friend: 'wings', colour: '#e8473a' },
  { id: 'capybara', name: 'Capybara', world: 'earth', rule: earth(['jungle', 'beach'], ['shore']), herd: [3, 5], move: 'walk', layer: 'herd', size: 0.6,
    behaviour: 'Rest in a calm row on the river bank', hello: 'Blinks slowly and wiggles its ears', why: 'The calmest animal: it rests with the others', options: BC, prototype: true, friend: 'bubble', colour: '#a0714a' },
  { id: 'flamingo', name: 'Flamingo', world: 'earth', rule: earth(['beach', 'savanna'], ['shore', 'sea']), herd: [5, 9], move: 'walk', layer: 'herd', size: 1.2,
    behaviour: 'Stand in the shallow water, walk on long legs', hello: 'Stands on one leg and nods', why: 'Pink, and it stands on one leg', options: ABC, prototype: true, friend: 'wings', colour: '#f59cb0' },
  { id: 'turtle', name: 'Sea turtle', world: 'earth', rule: earth(['beach'], ['shore', 'sea']), herd: [1, 2], move: 'crawl', layer: 'herd', size: 0.4,
    behaviour: 'Crawl slowly over the sand, swim at the surface', hello: 'Pulls its head in and out', why: 'Slow and safe in its shell', options: BC, prototype: true, friend: 'bubble', colour: '#6f8f4a' },
  { id: 'seagull', name: 'Seagull', world: 'earth', rule: earth(['beach', 'temperate', 'savanna', 'jungle'], ['shore', 'sea'], { air: [6, 12] }), herd: [3, 6], move: 'fly', layer: 'flock', size: 0.5,
    behaviour: 'Glide in loops over the shore', hello: 'Glides close and calls', why: 'The bird of each beach', options: BC, prototype: true, friend: 'wings', colour: '#f6f6f2' },
  // ---- Earth: the sea --------------------------------------------------------------------------
  { id: 'dolphin', name: 'Dolphin', world: 'earth', rule: earth(['beach', 'jungle', 'savanna', 'desert', 'temperate'], ['sea', 'deep']), herd: [3, 5], move: 'leap', layer: 'herd', size: 1.8,
    behaviour: 'Swim in a pod and leap in arcs', hello: 'Leaps high next to her', why: 'Leaps are the best part of the sea', options: ABC, prototype: true, friend: 'bubble', colour: '#7f9fb8' },
  { id: 'whale', name: 'Whale', world: 'earth', rule: earth([], ['deep']), herd: [1, 2], move: 'swim', layer: 'herd', size: 9,
    behaviour: 'Swim slowly at the surface and blow a spout', hello: 'Blows a big spout', why: 'The biggest animal; the spout reads from very far', options: BC, prototype: true, friend: 'bubble', colour: '#5d7fa8' },
  // ---- Earth: small life (option C) ------------------------------------------------------------
  { id: 'fish', name: 'Silver fish', world: 'earth', rule: earth([...WARM, 'temperate', 'taiga'], ['sea', 'river']), herd: [8, 14], move: 'leap', layer: 'small', size: 0.3,
    behaviour: 'A school jumps out of the water in little arcs. The water of the game is not clear, so fish show only when they jump', hello: 'The whole school jumps at once', why: 'Many small jumps sparkle in the sun', options: C, prototype: true, friend: 'bubble', colour: '#bfd6e6' },
  { id: 'butterfly', name: 'Butterflies', world: 'earth', rule: earth(['temperate', 'jungle', 'savanna'], ['land'], { air: [1, 3], seasons: ['spring', 'summer'] }), herd: [6, 12], move: 'fly', layer: 'small', size: 0.2,
    behaviour: 'Flutter over the flowers in spring and summer', hello: 'They circle her in a ring', why: 'A cloud of colour over the meadow', options: C, prototype: false, friend: 'wings', colour: '#ffb347' },
  { id: 'firefly', name: 'Fireflies', world: 'earth', rule: earth(['temperate', 'jungle'], ['land', 'shore'], { air: [0.5, 3], seasons: ['summer'] }), herd: [10, 20], move: 'float', layer: 'small', size: 0.1,
    behaviour: 'Glow and drift on summer nights', hello: 'They glow brighter', why: 'Small lights make the night friendly', options: C, prototype: false, friend: 'wings', colour: '#f6f08a' },
  { id: 'goose', name: 'Geese', world: 'earth', rule: earth(['temperate', 'taiga'], ['land', 'river'], { air: [14, 20], seasons: ['autumn', 'spring'] }), herd: [7, 11], move: 'fly', layer: 'small', size: 0.6,
    behaviour: 'A V of geese crosses the belts toward the equator in autumn and back in spring', hello: 'The V dips its wings', why: 'Shows the travel of the seasons in the sky', options: C, prototype: true, friend: 'wings', colour: '#8d8172' },

  // ---- Blossom Haven: the five creatures of today ------------------------------------------------
  { id: 'unicorn', name: 'Unicorn', world: 'fairy', rule: haven(['grove', 'orchard'], ['land']), herd: [2, 3], move: 'walk', layer: 'herd', size: 1.4,
    behaviour: 'Stroll, graze, turn back', hello: 'The horn glows and it hops', why: 'The creature that she asked for', options: ABC, existing: true, prototype: true, friend: 'bubble', colour: '#fff6f8' },
  { id: 'dragonling', name: 'Dragonling', world: 'fairy', rule: haven(['grove', 'glade'], ['land']), herd: [3, 5], move: 'waddle', layer: 'herd', size: 1.2,
    behaviour: 'Waddle, rest, puff candy floss', hello: 'Puffs a little cloud', why: 'A baby dragon that is not scary', options: ABC, existing: true, prototype: true, friend: 'wings', colour: '#9fd9c3' },
  { id: 'kitsune', name: 'Kitsune kit', world: 'fairy', rule: haven(['glade', 'orchard'], ['land']), herd: [2, 3], move: 'hop', layer: 'herd', size: 0.9,
    behaviour: 'Hop in short bursts', hello: 'Its three tails glow', why: 'A fox cub from old stories', options: ABC, existing: true, prototype: true, friend: 'bubble', colour: '#f7c49c' },
  { id: 'frogPrince', name: 'Frog Prince', world: 'fairy', rule: haven([], ['river', 'sea']), herd: [1, 2], move: 'float', layer: 'herd', size: 0.6,
    behaviour: 'Drift on a lily pad, hop', hello: 'Blows a wishing bubble', why: 'The frog of the fairy tale, with a crown', options: ABC, existing: true, prototype: true, friend: 'bubble', colour: '#b9e58c' },
  { id: 'pegasus', name: 'Pegasus foal', world: 'fairy', rule: haven(['grove'], ['land'], { home: true, air: [2.5, 3.5] }), herd: [5, 5], move: 'fly', layer: 'flock', size: 0.9,
    behaviour: 'Hover and circle over the cottage garden', hello: 'Turns and makes two jumps in the air', why: 'A small winged pony near home', options: ABC, existing: true, prototype: true, friend: 'wings', colour: '#c9c4f2' },
  // ---- Blossom Haven: new creatures of the gardens --------------------------------------------------
  { id: 'gummyBear', name: 'Gummy bear cubs', world: 'fairy', rule: haven(['grove'], ['land']), herd: [3, 5], move: 'hop', layer: 'herd', size: 0.8,
    behaviour: 'Bounce like jelly between the lollipops, each cub in its own candy colour', hello: 'Wobbles and waves', why: 'A sweet that comes alive: red, orange, yellow and green', options: ABC, prototype: true, friend: 'bubble', colour: '#ff6f8f' },
  { id: 'flossLamb', name: 'Candy-floss lamb', world: 'fairy', rule: haven(['orchard'], ['land']), herd: [3, 6], move: 'hop', layer: 'herd', size: 0.9,
    behaviour: 'A puff of candy floss on four small legs. It floats a little at each hop', hello: 'Floats up and spins once', why: 'A cloud that she can almost hug', options: ABC, prototype: true, friend: 'bubble', colour: '#f7b8d8' },
  { id: 'caterpillar', name: 'Story caterpillar', world: 'fairy', rule: haven(['glade'], ['land']), herd: [1, 2], move: 'crawl', layer: 'herd', size: 0.6,
    behaviour: 'The blue caterpillar of Alice: it inches along and blows bubble rings', hello: 'Blows a ring of bubbles', why: 'From a story that grown-ups read aloud', options: BC, prototype: false, friend: 'bubble', colour: '#7fb0e8' },
  { id: 'crystalDeer', name: 'Crystal deer', world: 'fairy', rule: haven(['peaks'], ['land']), herd: [2, 3], move: 'walk', layer: 'herd', size: 1.4,
    behaviour: 'Walk on the peaks; the sugar-crystal antlers glint', hello: 'Its antlers sparkle', why: 'The magic animal of the high crystal peaks', options: ABC, prototype: true, friend: 'bubble', colour: '#e6f6f4' },
  { id: 'griffin', name: 'Griffin chick', world: 'fairy', rule: haven(['peaks'], ['land'], { air: [6, 10] }), herd: [1, 2], move: 'fly', layer: 'flock', size: 0.8,
    behaviour: 'Glide in small loops around the peaks', hello: 'Ruffles its feathers', why: 'A fluffy chick of a story bird', options: BC, prototype: false, friend: 'wings', colour: '#f3d9a4' },
  { id: 'jelly', name: 'Gummy jellyfish', world: 'fairy', rule: haven([], ['river', 'sea', 'deep']), herd: [3, 6], move: 'float', layer: 'herd', size: 0.6,
    behaviour: 'Bob at the top of the soda, the ribbons sway', hello: 'Pulses and glows', why: 'A jelly sweet that swims, in pink, lilac and mint', options: ABC, prototype: true, friend: 'bubble', colour: '#f4a6d6' },
  { id: 'serpent', name: 'Soda serpent', world: 'fairy', rule: haven([], ['sea', 'deep']), herd: [1, 1], move: 'swim', layer: 'herd', size: 3,
    behaviour: 'Three humps glide through the soda, as the friendly sea serpent of the stories', hello: 'Blows a fountain of fizz', why: 'A big friendly shape that reads from far', options: BC, prototype: true, friend: 'bubble', colour: '#9ed8c4' },
  { id: 'phoenix', name: 'Phoenix chick', world: 'fairy', rule: haven(ALL_GARDENS.slice(), ['land'], { air: [12, 18] }), herd: [1, 1], move: 'fly', layer: 'flock', size: 0.8,
    behaviour: 'Flies a slow loop high over the gardens with a warm glow, brighter in Lantern time', hello: 'Drops a few warm sparks', why: 'A warm light in the sky, never fire that burns', options: BC, prototype: false, friend: 'wings', colour: '#ffb347' },
  // ---- Blossom Haven: creatures of one magic season (small life of option C, and the owlets) ----
  { id: 'honeyBee', name: 'Honey-drop bees', world: 'fairy', rule: haven(['grove', 'orchard'], ['land'], { air: [1, 3], magic: ['blossom'] }), herd: [5, 9], move: 'float', layer: 'small', size: 0.2,
    behaviour: 'Round striped bees visit the giant flowers in Blossom time', hello: 'They hum a ring around her', why: 'A soft hum and stripes. They never sting', options: C, prototype: false, friend: 'wings', colour: '#ffd24a' },
  { id: 'bubbleFish', name: 'Bubble fish', world: 'fairy', rule: haven(['grove', 'orchard', 'glade'], ['land'], { air: [2, 6], magic: ['bubble'] }), herd: [4, 8], move: 'float', layer: 'small', size: 0.4,
    behaviour: 'In Bubble time small fish swim in the air, each one in its own bubble', hello: 'The bubbles bump her softly', why: 'Fish in the air: only magic can do it', options: C, prototype: false, friend: 'bubble', colour: '#9fe3cf' },
  { id: 'lanternMoth', name: 'Lantern moths', world: 'fairy', rule: haven(['glade', 'grove'], ['land'], { air: [1, 4], magic: ['lantern'] }), herd: [6, 12], move: 'float', layer: 'small', size: 0.3,
    behaviour: 'In Lantern time soft round moths glow around the glowing toadstools', hello: 'They glow brighter and circle her', why: 'A warm light for the dark, with no fear', options: C, prototype: true, friend: 'wings', colour: '#ffd27a' },
  { id: 'owlet', name: 'Sugar owlets', world: 'fairy', rule: haven(['peaks', 'orchard'], ['land'], { magic: ['crystal'] }), herd: [2, 3], move: 'hop', layer: 'herd', size: 0.5,
    behaviour: 'In Crystal time round owlets of sugar glass sit by the sugar crystals and blink', hello: 'Blinks both eyes and hoots softly', why: 'Round, sleepy and sparkly', options: C, prototype: false, friend: 'wings', colour: '#e9e6fb' },
]

export const speciesById = (id: string) => SPECIES.find(species => species.id === id)!
export const speciesOf = (option: OptionId, world: 'earth' | 'fairy') => SPECIES.filter(species => species.world === world && species.options.includes(option))

/**
 * The distance in metres up to which an animal of `size` metres is at least 16 px tall in a view of
 * 720 px with the camera of the game (58° of field of view). Smaller than 16 px, a shape is hard to know.
 */
export function readRange(size: number, pixels = 16, viewHeight = 720, fov = 58) {
  return Math.round(size * viewHeight / (pixels * 2 * Math.tan(fov / 2 * Math.PI / 180)))
}

/** The read range in words: far (more than 80 m), middle (30 to 80 m) or near (less than 30 m). */
export function readsFrom(size: number) {
  const range = readRange(size)
  return range > 80 ? 'far' : range >= 30 ? 'middle' : 'near'
}
