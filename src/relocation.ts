import * as THREE from 'three'
import type { World } from './worlds'
import { touchesBelt } from './belt'
import { MOON, touchesMoonPath } from './moon'
import { touchesCometPath } from './comet'
import { PROPORTIONS } from './proportions'

/** Blossom Haven hops each 2 minutes of active play with no guide (docs/wandering-home-study.md). */
export const HOME_MOVE_SECONDS = 2 * 60
export const HOME_CARRY_MARGIN = 12
/** The clear space around a home, in metres, as the hop rule keeps it. */
const HOP_MARGIN = 250

/** Include atmosphere and the rings of Saturn and Uranus, not only each planet's solid sphere. */
export function occupiedRadius(world: World) {
  return Math.max(world.radius + world.atmosphere, world.kind === 'saturn' ? world.radius * 2.1 : world.kind === 'uranus' ? world.radius * 2.05 : 0)
}

/** The size of the home in metres of the game: the radius of its ground, its air and its clouds. */
export type HomeSize = { id: string; name: string; radius: number; atmosphere: number; cloudHeight: number }

/**
 * The ten sizes of Blossom Haven, each the size of a real world of the game, from Ceres to Jupiter
 * (base units of WORLD_DATA in src/worlds.ts). The air and the clouds grow with the square root of
 * the radius, so a small home keeps room to fly under its clouds.
 */
export const HOME_SIZES: HomeSize[] = ([
  ['ceres', 'Ceres', 26], ['moon', 'the Moon', MOON.radius / PROPORTIONS.size], ['mercury', 'Mercury', 95], ['today', 'Blossom Haven', 110],
  ['mars', 'Mars', 145], ['venus', 'Venus', 170], ['earth', 'Earth', 220], ['neptune', 'Neptune', 275], ['saturn', 'Saturn', 390], ['jupiter', 'Jupiter', 470],
] as const).map(([id, name, base]) => {
  const air = Math.sqrt(base / 110)
  return { id, name, radius: base * PROPORTIONS.size, atmosphere: 52 * air * PROPORTIONS.size, cloudHeight: 24 * air * PROPORTIONS.size }
})
export const homeSizeById = (id: string) => HOME_SIZES.find(size => size.id === id)

/** Any size at each hop: each of the ten sizes has the same chance, also the size of now. */
export function pickHomeSize(random = Math.random) {
  return HOME_SIZES[Math.min(HOME_SIZES.length - 1, Math.floor(random() * HOME_SIZES.length))]
}

/** The space that the hop rule keeps for a home of this size. */
const homeExtent = (size: { radius: number; atmosphere: number }) => size.radius + size.atmosphere + HOME_CARRY_MARGIN + 30

/** `size` is the size of the home after the hop. The default is its size now. */
export function clearHomePosition(position: THREE.Vector3, home: World, worlds: World[], fairy: THREE.Vector3, carrying: boolean, size: { radius: number; atmosphere: number } = home) {
  const extent = homeExtent(size)
  if (position.distanceTo(home.group.position) < 1400 * PROPORTIONS.spacing) return false
  if (!carrying && position.distanceTo(fairy) < extent + HOP_MARGIN) return false
  // The asteroid belt turns with the planets, so a home clear of it stays clear.
  if (touchesBelt(position, extent + HOP_MARGIN)) return false
  // The comet does not turn with the planets. A home clear of its whole path and tails stays clear.
  if (touchesCometPath(position, extent + HOP_MARGIN)) return false
  // The Moon turns around Earth, so a home clear of the Moon now can be in its path later.
  const earth = worlds.find(world => world.kind === 'earth')
  if (earth && worlds.some(world => world.kind === 'moon') && touchesMoonPath(position, earth.group.position, extent + HOP_MARGIN)) return false
  return worlds.every(world => world === home || position.distanceTo(world.group.position) > extent + occupiedRadius(world) + HOP_MARGIN)
}

