import * as THREE from 'three'
import type { World } from '../../src/worlds'
import { seededRandom } from '../../src/terrain'
import { createFields } from '../../src/foliage/zones'
import { magicAt } from '../../src/magic-seasons'
import type { MagicId } from '../../src/magic-seasons'
import type { SeasonName } from '../../src/seasons'
import { canSayHello, createHeartPool, heartCount, heartPool, heartPose, helloLength, helloLift, helloTurn } from '../../src/creatures/hello'
import type { HeartPose } from '../../src/creatures/hello'
import type { SphericalHabitat } from '../../src/creatures/spherical'
import { SPECIES } from './catalog'
import type { OptionId, Species } from './catalog'
import { fits, placeAt } from './rules'
import type { Place } from './rules'
import { farMaterial, gaitOf, joinedGeometry, partsModel, RIG_TIME, rigMaterial } from './build'
import type { PartsModel } from './build'
import { SHAPE_IDS } from './shapes'

/**
 * The fauna of one option on one world of the lab. It puts the species of the option where their
 * rules allow (a survey of the real planet: the zones, the water and the heights of the game), and
 * it draws them in the way of the option:
 *
 * - A: one mesh for each part, for the nearest 28 animals (14 on a phone), as the game does today.
 * - B: one InstancedMesh for each species with the joined model moved by the graphics card, a
 *   simple far model after NEAR metres, and a limit for the animals in the view.
 * - C: the joined model only for the nearest few animals, a point for each other animal, and the
 *   small life (fish, insects, geese) as points or tiny instanced models.
 *
 * The animals of the game are hidden while the fauna lives, and they come back at dispose().
 */
export type FaunaSettings = {
  option: OptionId
  mobile: boolean
  /** Only these species (ids); the default is each species of the option for this world. */
  only?: string[]
  /** The season of Earth, or a function that gives the magic season of a direction on Blossom Haven. */
  season?: SeasonName | null
  magic?: (y: number) => MagicId | null
  /** More or fewer groups of each species. */
  density?: number
}

/** The limits of each option, on a computer and on a phone. */
export const LIMITS = {
  A: { models: 28, phoneModels: 14, range: 97 },
  B: { near: 45, far: 170, cap: 260, phoneCap: 130, phoneNear: 32 },
  C: { near: 40, models: 12, phoneModels: 6, dots: 220, small: 90 },
} as const

type Kind = 'ground' | 'water' | 'air' | 'leap'
type Member = { east: number; north: number; scale: number; phase: number; yaw: number; tint: THREE.Color | null; ground: number }
type Herd = {
  id: number
  species: Species
  kind: Kind
  members: Member[]
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
}
/** One animal in one frame. */
type Pose = { herd: Herd; index: number; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number; moving: number; distance: number; key: number; hop: number }
const refineNormal = new THREE.Vector3()
/** The exact height of the ground under a near animal on land, from the triangles of the ground mesh, and its hop. */
function refine(pose: Pose, ground: SphericalHabitat) {
  if (pose.herd.kind !== 'ground') return
  refineNormal.copy(pose.position).normalize()
  const r = ground.radiusAt(refineNormal)
  if (Number.isFinite(r)) pose.position.copy(refineNormal).multiplyScalar(r + 0.02)
  if (pose.hop) pose.position.addScaledVector(refineNormal, pose.hop)
}

const TAU = Math.PI * 2
const speedOf = (species: Species) => species.move === 'crawl' ? 0.18 : species.move === 'waddle' ? 0.35 : THREE.MathUtils.clamp(species.size * 0.35, 0.3, 0.9)
const footprintOf = (species: Species) => Math.max(0.35, species.size * (species.move === 'fly' ? 0.3 : 0.45))
const kindOf = (species: Species): Kind => species.move === 'fly' || (species.layer === 'small' && species.move === 'float' && species.rule.air) ? 'air'
  : species.move === 'leap' ? 'leap' : species.move === 'swim' || (species.move === 'float' && !species.rule.air) ? 'water' : 'ground'

/** The survey of a world: a place for each point of a Fibonacci sphere. It is made once for each landscape. */
type Survey = { dirs: THREE.Vector3[]; places: Place[] }
const surveys = new Map<string, Survey>()
export function surveyOf(world: World): Survey {
  const key = `${world.kind}-${world.seed}`
  const known = surveys.get(key)
  if (known) return known
  const count = world.kind === 'earth' ? 40000 : 16000
  const fields = createFields(world.seed), dirs: THREE.Vector3[] = [], places: Place[] = []
  const kind = world.kind === 'earth' ? 'earth' : 'fairy'
  for (let i = 0; i < count; i++) {
    const y = 1 - (i + 0.5) / count * 2, ring = Math.sqrt(1 - y * y), angle = i * 2.399963229728653
    const dir = new THREE.Vector3(Math.cos(angle) * ring, y, Math.sin(angle) * ring)
    dirs.push(dir)
    places.push(placeAt(kind, dir.x, dir.y, dir.z, world.sample, fields, world.radius))
  }
  const survey = { dirs, places }
  surveys.set(key, survey)
  return survey
}

