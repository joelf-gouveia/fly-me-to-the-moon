import type { Rule } from './rules'

/**
 * The catalog of the animals of the game (option B of docs/animals-study.md, with the small life of
 * option C and a creature for each magic season). Earth follows the real world. Blossom Haven gets
 * creatures from stories and candy, not copies of the animals of Earth. Nothing hunts, chases or
 * eats another animal: the fox trots and sits, the bears pick berries. Each kind walks, hops, swims,
 * flies a loop or rests, and says hello.
 */
export const KIND_IDS = [
  // Earth: the leaf forest, the pine forest, the snow line, the savanna, the desert, the jungle, the beach, the sea and the sky.
  'cow', 'sheep', 'rabbit', 'duck', 'deer', 'fox', 'stork', 'moose', 'bear', 'beaver', 'reindeer', 'hare', 'penguin', 'seal',
  'zebra', 'giraffe', 'elephant', 'camel', 'meerkat', 'monkey', 'parrot', 'capybara', 'flamingo', 'turtle', 'seagull',
  'dolphin', 'whale', 'fish', 'butterfly', 'firefly', 'goose',
  // Blossom Haven: the gardens, the soda water, the sky and the magic seasons.
  'unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus', 'gummyBear', 'flossLamb', 'caterpillar', 'crystalDeer', 'griffin',
  'jelly', 'serpent', 'phoenix', 'honeyBee', 'bubbleFish', 'lanternMoth', 'owlet',
] as const
export type KindId = typeof KIND_IDS[number]

/** How the kind moves. */
export type Move = 'walk' | 'hop' | 'waddle' | 'swim' | 'leap' | 'fly' | 'float' | 'crawl'
/**
 * The layer that draws the kind. A herd and a flock are 3D models. Small life comes in large numbers
 * (fish, butterflies, moths): points far away, and a tiny model near the fairy when it has one.
 */
export type Layer = 'herd' | 'flock' | 'small'
/** The row of the animal book: a place of Earth or of Blossom Haven. */
export type PlaceId = 'beach' | 'jungle' | 'savanna' | 'desert' | 'temperate' | 'taiga' | 'tundra' | 'sea' | 'sky'
  | 'grove' | 'orchard' | 'glade' | 'peaks' | 'soda' | 'heaven'

export type Species = {
  id: KindId
  name: string
  world: 'earth' | 'fairy'
  rule: Rule
  /** The animals of one group: the smallest and the largest count. */
  herd: [number, number]
  move: Move
  layer: Layer
  /** The height (or the length of a swimmer) in metres, in the scale of the game: a cow is 1.25 m. */
  size: number
  /** A friend with wings flies; each other friend rides in a soap bubble (src/friend.ts). */
  friend: 'wings' | 'bubble'
  /** A school or a swarm: it gets a card in the book, but it is not one animal, so it is no friend. */
  group?: boolean
  /** The main colour, for a far point and for the page. */
  colour: string
  /** The row of the book. */
  place: PlaceId
}

const earth = (zones: Rule['zones'], surfaces: Rule['surfaces'], more: Partial<Rule> = {}): Rule => ({ world: 'earth', zones, surfaces, ...more })
const haven = (zones: Rule['zones'], surfaces: Rule['surfaces'], more: Partial<Rule> = {}): Rule => ({ world: 'fairy', zones, surfaces, ...more })
const WARM_SEA = ['beach', 'jungle', 'savanna', 'desert', 'temperate'] as const

