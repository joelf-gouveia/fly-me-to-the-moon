import * as THREE from 'three'
import { HOME_START_BASE, WORLD_DATA } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { PROPORTIONS } from '../../src/proportions'
import { touchesBelt } from '../../src/belt'
import { COMET, cometPosition, cometTails, tailRadius, touchesCometPath } from '../../src/comet'
import { MOON } from '../../src/moon'
import { findHomePosition, HOME_CARRY_MARGIN, HOME_MOVE_SECONDS } from '../../src/relocation'
import { SPACE_SPEED } from '../../src/flight'
import { MAGIC_CHANGE_SECONDS, MAGIC_SEASONS } from '../../src/magic-seasons'

/**
 * The numbers of the wandering home study: the new clock, the sizes, the places where Blossom
 * Haven can be a moon, the nova and the trips by hand. Each value comes from the rules of the
 * game (src/relocation.ts, src/worlds.ts, src/belt.ts, src/comet.ts, src/moon.ts), so a test
 * fails when the game changes them. The page (main.ts) and docs/wandering-home-study.md show them.
 */

// ---- The clock ---------------------------------------------------------------------------------

/** The clock of the game at the time of the study (5 minutes), and the clock of the request. The game has the new clock now. */
export const TODAY_SECONDS = 5 * 60
export const HOP_SECONDS: number = HOME_MOVE_SECONDS
/** One hop gives the next magic season today (MAGIC_STEP in src/magic-seasons.ts). */
export const magicYearSeconds = (hop: number, hopsForEachSeason = 1) => hop * hopsForEachSeason * MAGIC_SEASONS.length
export { MAGIC_CHANGE_SECONDS }

/** The hops in `minutes` of play, for the timeline of the page. */
export function hopTimes(hop: number, minutes = 12) {
  const times: number[] = []
  for (let t = hop; t <= minutes * 60 + 0.001; t += hop) times.push(t)
  return times
}

// ---- The sizes ---------------------------------------------------------------------------------

const base = (kind: string) => WORLD_DATA.find(item => item[1] === kind)![2] as number
/** Blossom Haven today: radius 110, air 52, clouds 24 (base units, createWorlds() in src/worlds.ts). */
export const HOME_BASE = { radius: 110, atmosphere: 52, cloudHeight: 24 } as const

/**
 * The sizes of Blossom Haven, each one the size of a real world of the game. The child hears
 * "as big as Mars". Base units; the game multiplies them by PROPORTIONS.size.
 */
export const SIZES = [
  { id: 'ceres', name: 'Ceres', base: base('ceres') },
  { id: 'moon', name: 'the Moon', base: Math.round(MOON.radius / PROPORTIONS.size) },
  { id: 'mercury', name: 'Mercury', base: base('mercury') },
  { id: 'today', name: 'Blossom Haven today', base: HOME_BASE.radius },
  { id: 'mars', name: 'Mars', base: base('mars') },
  { id: 'venus', name: 'Venus', base: base('venus') },
  { id: 'earth', name: 'Earth', base: base('earth') },
  { id: 'neptune', name: 'Neptune', base: base('neptune') },
  { id: 'saturn', name: 'Saturn', base: base('saturn') },
  { id: 'jupiter', name: 'Jupiter', base: base('jupiter') },
] as const
export type SizeId = typeof SIZES[number]['id']
export const sizeById = (id: SizeId) => SIZES.find(size => size.id === id)!

/**
 * The home at a size, in metres of the game. The air and the clouds grow with the square root of
 * the radius: a small home keeps room to fly under its clouds, and a big home does not get a
 * sky of hundreds of metres.
 */
export function homeAtSize(baseRadius: number) {
  const s = baseRadius / HOME_BASE.radius, air = Math.sqrt(s)
  const radius = baseRadius * PROPORTIONS.size
  const atmosphere = HOME_BASE.atmosphere * air * PROPORTIONS.size
  const cloudHeight = HOME_BASE.cloudHeight * air * PROPORTIONS.size
  return {
    radius, atmosphere, cloudHeight,
    /** The space that clearHomePosition() in src/relocation.ts keeps for the home. */
    extent: radius + atmosphere + HOME_CARRY_MARGIN + 30,
    /** A lap of the equator, and the time of a lap at the slow flight speed near the ground (11 m/s). */
    lap: 2 * Math.PI * radius,
    lapSeconds: 2 * Math.PI * radius / 11,
    /** The ground area against today: the plants of src/foliage/planting.ts grow with it. */
    area: s * s,
  }
}

