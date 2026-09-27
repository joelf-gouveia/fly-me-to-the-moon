import { seededRandom } from './terrain'
import { PROPORTIONS } from './proportions'

export type Point = { x: number; y: number; z: number }

/** The real belt (2.1 to 3.3 AU) maps linearly onto the gap between Mars and Jupiter, in base units. */
export const BELT_BASE = { inner: 4850, outer: 5550, halfHeight: 160, innerAu: 2.1, outerAu: 3.3 }
export type Belt = typeof BELT_BASE
/** The belt in the game: the base belt at the spacing of src/proportions.ts. */
export const BELT: Belt = { ...BELT_BASE, inner: BELT_BASE.inner * PROPORTIONS.spacing, outer: BELT_BASE.outer * PROPORTIONS.spacing, halfHeight: BELT_BASE.halfHeight * PROPORTIONS.spacing }
export const auToGame = (au: number, belt: Belt = BELT) => belt.inner + (au - belt.innerAu) / (belt.outerAu - belt.innerAu) * (belt.outer - belt.inner)
export const gameToAu = (radius: number, belt: Belt = BELT) => belt.innerAu + (radius - belt.inner) / (belt.outer - belt.inner) * (belt.outerAu - belt.innerAu)

/** Jupiter clears these orbits. Ratios are asteroid orbits per Jupiter orbit. */
export const KIRKWOOD_GAPS = [
  { au: 2.5, resonance: '3:1' }, { au: 2.82, resonance: '5:2' },
  { au: 2.95, resonance: '7:3' }, { au: 3.27, resonance: '2:1' },
] as const
const GAP_WIDTH_AU = 0.02

/** Relative number of asteroids at a distance: a broad hump with four narrow gaps. */
export function beltDensity(au: number) {
  const smooth = (edge0: number, edge1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t) }
  let density = smooth(2.1, 2.2, au) * (1 - smooth(3.15, 3.3, au)) * (0.62 + 0.38 * Math.exp(-(((au - 2.72) / 0.36) ** 2)))
  for (const gap of KIRKWOOD_GAPS) density *= 1 - 0.94 * Math.exp(-(((au - gap.au) / GAP_WIDTH_AU) ** 2))
  return density
}

/** One belt position in the belt frame (the Sun at the origin), by rejection sampling. */
export function sampleBeltPoint(random: () => number, spread = 1, belt: Belt = BELT): Point & { au: number } {
  for (;;) {
    const au = belt.innerAu + random() * (belt.outerAu - belt.innerAu)
    if (random() > beltDensity(au)) continue
    const radius = auToGame(au, belt), angle = random() * Math.PI * 2
    // A soft vertical spread: most rocks near the middle plane, none past halfHeight.
    const y = (random() + random() + random() - 1.5) / 1.5 * belt.halfHeight * spread
    return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, au }
  }
}

/**
 * True when a sphere of this radius touches the belt volume. The belt turns
 * about the Sun's axis, so the test is the same in world and belt coordinates.
 */
export function touchesBelt(position: Point, radius = 0, belt: Belt = BELT) {
  const r = Math.hypot(position.x, position.z)
  return r > belt.inner - radius && r < belt.outer + radius && Math.abs(position.y) < belt.halfHeight + radius
}

/** Dwarf worlds at their real distances. Sizes are stylized, as for the planets, and in base units. */
export const DWARF_WORLDS = [
  { id: 'ceres', name: 'Ceres', au: 2.77, radius: 26, angle: 2.62, color: 0x8b867e, spin: 180 },
  { id: 'vesta', name: 'Vesta', au: 2.36, radius: 18, angle: 1.55, color: 0xa79a86, spin: 150 },
] as const
export type DwarfWorld = typeof DWARF_WORLDS[number]

/** Belt-frame centre of a dwarf world. The belt and the worlds turn together. */
export function dwarfPosition(world: DwarfWorld, belt: Belt = BELT): Point {
  const radius = auToGame(world.au, belt)
  return { x: Math.cos(world.angle) * radius, y: 0, z: Math.sin(world.angle) * radius }
}

