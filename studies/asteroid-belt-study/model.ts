import { seededRandom } from '../../src/terrain'
import { HOME_CARRY_MARGIN } from '../../src/relocation'
import * as game from '../../src/belt'
import { BELT_LAYERS, CELL, makeRock, NEAR_CELLS, ROCK_VARIANTS } from '../../src/belt'
import type { DwarfWorld, Point } from '../../src/belt'

// The shared belt code lives in src/belt.ts. This study records the belt in base units,
// before the proportions change (docs/proportions-study.md), so it passes the base belt.
export const BELT = game.BELT_BASE
export const auToGame = (au: number) => game.auToGame(au, BELT)
export const gameToAu = (radius: number) => game.gameToAu(radius, BELT)
export const sampleBeltPoint = (random: () => number, spread = 1) => game.sampleBeltPoint(random, spread, BELT)
export const touchesBelt = (position: Point, radius = 0) => game.touchesBelt(position, radius, BELT)
export const dwarfPosition = (world: DwarfWorld) => game.dwarfPosition(world, BELT)
export const insideDwarfWorld = (position: Point, radius = 0) => game.insideDwarfWorld(position, radius, BELT, 1)
export const cellRocks = (ix: number, iy: number, iz: number, perCell: number) => game.cellRocks(ix, iy, iz, perCell, BELT, 1)
export { beltDensity, CELL, cellSeed, DWARF_WORLDS, KIRKWOOD_GAPS, NEAR_RANGE, nearCellsAround, ROCK_VARIANTS } from '../../src/belt'
export type { Point, Rock } from '../../src/belt'

export type BeltOption = 'ribbon' | 'ring' | 'living'
export type Device = 'desktop' | 'phone'

// Game values from `data` in src/worlds.ts: orbit radius, planet radius, atmosphere.
export const MARS = { orbit: 4500, radius: 145, atmosphere: 42, angle: 2.12 }
export const JUPITER = { orbit: 6300, radius: 470, atmosphere: 145, angle: 4.2 }
/** Blossom Haven radius, atmosphere and the extra 30 used by clearHomePosition(). */
export const HOME_EXTENT = 110 + 52 + HOME_CARRY_MARGIN + 30
/** Game flight speed in open space (src/flight.ts), and with Shift. */
export const SPACE_SPEED = 430, BOOST_SPEED = 430 * 2.3

/** Free space between the belt and the planets beside it, for the largest rock. */
export function clearances(largestRock = 26) {
  return {
    mars: BELT.inner - largestRock - (MARS.orbit + MARS.radius + MARS.atmosphere),
    jupiter: JUPITER.orbit - JUPITER.radius - JUPITER.atmosphere - (BELT.outer + largestRock),
  }
}

/** Fraction of relocation candidates from findHomePosition() that touch the belt. */
export function relocationRisk(samples = 40000, seed = 7) {
  const random = seededRandom(seed)
  let hits = 0
  for (let i = 0; i < samples; i++) {
    // Same candidate space as findHomePosition() in src/relocation.ts.
    const radius = 1100 + random() * 13300, angle = random() * Math.PI * 2
    const point = { x: Math.cos(angle) * radius, y: (random() - 0.5) * 3200, z: Math.sin(angle) * radius }
    if (touchesBelt(point, HOME_EXTENT)) hits++
  }
  return hits / samples
}

/** Belt volume in cubic game metres. */
export const beltVolume = () => Math.PI * (BELT.outer ** 2 - BELT.inner ** 2) * BELT.halfHeight * 2
/** Mean distance from one object to the next in a volume. */
export const spacing = (count: number, volume = beltVolume()) => count ? Math.cbrt(volume / count) : Infinity

/** Triangles of one rock: an icosahedron with detail 1. */
export const ROCK_TRIANGLES = 80

type Layer = { dust: number; haze: boolean; ring: number; nearPerCell: number; worlds: number }
export const OPTIONS: Record<BeltOption, { letter: string; name: string; desktop: Layer; phone: Layer }> = {
  ribbon: { letter: 'A', name: 'Glitter ribbon', desktop: { dust: 12000, haze: true, ring: 0, nearPerCell: 0, worlds: 0 }, phone: { dust: 6000, haze: true, ring: 0, nearPerCell: 0, worlds: 0 } },
  ring: { letter: 'B', name: 'Rock ring', desktop: { dust: 6000, haze: false, ring: 3200, nearPerCell: 0, worlds: 0 }, phone: { dust: 3000, haze: false, ring: 1600, nearPerCell: 0, worlds: 0 } },
  living: { letter: 'C', name: 'Living belt', desktop: { dust: BELT_LAYERS.desktop.dust, haze: true, ring: 0, nearPerCell: BELT_LAYERS.desktop.perCell, worlds: 2 }, phone: { dust: BELT_LAYERS.phone.dust, haze: true, ring: 0, nearPerCell: BELT_LAYERS.phone.perCell, worlds: 2 } },
}

/** Rough game cost of an option, for the budget panel and the tests. */
export function budget(option: BeltOption, device: Device) {
  const layer = OPTIONS[option][device]
  const nearMax = layer.nearPerCell * NEAR_CELLS
  const rocksAtOnce = layer.ring + nearMax
  return {
    dust: layer.dust,
    rocks: rocksAtOnce,
    ringRocks: layer.ring,
    nearRocksMax: nearMax,
    worlds: layer.worlds,
    drawCalls: 1 + (layer.haze ? 1 : 0) + (layer.ring ? ROCK_VARIANTS : 0) + (nearMax ? ROCK_VARIANTS : 0) + layer.worlds,
    triangles: rocksAtOnce * ROCK_TRIANGLES + layer.worlds * 2 * 64 * 96,
    // Position and colour per dust point; one 4×4 matrix and one colour per rock.
    memoryKb: Math.round((layer.dust * 6 * 4 + rocksAtOnce * 19 * 4) / 1024),
    // CPU matrix updates per frame: only the near field tumbles.
    matrixUpdates: nearMax,
    rockSpacing: Math.round(nearMax ? spacing(nearRocksPerCell(layer.nearPerCell), CELL ** 3) : spacing(layer.ring)),
    crossSeconds: +((BELT.outer - BELT.inner) / SPACE_SPEED).toFixed(1),
  }
}

/** Option B: the whole ring, placed once. */
export function ringRocks(count: number, seed = 0xbe17) {
  const random = seededRandom(seed)
  return Array.from({ length: count }, () => {
    const p = sampleBeltPoint(random)
    return makeRock(random, p.x, p.y, p.z, 3, 26)
  })
}

/** Mean rocks in one cell on the middle plane of the belt, measured over 64 cells. */
export function nearRocksPerCell(perCell: number) {
  let total = 0
  for (let i = 0; i < 64; i++) {
    const angle = i / 64 * Math.PI * 2, radius = BELT.inner + (i % 8 + 0.5) / 8 * (BELT.outer - BELT.inner)
    total += cellRocks(Math.floor(Math.cos(angle) * radius / CELL), i % 2 - 1, Math.floor(Math.sin(angle) * radius / CELL), perCell).length
  }
  return total / 64
}
