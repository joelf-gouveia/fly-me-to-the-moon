import * as THREE from 'three'
import { seededRandom } from '../terrain'
import type { TerrainSample } from '../terrain'
import { createFields } from '../foliage/zones'
import { HERD_KINDS } from './catalog'
import type { KindId, Species } from './catalog'
import { hasModel } from './joined'
import { fits, placeAt } from './rules'
import type { Place, Zone } from './rules'
import type { CreatureObstacles, SphericalHabitat } from './spherical'

/**
 * The herds of a world (step 3 of the build plan of docs/animals-study.md). They replace
 * populateSphere(): each kind lives where its rule allows, never at a fixed place, so a new Earth
 * gets new herds.
 *
 * 1. A survey of the world: the points of a Fibonacci sphere, each with its place (placeAt()).
 * 2. The groups. Each kind is placed in the order of its size (the large kinds first), with its own
 *    random numbers. A group keeps a gap to the groups of its own kind and does not overlap a group
 *    of another kind.
 * 3. Each member stands on good ground: the vertices of the ground mesh under its footprint are in
 *    the height range of its surface, with a slope under 1.35 m, and clear of the plants and the
 *    candy. A swimmer needs water deep enough for its size.
 * 4. A herd on the ground or on a river walks a short route of three points, each good for each
 *    member, and rests. A flock, a pod and a whale go around a loop.
 */
export type HerdKind = 'ground' | 'water' | 'air' | 'leap'
export type Member = {
  /** The place in the herd, in metres to the east and to the north of the centre of the herd. */
  east: number; north: number
  scale: number; phase: number; yaw: number
  /** The colour of the instance: the candy colour of a gummy bear cub or a jellyfish, else null. */
  tint: THREE.Color | null
  /** The height of the ground under the member at each point of the route, in metres from the sea. */
  ground: number[]
}
export type Herd = {
  id: number
  species: Species
  kind: HerdKind
  members: Member[]
  /** The route of the centre, as directions: there and back. A loop has one point, its centre. */
  route: THREE.Vector3[]
  durations: number[]
  cycle: number
  rest: number
  phase: number
  east: THREE.Vector3
  north: THREE.Vector3
  /** Fliers and leapers: the radius of the loop in metres, its height over the sea, and its speed in radians per second. */
  loop: number
  height: number
  turn: number
  /** The zone at the centre of the herd, and its latitude in degrees, for the seasons. */
  zone: Zone
  latitude: number
}

export const TAU = Math.PI * 2
/** The walking speed of a kind in metres per second. */
export const speedOf = (species: Species) => species.move === 'crawl' ? 0.18 : species.move === 'waddle' ? 0.35 : THREE.MathUtils.clamp(species.size * 0.35, 0.3, 0.9)
/** The radius that one animal keeps free on the ground, in metres. */
export const footprintOf = (species: Species) => Math.max(0.35, species.size * (species.move === 'fly' ? 0.3 : 0.45))
export const herdKindOf = (species: Species): HerdKind => species.move === 'fly' || (species.layer === 'small' && species.move === 'float' && species.rule.air) ? 'air'
  : species.move === 'leap' ? 'leap' : species.move === 'swim' || (species.move === 'float' && !species.rule.air) ? 'water' : 'ground'

/** The space between the rings of two members of a loop, in metres: a flock flies wide, a school of fish is close. */
export const lateralOf = (species: Species, kind: HerdKind) => kind === 'air' ? (species.layer === 'small' ? 0.45 : 0.9) : species.layer === 'small' ? 0.3 : 1.2

/** The survey of a world: a place for each point of a Fibonacci sphere. It is made once for each landscape. */
export type Survey = { dirs: THREE.Vector3[]; places: Place[] }
export function survey(world: 'earth' | 'fairy', seed: number, sample: (x: number, y: number, z: number) => TerrainSample, radius: number, count: number): Survey {
  const fields = createFields(seed), dirs: THREE.Vector3[] = [], places: Place[] = []
  for (let i = 0; i < count; i++) {
    const y = 1 - (i + 0.5) / count * 2, ring = Math.sqrt(1 - y * y), angle = i * 2.399963229728653
    const dir = new THREE.Vector3(Math.cos(angle) * ring, y, Math.sin(angle) * ring)
    dirs.push(dir)
    places.push(placeAt(world, dir.x, dir.y, dir.z, sample, fields, radius))
  }
  return { dirs, places }
}