/** True when a sphere of this radius touches Ceres or Vesta. `size` scales their base radius. */
export function insideDwarfWorld(position: Point, radius = 0, belt: Belt = BELT, size: number = PROPORTIONS.size) {
  return DWARF_WORLDS.some(world => {
    const centre = dwarfPosition(world, belt)
    return Math.hypot(position.x - centre.x, position.y - centre.y, position.z - centre.z) < world.radius * size + radius
  })
}

// Near field: cells around the camera, filled from a seed per cell.
export const CELL = 120
export const NEAR_RANGE = { across: 2, up: 1 }
export const NEAR_CELLS = (2 * NEAR_RANGE.across + 1) ** 2 * (2 * NEAR_RANGE.up + 1)
export const ROCK_VARIANTS = 4

/** Dust points and rock candidates per cell. A phone draws half. */
export const BELT_LAYERS = { desktop: { dust: 12000, perCell: 14 }, phone: { dust: 6000, perCell: 7 } } as const

/** A stable seed for one near-field cell, so a cell always has the same rocks. */
export function cellSeed(ix: number, iy: number, iz: number) {
  let h = 0x9e3779b9 ^ Math.imul(ix, 0x85ebca6b) ^ Math.imul(iy, 0xc2b2ae35) ^ Math.imul(iz, 0x27d4eb2f)
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  return (h ^ (h >>> 15)) >>> 0
}

export type Rock = { x: number; y: number; z: number; size: number; variant: number; tint: number; axis: Point; spin: number; phase: number }

export function makeRock(random: () => number, x: number, y: number, z: number, min: number, max: number): Rock {
  // A steep size law: many pebbles, few boulders.
  const size = min + (max - min) * random() ** 3
  const u = random() * 2 - 1, a = random() * Math.PI * 2, s = Math.sqrt(1 - u * u)
  return { x, y, z, size, variant: Math.floor(random() * ROCK_VARIANTS), tint: random(), axis: { x: s * Math.cos(a), y: u, z: s * Math.sin(a) }, spin: 0.05 + random() * 0.35, phase: random() * Math.PI * 2 }
}

/** Rocks of one cell. The count follows the belt density, with the gaps. */
export function cellRocks(ix: number, iy: number, iz: number, perCell: number, belt: Belt = BELT, size: number = PROPORTIONS.size): Rock[] {
  const cx = (ix + 0.5) * CELL, cy = (iy + 0.5) * CELL, cz = (iz + 0.5) * CELL
  if (!touchesBelt({ x: cx, y: cy, z: cz }, 0, belt)) return []
  const random = seededRandom(cellSeed(ix, iy, iz))
  const rocks: Rock[] = []
  for (let i = 0; i < perCell; i++) {
    const x = cx + (random() - 0.5) * CELL, y = cy + (random() - 0.5) * CELL, z = cz + (random() - 0.5) * CELL
    const au = gameToAu(Math.hypot(x, z), belt)
    // Fewer rocks away from the middle plane.
    const keep = beltDensity(au) * Math.exp(-((y / belt.halfHeight) ** 2) * 1.5)
    const candidate = makeRock(random, x, y, z, 0.8, 9)
    if (random() < keep && touchesBelt({ x, y, z }, 0, belt) && !insideDwarfWorld({ x, y, z }, candidate.size + 6, belt, size)) rocks.push(candidate)
  }
  return rocks
}

/** Cells of the near field around a belt-frame position. */
export function nearCellsAround(position: Point) {
  const ix = Math.floor(position.x / CELL), iy = Math.floor(position.y / CELL), iz = Math.floor(position.z / CELL)
  const cells: Array<[number, number, number]> = []
  for (let dx = -NEAR_RANGE.across; dx <= NEAR_RANGE.across; dx++)
    for (let dy = -NEAR_RANGE.up; dy <= NEAR_RANGE.up; dy++)
      for (let dz = -NEAR_RANGE.across; dz <= NEAR_RANGE.across; dz++) cells.push([ix + dx, iy + dy, iz + dz])
  return cells
}
