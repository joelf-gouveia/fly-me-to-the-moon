import { createTerrain, seededRandom } from '../terrain'

export type LivingWorld = 'earth' | 'fairy'
export type Species = 'rabbit' | 'sheep' | 'duck' | 'cow'
export type Point = { x: number; z: number }
export type Field = { size: number; spacing: number; heights: Float32Array; seed: number; world: LivingWorld }
export const species = {
  cow: { name: 'Cow', habitat: 'land', speed: 0.38, footprint: 1.4, color: '#dad4c5', note: 'A sturdy oval, a broad pink muzzle, little horns, and four hooves.', behavior: 'Stroll → graze → turn back', feature: 'Coat spots' },
  rabbit: { name: 'Rabbit', habitat: 'land', speed: 0.85, footprint: 0.7, color: '#bd8760', note: 'Long ears, a round tail, and tiny hopping steps.', behavior: 'Hop → pause → turn back', feature: 'Pink ear centers' },
  sheep: { name: 'Sheep', habitat: 'land', speed: 0.52, footprint: 0.95, color: '#ece6d4', note: 'One woolly oval, four little legs, and a soft muzzle.', behavior: 'Amble → graze → turn back', feature: 'Wool tufts' },
  duck: { name: 'Duck', habitat: 'water', speed: 0.65, footprint: 0.9, color: '#daa458', note: 'A floating oval, a round head, and a broad little bill.', behavior: 'Paddle → drift → turn back', feature: 'Wing patches' },
} as const

// A flattened local survey of the same spherical noise used by the game.
// Select a mixed shore when one exists; never invent water for a missing habitat.
export function createField(world: LivingWorld, seed: number): Field {
  const sample = createTerrain(world, seed)
  const random = seededRandom(seed ^ 0x54ad)
  const radius = world === 'earth' ? 220 : 190
  let center = [0, 1, 0], east = [1, 0, 0], north = [0, 0, 1]
  let best = -Infinity
  for (let attempt = 0; attempt < 100; attempt++) {
    const y = random() * 1.6 - 0.8, angle = random() * Math.PI * 2
    const c = [Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle)]
    const e = [-Math.sin(angle), 0, Math.cos(angle)]
    const n = [y * Math.cos(angle), -Math.sqrt(1 - y * y), y * Math.sin(angle)]
    let land = 0, water = 0
    for (let x = -20; x <= 20; x += 5) for (let z = -20; z <= 20; z += 5) {
      const d = c.map((v, i) => v * radius + e[i] * x + n[i] * z)
      const length = Math.hypot(...d)
      const height = sample(d[0] / length, d[1] / length, d[2] / length).height
      if (height > 0.8 && height < 6) land++
      if (height < -0.8) water++
    }
    const score = Math.min(land, water) * 3 + land + water
    if (score > best) { best = score; center = c; east = e; north = n }
  }
  const size = 81, spacing = 0.6
  const heights = new Float32Array(size * size)
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const x = (col - (size - 1) / 2) * spacing, z = (row - (size - 1) / 2) * spacing
    const d = center.map((v, i) => v * radius + east[i] * x + north[i] * z)
    const length = Math.hypot(...d)
    heights[row * size + col] = sample(d[0] / length, d[1] / length, d[2] / length).height
  }
  return { size, spacing, heights, seed, world }
}

// Triangle interpolation matches the actual ground mesh, including its diagonal.
export function heightAt(field: Field, x: number, z: number) {
  const half = (field.size - 1) / 2
  const gx = x / field.spacing + half, gz = z / field.spacing + half
  const col = Math.max(0, Math.min(field.size - 2, Math.floor(gx)))
  const row = Math.max(0, Math.min(field.size - 2, Math.floor(gz)))
  const u = Math.max(0, Math.min(1, gx - col)), v = Math.max(0, Math.min(1, gz - row))
  const a = field.heights[row * field.size + col], b = field.heights[row * field.size + col + 1]
  const c = field.heights[(row + 1) * field.size + col], d = field.heights[(row + 1) * field.size + col + 1]
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v)
}

// Conservatively check every mesh vertex covering the full swept body footprint.
// Because triangles are linear, no hidden water/land sliver can cross a safe box.
export function safeSegment(field: Field, kind: Species, a: Point, b: Point) {
  const config = species[kind], half = (field.size - 1) / 2
  const minX = Math.floor((Math.min(a.x, b.x) - config.footprint) / field.spacing + half)
  const maxX = Math.ceil((Math.max(a.x, b.x) + config.footprint) / field.spacing + half)
  const minZ = Math.floor((Math.min(a.z, b.z) - config.footprint) / field.spacing + half)
  const maxZ = Math.ceil((Math.max(a.z, b.z) + config.footprint) / field.spacing + half)
  if (minX < 0 || minZ < 0 || maxX >= field.size || maxZ >= field.size) return false
  let low = Infinity, high = -Infinity
  for (let row = minZ; row <= maxZ; row++) for (let col = minX; col <= maxX; col++) {
    const height = field.heights[row * field.size + col]
    low = Math.min(low, height); high = Math.max(high, height)
  }
  if (config.habitat === 'water') return high < -0.35
  return low > 0.45 && high < 8 && high - low < 1.15
}

export type Resident = { kind: Species; route: Point[]; phase: number; scale: number }

export function populate(field: Field, populationSeed: number, perSpecies = 5): Resident[] {
  const random = seededRandom(populationSeed)
  const residents: Resident[] = []
  const extent = (field.size - 1) * field.spacing / 2 - 3
  for (const kind of Object.keys(species) as Species[]) {
    let count = 0
    for (let attempt = 0; attempt < 1800 && count < perSpecies; attempt++) {
      const start = { x: (random() * 2 - 1) * extent, z: (random() * 2 - 1) * extent }
      if (!safeSegment(field, kind, start, start)) continue
      if (residents.some(other => Math.hypot(other.route[0].x - start.x, other.route[0].z - start.z) < 3)) continue
      const route = [start]
      for (let step = 0; step < 3; step++) {
        const from = route[route.length - 1]
        for (let choice = 0; choice < 20; choice++) {
          const angle = random() * Math.PI * 2, distance = 1.4 + random() * 1.8
          const next = { x: from.x + Math.cos(angle) * distance, z: from.z + Math.sin(angle) * distance }
          if (Math.hypot(next.x - start.x, next.z - start.z) > 6 || !safeSegment(field, kind, from, next)) continue
          route.push(next)
          break
        }
      }
      if (route.length < 3) continue // Skip cramped habitats rather than force an unsafe spawn.
      residents.push({ kind, route, phase: random() * 20, scale: 0.82 + random() * 0.18 })
      count++
    }
  }
  return residents
}

export function poseOnRoute(resident: Resident, time: number) {
  // Walk the exact verified segments in both directions. No spline corner cutting.
  const route = [...resident.route, ...resident.route.slice(0, -1).reverse()]
  const speed = species[resident.kind].speed, rest = 1.4
  const durations = route.slice(1).map((p, i) => Math.hypot(p.x - route[i].x, p.z - route[i].z) / speed)
  const cycle = durations.reduce((sum, duration) => sum + duration + rest, 0)
  let remaining = ((time + resident.phase) % cycle + cycle) % cycle
  for (let i = 0; i < durations.length; i++) {
    const duration = durations[i], a = route[i], b = route[i + 1]
    if (remaining <= duration + rest || i === durations.length - 1) {
      const t = Math.min(1, remaining / duration)
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z), moving: remaining < duration }
    }
    remaining -= duration + rest
  }
  throw new Error('A creature needs a route with at least two points')
}
