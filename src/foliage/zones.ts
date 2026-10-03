import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { seededRandom } from '../terrain'
import type { TerrainSample } from '../terrain'
import type { SpeciesId } from './species'

/**
 * The zones of each option: which plants grow where. A zone is a theme of a part of a world,
 * for example the taiga of Earth or the mushroom glade of Blossom Haven. The rules read only the
 * direction on the planet, the terrain sample and four noise fields, so the planting and the
 * colour of the ground agree.
 */
export type OptionId = 'E0' | 'E1' | 'E2' | 'E3' | 'H0' | 'H1' | 'H2' | 'H3'
export type Entry = { species: SpeciesId; weight: number; palette?: number[]; size?: number }
export type Zone = {
  id: string
  name: string
  trees: Entry[]
  /** The chance of a tree at a candidate point in a wood, and in a glade. */
  wood: number
  open: number
  under: Entry[]
  /** The chance of a small plant at a candidate point that has no tree. */
  cover: number
  /** Reeds grow on the river banks of the zone. */
  reeds?: boolean
  /** The colour of the grass of the zone. */
  ground: number
}
type Field = (x: number, y: number, z: number) => number
export type Fields = { zone: Field; moist: Field; wood: Field; jitter: Field }

export function createFields(seed: number): Fields {
  const noise = [1, 2, 3, 4].map(offset => createNoise3D(seededRandom(seed + 7000 + offset)))
  return {
    zone: (x, y, z) => noise[0](x * 1.1, y * 1.1, z * 1.1),
    moist: (x, y, z) => noise[1](x * 1.1, y * 1.1, z * 1.1),
    wood: (x, y, z) => noise[2](x * 7, y * 7, z * 7),
    jitter: (x, y, z) => noise[3](x * 6, y * 6, z * 6),
  }
}

const e = (species: SpeciesId, weight: number, palette?: number[], size?: number): Entry => ({ species, weight, palette, size })

// ---- Earth ----------------------------------------------------------------------------------------
const PLAIN_GRASS = 0x679a43
const DRY = [0xc9b95a, 0xb9a84e, 0xd6c56a]
const EARTH_CAP = [0xc0482e, 0xa9713f]

const MIXED: Zone = { id: 'mixed', name: 'Mixed wood', wood: 0.34, open: 0.03, cover: 0.5, reeds: true, ground: PLAIN_GRASS,
  trees: [e('oak', 4), e('pine', 3), e('birch', 2)], under: [e('grass', 8), e('flowers', 3), e('bush', 2), e('rock', 0.5)] }

export const BELTS: Record<'beach' | 'jungle' | 'savanna' | 'desert' | 'temperate' | 'taiga' | 'tundra', Zone> = {
  beach: { id: 'beach', name: 'Palm beach', wood: 0.14, open: 0.14, cover: 0.12, ground: 0x8fae4f,
    trees: [e('palm', 1)], under: [e('grass', 2, DRY), e('rock', 0.5)] },
  jungle: { id: 'jungle', name: 'Jungle', wood: 0.5, open: 0.18, cover: 0.6, reeds: true, ground: 0x3f8a3c,
    trees: [e('palm', 3), e('oak', 4, [0x2f7a3a, 0x3b8a40, 0x286b38], 1.25)], under: [e('fern', 5), e('bush', 2), e('flowers', 1, [0xe8503a, 0xff9a3a, 0xf58ab8])] },
  savanna: { id: 'savanna', name: 'Savanna', wood: 0.1, open: 0.05, cover: 0.5, ground: 0xb3a655,
    trees: [e('acacia', 1)], under: [e('grass', 8, DRY), e('rock', 1), e('bush', 0.6, [0x8a9a4a, 0x7d8d45])] },
  desert: { id: 'desert', name: 'Desert', wood: 0.07, open: 0.05, cover: 0.1, ground: 0xd9c48c,
    trees: [e('cactus', 1)], under: [e('rock', 2), e('grass', 1, DRY)] },
  temperate: { id: 'temperate', name: 'Leaf forest', wood: 0.34, open: 0.03, cover: 0.5, reeds: true, ground: PLAIN_GRASS,
    trees: [e('oak', 4), e('birch', 2), e('pine', 1)], under: [e('grass', 8), e('flowers', 3), e('bush', 2), e('rock', 0.4)] },
  taiga: { id: 'taiga', name: 'Pine forest', wood: 0.4, open: 0.05, cover: 0.4, reeds: true, ground: 0x4f7d57,
    trees: [e('pine', 6), e('birch', 1), e('snowPine', 1)], under: [e('bush', 2, [0x3f7046, 0x48784a]), e('grass', 5, [0x6f9050, 0x648648]), e('rock', 1), e('toadstool', 1, EARTH_CAP)] },
  tundra: { id: 'tundra', name: 'Snow line', wood: 0.12, open: 0.02, cover: 0.15, ground: 0x9fae9c,
    trees: [e('snowPine', 1)], under: [e('rock', 2), e('grass', 2, [0xa9b58e])] },
}