export function findHomePosition(home: World, worlds: World[], fairy: THREE.Vector3, carrying: boolean, random = Math.random, size: { radius: number; atmosphere: number } = home) {
  // Candidate space spans the inner and outer system, not a fixed orbit.
  for (let attempt = 0; attempt < 160; attempt++) {
    const radius = (1100 + random() * 13300) * PROPORTIONS.spacing, angle = random() * Math.PI * 2
    const position = new THREE.Vector3(Math.cos(angle) * radius, (random() - 0.5) * 3200 * PROPORTIONS.spacing, Math.sin(angle) * radius)
    if (clearHomePosition(position, home, worlds, fairy, carrying, size)) return position
  }
  return null // Keep the old safe position if no candidate passes all checks.
}

// ---- Blossom Haven as a moon ---------------------------------------------------------------------

/**
 * A moon home: a path around a planet, tilted 20° to the plane of the planets, one turn in 4
 * minutes. The plane of the path turns with the planet on its orbit, so a path that is clear at one
 * place of the planet is clear at each place (the belt, the comet and the planet circles are the
 * same all around the Sun).
 */
export const MOON_HOME = {
  /** The planets with room for a moon home with the rule of the whole comet path (the study table). */
  hosts: ['earth', 'saturn', 'uranus', 'neptune'] as World['kind'][],
  tilt: 20,
  turnSeconds: 4 * 60,
  /** A moon home is at least this many radii from the middle of its planet. */
  reach: 2,
} as const

/**
 * The place of a moon home relative to its planet. `angle` is the place on the path, and
 * `hostAngle` the angle of the planet on its orbit (atan2(z, x) from the Sun).
 */
export function moonHomeOffset(distance: number, angle: number, hostAngle: number, target = new THREE.Vector3()) {
  const tilt = THREE.MathUtils.degToRad(MOON_HOME.tilt)
  return target.set(Math.cos(angle) * distance, Math.sin(angle) * Math.sin(tilt) * distance, Math.sin(angle) * Math.cos(tilt) * distance)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -hostAngle)
}

/**
 * True when a whole moon path of `distance` around `host` is clear: of the Sun, the belt, the comet
 * path and the circle of each other planet, with the margin of the hop rule. The test puts the planet
 * at angle 0; the path turns with the planet, so the result is the same at each angle.
 */
function moonPathClear(host: World, distance: number, extent: number, worlds: World[]) {
  const orbit = Math.hypot(host.group.position.x, host.group.position.z)
  const centre = new THREE.Vector3(orbit, host.group.position.y, 0), point = new THREE.Vector3()
  const sun = worlds.find(world => world.kind === 'sun')
  const others = worlds.filter(world => ![host.kind, 'sun', 'moon', 'fairy', 'ceres', 'vesta'].includes(world.kind))
  for (let i = 0; i < 48; i++) {
    moonHomeOffset(distance, i / 48 * Math.PI * 2, 0, point).add(centre)
    if (sun && point.distanceTo(sun.group.position) < sun.radius + extent + HOP_MARGIN) return false
    if (touchesBelt(point, extent + HOP_MARGIN) || touchesCometPath(point, extent + HOP_MARGIN)) return false
    const fromSun = Math.hypot(point.x, point.z)
    for (const other of others) {
      // The planets turn on their own circles, so a path that reaches the circle of a planet meets it one day.
      const room = occupiedRadius(other) + extent + HOP_MARGIN
      if (Math.abs(fromSun - Math.hypot(other.group.position.x, other.group.position.z)) < room && Math.abs(point.y - other.group.position.y) < room) return false
    }
  }
  return true
}

const moonDistances = new Map<string, number | null>()
/**
 * The nearest clear moon path for a home of `size` around `host`, or null: no path up to 8 radii of
 * the planet is clear. The planets keep their circles, so the result is kept for each planet and size.
 */
