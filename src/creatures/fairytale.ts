import { species } from './habitat'
import type { Species } from './habitat'

/** The ribbon butterflies in `src/candy.ts` are the only Blossom Haven creatures outside `species`. */
export type Resident = Species | 'butterfly'
export type Fairytale = 'unicorn' | 'dragonling' | 'kitsune' | 'frogPrince' | 'pegasus'

// One for one: each fairytale creature takes an existing slot, so habitat
// rules, footprints, speeds, and population counts stay the same.
export const replacements: Record<Resident, Fairytale> = {
  cow: 'unicorn',
  sheep: 'dragonling',
  rabbit: 'kitsune',
  duck: 'frogPrince',
  butterfly: 'pegasus',
}

export const fairytaleOrder: Fairytale[] = ['unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus']

const butterfly = { name: 'Ribbon butterfly', habitat: 'air', speed: 0, footprint: 0.9 } as const

export const residentInfo = (resident: Resident) => resident === 'butterfly' ? butterfly : species[resident]

export const fairytale = {
  unicorn: {
    name: 'Unicorn', replaces: 'cow', color: '#f4dcef',
    note: 'A round cream pony with big eyes, a twisted golden horn, and a rainbow mane in the planet\'s candy colors.',
    story: 'The largest resident. It grazes where the cows grazed.',
    behavior: 'Stroll → graze → turn back', detail: 'Rainbow mane and tail', magic: 'Glowing horn and sparkles',
  },
  dragonling: {
    name: 'Dragonling', replaces: 'sheep', color: '#9fd9c3',
    note: 'A mint baby dragon with a cream belly, tiny wings, soft horns, and a curled tail.',
    story: 'Small herds waddle across the meadows, as the sheep did.',
    behavior: 'Waddle → rest → puff', detail: 'Back spikes and heart tail', magic: 'Candy-floss puffs',
  },
  kitsune: {
    name: 'Kitsune kit', replaces: 'rabbit', color: '#f7c49c',
    note: 'An apricot fox cub from the old stories, with tall ears, fluffy cheeks, and three wish tails.',
    story: 'It hops in short bursts, like the rabbit before it.',
    behavior: 'Hop → pause → turn back', detail: 'Three wish tails', magic: 'Glowing tail tips and fox-fire',
  },
  frogPrince: {
    name: 'Frog Prince', replaces: 'duck', color: '#b9e58c',
    note: 'A chubby lime frog in a golden crown. He rides a lily pad on the soda water.',
    story: 'He floats where the ducks paddled. He never leaves the water.',
    behavior: 'Drift → rest → hop', detail: 'Golden crown and lotus', magic: 'Wishing bubbles',
  },
  pegasus: {
    name: 'Pegasus foal', replaces: 'butterfly', color: '#c9c4f2',
    note: 'A tiny winged pony with a starry periwinkle mane. It hovers over the cottage garden.',
    story: 'It takes the place of the five ribbon butterflies.',
    behavior: 'Hover → bob → circle', detail: 'Starry mane', magic: 'Sparkle trail',
  },
} as const satisfies Record<Fairytale, {
  name: string; replaces: Resident; color: string; note: string; story: string; behavior: string; detail: string; magic: string
}>

export const habitatOf = (kind: Fairytale) => residentInfo(fairytale[kind].replaces).habitat