export const SEASONS: Zone[] = [
  { id: 'spring', name: 'Spring land', wood: 0.3, open: 0.04, cover: 0.6, reeds: true, ground: 0x8cc152,
    trees: [e('oak', 3, [0xffb7d5, 0xfff0f5, 0xf7a1c4]), e('birch', 2, [0xa8d65a, 0xb9e06a])],
    under: [e('flowers', 6, [0xe8503a, 0xffd84a, 0xf58ab8, 0xffffff]), e('grass', 7, [0x9acb55, 0x8cc152]), e('bush', 1)] },
  { id: 'summer', name: 'Summer land', wood: 0.36, open: 0.03, cover: 0.5, reeds: true, ground: 0x5f9a3c,
    trees: [e('oak', 5), e('pine', 1)], under: [e('grass', 8), e('flowers', 2, [0xffffff, 0xffd84a]), e('bush', 2), e('fern', 1)] },
  { id: 'autumn', name: 'Autumn land', wood: 0.34, open: 0.04, cover: 0.45, reeds: true, ground: 0xb08a4a,
    trees: [e('oak', 4, [0xd9822b, 0xb5412b, 0xe0b23a, 0xa8562a]), e('birch', 2, [0xe6c13a, 0xf0d050])],
    under: [e('toadstool', 2, EARTH_CAP), e('bush', 2, [0xa8562a, 0x8a6a2a]), e('grass', 6, [0xb89a4a, 0xc9a850]), e('rock', 0.6)] },
  { id: 'winter', name: 'Winter land', wood: 0.3, open: 0.04, cover: 0.12, ground: 0xe6edf0,
    trees: [e('snowPine', 4), e('bareTree', 3)], under: [e('rock', 1, [0xdfe5ea, 0xc9d0d6]), e('bush', 1, [0xe8eef2])] },
]

// ---- Blossom Haven --------------------------------------------------------------------------------
const PLAIN_PINK = 0xe7a0ba
const PINK_GRASS = [0xf2a6c8, 0xe9b6dc, 0xf7c0d4]
const PASTEL = [0xffffff, 0xffe08a, 0xc9a8f5]

const SWEET: Zone = { id: 'sweet', name: 'Sweet shop', wood: 0.3, open: 0.05, cover: 0.45, ground: PLAIN_PINK,
  trees: [e('lollipop', 3), e('ballPop', 2), e('cane', 2), e('cottonTree', 2), e('iceCream', 1)],
  under: [e('gumdrops', 3), e('marshmallow', 2), e('grass', 7, PINK_GRASS), e('flowers', 2, PASTEL)] }

export const GARDENS: Record<'grove' | 'orchard' | 'glade' | 'peaks', Zone> = {
  grove: { id: 'grove', name: 'Lollipop grove', wood: 0.32, open: 0.05, cover: 0.45, ground: PLAIN_PINK,
    trees: [e('lollipop', 4), e('ballPop', 2), e('cane', 2)], under: [e('gumdrops', 3), e('grass', 7, PINK_GRASS), e('flowers', 2, PASTEL)] },
  orchard: { id: 'orchard', name: 'Cotton candy orchard', wood: 0.3, open: 0.05, cover: 0.45, ground: 0xf3c7ad,
    trees: [e('cottonTree', 4), e('iceCream', 2)], under: [e('marshmallow', 2), e('grass', 7, [0xa9d4f5, 0xf7c0d4, 0xffffff]), e('gumdrops', 1)] },
  glade: { id: 'glade', name: 'Mushroom glade', wood: 0.3, open: 0.06, cover: 0.5, ground: 0xa98fd0,
    trees: [e('toadstool', 1, undefined, 5)], under: [e('toadstool', 3), e('flowers', 3, [0xc9a8f5, 0x9fd8f2, 0xffffff]), e('grass', 6, [0xb79ae6, 0xcdb2f0])] },
  peaks: { id: 'peaks', name: 'Crystal peaks', wood: 0.22, open: 0.08, cover: 0.2, ground: 0xa9dccc,
    trees: [e('crystal', 1)], under: [e('marshmallow', 1, [0xffffff]), e('grass', 3, [0xa8e6cf, 0xffffff])] },
}