/** The size walks of the decision "How the size changes". Each gives the steps and their weights. */
export const WALKS = {
  /** One or two steps up or down, or the same size: the planet grows and shrinks a little at a time. */
  steps: [[-2, 1], [-1, 2], [0, 2], [1, 2], [2, 1]],
  /** Any size at each hop. */
  any: null,
} as const

/** The next size of a walk. `random` gives numbers from 0 to 1. Steps past an end stop at the end. */
export function nextSize(index: number, walk: keyof typeof WALKS, random: () => number) {
  const weights = WALKS[walk]
  if (!weights) return Math.floor(random() * SIZES.length)
  const steps = weights as readonly (readonly [number, number])[]
  let pick = random() * steps.reduce((sum, [, weight]) => sum + weight, 0)
  for (const [step, weight] of steps) {
    pick -= weight
    if (pick <= 0) return THREE.MathUtils.clamp(index + step, 0, SIZES.length - 1)
  }
  return index
}

/** The part of the hops at each size over many hops, and the part of the hops with a new size. */
export function sizeShares(walk: keyof typeof WALKS, hops = 20000, random = mulberry(26)) {
  const counts = new Array<number>(SIZES.length).fill(0)
  let index = SIZES.findIndex(size => size.id === 'today'), changes = 0
  for (let i = 0; i < hops; i++) {
    const next = nextSize(index, walk, random)
    if (next !== index) changes++
    index = next
    counts[index]++
  }
  return { shares: counts.map(count => count / hops), changed: changes / hops }
}

// ---- Blossom Haven as a moon -----------------------------------------------------------------------

/** The planets that can hold a moon. Ceres and Vesta are in the asteroid belt, where no home goes. */
export const HOSTS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const
export type HostId = typeof HOSTS[number]
/** The clear space of the hop rule (clearHomePosition() in src/relocation.ts). */
const MARGIN = 250
/** The tilt of the path of the moon home against the plane of the planets, as the Moon has 28°. */
export const MOON_HOME_TILT = 20
/** The Moon is 3.5 Earth radii from Earth. A moon home is at least this many radii from its planet. */
export const MOON_HOME_REACH = 2

export type Planet = { kind: string; name: string; radius: number; atmosphere: number; orbit: number; angle: number; occupied: number }
export const PLANETS: Planet[] = WORLD_DATA.map(([name, kind, radius, orbit, angle, , atmosphere]) => {
  const r = radius * PROPORTIONS.size, air = atmosphere * PROPORTIONS.size
  // occupiedRadius() of src/relocation.ts: the air, and the rings of Saturn and Uranus.
  const occupied = Math.max(r + air, kind === 'saturn' ? r * 2.1 : kind === 'uranus' ? r * 2.05 : 0)
  return { kind, name, radius: r, atmosphere: air, orbit: orbit * PROPORTIONS.spacing, angle, occupied }
})
export const SUN_RADIUS = 600 * PROPORTIONS.sun
const planetOf = (kind: string) => PLANETS.find(planet => planet.kind === kind)!

/** A point of the path of a moon home: the planet at its orbit angle, the moon home at `turn` of its path. */
function pathPoint(host: Planet, distance: number, turn: number, hostAngle: number) {
  const tilt = THREE.MathUtils.degToRad(MOON_HOME_TILT)
  const centre = new THREE.Vector3(Math.cos(hostAngle) * host.orbit, 0, Math.sin(hostAngle) * host.orbit)
  return centre.add(new THREE.Vector3(Math.cos(turn) * distance, Math.sin(turn) * Math.sin(tilt) * distance, Math.sin(turn) * Math.cos(tilt) * distance))
}

/**
 * The reason a moon home of this size cannot be at `distance` from the planet, or null. The test
 * uses the whole path and each angle of the planet on its orbit, as the hop rule of the game does
 * for a home on its own orbit: the belt, the comet, the Sun, the other planets and the Moon.
 */