export function moonHomeDistance(host: World, size: { radius: number; atmosphere: number }, worlds: World[]) {
  const key = `${host.kind}:${size.radius.toFixed(2)}:${size.atmosphere.toFixed(2)}`
  if (moonDistances.has(key)) return moonDistances.get(key)!
  const extent = homeExtent(size)
  let nearest = Math.max(occupiedRadius(host) + extent + HOP_MARGIN, host.radius * MOON_HOME.reach)
  // Around Earth the path is outside the path of the Moon.
  if (host.kind === 'earth') nearest = Math.max(nearest, MOON.orbit + MOON.radius + extent + HOP_MARGIN)
  let found: number | null = null
  for (let distance = nearest; distance <= Math.max(nearest, host.radius * 8); distance += 25) {
    if (moonPathClear(host, distance, extent, worlds)) { found = distance; break }
  }
  moonDistances.set(key, found)
  return found
}

/** A hop: the new size, and the new place around the Sun (`host` null) or on a moon path. */
export type HopPlan = {
  size: HomeSize
  position: THREE.Vector3
  host: World | null
  /** For a moon home: the distance from the planet and the angle on the path at the time of the plan. */
  distance: number
  angle: number
}

/**
 * Plans a hop. The size is any of the ten sizes. The place is at random: around the Sun, or a moon
 * of each planet with room for that size, each with the same chance (the answer "Randomize it" of
 * the study). A moon place that is too near the old place or the fairy, after 12 tries on its path,
 * gives a place around the Sun. `options` can fix the size and the place, for a browser check.
 */
export function planHop(home: World, worlds: World[], fairy: THREE.Vector3, carrying: boolean, random = Math.random, options: { size?: string; host?: string } = {}): HopPlan | null {
  const size = (options.size && homeSizeById(options.size)) || pickHomeSize(random)
  // A planet with no point of the path far enough from the old place (the home is its moon now) has no room.
  const reach = (world: World) => world.group.position.distanceTo(home.group.position) + moonHomeDistance(world, size, worlds)! >= 1400 * PROPORTIONS.spacing
  const hosts = worlds.filter(world => MOON_HOME.hosts.includes(world.kind) && (!options.host || world.kind === options.host) && moonHomeDistance(world, size, worlds) !== null && reach(world))
  const places: (World | null)[] = options.host === 'sun' ? [null] : options.host ? hosts : [null, ...hosts]
  const host = places[Math.min(places.length - 1, Math.floor(random() * places.length))] ?? null
  if (host) {
    const distance = moonHomeDistance(host, size, worlds)!
    const hostAngle = Math.atan2(host.group.position.z, host.group.position.x)
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = random() * Math.PI * 2
      const position = moonHomeOffset(distance, angle, hostAngle).add(host.group.position)
      if (position.distanceTo(home.group.position) < 1400 * PROPORTIONS.spacing) continue
      if (!carrying && position.distanceTo(fairy) < homeExtent(size) + HOP_MARGIN) continue
      return { size, position, host, distance, angle }
    }
  }
  const position = findHomePosition(home, worlds, fairy, carrying, random, size)
  return position ? { size, position, host: null, distance: 0, angle: 0 } : null
}

export function createRelocationClock() {
  let elapsed = 0, moves = 0
  return {
    get elapsed() { return elapsed },
    get moves() { return moves },
    update(delta: number, guided: boolean, move: () => boolean) {
      if (guided || !Number.isFinite(delta) || delta <= 0) return false
      elapsed = Math.min(HOME_MOVE_SECONDS, elapsed + delta)
      if (elapsed < HOME_MOVE_SECONDS || !move()) return false
      elapsed = 0
      moves++
      return true
    },
  }
}

/** Move the existing group instead of rebuilding it: terrain, effects and seed survive. */
export function relocateHome(home: World, next: THREE.Vector3, fairy: THREE.Vector3) {
  const carrying = fairy.distanceTo(home.group.position) <= home.radius + home.atmosphere + HOME_CARRY_MARGIN
  const offset = next.clone().sub(home.group.position)
  home.group.position.copy(next)
  if (carrying) fairy.add(offset)
  return { carrying, offset }
}