export type HerdSite = {
  world: 'earth' | 'fairy'
  /** The seed of the landscape: the zones come from it. */
  seed: number
  /** The seed of the random numbers of the herds. The default is the seed of the landscape. */
  random?: number
  radius: number
  sample: (x: number, y: number, z: number) => TerrainSample
  /** The ground mesh of the world. */
  ground: SphericalHabitat
  obstacles: CreatureObstacles
  /** A few herds start near this direction: the meadow of Earth, the cottage garden of Blossom Haven. */
  anchor?: THREE.Vector3
  /** The points of the survey: 40,000 on Earth (about 4.9 m apart) and 16,000 on Blossom Haven. */
  points?: number
  /** More or fewer groups of each kind. */
  density?: number
  /** Keep only these kinds (for a test). The other kinds take their places too, so the kept herds do not change. */
  only?: KindId[]
}

/**
 * The kinds that have one herd near the anchor first, so the start of a visit has animals in the view.
 * The meadow of the start of Earth is in the leaf forest or in the pine forest; a kind gets a herd there only when its rule allows the place.
 */
const START_KINDS: KindId[] = ['cow', 'sheep', 'rabbit', 'deer', 'fox', 'moose', 'hare', 'unicorn', 'dragonling', 'kitsune', 'gummyBear']
/** The colours of the instances of the candy kinds. */
const TINTS: Partial<Record<KindId, number[]>> = {
  gummyBear: [0xff5a6e, 0xffa04a, 0xffe066, 0x7fdc6a, 0xfff0f0],
  jelly: [0xf4a6d6, 0xc3a6e6, 0x9ed8c4],
  butterfly: [0xffb347, 0xff9ec7, 0xffe066, 0x9fd3ee, 0xffffff],
}
/** The young of a family are smaller: an elephant calf, a bear cub, a fawn, a giraffe calf. */
const FAMILIES: KindId[] = ['elephant', 'bear', 'deer', 'giraffe', 'moose']