export const BLOSSOM: Record<'lane' | 'meadow' | 'orchard' | 'hills', Zone> = {
  lane: { id: 'lane', name: 'Candy lane', wood: 0.3, open: 0.1, cover: 0.45, ground: PLAIN_PINK,
    trees: [e('lollipop', 2), e('cane', 2), e('blossomTree', 1)], under: [e('gumdrops', 2), e('flowers', 3, PASTEL), e('grass', 5, PINK_GRASS)] },
  meadow: { id: 'meadow', name: 'Flower meadow', wood: 0.16, open: 0.08, cover: 0.65, ground: 0xbfe3c2,
    trees: [e('giantFlower', 1)], under: [e('flowers', 6, [0xff9ec7, 0xffffff, 0xc9a8f5, 0xffc46b]), e('grass', 8, [0x9fd6a0, 0xb4e0a8, 0xc6e8b0])] },
  orchard: { id: 'blossom', name: 'Blossom orchard', wood: 0.36, open: 0.05, cover: 0.5, ground: 0xf0b8cc,
    trees: [e('blossomTree', 5), e('giantFlower', 1)], under: [e('flowers', 3, PASTEL), e('grass', 7, PINK_GRASS), e('gumdrops', 0.5)] },
  hills: { id: 'hills', name: 'White blossom hills', wood: 0.26, open: 0.05, cover: 0.35, ground: 0xdcc8ee,
    trees: [e('blossomTree', 3, [0xfff4f8, 0xffe3ee, 0xf5e9ff]), e('toadstool', 1, [0xb07ae8, 0xcdb2f0], 4)],
    under: [e('flowers', 2, [0xffffff, 0xf5e9ff]), e('grass', 4, [0xcdb2f0, 0xe2d2f6]), e('marshmallow', 0.6)] },
}

/** The land around the cottage of Blossom Haven, as a distance from the south pole on the unit sphere: about 55 m. */
export const HOME_RING = 0.4

// ---- The rules ------------------------------------------------------------------------------------
const smooth = (value: number, from: number, to: number) => THREE.MathUtils.smoothstep(value, from, to)

/** Earth, option B: how cold a place is. The poles and the high ground are cold. */
export function coldAt(x: number, y: number, z: number, sample: TerrainSample, fields: Fields) {
  return Math.abs(y) + fields.jitter(x, y, z) * 0.05 + Math.max(0, sample.height - 4.5) * 0.05
}
/** Earth, option C: the season of a place, from 0 to 4 around the planet (spring, summer, autumn, winter). */
export function seasonAt(x: number, y: number, z: number, fields: Fields) {
  const turn = Math.atan2(z, x) / (Math.PI * 2) + 0.5 + fields.jitter(x, y, z) * 0.03
  return (turn - Math.floor(turn)) * 4
}

