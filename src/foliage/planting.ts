import * as THREE from 'three'
import { seededRandom } from '../terrain'
import type { TerrainSample } from '../terrain'
import { SPECIES, speciesTriangles } from './species'
import type { SpeciesId } from './species'
import { createFields, zoneAt } from './zones'
import type { Entry, OptionId } from './zones'

/**
 * The plan of a planting: where each plant of an option stands on a world. The plan has no
 * scene and no renderer, so a unit test can make it. scene.ts puts a plan on a world.
 */
export type Site = { kind: 'earth' | 'fairy'; radius: number; seed: number; sample: (x: number, y: number, z: number) => TerrainSample; mobile?: boolean }
/** The design levers of the study. Each lever can be off, to see what it adds. */
export type Levers = { clusters: boolean; variation: boolean; wind: boolean; ground: boolean; night: boolean }
export const ALL_LEVERS: Levers = { clusters: true, variation: true, wind: true, ground: true, night: false }
export type Batch = { species: SpeciesId; count: number; matrices: Float32Array; colours: Float32Array }
export type PlanStats = { trees: number; small: number; kinds: number; triangles: number; zones: Record<string, number> }

/** One candidate point for each 7.5 square metres of the planet. A phone gets half. */
export const CANDIDATE_AREA = 7.5
/** The share of the land that is wood, when the woods and glades lever is off. */
const EVEN_WOOD = 0.42
/** Two trees do not stand in the same cell of this size, in metres. */
const TREE_CELL = 2.6

function pick(entries: Entry[], roll: number) {
  let total = 0
  for (const entry of entries) total += entry.weight
  let at = roll * total
  for (const entry of entries) { at -= entry.weight; if (at <= 0) return entry }
  return entries[entries.length - 1]
}

export function plan(option: OptionId, site: Site, levers: Levers = ALL_LEVERS): { batches: Batch[]; stats: PlanStats } {
  const random = seededRandom(site.seed + 977)
  const fields = createFields(site.seed)
  const earth = site.kind === 'earth'
  const candidates = Math.round(4 * Math.PI * site.radius ** 2 / CANDIDATE_AREA * (site.mobile ? 0.5 : 1))
  const lists = new Map<SpeciesId, { matrices: number[]; colours: number[] }>()
  const taken = new Set<string>()
  const stats: PlanStats = { trees: 0, small: 0, kinds: 0, triangles: 0, zones: {} }
  const normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dummy = new THREE.Object3D(), colour = new THREE.Color()

  function place(entry: Entry, height: number, tree: boolean) {
    const species = SPECIES[entry.species], palette = entry.palette ?? species.palette
    // The same number of random values with each lever, so a lever does not move the plants.
    const rolls = [random(), random(), random(), random(), random(), random()]
    const size = (levers.variation ? THREE.MathUtils.lerp(species.scale[0], species.scale[1], rolls[0]) : (species.scale[0] + species.scale[1]) / 2) * (entry.size ?? 1)
    dummy.position.copy(normal).multiplyScalar(site.radius + height - (tree ? 0.12 : 0.04) * size)
    dummy.quaternion.setFromUnitVectors(up, normal)
    dummy.rotateY(rolls[1] * Math.PI * 2)
    if (levers.variation) dummy.rotateX((rolls[2] - 0.5) * 0.14)
    dummy.scale.setScalar(size)
    dummy.updateMatrix()
    colour.setHex(palette[levers.variation ? Math.floor(rolls[3] * palette.length) % palette.length : 0])
    if (levers.variation) colour.offsetHSL((rolls[4] - 0.5) * 0.03, (rolls[5] - 0.5) * 0.1, (rolls[4] - 0.5) * 0.08)
    let list = lists.get(entry.species)
    if (!list) { list = { matrices: [], colours: [] }; lists.set(entry.species, list) }
    list.matrices.push(...dummy.matrix.elements)
    list.colours.push(colour.r, colour.g, colour.b)
    if (tree) stats.trees++
    else stats.small++
    stats.triangles += speciesTriangles(entry.species)
  }

  for (let i = 0; i < candidates; i++) {
    const y = random() * 2 - 1, angle = random() * Math.PI * 2, roll = random(), second = random(), third = random()
    normal.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    const sample = site.sample(normal.x, normal.y, normal.z)
    if (sample.height > (earth ? 8.5 : 6)) continue
    // The clearing of the cottage stays free (src/candy.ts).
    if (!earth && y < 0 && Math.hypot(normal.x, normal.z) < 0.18) continue
    const bank = earth && sample.river > 0.12 && sample.river < 0.5 && sample.height > 0.15
    if (!bank && (sample.height < (earth ? 0.9 : 1) || sample.river > 0.1)) continue
    const zone = zoneAt(option, normal.x, normal.y, normal.z, sample, fields)
    if (!zone) continue
    if (bank) {
      if (zone.reeds && roll < 0.5) place({ species: 'reeds', weight: 1 }, sample.height, false)
      continue
    }
    const wood = levers.clusters ? THREE.MathUtils.smoothstep(fields.wood(normal.x, normal.y, normal.z), -0.05, 0.3) : EVEN_WOOD
    if (roll < zone.open + (zone.wood - zone.open) * wood) {
      const cell = `${Math.floor(normal.x * site.radius / TREE_CELL)},${Math.floor(normal.y * site.radius / TREE_CELL)},${Math.floor(normal.z * site.radius / TREE_CELL)}`
      if (taken.has(cell)) continue
      taken.add(cell)
      place(pick(zone.trees, second), sample.height, true)
      stats.zones[zone.id] = (stats.zones[zone.id] ?? 0) + 1
    } else if (second < zone.cover * (1 - 0.35 * wood)) place(pick(zone.under, third), sample.height, false)
  }

  const batches = [...lists].map(([species, list]) => ({ species, count: list.colours.length / 3, matrices: new Float32Array(list.matrices), colours: new Float32Array(list.colours) }))
  stats.kinds = batches.length
  return { batches, stats }
}