export function placeHerds(site: HerdSite): Herd[] {
  const { world, seed, radius, ground, obstacles } = site
  const points = site.points ?? (world === 'earth' ? 40000 : 16000)
  const map = survey(world, seed, site.sample, radius, points)
  // The large kinds first, so they find room; the small ones fill the space between them.
  const list = HERD_KINDS.filter(species => species.world === world && (species.layer === 'small' || hasModel(species.id)))
    .sort((a, b) => b.size - a.size)
  const fields = createFields(seed)
  const herds: Herd[] = []
  let serial = 0

  // The groups of one kind keep a gap between them; the groups of two kinds do not overlap.
  type Spot = { p: THREE.Vector3; reach: number; id: string; air: boolean }
  const cells = new Map<string, Spot[]>()
  const CELL = 40
  const cellOf = (p: THREE.Vector3) => [Math.floor(p.x * radius / CELL), Math.floor(p.y * radius / CELL), Math.floor(p.z * radius / CELL)]
  const crowded = (p: THREE.Vector3, gap: number, reach: number, id: string, air: boolean) => {
    const [cx, cy, cz] = cellOf(p)
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
      for (const other of cells.get(`${x},${y},${z}`) ?? []) {
        if (other.air !== air) continue
        const distance = other.p.angleTo(p) * radius
        if (distance < (other.id === id ? gap : reach + other.reach + 1.5)) return true
      }
    }
    return false
  }
  const remember = (spot: Spot) => { const key = cellOf(spot.p).join(','); cells.set(key, [...(cells.get(key) ?? []), spot]) }

  /** The low and the high ground under a cap of `reach` metres, from the vertices of the ground mesh (as SphericalHabitat.safeSegment()). */
  function groundRange(n: THREE.Vector3, reach: number) {
    const cap = reach / radius, theta = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1))
    if (theta <= cap + 0.02 || theta >= Math.PI - cap - 0.02) return null
    const longitude = (Math.atan2(n.z, -n.x) % TAU + TAU) % TAU
    const span = Math.asin(Math.min(1, Math.sin(cap) / Math.sin(theta)))
    const minRow = Math.floor((theta - cap) / Math.PI * ground.height), maxRow = Math.ceil((theta + cap) / Math.PI * ground.height)
    const minCol = Math.floor((longitude - span) / TAU * ground.width), maxCol = Math.ceil((longitude + span) / TAU * ground.width)
    let low = Infinity, high = -Infinity
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const value = ground.radii[row * (ground.width + 1) + ((col % ground.width) + ground.width) % ground.width] - radius
      low = Math.min(low, value); high = Math.max(high, value)
    }
    return [low, high] as const
  }
  /** True when the place of `n` passes the rule of the kind: each animal stays in its zone, also at the edge of two belts. */
  const placeFits = (species: Species, n: THREE.Vector3) => fits(species.rule, placeAt(world, n.x, n.y, n.z, site.sample, fields, radius))
  /** True when an animal of `species` can stand or swim at `n`, on good ground and in a place of its rule. */
  function standsAt(species: Species, kind: HerdKind, n: THREE.Vector3) {
    const foot = footprintOf(species)
    if (kind === 'water' || kind === 'leap') {
      const range = groundRange(n, species.size > 4 ? 3 : foot + 0.6)
      // A pod, a school or a whale swims a loop: each point of the loop is in its zone, over water deep enough for it.
      return !!range && range[1] < (species.size > 4 ? -2 : kind === 'leap' && species.size > 1.5 ? -1.2 : -0.5) && (kind === 'leap' || species.size > 2 ? placeFits({ ...species, rule: { ...species.rule, surfaces: [] } }, n) : placeFits(species, n))
    }
    const range = groundRange(n, foot)
    if (!range) return false
    const wade = species.rule.surfaces.includes('sea') || species.rule.surfaces.includes('shore')
    const low = wade ? (species.rule.surfaces.includes('sea') ? -0.6 : 0.15) : 0.65
    return range[0] > low && range[1] < 9 && range[1] - range[0] < 1.35 && obstacles.clearSegment(n, n, radius, foot) && placeFits(species, n)
  }
  const offset = (n: THREE.Vector3, east: THREE.Vector3, north: THREE.Vector3, x: number, z: number, out = new THREE.Vector3()) =>
    out.copy(n).multiplyScalar(radius).addScaledVector(east, x).addScaledVector(north, z).normalize()
  const heightAt = (n: THREE.Vector3) => {
    const r = ground.radiusAt(n)
    return Number.isFinite(r) ? r - radius : Math.max(0, site.sample(n.x, n.y, n.z).height)
  }

  for (const species of list) {
    const kind = herdKindOf(species)
    const random = seededRandom(((site.random ?? seed) ^ 0x5eed) + [...species.id].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) % 1000003, 7))
    const matches: number[] = []
    map.places.forEach((place, i) => { if (fits(species.rule, place)) matches.push(i) })
    if (!matches.length) continue
    const wanted = Math.round((world === 'earth' ? (species.size > 4 ? 10 : species.layer === 'small' ? 26 : 34) : (species.layer === 'small' ? 16 : 14)) * (site.density ?? 1))
    const nearStart = site.anchor && START_KINDS.includes(species.id) ? 60 : 0
    let made = 0
    for (let attempt = 0; attempt < wanted * 30 + nearStart && made < wanted; attempt++) {
      let centre: THREE.Vector3
      if (attempt < nearStart && made === 0) {
        // One herd of a start kind 8 to 30 m from the anchor, when its rule allows the place there.
        centre = offsetDirection(site.anchor!, random() * TAU, 8 + random() * 22, radius)
        if (!fits(species.rule, placeAt(world, centre.x, centre.y, centre.z, site.sample, fields, radius))) continue
      } else centre = map.dirs[matches[Math.floor(random() * matches.length)]].clone()
      const gap = kind === 'air' ? 30 : species.size > 4 ? 40 : 12
      const count0 = species.herd[1], reach = kind === 'air' ? 3 : (kind === 'leap' || species.size > 2 && kind === 'water' ? 10 : 0.8 + Math.sqrt(count0) * footprintOf(species) * 1.1 + 2)
      if (crowded(centre, gap, reach, species.id, kind === 'air')) continue
      const east = new THREE.Vector3().crossVectors(centre, Math.abs(centre.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
      const north = new THREE.Vector3().crossVectors(centre, east)
      const count = species.herd[0] + Math.floor(random() * (species.herd[1] - species.herd[0] + 1))
      const zone = placeAt(world, centre.x, centre.y, centre.z, site.sample, fields, radius).zone
      const herd: Herd = {
        id: serial++, species, kind, members: [], route: [centre], durations: [], cycle: 1, rest: 2 + random() * 3, phase: random() * 40,
        east, north, loop: 0, height: 0, turn: 0, zone, latitude: Math.asin(THREE.MathUtils.clamp(centre.y, -1, 1)) * 180 / Math.PI,
      }
      const foot = footprintOf(species)
      if (kind === 'air') {
        // A loop over the zone, high over the highest ground of the loop.
        herd.loop = (species.layer === 'small' ? 2.5 : 7) + random() * (species.layer === 'small' ? 3 : 8)
        let top = 0
        for (let k = 0; k < 8; k++) top = Math.max(top, site.sample(...offset(centre, east, north, Math.cos(k / 8 * TAU) * herd.loop, Math.sin(k / 8 * TAU) * herd.loop).toArray()).height)
        const [low, high] = species.rule.air ?? [6, 10]
        // Over the jungle the trees are tall.
        herd.height = Math.max(0, top) + low + random() * (high - low) + (species.rule.zones.includes('jungle') && species.layer !== 'small' ? 3 : 0)
        herd.turn = (species.layer === 'small' ? 0.5 : 0.22 + random() * 0.12) * (random() < 0.5 ? -1 : 1)
      } else if (kind === 'leap' || (kind === 'water' && species.size > 2)) {
        // A pod, a school, a whale or the soda serpent: a loop on the water that stays over deep enough water.
        herd.loop = species.size > 4 ? 12 : species.layer === 'small' ? 1.5 : kind === 'leap' ? 6 + random() * 3 : 4 + random() * 2
        let ok = standsAt(species, kind, centre)
        // Each member swims a ring of its own: the inner and the outer ring stay over the water too.
        const wide = Math.ceil((count - 1) / 2) * lateralOf(species, kind)
        for (const ring of [herd.loop, herd.loop + wide, Math.max(0, herd.loop - wide)]) for (let k = 0; k < 12 && ok; k++) ok = standsAt(species, kind, offset(centre, east, north, Math.cos(k / 12 * TAU) * ring, Math.sin(k / 12 * TAU) * ring))
        if (!ok) continue
        herd.turn = (species.size > 4 ? 0.04 : species.layer === 'small' ? 0.25 : 0.12) * (random() < 0.5 ? -1 : 1)
      }
      // The members: a small group around the centre, each one on good ground.
      const spread = kind === 'air' ? 1.6 : 0.8 + Math.sqrt(count) * foot * 1.1
      const walks = kind === 'ground' || (kind === 'water' && species.size <= 2)
      for (let tries = 0; tries < count * 12 && herd.members.length < count; tries++) {
        const first = herd.members.length === 0
        const x = first ? 0 : (random() * 2 - 1) * spread, z = first ? 0 : (random() * 2 - 1) * spread
        if (herd.members.some(m => Math.hypot(m.east - x, m.north - z) < foot * 1.6)) continue
        if (walks && !standsAt(species, kind, offset(centre, east, north, x, z))) continue
        const palette = TINTS[species.id]
        const tint = palette ? new THREE.Color(palette[Math.floor(random() * palette.length)]) : null
        const young = FAMILIES.includes(species.id) && herd.members.length === count - 1 && count > 1
        herd.members.push({ east: x, north: z, scale: young ? 0.55 : 0.88 + random() * 0.12, phase: random() * TAU, yaw: (random() * 2 - 1) * 0.5, tint, ground: [] })
      }
      if (herd.members.length < Math.min(count, species.herd[0])) continue
      // A short walk: three points, each one good for each member, and the points of each step too.
      if (walks) {
        for (let step = 0; step < 2; step++) {
          const from = herd.route[herd.route.length - 1]
          for (let choice = 0; choice < 10; choice++) {
            const a = random() * TAU, d = 2 + random() * 3
            const next = offset(from, east, north, Math.cos(a) * d, Math.sin(a) * d)
            if (next.angleTo(centre) * radius > 7) continue
            // The end of the step and five points on the way, about 1 m apart, are good for each member.
            const points = [1, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6].map(t => from.clone().lerp(next, t).normalize())
            if (herd.members.every(m => points.every(p => standsAt(species, kind, offset(p, east, north, m.east, m.north))))) { herd.route.push(next); break }
          }
        }
        const route = [...herd.route, ...herd.route.slice(0, -1).reverse()]
        herd.route = route
        herd.durations = route.slice(1).map((p, i) => p.angleTo(route[i]) * radius / speedOf(species))
        herd.cycle = herd.durations.reduce((sum, d) => sum + d + herd.rest, 0) || 1
      }
      // The height of the ground under each member at each point of the route: a far animal needs no ray test.
      const point = new THREE.Vector3()
      for (const member of herd.members) member.ground = herd.route.map(p => heightAt(offset(p, east, north, member.east, member.north, point)))
      // A test can keep only some kinds: each kind still takes its place, so the other kinds do not move.
      if (!site.only || site.only.includes(species.id)) herds.push(herd)
      remember({ p: centre, reach, id: species.id, air: kind === 'air' }); made++
    }
  }
  return herds
}

/** A direction `distance` metres from `normal` on the sphere, at `angle` from its east. */
export function offsetDirection(normal: THREE.Vector3, angle: number, distance: number, radius: number) {
  const east = new THREE.Vector3().crossVectors(normal, Math.abs(normal.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
  const north = new THREE.Vector3().crossVectors(normal, east)
  const tangent = east.multiplyScalar(Math.cos(angle)).addScaledVector(north, Math.sin(angle))
  return normal.clone().multiplyScalar(Math.cos(distance / radius)).addScaledVector(tangent, Math.sin(distance / radius)).normalize()
}