/** The zone of a place, or null where no plant grows (the snow of the poles). */
export function zoneAt(option: OptionId, x: number, y: number, z: number, sample: TerrainSample, fields: Fields): Zone | null {
  switch (option) {
    case 'E1': return Math.abs(y) < 0.86 ? MIXED : null
    case 'E2': {
      const cold = coldAt(x, y, z, sample, fields)
      if (cold > 0.86) return null
      if (cold > 0.74) return BELTS.tundra
      if (cold > 0.56) return BELTS.taiga
      if (cold > 0.3) return BELTS.temperate
      if (sample.height < 1.4) return BELTS.beach
      const moist = fields.moist(x, y, z)
      return moist > 0.08 ? BELTS.jungle : moist > -0.22 ? BELTS.savanna : BELTS.desert
    }
    case 'E3': return Math.abs(y) < 0.86 ? SEASONS[Math.floor(seasonAt(x, y, z, fields)) % 4] : null
    case 'H1': return SWEET
    case 'H2': {
      // The cottage keeps the candy of today around it.
      if (y < 0 && Math.hypot(x, z) < HOME_RING) return GARDENS.grove
      if (sample.height > 4.6) return GARDENS.peaks
      const field = fields.zone(x, y, z)
      return field > 0.26 ? GARDENS.orchard : field < -0.26 ? GARDENS.glade : GARDENS.grove
    }
    case 'H3': {
      if (y < 0 && Math.hypot(x, z) < HOME_RING) return BLOSSOM.lane
      if (sample.height > 4.3) return BLOSSOM.hills
      return sample.height < 2 + fields.jitter(x, y, z) * 0.3 ? BLOSSOM.meadow : BLOSSOM.orchard
    }
    default: return null
  }
}

const tint = new THREE.Color(), other = new THREE.Color()
/** The colour of the grass of a place. The colours of two zones mix at their border. A look with no zones has one grass colour. */
export function groundColour(option: OptionId, x: number, y: number, z: number, sample: TerrainSample, fields: Fields, out: THREE.Color) {
  if (option === 'E2') {
    const cold = coldAt(x, y, z, sample, fields), moist = fields.moist(x, y, z)
    out.setHex(BELTS.temperate.ground).lerp(tint.setHex(BELTS.taiga.ground), smooth(cold, 0.51, 0.61)).lerp(tint.setHex(BELTS.tundra.ground), smooth(cold, 0.7, 0.8))
    other.setHex(BELTS.jungle.ground).lerp(tint.setHex(BELTS.savanna.ground), 1 - smooth(moist, -0.02, 0.18)).lerp(tint.setHex(BELTS.desert.ground), 1 - smooth(moist, -0.32, -0.12))
    out.lerp(other, 1 - smooth(cold, 0.25, 0.35))
    return out
  }
  if (option === 'E3') {
    const season = seasonAt(x, y, z, fields), index = Math.floor(season) % 4, part = season - Math.floor(season)
    out.setHex(SEASONS[index].ground)
    out.lerp(tint.setHex(SEASONS[(index + 1) % 4].ground), smooth(part, 0.85, 1) * 0.5)
    out.lerp(tint.setHex(SEASONS[(index + 3) % 4].ground), (1 - smooth(part, 0, 0.15)) * 0.5)
    return out
  }
  if (option === 'H2') {
    const field = fields.zone(x, y, z)
    out.setHex(GARDENS.grove.ground).lerp(tint.setHex(GARDENS.orchard.ground), smooth(field, 0.2, 0.32)).lerp(tint.setHex(GARDENS.glade.ground), 1 - smooth(field, -0.32, -0.2))
      .lerp(tint.setHex(GARDENS.peaks.ground), smooth(sample.height, 4.2, 5))
    if (y < 0) out.lerp(tint.setHex(GARDENS.grove.ground), 1 - smooth(Math.hypot(x, z), HOME_RING - 0.06, HOME_RING + 0.06))
    return out
  }
  if (option === 'H3') {
    out.setHex(BLOSSOM.orchard.ground).lerp(tint.setHex(BLOSSOM.meadow.ground), 1 - smooth(sample.height, 1.7, 2.3)).lerp(tint.setHex(BLOSSOM.hills.ground), smooth(sample.height, 4, 4.6))
    if (y < 0) out.lerp(tint.setHex(BLOSSOM.lane.ground), 1 - smooth(Math.hypot(x, z), HOME_RING - 0.06, HOME_RING + 0.06))
    return out
  }
  return out.setHex(option.startsWith('E') ? PLAIN_GRASS : PLAIN_PINK)
}

/** The zones of an option, for the page. */
export function zonesOf(option: OptionId): Zone[] {
  switch (option) {
    case 'E1': return [MIXED]
    case 'E2': return Object.values(BELTS)
    case 'E3': return SEASONS
    case 'H1': return [SWEET]
    case 'H2': return Object.values(GARDENS)
    case 'H3': return Object.values(BLOSSOM)
    default: return []
  }
}