export function moonPathProblem(hostKind: HostId, distance: number, extent: number, comet = true) {
  const host = planetOf(hostKind)
  for (let i = 0; i < 48; i++) {
    const turn = i / 48 * Math.PI * 2
    // The belt and the comet turn about the axis of the Sun, so one angle of the planet is enough for them.
    const point = pathPoint(host, distance, turn, 0)
    const fromSun = Math.hypot(point.x, point.z)
    if (point.length() < SUN_RADIUS + extent + MARGIN) return 'the Sun'
    if (touchesBelt(point, extent + MARGIN)) return 'the asteroid belt'
    if (comet && touchesCometPath(point, extent + MARGIN)) return 'the path of the comet'
    for (const other of PLANETS) {
      if (other.kind === hostKind || other.kind === 'ceres' || other.kind === 'vesta') continue
      // The planets turn on their own circles, so a moon path that reaches the circle of a planet meets it one day.
      if (Math.abs(fromSun - other.orbit) < other.occupied + extent + MARGIN && Math.abs(point.y) < other.occupied + extent + MARGIN) return other.name
    }
  }
  return null
}

/**
 * The place of a moon home of a size around each planet: the nearest distance that is clear of
 * the planet (its air and rings), and of the Moon for Earth, and then each test of
 * moonPathProblem(). `fits` is false with the reason when no distance up to 8 radii is clear.
 */
export function moonSlot(hostKind: HostId, baseRadius: number) {
  const host = planetOf(hostKind), home = homeAtSize(baseRadius)
  let nearest = Math.max(host.occupied + home.extent + MARGIN, host.radius * MOON_HOME_REACH)
  if (hostKind === 'earth') nearest = Math.max(nearest, MOON.orbit + MOON.radius + home.extent + MARGIN)
  const bigger = home.radius >= host.radius
  // The reason of the nearest distance: a path farther out is not clear of it either.
  const reason = moonPathProblem(hostKind, nearest, home.extent)
  for (let distance = nearest; distance <= Math.max(nearest, host.radius * 8); distance += 25) {
    if (!moonPathProblem(hostKind, distance, home.extent)) return { host: hostKind, fits: true, distance, radii: distance / host.radius, bigger, reason: null }
  }
  return { host: hostKind, fits: false, distance: nearest, radii: nearest / host.radius, bigger, reason: reason ?? 'its own size' }
}

/**
 * The other comet rule: the comet only for the stay of the home, not for its whole path. For a
 * planet at `hostAngle` and the comet at `cometTime`, true when the comet, its coma and its tails
 * stay clear of the whole moon path for `stay` seconds. The planet turns on its orbit in that time.
 */
export function stayClearOfComet(hostKind: HostId, distance: number, extent: number, hostAngle: number, cometTime: number, stay: number) {
  const host = planetOf(hostKind), reach = extent + MARGIN
  const path = Array.from({ length: 24 }, (_, i) => pathPoint(host, distance, i / 24 * Math.PI * 2, 0).sub(new THREE.Vector3(host.orbit, 0, 0)))
  const centre = new THREE.Vector3(), point = new THREE.Vector3()
  for (let s = 0; s <= stay; s += 5) {
    const angle = hostAngle + s / 3600 * Math.PI * 2
    centre.set(Math.cos(angle) * host.orbit, 0, Math.sin(angle) * host.orbit)
    const comet = cometPosition(cometTime + s), length = Math.hypot(comet.x, comet.y, comet.z)
    const { dust, ion } = cometTails(length)
    // The coma, then four points of the longest tail, as the PATH of src/comet.ts.
    const parts: [number, number][] = [[1, COMET.coma], ...[0.25, 0.5, 0.75, 1].map(u => [1 + u * ion.length / length, tailRadius(dust, u)] as [number, number])]
    for (const [scale, size] of parts) {
      point.set(comet.x * scale, comet.y * scale, comet.z * scale)
      for (const offset of path) if (point.distanceTo(centre.clone().add(offset)) < size + reach) return false
    }
  }
  return true
}

/**
 * The moon slot with the stay rule for the comet: the nearest distance clear of everything but the
 * comet path, and the part of the hops (planet angle and comet time at random) when the comet
 * stays clear for a stay of the clock plus 30 s.
 */
export function moonSlotForStay(hostKind: HostId, baseRadius: number, samples = 400, random = mulberry(11)) {
  const host = planetOf(hostKind), home = homeAtSize(baseRadius)
  let nearest = Math.max(host.occupied + home.extent + MARGIN, host.radius * MOON_HOME_REACH)
  if (hostKind === 'earth') nearest = Math.max(nearest, MOON.orbit + MOON.radius + home.extent + MARGIN)
  let distance = nearest, problem: string | null = 'its own size'
  for (; distance <= Math.max(nearest, host.radius * 8); distance += 25) {
    problem = moonPathProblem(hostKind, distance, home.extent, false)
    if (!problem) break
  }
  if (problem) return { host: hostKind, fits: false, distance: nearest, share: 0, reason: moonPathProblem(hostKind, nearest, home.extent, false) }
  let clear = 0
  for (let i = 0; i < samples; i++) if (stayClearOfComet(hostKind, distance, home.extent, random() * Math.PI * 2, random() * COMET.period, HOP_SECONDS + 30)) clear++
  return { host: hostKind, fits: clear > 0, distance, share: clear / samples, reason: clear ? null : 'the comet' }
}