export const SPECIES: Species[] = [
  // ---- Earth: the leaf forest and its meadows (the four animals of the first game live here now) ----
  { id: 'cow', name: 'Cow', world: 'earth', rule: earth(['temperate'], ['land']), herd: [3, 5], move: 'walk', layer: 'herd', size: 1.25, friend: 'bubble', colour: '#e9e1cf', place: 'temperate' },
  { id: 'sheep', name: 'Sheep', world: 'earth', rule: earth(['temperate'], ['land']), herd: [4, 7], move: 'walk', layer: 'herd', size: 1, friend: 'bubble', colour: '#f3e9d3', place: 'temperate' },
  { id: 'rabbit', name: 'Rabbit', world: 'earth', rule: earth(['temperate'], ['land', 'shore']), herd: [2, 4], move: 'hop', layer: 'herd', size: 0.7, friend: 'bubble', colour: '#b78b6b', place: 'temperate' },
  { id: 'duck', name: 'Duck', world: 'earth', rule: earth(['temperate'], ['river']), herd: [3, 5], move: 'swim', layer: 'herd', size: 0.6, friend: 'wings', colour: '#e6bb77', place: 'temperate' },
  { id: 'deer', name: 'Deer', world: 'earth', rule: earth(['temperate'], ['land']), herd: [2, 4], move: 'walk', layer: 'herd', size: 1.35, friend: 'bubble', colour: '#c08a5a', place: 'temperate' },
  { id: 'fox', name: 'Fox', world: 'earth', rule: earth(['temperate', 'taiga'], ['land']), herd: [1, 2], move: 'walk', layer: 'herd', size: 0.6, friend: 'bubble', colour: '#e8833a', place: 'temperate' },
  // Summer in the leaf forest, winter in the savanna: it travels with the seasons.
  { id: 'stork', name: 'Stork', world: 'earth', rule: earth(['temperate', 'savanna'], ['land', 'shore'], { air: [8, 14], seasonsIn: { temperate: ['spring', 'summer'], savanna: ['autumn', 'winter'] } }), herd: [2, 4], move: 'fly', layer: 'flock', size: 1, friend: 'wings', colour: '#f4f1ea', place: 'sky' },
  // ---- Earth: the pine forest ----
  { id: 'moose', name: 'Moose', world: 'earth', rule: earth(['taiga'], ['land', 'shore']), herd: [1, 2], move: 'walk', layer: 'herd', size: 2, friend: 'bubble', colour: '#6e4c35', place: 'taiga' },
  { id: 'bear', name: 'Brown bear and cub', world: 'earth', rule: earth(['taiga'], ['land']), herd: [2, 2], move: 'walk', layer: 'herd', size: 1.4, friend: 'bubble', colour: '#8a5a3a', place: 'taiga' },
  { id: 'beaver', name: 'Beaver', world: 'earth', rule: earth(['taiga', 'temperate'], ['shore']), herd: [1, 2], move: 'waddle', layer: 'herd', size: 0.5, friend: 'bubble', colour: '#8b5e3c', place: 'taiga' },
  // ---- Earth: the snow line ----
  { id: 'reindeer', name: 'Reindeer', world: 'earth', rule: earth(['tundra'], ['land']), herd: [4, 7], move: 'walk', layer: 'herd', size: 1.35, friend: 'bubble', colour: '#8b6a4e', place: 'tundra' },
  // The coat is white in snow and brown in summer (snowCover() of src/seasons.ts).
  { id: 'hare', name: 'Arctic hare', world: 'earth', rule: earth(['tundra', 'taiga'], ['land']), herd: [1, 3], move: 'hop', layer: 'herd', size: 0.6, friend: 'bubble', colour: '#f4f6f8', place: 'tundra' },
  { id: 'penguin', name: 'Penguin', world: 'earth', rule: earth(['tundra', 'polar'], ['shore', 'land'], { hemisphere: 'south' }), herd: [5, 9], move: 'waddle', layer: 'herd', size: 0.7, friend: 'bubble', colour: '#2f3a4a', place: 'tundra' },
  { id: 'seal', name: 'Seal', world: 'earth', rule: earth(['tundra', 'polar', 'taiga'], ['shore']), herd: [2, 4], move: 'crawl', layer: 'herd', size: 0.6, friend: 'bubble', colour: '#9aa4ad', place: 'tundra' },
  // ---- Earth: the savanna and the desert ----
  { id: 'zebra', name: 'Zebra', world: 'earth', rule: earth(['savanna'], ['land']), herd: [4, 8], move: 'walk', layer: 'herd', size: 1.35, friend: 'bubble', colour: '#f2f0ea', place: 'savanna' },
  { id: 'giraffe', name: 'Giraffe', world: 'earth', rule: earth(['savanna'], ['land']), herd: [2, 4], move: 'walk', layer: 'herd', size: 3.2, friend: 'bubble', colour: '#f0c76a', place: 'savanna' },
  { id: 'elephant', name: 'Elephant', world: 'earth', rule: earth(['savanna', 'jungle'], ['land']), herd: [2, 4], move: 'walk', layer: 'herd', size: 2.2, friend: 'bubble', colour: '#9aa3ad', place: 'savanna' },
  { id: 'meerkat', name: 'Meerkat', world: 'earth', rule: earth(['desert', 'savanna'], ['land']), herd: [3, 6], move: 'hop', layer: 'herd', size: 0.45, friend: 'bubble', colour: '#d9b98a', place: 'savanna' },
  { id: 'camel', name: 'Camel', world: 'earth', rule: earth(['desert'], ['land']), herd: [1, 3], move: 'walk', layer: 'herd', size: 2, friend: 'bubble', colour: '#d9a96a', place: 'desert' },
  // ---- Earth: the jungle and the palm beach ----
  { id: 'monkey', name: 'Monkey', world: 'earth', rule: earth(['jungle'], ['land']), herd: [2, 4], move: 'hop', layer: 'herd', size: 0.7, friend: 'bubble', colour: '#8a5a3a', place: 'jungle' },
  { id: 'parrot', name: 'Parrot', world: 'earth', rule: earth(['jungle'], ['land', 'shore'], { air: [6, 12] }), herd: [3, 5], move: 'fly', layer: 'flock', size: 0.55, friend: 'wings', colour: '#e8473a', place: 'jungle' },
  { id: 'capybara', name: 'Capybara', world: 'earth', rule: earth(['jungle', 'beach'], ['shore']), herd: [3, 5], move: 'walk', layer: 'herd', size: 0.6, friend: 'bubble', colour: '#a0714a', place: 'beach' },
  { id: 'flamingo', name: 'Flamingo', world: 'earth', rule: earth(['beach', 'savanna'], ['shore', 'sea']), herd: [5, 9], move: 'walk', layer: 'herd', size: 1.2, friend: 'bubble', colour: '#f59cb0', place: 'beach' },
  { id: 'turtle', name: 'Sea turtle', world: 'earth', rule: earth(['beach'], ['shore', 'sea']), herd: [1, 2], move: 'crawl', layer: 'herd', size: 0.4, friend: 'bubble', colour: '#6f8f4a', place: 'beach' },
  { id: 'seagull', name: 'Seagull', world: 'earth', rule: earth(['beach', 'temperate', 'savanna', 'jungle'], ['shore', 'sea'], { air: [6, 12] }), herd: [3, 6], move: 'fly', layer: 'flock', size: 0.5, friend: 'wings', colour: '#f6f6f2', place: 'sky' },
  // ---- Earth: the sea ----
  { id: 'dolphin', name: 'Dolphin', world: 'earth', rule: earth([...WARM_SEA], ['sea', 'deep']), herd: [3, 5], move: 'leap', layer: 'herd', size: 1.8, friend: 'bubble', colour: '#7f9fb8', place: 'sea' },
  { id: 'whale', name: 'Whale', world: 'earth', rule: earth([...WARM_SEA, 'taiga'], ['deep']), herd: [1, 2], move: 'swim', layer: 'herd', size: 9, friend: 'bubble', colour: '#5d7fa8', place: 'sea' },
  // ---- Earth: the small life ----
  // The water of the game is not clear, so the fish show only when they jump.
  { id: 'fish', name: 'Silver fish', world: 'earth', rule: earth([...WARM_SEA, 'taiga'], ['sea', 'river']), herd: [8, 14], move: 'leap', layer: 'small', size: 0.3, friend: 'bubble', group: true, colour: '#bfd6e6', place: 'sea' },
  { id: 'butterfly', name: 'Butterflies', world: 'earth', rule: earth(['temperate', 'jungle', 'savanna'], ['land'], { air: [1, 3], seasons: ['spring', 'summer'] }), herd: [6, 12], move: 'fly', layer: 'small', size: 0.2, friend: 'wings', group: true, colour: '#ffb347', place: 'temperate' },
  { id: 'firefly', name: 'Fireflies', world: 'earth', rule: earth(['temperate', 'jungle'], ['land', 'shore'], { air: [0.5, 3], seasons: ['summer'], night: true }), herd: [10, 20], move: 'float', layer: 'small', size: 0.1, friend: 'wings', group: true, colour: '#f6f08a', place: 'temperate' },
  // A V of geese crosses the belts in autumn and in spring.
  { id: 'goose', name: 'Goose', world: 'earth', rule: earth(['temperate', 'taiga'], ['land', 'river'], { air: [14, 20], seasons: ['autumn', 'spring'] }), herd: [7, 11], move: 'fly', layer: 'small', size: 0.6, friend: 'wings', colour: '#8d8172', place: 'sky' },

  // ---- Blossom Haven: the five creatures of the first game ----
  { id: 'unicorn', name: 'Unicorn', world: 'fairy', rule: haven(['grove', 'orchard'], ['land']), herd: [2, 3], move: 'walk', layer: 'herd', size: 1.4, friend: 'bubble', colour: '#fff6f8', place: 'grove' },
  { id: 'dragonling', name: 'Dragonling', world: 'fairy', rule: haven(['grove', 'glade'], ['land']), herd: [3, 5], move: 'waddle', layer: 'herd', size: 1.2, friend: 'wings', colour: '#9fd9c3', place: 'grove' },
  { id: 'kitsune', name: 'Kitsune kit', world: 'fairy', rule: haven(['glade', 'orchard'], ['land']), herd: [2, 3], move: 'hop', layer: 'herd', size: 0.9, friend: 'bubble', colour: '#f7c49c', place: 'orchard' },
  { id: 'frogPrince', name: 'Frog Prince', world: 'fairy', rule: haven([], ['river', 'sea']), herd: [1, 2], move: 'float', layer: 'herd', size: 0.6, friend: 'bubble', colour: '#b9e58c', place: 'soda' },
  // The five foals over the cottage garden are in src/candy.ts, not in the herds.
  { id: 'pegasus', name: 'Pegasus foal', world: 'fairy', rule: haven(['grove'], ['land'], { home: true, air: [2.5, 3.5] }), herd: [5, 5], move: 'fly', layer: 'flock', size: 0.9, friend: 'wings', colour: '#c9c4f2', place: 'grove' },
  // ---- Blossom Haven: the new creatures of the gardens ----
  { id: 'gummyBear', name: 'Gummy bear cubs', world: 'fairy', rule: haven(['grove'], ['land']), herd: [3, 5], move: 'hop', layer: 'herd', size: 0.8, friend: 'bubble', colour: '#ff6f8f', place: 'grove' },
  { id: 'flossLamb', name: 'Candy-floss lamb', world: 'fairy', rule: haven(['orchard'], ['land']), herd: [3, 6], move: 'hop', layer: 'herd', size: 0.9, friend: 'bubble', colour: '#f7b8d8', place: 'orchard' },
  { id: 'caterpillar', name: 'Story caterpillar', world: 'fairy', rule: haven(['glade'], ['land']), herd: [1, 2], move: 'crawl', layer: 'herd', size: 0.6, friend: 'bubble', colour: '#7fb0e8', place: 'glade' },
  { id: 'crystalDeer', name: 'Crystal deer', world: 'fairy', rule: haven(['peaks'], ['land']), herd: [2, 3], move: 'walk', layer: 'herd', size: 1.4, friend: 'bubble', colour: '#e6f6f4', place: 'peaks' },
  { id: 'griffin', name: 'Griffin chick', world: 'fairy', rule: haven(['peaks'], ['land'], { air: [6, 10] }), herd: [1, 2], move: 'fly', layer: 'flock', size: 0.8, friend: 'wings', colour: '#f3d9a4', place: 'peaks' },
  { id: 'jelly', name: 'Gummy jellyfish', world: 'fairy', rule: haven([], ['river', 'sea', 'deep']), herd: [3, 6], move: 'float', layer: 'herd', size: 0.6, friend: 'bubble', colour: '#f4a6d6', place: 'soda' },
  { id: 'serpent', name: 'Soda serpent', world: 'fairy', rule: haven([], ['sea', 'deep']), herd: [1, 1], move: 'swim', layer: 'herd', size: 3, friend: 'bubble', colour: '#9ed8c4', place: 'soda' },
  // A warm glow, never fire.
  { id: 'phoenix', name: 'Phoenix chick', world: 'fairy', rule: haven(['grove', 'orchard', 'glade', 'peaks'], ['land'], { air: [12, 18] }), herd: [1, 1], move: 'fly', layer: 'flock', size: 0.8, friend: 'wings', colour: '#ffb347', place: 'heaven' },
  // ---- Blossom Haven: one creature for each magic season ----
  { id: 'honeyBee', name: 'Honey-drop bees', world: 'fairy', rule: haven(['grove', 'orchard'], ['land'], { air: [1, 3], magic: ['blossom'] }), herd: [5, 9], move: 'float', layer: 'small', size: 0.2, friend: 'wings', group: true, colour: '#ffd24a', place: 'grove' },
  { id: 'bubbleFish', name: 'Bubble fish', world: 'fairy', rule: haven(['grove', 'orchard', 'glade'], ['land'], { air: [2, 6], magic: ['bubble'] }), herd: [4, 8], move: 'float', layer: 'small', size: 0.4, friend: 'bubble', colour: '#9fe3cf', place: 'orchard' },
  { id: 'lanternMoth', name: 'Lantern moth', world: 'fairy', rule: haven(['glade', 'grove'], ['land'], { air: [1, 4], magic: ['lantern'] }), herd: [6, 12], move: 'float', layer: 'small', size: 0.3, friend: 'wings', colour: '#ffd27a', place: 'glade' },
  { id: 'owlet', name: 'Sugar owlet', world: 'fairy', rule: haven(['peaks', 'orchard'], ['land'], { magic: ['crystal'] }), herd: [2, 3], move: 'hop', layer: 'herd', size: 0.5, friend: 'wings', colour: '#e9e6fb', place: 'peaks' },
]

const BY_ID = new Map(SPECIES.map(species => [species.id, species]))
export const speciesById = (id: KindId) => BY_ID.get(id)!
export const isKind = (value: unknown): value is KindId => typeof value === 'string' && BY_ID.has(value as KindId)
export const kindsOf = (world: 'earth' | 'fairy') => SPECIES.filter(species => species.world === world)
/** The kinds that the herds of src/creatures/herds.ts put on a world. The pegasus foals are in src/candy.ts. */
export const HERD_KINDS = SPECIES.filter(species => species.id !== 'pegasus')
/** The kinds that can be the fairy friend: each kind, except a school or a swarm. */
export const FRIEND_KIND_IDS = SPECIES.filter(species => !species.group).map(species => species.id)

/**
 * The distance in metres up to which an animal of `size` metres is at least 16 px tall in a view of
 * 720 px with the camera of the game (58° of field of view). Smaller than 16 px, a shape is hard to know.
 */
export function readRange(size: number, pixels = 16, viewHeight = 720, fov = 58) {
  return Math.round(size * viewHeight / (pixels * 2 * Math.tan(fov / 2 * Math.PI / 180)))
}