export function createFauna(world: World, settings: FaunaSettings) {
  const creatures = world.creatures!
  const ground = creatures.ground, obstacles = creatures.obstacles
  const radius = world.radius, mobile = settings.mobile, option = settings.option
  // The animals of the game hide while the fauna of the study lives.
  const gameUpdate = creatures.update
  creatures.group.visible = false
  creatures.update = () => {}
  // Each species of the world is placed, in the order of the catalog, and the option keeps its own
  // species: so a species has the same groups in each option, and two groups never stand on one place.
  // A species without a model of the study is left out, except the small life of option C (points).
  // The large species come first, so they find room; the small ones fill the space between them.
  const list = SPECIES.filter(species => species.world === (world.kind === 'earth' ? 'earth' : 'fairy') && species.id !== 'pegasus' && (species.prototype || species.layer === 'small'))
    .sort((a, b) => b.size - a.size)
  const keep = (species: Species) => species.options.includes(option) && (!settings.only || settings.only.includes(species.id))
  const survey = surveyOf(world)
  const herds: Herd[] = []
  let serial = 0
  // The groups of one species keep a gap between them; the groups of two species do not overlap.
  // Each species has its own random numbers, so its groups do not depend on the species before it.
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
  function groundRange(habitat: SphericalHabitat, n: THREE.Vector3, reach: number) {
    const cap = reach / radius, theta = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1))
    if (theta <= cap + 0.02 || theta >= Math.PI - cap - 0.02) return null
    const longitude = (Math.atan2(n.z, -n.x) % TAU + TAU) % TAU
    const span = Math.asin(Math.min(1, Math.sin(cap) / Math.sin(theta)))
    const minRow = Math.floor((theta - cap) / Math.PI * habitat.height), maxRow = Math.ceil((theta + cap) / Math.PI * habitat.height)
    const minCol = Math.floor((longitude - span) / TAU * habitat.width), maxCol = Math.ceil((longitude + span) / TAU * habitat.width)
    let low = Infinity, high = -Infinity
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const value = habitat.radii[row * (habitat.width + 1) + ((col % habitat.width) + habitat.width) % habitat.width] - radius
      low = Math.min(low, value); high = Math.max(high, value)
    }
    return [low, high] as const
  }
  /** True when an animal of `species` can stand or swim at `n`. */
  function standsAt(species: Species, kind: Kind, n: THREE.Vector3) {
    const foot = footprintOf(species)
    if (kind === 'water' || kind === 'leap') {
      const range = groundRange(ground, n, species.size > 4 ? 3 : foot + 0.6)
      return !!range && range[1] < (species.size > 4 ? -2 : species.size > 1.5 ? -1.2 : -0.5)
    }
    const range = groundRange(ground, n, foot)
    if (!range) return false
    const wade = species.rule.surfaces.includes('sea') || species.rule.surfaces.includes('shore')
    const low = wade ? (species.rule.surfaces.includes('sea') ? -0.6 : 0.15) : 0.65
    return range[0] > low && range[1] < 9 && range[1] - range[0] < 1.35 && obstacles.clearSegment(n, n, radius, foot)
  }
  const offset = (n: THREE.Vector3, east: THREE.Vector3, north: THREE.Vector3, x: number, z: number, out = new THREE.Vector3()) =>
    out.copy(n).multiplyScalar(radius).addScaledVector(east, x).addScaledVector(north, z).normalize()

  // ---- Placement -----------------------------------------------------------------------------------
  const seasonAtDir = (dir: THREE.Vector3) => ({ earth: settings.season ?? null, magic: settings.magic?.(dir.y) ?? null })
  for (const species of list) {
    const kind = kindOf(species)
    const random = seededRandom((world.seed ^ 0x5eed) + [...species.id].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) % 1000003, 7))
    const matches: number[] = []
    survey.places.forEach((place, i) => { if (fits(species.rule, place, seasonAtDir(survey.dirs[i]))) matches.push(i) })
    if (!matches.length) continue
    const wanted = Math.round((world.kind === 'earth' ? (species.size > 4 ? 10 : species.layer === 'small' ? 26 : 34) : (species.layer === 'small' ? 16 : 14)) * (settings.density ?? 1))
    let made = 0
    for (let attempt = 0; attempt < wanted * 30 && made < wanted; attempt++) {
      const centre = survey.dirs[matches[Math.floor(random() * matches.length)]].clone()
      const gap = kind === 'air' ? 30 : species.size > 4 ? 40 : 12
      const count0 = species.herd[1], reach = kind === 'air' ? 3 : (kind === 'leap' || species.size > 2 && kind === 'water' ? 10 : 0.8 + Math.sqrt(count0) * footprintOf(species) * 1.1 + 2)
      if (crowded(centre, gap, reach, species.id, kind === 'air')) continue
      const east = new THREE.Vector3().crossVectors(centre, Math.abs(centre.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
      const north = new THREE.Vector3().crossVectors(centre, east)
      const count = species.herd[0] + Math.floor(random() * (species.herd[1] - species.herd[0] + 1))
      const herd: Herd = { id: serial++, species, kind, members: [], route: [centre], durations: [], cycle: 1, rest: 2 + random() * 3, phase: random() * 40, east, north, loop: 0, height: 0, turn: 0 }
      const foot = footprintOf(species)
      if (kind === 'air') {
        // A loop over the zone, high over the highest ground of the loop.
        herd.loop = (species.layer === 'small' ? 2.5 : 7) + random() * (species.layer === 'small' ? 3 : 8)
        let top = 0
        for (let k = 0; k < 8; k++) top = Math.max(top, world.sample(...offset(centre, east, north, Math.cos(k / 8 * TAU) * herd.loop, Math.sin(k / 8 * TAU) * herd.loop).toArray()).height)
        const [low, high] = species.rule.air ?? [6, 10]
        herd.height = Math.max(0, top) + low + random() * (high - low) + (species.rule.zones.includes('jungle') ? 3 : 0)
        herd.turn = (species.layer === 'small' ? 0.5 : 0.22 + random() * 0.12) * (random() < 0.5 ? -1 : 1)
      } else if (kind === 'leap' || (kind === 'water' && species.size > 2)) {
        // A pod or a whale: a loop on the water that stays over deep enough water.
        herd.loop = species.size > 4 ? 12 : species.layer === 'small' ? 1.5 : 6 + random() * 3
        let ok = standsAt(species, kind, centre)
        for (let k = 0; k < 12 && ok; k++) ok = standsAt(species, kind, offset(centre, east, north, Math.cos(k / 12 * TAU) * herd.loop, Math.sin(k / 12 * TAU) * herd.loop))
        if (!ok) continue
        herd.turn = (species.size > 4 ? 0.04 : species.layer === 'small' ? 0.25 : 0.12) * (random() < 0.5 ? -1 : 1)
      }
      // The members: a small group around the centre, each one on good ground.
      const spread = kind === 'air' ? 1.6 : 0.8 + Math.sqrt(count) * foot * 1.1
      for (let tries = 0; tries < count * 12 && herd.members.length < count; tries++) {
        const first = herd.members.length === 0
        const x = first ? 0 : (random() * 2 - 1) * spread, z = first ? 0 : (random() * 2 - 1) * spread
        if (herd.members.some(m => Math.hypot(m.east - x, m.north - z) < foot * 1.6)) continue
        if ((kind === 'ground' || (kind === 'water' && species.size <= 2)) && !standsAt(species, kind, offset(centre, east, north, x, z))) continue
        const tint = species.id === 'gummyBear' ? new THREE.Color([0xff5a6e, 0xffa04a, 0xffe066, 0x7fdc6a, 0xfff0f0][Math.floor(random() * 5)])
          : species.id === 'jelly' ? new THREE.Color([0xf4a6d6, 0xc3a6e6, 0x9ed8c4][Math.floor(random() * 3)]) : null
        // The young of a family are smaller: an elephant calf, a bear cub, a fawn.
        const young = ['elephant', 'bear', 'deer', 'giraffe'].includes(species.id) && herd.members.length === count - 1 && count > 1
        herd.members.push({ east: x, north: z, scale: young ? 0.55 : 0.88 + random() * 0.12, phase: random() * TAU, yaw: (random() * 2 - 1) * 0.5, tint, ground: 0 })
      }
      if (herd.members.length < Math.min(count, species.herd[0])) continue
      // A short walk for a herd on the ground or the water: three points, each one good for each member.
      if (kind === 'ground' || (kind === 'water' && species.size <= 2)) {
        for (let step = 0; step < 2; step++) {
          const from = herd.route[herd.route.length - 1]
          for (let choice = 0; choice < 10; choice++) {
            const next = offset(from, east, north, ...(([a, d]) => [Math.cos(a) * d, Math.sin(a) * d] as [number, number])([random() * TAU, 2 + random() * 3]))
            if (next.angleTo(centre) * radius > 7) continue
            const mid = from.clone().add(next).normalize()
            if (herd.members.every(m => standsAt(species, kind, offset(next, east, north, m.east, m.north)) && standsAt(species, kind, offset(mid, east, north, m.east, m.north)))) { herd.route.push(next); break }
          }
        }
        const route = [...herd.route, ...herd.route.slice(0, -1).reverse()]
        herd.route = route
        herd.durations = route.slice(1).map((p, i) => p.angleTo(route[i]) * radius / speedOf(species))
        herd.cycle = herd.durations.reduce((sum, d) => sum + d + herd.rest, 0) || 1
      }
      // The height of the ground under each member at its start: the far animals use it, so they need no ray test.
      for (const member of herd.members) {
        const r = ground.radiusAt(offset(centre, east, north, member.east, member.north))
        member.ground = Number.isFinite(r) ? r - radius : Math.max(0, world.sample(...offset(centre, east, north, member.east, member.north).toArray()).height)
      }
      if (keep(species)) herds.push(herd)
      remember({ p: centre, reach, id: species.id, air: kind === 'air' }); made++
    }
  }

  // ---- Poses ---------------------------------------------------------------------------------------
  const normal = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3(), basis = new THREE.Matrix4()
  const centreNow = new THREE.Vector3(), tmp = new THREE.Vector3(), cameraAt = new THREE.Vector3(), up = new THREE.Vector3(), yawTurn = new THREE.Quaternion()
  /** The centre of a herd at a time, its heading and whether it walks. */
  function herdAt(herd: Herd, time: number) {
    if (herd.route.length < 2) { centreNow.copy(herd.route[0]); forward.copy(herd.north); return 0 }
    let remaining = ((time + herd.phase) % herd.cycle + herd.cycle) % herd.cycle
    for (let i = 0; i < herd.durations.length; i++) {
      const duration = herd.durations[i]
      if (remaining <= duration + herd.rest || i === herd.durations.length - 1) {
        const a = herd.route[i], b = herd.route[i + 1], u = Math.min(1, remaining / Math.max(duration, 1e-3))
        centreNow.copy(a).lerp(b, u).normalize()
        forward.copy(b).sub(a)
        return remaining < duration ? 1 : 0
      }
      remaining -= duration + herd.rest
    }
    return 0
  }
  /** Writes the pose of each animal near the camera into `poses`. */
  function posesNear(time: number, camera: THREE.Vector3, range: number, poses: Pose[]) {
    poses.length = 0
    const cameraDir = cameraAt.copy(camera).normalize(), cameraHeight = camera.length()
    for (const herd of herds) {
      const angle = herd.route[0].angleTo(cameraDir)
      if (angle * radius > range + 40 || cameraHeight > radius + range + 40) continue
      const species = herd.species
      herd.members.forEach((member, index) => {
        const position = new THREE.Vector3(), quaternion = new THREE.Quaternion()
        let moving = 1, scale = member.scale, hop = 0
        if (herd.kind === 'air' || herd.kind === 'leap' || herd.loop > 0) {
          // A loop: each member follows the one before it, a little to the side.
          const a = time * herd.turn + herd.phase - index * (herd.kind === 'air' ? 0.32 : 0.45) / Math.max(1, herd.loop / 6)
          const lateral = herd.kind === 'air' ? (index % 2 ? 1 : -1) * Math.ceil(index / 2) * 0.9 : (index % 2 ? 1 : -1) * Math.ceil(index / 2) * 1.2
          const ring = herd.loop + lateral
          offset(herd.route[0], herd.east, herd.north, Math.cos(a) * ring, Math.sin(a) * ring, normal)
          tmp.copy(herd.east).multiplyScalar(-Math.sin(a)).addScaledVector(herd.north, Math.cos(a)).multiplyScalar(Math.sign(herd.turn))
          forward.copy(tmp)
          let lift = 0, pitch = 0
          if (herd.kind === 'air') lift = herd.height + Math.sin(time * 1.3 + member.phase) * 0.4
          else if (herd.kind === 'leap') {
            // A leap of 1.1 s in each cycle of 3.4 s; under the water the rest of the time.
            const cycle = 3.2, u = ((time + member.phase) % cycle) / 1.3
            const arc = species.size > 1 ? 1.7 : 0.7
            lift = u < 1 ? Math.sin(u * Math.PI) * arc - 0.15 : -1.2
            pitch = u < 1 ? -Math.cos(u * Math.PI) * 0.9 : 0
            if (u >= 1) return
          } else lift = species.size > 4 ? -0.75 + Math.sin(time * 0.5 + herd.phase) * 0.12 : 0.05
          position.copy(normal).multiplyScalar(radius + lift)
          if (herd.kind === 'air') moving = 0.5 + 0.5 * Math.sin(time * 0.7 + member.phase)
          right.crossVectors(normal, forward).normalize()
          basis.makeBasis(right, normal, forward)
          quaternion.setFromRotationMatrix(basis)
          if (pitch) quaternion.multiply(yawTurn.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch))
        } else {
          moving = herdAt(herd, time)
          offset(centreNow, herd.east, herd.north, member.east, member.north, normal)
          const elevation = herd.kind === 'water' ? radius + (species.id === 'jelly' ? Math.sin(time * 1.6 + member.phase) * 0.05 - 0.05 : 0.02) : radius + member.ground
          position.copy(normal).multiplyScalar(elevation + 0.02)
          if (moving && species.move === 'hop') hop = Math.max(0, Math.sin((time + member.phase) * 8)) * 0.1 * species.size
          forward.addScaledVector(normal, -forward.dot(normal))
          if (forward.lengthSq() < 1e-8) forward.copy(herd.north)
          forward.normalize()
          right.crossVectors(normal, forward).normalize()
          basis.makeBasis(right, normal, forward)
          quaternion.setFromRotationMatrix(basis).multiply(yawTurn.setFromAxisAngle(up.set(0, 1, 0), member.yaw * (moving ? 0.3 : 1)))
        }
        poses.push({ herd, index, position, quaternion, scale, moving, distance: position.distanceTo(camera), key: herd.id * 64 + index, hop })
      })
    }
    poses.sort((a, b) => a.distance - b.distance)
    return poses
  }

  // ---- The hellos ---------------------------------------------------------------------------------------
  const hearts = createHeartPool(heartPool(mobile)); world.group.add(hearts.points)
  const hellos = new Map<number, { at: number; hearts: number; side: THREE.Vector3 }>(), lastHello = new Map<number, number>()
  const heart: HeartPose = { rise: 0, sway: 0, size: 0, alpha: 0, spin: 0 }
  const toFairy = new THREE.Vector3(), facing = new THREE.Quaternion(), feet = new THREE.Vector3(), point = new THREE.Vector3()
  let helloCount = 0
  /** The hello of the near animals: a turn to the fairy, a hop, and hearts. It changes the poses. */
  function greet(time: number, delta: number, fairy: THREE.Vector3, near: Pose[]) {
    hearts.begin()
    for (const pose of near) {
      if (delta > 0 && !hellos.has(pose.key) && canSayHello(pose.position.distanceTo(fairy), time, lastHello.get(pose.key))) {
        lastHello.set(pose.key, time)
        normal.copy(pose.position).normalize()
        const side = new THREE.Vector3().crossVectors(normal, toFairy.copy(fairy).sub(pose.position))
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
        hellos.set(pose.key, { at: time, hearts: heartCount(helloCount++, mobile), side: side.normalize() })
      }
      const hello = hellos.get(pose.key)
      if (!hello) continue
      const age = time - hello.at
      if (age > helloLength(hello.hearts)) { hellos.delete(pose.key); continue }
      normal.copy(pose.position).normalize()
      if (pose.herd.kind === 'ground' || pose.herd.kind === 'water') {
        toFairy.copy(fairy).sub(pose.position).addScaledVector(normal, -toFairy.dot(normal))
        const turn = helloTurn(age)
        if (turn > 0 && toFairy.lengthSq() > 0.01) {
          forward.copy(toFairy).normalize(); right.crossVectors(normal, forward).normalize()
          pose.quaternion.slerp(facing.setFromRotationMatrix(basis.makeBasis(right, normal, forward)), turn)
        }
      }
      feet.copy(pose.position)
      pose.position.addScaledVector(normal, helloLift(age, pose.herd.kind === 'water') * pose.scale * Math.min(1.5, pose.herd.species.size))
      const top = pose.herd.species.size * pose.scale * (pose.herd.kind === 'leap' ? 0.4 : 1)
      for (let k = 0; k < hello.hearts; k++) {
        if (!heartPose(age, k, heart)) continue
        const spread = (k - (hello.hearts - 1) / 2) * 0.42 + heart.sway
        if (!hearts.add(point.copy(feet).addScaledVector(normal, top + heart.rise).addScaledVector(hello.side, spread), heart)) break
      }
    }
    hearts.end()
  }

  // ---- The renderers --------------------------------------------------------------------------------------
  const layer = new THREE.Group(); layer.name = `fauna-${option}`; world.group.add(layer)
  const dummy = new THREE.Object3D()
  type Batch = { mesh: THREE.InstancedMesh; move?: THREE.InstancedBufferAttribute; used: number }
  const batches = new Map<string, Batch>()
  function batch(id: string, quality: 'near' | 'far', capacity: number) {
    const key = `${id}-${quality}`
    let found = batches.get(key)
    if (!found) {
      const base = joinedGeometry(id, quality)
      const geometry = new THREE.BufferGeometry()
      for (const [name, attribute] of Object.entries(base.attributes)) geometry.setAttribute(name, attribute)
      geometry.setIndex(base.index)
      let move: THREE.InstancedBufferAttribute | undefined
      if (quality === 'near') { move = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4); move.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute('aMove', move) }
      const mesh = new THREE.InstancedMesh(geometry, quality === 'near' ? rigMaterial(id) : farMaterial(id), capacity)
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      mesh.name = `fauna-${key}`
      layer.add(mesh)
      found = { mesh, move, used: 0 }
      batches.set(key, found)
    }
    return found
  }
  const white = new THREE.Color(1, 1, 1)
  function put(b: Batch, pose: Pose) {
    if (b.used >= b.mesh.instanceMatrix.count) return
    const i = b.used++
    dummy.position.copy(pose.position); dummy.quaternion.copy(pose.quaternion); dummy.scale.setScalar(pose.scale); dummy.updateMatrix()
    b.mesh.setMatrixAt(i, dummy.matrix)
    const member = pose.herd.members[pose.index]
    if (member.tint || b.mesh.instanceColor) b.mesh.setColorAt(i, member.tint ?? white)
    if (b.move) b.move.setXYZW(i, member.phase, pose.moving, rateOf(pose.herd.species.id), 0)
  }
  const rates = new Map<string, number>()
  const rateOf = (id: string) => rates.get(id) ?? rates.set(id, gaitOf(id).rate).get(id)!
  function beginBatches() { for (const b of batches.values()) b.used = 0 }
  function endBatches() {
    for (const b of batches.values()) {
      b.mesh.count = b.used
      b.mesh.visible = b.used > 0
      b.mesh.instanceMatrix.needsUpdate = true
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true
      if (b.move) b.move.needsUpdate = true
    }
  }

  // Option A: one model with a mesh for each part, for each animal near the camera.
  const models = new Map<number, PartsModel>()
  // Option C: one point for each far animal and for each small animal.
  const dotCapacity = 1600
  const dotPositions = new Float32Array(dotCapacity * 3), dotLooks = new Float32Array(dotCapacity * 4)
  const dotGeometry = new THREE.BufferGeometry()
  dotGeometry.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3).setUsage(THREE.DynamicDrawUsage))
  dotGeometry.setAttribute('look', new THREE.BufferAttribute(dotLooks, 4).setUsage(THREE.DynamicDrawUsage))
  const dots = new THREE.Points(dotGeometry, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uHalfHeight: { value: 360 } },
    // look: rgb the colour, w the size in metres (a negative size glows).
    vertexShader: `attribute vec4 look; uniform float uHalfHeight; varying vec3 vColor; varying float vGlow;
      void main() {
        vColor = look.rgb; vGlow = look.w < 0.0 ? 1.0 : 0.0;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(abs(look.w) * projectionMatrix[1][1] * uHalfHeight / -mv.z, 1.5, 40.0);
      }`,
    fragmentShader: `varying vec3 vColor; varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = vGlow > 0.5 ? pow(max(0.0, 1.0 - d), 1.3) : smoothstep(1.0, 0.7, d);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(vGlow > 0.5 ? mix(vColor, vec3(1.0, 0.98, 0.85), pow(max(0.0, 1.0 - d), 3.0)) * 1.8 : vColor, alpha);
        #include <colorspace_fragment>
      }`,
  }))
  dots.name = 'fauna-dots'; dots.frustumCulled = false; dots.visible = false
  dots.onBeforeRender = renderer => { (dots.material as THREE.ShaderMaterial).uniforms.uHalfHeight.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / 2 }
  layer.add(dots)
  // The lights of the fireflies and the lantern moths: the same points, with additive light, in their own draw call.
  const glowGeometry = new THREE.BufferGeometry()
  const glowPositions = new Float32Array(400 * 3), glowLooks = new Float32Array(400 * 4)
  glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3).setUsage(THREE.DynamicDrawUsage))
  glowGeometry.setAttribute('look', new THREE.BufferAttribute(glowLooks, 4).setUsage(THREE.DynamicDrawUsage))
  const glowMaterial = (dots.material as THREE.ShaderMaterial).clone()
  glowMaterial.blending = THREE.AdditiveBlending
  const glowPoints = new THREE.Points(glowGeometry, glowMaterial)
  glowPoints.name = 'fauna-glow'; glowPoints.frustumCulled = false; glowPoints.visible = false
  glowPoints.onBeforeRender = renderer => { glowMaterial.uniforms.uHalfHeight.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / 2 }
  layer.add(glowPoints)
  let dotCount = 0, glowCount = 0
  const dotColour = new THREE.Color()
  function dot(position: THREE.Vector3, species: Species, size: number, glow = false) {
    if (glow) {
      if (glowCount >= 400) return
      glowPositions.set([position.x, position.y, position.z], glowCount * 3)
      dotColour.set(species.colour)
      glowLooks.set([dotColour.r * 0.9, dotColour.g * 0.75, dotColour.b * 0.5, -size], glowCount * 4)
      glowCount++
      return
    }
    if (dotCount >= dotCapacity) return
    dotPositions.set([position.x, position.y, position.z], dotCount * 3)
    dotColour.set(species.colour)
    dotLooks.set([dotColour.r, dotColour.g, dotColour.b, glow ? -size : size], dotCount * 4)
    dotCount++
  }

  const poses: Pose[] = []
  const localCamera = new THREE.Vector3(), localFairy = new THREE.Vector3(), inverse = new THREE.Quaternion()
  let shown = 0, drawn = 0
  const frustum = new THREE.Frustum(), viewMatrix = new THREE.Matrix4(), sphere = new THREE.Sphere()
  /** Moves the fauna to the time `time` of the clip. `fairy` is a world position. */
  function update(time: number, delta: number, view: THREE.Camera, fairy: THREE.Vector3) {
    RIG_TIME.value = time
    view.updateMatrixWorld()
    frustum.setFromProjectionMatrix(viewMatrix.multiplyMatrices(view.projectionMatrix, view.matrixWorldInverse))
    const camera = view.position
    inverse.copy(world.group.quaternion).invert()
    localCamera.copy(camera).sub(world.group.position).applyQuaternion(inverse)
    localFairy.copy(fairy).sub(world.group.position).applyQuaternion(inverse)
    const range = option === 'A' ? LIMITS.A.range : option === 'B' ? LIMITS.B.far : LIMITS.C.dots
    posesNear(time, localCamera, range, poses)
    beginBatches(); dotCount = 0; glowCount = 0; shown = 0
    const seen = new Set<number>()
    if (option === 'A') {
      const near = poses.filter(pose => pose.distance < LIMITS.A.range).slice(0, mobile ? LIMITS.A.phoneModels : LIMITS.A.models)
      near.forEach(pose => refine(pose, ground))
      greet(time, delta, localFairy, near)
      for (const pose of near) {
        let model = models.get(pose.key)
        if (!model) { model = partsModel(pose.herd.species.id); model.root.name = `fauna-${pose.herd.species.id}`; models.set(pose.key, model); layer.add(model.root) }
        model.root.position.copy(pose.position); model.root.quaternion.copy(pose.quaternion); model.root.scale.setScalar(pose.scale)
        model.animate(time, pose.moving, pose.herd.members[pose.index].phase)
        model.root.visible = true
        seen.add(pose.key)
      }
      for (const [key, model] of models) {
        if (seen.has(key)) continue
        model.root.visible = false
        if (models.size > 80) { layer.remove(model.root); model.dispose(); models.delete(key) }
      }
      shown = near.length
    } else if (option === 'B') {
      const cap = mobile ? LIMITS.B.phoneCap : LIMITS.B.cap, nearRange = mobile ? LIMITS.B.phoneNear : LIMITS.B.near
      const kept = poses.filter(pose => pose.distance < LIMITS.B.far).slice(0, cap)
      kept.forEach(pose => { if (pose.distance < nearRange) refine(pose, ground) })
      greet(time, delta, localFairy, kept.filter(pose => pose.distance < nearRange))
      for (const pose of kept) put(batch(pose.herd.species.id, pose.distance < nearRange ? 'near' : 'far', capacityOf(pose.herd.species)), pose)
      shown = kept.length
    } else {
      const models = mobile ? LIMITS.C.phoneModels : LIMITS.C.models
      const big = poses.filter(pose => pose.herd.species.layer !== 'small')
      const near = big.filter(pose => pose.distance < LIMITS.C.near).slice(0, models)
      near.forEach(pose => refine(pose, ground))
      greet(time, delta, localFairy, near)
      for (const pose of near) put(batch(pose.herd.species.id, 'near', capacityOf(pose.herd.species)), pose)
      for (const pose of big.slice(near.length)) if (pose.distance < LIMITS.C.dots) dot(pose.position.addScaledVector(pose.position.clone().normalize(), pose.herd.species.size * 0.5 * pose.scale), pose.herd.species, pose.herd.species.size * 0.7 * pose.scale)
      // The small life: a tiny model near the fairy when the study has one, else a point.
      let small = 0
      for (const pose of poses) {
        const species = pose.herd.species
        if (species.layer !== 'small' || pose.distance > LIMITS.C.dots) continue
        if (SHAPE_IDS.includes(species.id) && pose.distance < 60 && small < LIMITS.C.small * (mobile ? 0.5 : 1)) {
          put(batch(species.id, 'near', 160), pose); small++
          // A glowing moth is a model with a soft light around it.
          if (glows(species)) dot(pose.position, species, 1.5, true)
        }
        else dot(pose.position, species, glows(species) ? 1.4 : Math.max(0.3, species.size * 1.4), glows(species))
      }
      shown = near.length + small
    }
    endBatches()
    dotGeometry.setDrawRange(0, dotCount)
    dots.visible = dotCount > 0
    glowGeometry.setDrawRange(0, glowCount)
    glowPoints.visible = glowCount > 0
    if (glowCount) { glowGeometry.attributes.position.needsUpdate = true; glowGeometry.attributes.look.needsUpdate = true }
    if (dotCount) { dotGeometry.attributes.position.needsUpdate = true; dotGeometry.attributes.look.needsUpdate = true }
    drawn = callsOfLayer()
  }
  const glows = (species: Species) => species.id === 'firefly' || species.id === 'lanternMoth'
  const capacityOf = (species: Species) => Math.min(mobile ? 140 : 280, species.herd[1] * 40)
  /**
   * The draw calls of the fauna in this frame. An InstancedMesh and the points are always drawn (no
   * culling); a model of option A counts only when it is in the view, as the renderer culls it.
   */
  function callsOfLayer() {
    let calls = (dots.visible ? 1 : 0) + (glowPoints.visible ? 1 : 0)
    for (const b of batches.values()) if (b.mesh.visible) calls++
    world.group.updateMatrixWorld()
    for (const model of models.values()) {
      if (!model.root.visible) continue
      sphere.center.copy(model.root.position).applyMatrix4(world.group.matrixWorld)
      sphere.radius = 3 * model.root.scale.x
      if (frustum.intersectsSphere(sphere)) calls += model.meshes
    }
    return calls + (hearts.count ? 1 : 0)
  }

  return {
    herds, layer, radius,
    /** The species with at least one group on the world. */
    get species() { return [...new Set(herds.map(herd => herd.species.id))] },
    get shown() { return shown },
    get calls() { return drawn },
    update,
    /** The world position of a member of a herd at a time: for the rails and the cameras of the clips. */
    placeOf(herd: Herd, index: number, time: number, out = new THREE.Vector3()) {
      const found: Pose[] = []
      const saved = herds.slice()
      herds.length = 0; herds.push(herd)
      posesNear(time, herd.route[0].clone().multiplyScalar(radius + 5), 1e9, found)
      herds.length = 0; herds.push(...saved)
      const pose = found.find(p => p.index === index) ?? found[0]
      if (!pose) return out.copy(herd.route[0]).multiplyScalar(radius).applyQuaternion(world.group.quaternion).add(world.group.position)
      return out.copy(pose.position).applyQuaternion(world.group.quaternion).add(world.group.position)
    },
    dispose() {
      hearts.dispose()
      models.forEach(model => model.dispose())
      for (const b of batches.values()) { b.mesh.dispose(); (b.mesh.material as THREE.Material).dispose() }
      dotGeometry.dispose(); (dots.material as THREE.Material).dispose(); glowGeometry.dispose(); glowMaterial.dispose()
      layer.removeFromParent()
      creatures.update = gameUpdate
      creatures.group.visible = true
    },
  }
}
export type Fauna = ReturnType<typeof createFauna>
export type FaunaHerd = Fauna['herds'][number]

/** The magic season of a direction of Blossom Haven in a magic year. */
export const magicOf = (year: number) => (y: number) => magicAt(y, year).season.id