/** The table of the page: each size against each planet. */
export function moonTable() {
  return SIZES.map(size => ({ size: size.id, slots: HOSTS.map(host => moonSlot(host, size.base)) }))
}

/** The speed of a moon home on its path, in m/s, for a turn in `period` seconds. */
export const moonSpeed = (distance: number, period: number) => 2 * Math.PI * distance / period
/** The Moon of the game: its distance from Earth, its turn and its speed. */
export const MOON_SIDEREAL = 1 / (1 / MOON.synodic - 1 / 3600)
export const MOON_REFERENCE = { distance: MOON.orbit, period: MOON_SIDEREAL, speed: moonSpeed(MOON.orbit, MOON_SIDEREAL) }

// ---- The nova ---------------------------------------------------------------------------------------

/** The field of view of the game camera, and the height of the clips. */
const FOV = 58, HEIGHT = 720
/** The size in pixels of a nova of `radius` metres at `distance` metres, on a screen of 720 px. */
export function novaPixels(radius: number, distance: number, height = HEIGHT) {
  return radius / distance / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * height / 2
}
/** The smallest nova on the screen: a nova far away keeps this size, as a bright star. */
export const NOVA_MIN_PIXELS = 14
/** The radius of the nova in the world: a few times the radius of the home. */
export const novaRadius = (homeRadius: number, factor: number) => homeRadius * factor

// ---- The trips by hand --------------------------------------------------------------------------------

/** A seeded random (mulberry32), so the numbers of the page are the same at each run. */
export function mulberry(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Plain worlds for findHomePosition(): each planet at its start angle, the Sun and the home. */
function planWorlds() {
  const worlds = PLANETS.map(planet => ({
    kind: planet.kind, radius: planet.radius, atmosphere: planet.atmosphere,
    group: { position: new THREE.Vector3(Math.cos(planet.angle) * planet.orbit, 0, Math.sin(planet.angle) * planet.orbit) },
  }))
  worlds.push({ kind: 'sun', radius: SUN_RADIUS, atmosphere: 0, group: { position: new THREE.Vector3() } })
  const home = { kind: 'fairy', radius: HOME_BASE.radius * PROPORTIONS.size, atmosphere: HOME_BASE.atmosphere * PROPORTIONS.size, group: { position: new THREE.Vector3(...HOME_START_BASE).multiplyScalar(PROPORTIONS.spacing) } }
  worlds.push(home)
  return { worlds: worlds as unknown as World[], home: home as unknown as World }
}

/**
 * Trips by hand from a planet to the home, with the hop rule of the game. The time of a trip is
 * the straight distance at the space speed of src/flight.ts (no turn, no slow approach), so it is
 * the shortest time. The clock of the hop has a random phase at the start of the trip, so the
 * chance that the home hops before she arrives is the time of the trip over the clock.
 */
export function handTrips(trips = 4000, random = mulberry(7)) {
  const { worlds, home } = planWorlds()
  const starts = PLANETS.filter(planet => planet.kind !== 'ceres' && planet.kind !== 'vesta')
  const times: number[] = []
  for (let i = 0; i < trips; i++) {
    const start = starts[Math.floor(random() * starts.length)]
    const from = new THREE.Vector3(Math.cos(start.angle) * start.orbit, 0, Math.sin(start.angle) * start.orbit)
    const to = findHomePosition(home, worlds, from, false, random)
    if (!to) continue
    home.group.position.copy(to)
    times.push(from.distanceTo(to) / SPACE_SPEED)
  }
  times.sort((a, b) => a - b)
  const mean = times.reduce((sum, t) => sum + t, 0) / times.length
  const lost = (clock: number) => times.reduce((sum, t) => sum + Math.min(1, t / clock), 0) / times.length
  return {
    trips: times.length, mean, median: times[Math.floor(times.length / 2)], longest: times[times.length - 1],
    lostToday: lost(TODAY_SECONDS), lostNew: lost(HOP_SECONDS), speed: SPACE_SPEED,
  }
}
