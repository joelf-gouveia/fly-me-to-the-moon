import * as THREE from 'three'
import { auToGame, BELT_BASE, DWARF_WORLDS, touchesBelt } from '../../src/belt'
import { HOME_CARRY_MARGIN, occupiedRadius } from '../../src/relocation'
import { HOME_START_BASE } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { MOON, MOON_SIDEREAL_SECONDS, moonOffset as gameMoonOffset } from '../../src/moon'

export type MoonOption = 'sky' | 'close' | 'far'
export type Point = { x: number; y: number; z: number }

const TAU = Math.PI * 2
const DEGREES = 180 / Math.PI

// Game values from `data` in src/worlds.ts and from src/orbits.ts.
export const SOLAR_ORBIT_SECONDS = 3600
export const EARTH = { radius: 220, atmosphere: 78, orbit: 3300, angle: 0.08, spin: 240 }
export const SUN_RADIUS = 600
/** The Moon has 0.273 of the Earth radius, as in the real Solar System. */
// This study compares its options in the base units, before the proportions change
// (docs/proportions-study.md). The game Moon in src/moon.ts now has other values.
export const MOON_RADIUS = 60
/** One new moon each 300 s: 12 lunar months in one game year, 12.4 in a real year. */
export const SYNODIC_SECONDS = MOON.synodic
/**
 * The Moon turns in the same direction as Earth's spin (rotation.y grows). The planets
 * orbit the other way, so the sidereal month is longer than the synodic month here.
 */
export const SIDEREAL_SECONDS = MOON_SIDEREAL_SECONDS
/** Blossom Haven radius, atmosphere and the extra 30 used by clearHomePosition(). */
export const HOME_EXTENT = 110 + 52 + HOME_CARRY_MARGIN + 30
/** The flight "near" zone of turnFlight() in src/flight.ts, as an altitude. */
export const nearZone = (atmosphere: number) => Math.max(atmosphere * 1.55, 85)
/** Game fog density in clear air at the ground (fogBase in updateEnvironment()). */
export const GROUND_FOG = 0.0018
/** Game flight speeds from stepFlight(): near the ground, in open space, and with Shift. */
export const SURFACE_SPEED = { min: 11, max: 32 }, SPACE_SPEED = 430, BOOST_SPEED = 430 * 2.3
/** The attach rule in animate() of src/main.ts: clearance up to max(atmosphere, 6). */
export const CARRY_TODAY = 6
/** Proposed carry shell for the Moon: the same height as its flight near zone. */
export const CARRY_PROPOSED = nearZone(0)
/** Sun occluder slots in src/sun-shading.ts, and the slots that the game uses today. */
export const OCCLUDER_SLOTS = 12, OCCLUDERS_TODAY = 11
export const WORLD_PICTURES_TODAY = 12

/**
 * The orbit where the Moon, seen from the ground below it, has the same size as the Sun.
 * Real total eclipses happen because the two discs are almost the same size.
 */
export function eclipseOrbit() {
  const sunDistance = EARTH.orbit - EARTH.radius
  return Math.round(EARTH.radius + MOON_RADIUS * sunDistance / SUN_RADIUS)
}

type OptionData = { letter: string; name: string; orbit: number; inclination: number; world: boolean; segments: [number, number] }
export const OPTIONS: Record<MoonOption, OptionData> = {
  sky: { letter: 'A', name: 'Sky Moon', orbit: 800, inclination: 5.1, world: false, segments: [64, 32] },
  close: { letter: 'B', name: 'Close Moon', orbit: eclipseOrbit(), inclination: 5.1, world: true, segments: [128, 96] },
  far: { letter: 'C', name: 'Journey Moon', orbit: 1100, inclination: 28, world: true, segments: [128, 96] },
}

/**
 * Orbit shape: a node line at a fixed angle, and the elongation at time 0.
 * 270° is a last-quarter Moon: it is up in the morning sky, when the first flight starts.
 */
export const ORBIT_START = { node: MOON.node, elongation: MOON.elongation }

export type Orbit = { radius: number; inclination: number; node?: number; elongation?: number }

export const toPoint = (x: number, y: number, z: number): Point => ({ x, y, z })
const sub = (a: Point, b: Point) => toPoint(a.x - b.x, a.y - b.y, a.z - b.z)
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y + a.z * b.z
const length = (a: Point) => Math.hypot(a.x, a.y, a.z)
const scale = (a: Point, s: number) => toPoint(a.x * s, a.y * s, a.z * s)
const normalize = (a: Point) => scale(a, 1 / (length(a) || 1))

/** Angle in the orbit plane of src/orbits.ts: position (cos a, 0, sin a). */
export const earthAngle = (time: number) => EARTH.angle + time / SOLAR_ORBIT_SECONDS * TAU
/** Earth's centre at game time `time` (orbits.elapsed). The Sun is at the origin. */
export function earthPosition(time: number): Point {
  const angle = earthAngle(time)
  return toPoint(Math.cos(angle) * EARTH.orbit, 0, Math.sin(angle) * EARTH.orbit)
}

/** The game orbit code lives in src/moon.ts; the study and the game use the same orbit. */
export const moonOffset = (time: number, orbit: Orbit): Point => gameMoonOffset(time, orbit)

export function moonPosition(time: number, orbit: Orbit): Point {
  const earth = earthPosition(time), offset = moonOffset(time, orbit)
  return toPoint(earth.x + offset.x, earth.y + offset.y, earth.z + offset.z)
}

/** Unit vector from the Moon to Earth, and the orbit normal: the tidal lock frame. */
export function tidalFrame(time: number, orbit: Orbit) {
  const toEarth = normalize(scale(moonOffset(time, orbit), -1))
  const ahead = normalize(sub(moonOffset(time + 0.01, orbit), moonOffset(time, orbit)))
  const normal = normalize(toPoint(toEarth.y * ahead.z - toEarth.z * ahead.y, toEarth.z * ahead.x - toEarth.x * ahead.z, toEarth.x * ahead.y - toEarth.y * ahead.x))
  return { toEarth, normal }
}

const PHASE_NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'] as const

/** Phase seen from Earth's centre, from the real geometry of the Sun, Earth and Moon. */
export function moonPhase(time: number, orbit: Orbit) {
  const earth = earthPosition(time), moon = moonPosition(time, orbit)
  const toSun = normalize(scale(moon, -1)), toEarth = normalize(sub(earth, moon))
  const phaseAngle = Math.acos(THREE.MathUtils.clamp(dot(toSun, toEarth), -1, 1))
  const illuminated = (1 + Math.cos(phaseAngle)) / 2
  // Elongation in the direction of Earth's spin: 0 at new moon, 180° at full moon.
  const sunAngle = Math.atan2(-earth.z, -earth.x), offset = moonOffset(time, orbit)
  const moonAngle = Math.atan2(offset.z, offset.x)
  const elongation = THREE.MathUtils.euclideanModulo(sunAngle - moonAngle, TAU) * DEGREES
  const name = PHASE_NAMES[Math.round(elongation / 45) % 8]
  return { illuminated, elongation, name, day: elongation / 360 * SYNODIC_SECONDS }
}

/** Next time after `time` when the elongation reaches `target` degrees. */
export function nextElongation(time: number, target: number, orbit: Orbit) {
  const now = moonPhase(time, orbit).elongation
  let wait = THREE.MathUtils.euclideanModulo(target - now, 360) / 360 * SYNODIC_SECONDS
  if (wait < 0.5) wait += SYNODIC_SECONDS
  // Refine: the elongation rate is not constant when the orbit is tilted.
  let t = time + wait
  for (let i = 0; i < 6; i++) {
    const error = ((moonPhase(t, orbit).elongation - target + 540) % 360) - 180
    t -= error / 360 * SYNODIC_SECONDS
  }
  return t
}

/** Angular diameter in degrees of a sphere of this radius at this centre distance. */
export const apparentDiameter = (distance: number, radius: number) => 2 * Math.asin(Math.min(1, radius / distance)) * DEGREES
export const sunDiameterFromGround = () => apparentDiameter(EARTH.orbit - EARTH.radius, SUN_RADIUS)
export const moonDiameterFromGround = (orbit: number) => apparentDiameter(orbit - EARTH.radius, MOON_RADIUS)
/** Earth seen from the near side of the Moon. */
export const earthDiameterFromMoon = (orbit: number) => apparentDiameter(orbit - MOON_RADIUS, EARTH.radius)
/** FogExp2: the part of an object's colour that the fog replaces. */
export const fogAmount = (distance: number, density = GROUND_FOG) => 1 - Math.exp(-((density * distance) ** 2))

/** Sun (0), point light at the origin: the game shader treats the Sun as a point. */
export function eclipseAt(time: number, orbit: Orbit) {
  const earth = earthPosition(time), moon = moonPosition(time, orbit)
  const dEarth = length(earth), dMoon = length(moon)
  const gap = Math.acos(THREE.MathUtils.clamp(dot(earth, moon) / (dEarth * dMoon), -1, 1))
  const earthSize = Math.asin(EARTH.radius / dEarth), moonSize = Math.asin(MOON_RADIUS / dMoon)
  if (dMoon < dEarth && gap < earthSize + moonSize) return { type: 'solar' as const, total: gap < earthSize }
  if (dMoon > dEarth && gap < earthSize + moonSize) return { type: 'lunar' as const, total: gap < earthSize - moonSize }
  return null
}

export type Eclipse = { type: 'solar' | 'lunar'; start: number; end: number; total: boolean }

/** Every eclipse in one game year. The Moon orbit wraps with SOLAR_ORBIT_SECONDS. */
export function eclipseSchedule(orbit: Orbit, step = 0.1): Eclipse[] {
  const events: Eclipse[] = []
  let current = null as Eclipse | null
  for (let time = 0; time < SOLAR_ORBIT_SECONDS; time += step) {
    const now = eclipseAt(time, orbit)
    if (now && current?.type === now.type) { current.end = time; current.total ||= now.total; continue }
    if (current) events.push(current)
    current = now ? { type: now.type, start: time, end: time, total: now.total } : null
  }
  if (current) events.push(current)
  return events
}

/** Full moons that are dark in Earth's shadow, as a share of all 12 full moons. */
export function darkFullMoons(orbit: Orbit) {
  return eclipseSchedule(orbit).filter(event => event.type === 'lunar').length / (SOLAR_ORBIT_SECONDS / SYNODIC_SECONDS)
}

/** Positions of the game worlds at time 0. All of them turn together, so any time works. */
function gameWorlds() {
  const rows: Array<[World['kind'], number, number, number, number]> = [
    ['mercury', 95, 1400, 0.28, 0], ['venus', 170, 2250, 1.18, 95], ['earth', 220, 3300, 0.08, 78], ['mars', 145, 4500, 2.12, 42],
    ...DWARF_WORLDS.map(world => [world.id, world.radius, auToGame(world.au, BELT_BASE), world.angle, 0] as [World['kind'], number, number, number, number]),
    ['jupiter', 470, 6300, 4.2, 145], ['saturn', 390, 8500, 5.18, 130], ['uranus', 285, 10900, 3.05, 100], ['neptune', 275, 13600, 5.82, 105],
  ]
  const stub = (kind: World['kind'], radius: number, atmosphere: number, position: THREE.Vector3) =>
    ({ kind, radius, atmosphere, group: { position } }) as unknown as World
  const worlds = rows.map(([kind, radius, orbit, angle, atmosphere]) => stub(kind, radius, atmosphere, new THREE.Vector3(Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit)))
  const home = stub('fairy', 110, 52, new THREE.Vector3(...HOME_START_BASE))
  worlds.push(home, stub('sun', SUN_RADIUS, 0, new THREE.Vector3()))
  return { worlds, home, earth: worlds[2] }
}

/**
 * True when a sphere of this radius can meet the Moon. The Moon turns around Earth,
 * so the test is a sphere around Earth that holds the whole orbit.
 */
export function touchesMoonPath(position: Point, earth: Point, orbit: number, radius = 0) {
  return length(sub(position, earth)) < orbit + MOON_RADIUS + radius
}

/**
 * clearHomePosition() of src/relocation.ts before the Moon and the proportions change:
 * base units, and no test for the Moon's path. The fairy test is left out (carrying).
 */
function clearHomeBefore(position: THREE.Vector3, home: World, worlds: World[]) {
  const extent = occupiedRadius(home) + HOME_CARRY_MARGIN + 30
  if (position.distanceTo(home.group.position) < 1400) return false
  if (touchesBelt(position, extent + 250, BELT_BASE)) return false
  return worlds.every(world => world === home || position.distanceTo(world.group.position) > extent + occupiedRadius(world) + 250)
}

/**
 * Share of relocation moves that clearHomePosition() accepts today, but that put
 * Blossom Haven where the Moon passes. The candidate space is findHomePosition().
 */
export function relocationRisk(orbit: number, samples = 40000, seed = 11) {
  const { worlds, home, earth } = gameWorlds()
  let random = seed >>> 0
  const next = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random / 4294967296 }
  let accepted = 0, hits = 0
  const position = new THREE.Vector3()
  for (let i = 0; i < samples; i++) {
    const radius = 1100 + next() * 13300, angle = next() * TAU
    position.set(Math.cos(angle) * radius, (next() - 0.5) * 3200, Math.sin(angle) * radius)
    if (!clearHomeBefore(position, home, worlds)) continue
    accepted++
    if (touchesMoonPath(position, earth.group.position, orbit, HOME_EXTENT + 250)) hits++
  }
  return { perMove: hits / accepted, excludedToday: occupiedRadius(earth) + HOME_EXTENT + 250, excludedNeeded: orbit + MOON_RADIUS + HOME_EXTENT + 250 }
}

/** Free space around the Moon's orbit. Values are the smallest gaps, in game metres. */
export function clearances(orbit: number, inclination = 0) {
  const { worlds, earth } = gameWorlds()
  const e = earth.group.position
  const gapTo = (kind: World['kind']) => {
    const world = worlds.find(item => item.kind === kind)!
    return Math.round(world.group.position.distanceTo(e) - orbit - MOON_RADIUS - world.radius - world.atmosphere)
  }
  return {
    earthAir: Math.round(orbit - MOON_RADIUS - EARTH.radius - EARTH.atmosphere),
    // Both flight near zones: turnFlight() treats the fairy as near a world inside these.
    nearZones: Math.round(orbit - (EARTH.radius + nearZone(EARTH.atmosphere)) - (MOON_RADIUS + nearZone(0))),
    mercury: gapTo('mercury'),
    venus: gapTo('venus'),
    sun: Math.round(EARTH.orbit - orbit - MOON_RADIUS - SUN_RADIUS),
    height: Math.round(orbit * Math.sin(inclination / DEGREES)),
  }
}

/** The Moon's speed around Earth, and its largest speed in the game frame, in m/s. */
export function moonSpeed(orbit: number, factor = 1) {
  const around = TAU * orbit / SIDEREAL_SECONDS * factor
  return { around, frame: around + TAU * EARTH.orbit / SOLAR_ORBIT_SECONDS * factor }
}

/**
 * Seconds from the meadow (7 m above the ground) to the Moon (12 m above its ground),
 * straight up, with the speed rules of stepFlight(). The Moon holds still here.
 */
export function tripSeconds(orbit: number, boost = false) {
  const dt = 1 / 60, moonCentre = orbit
  let height = EARTH.radius + 7, speed = SURFACE_SPEED.min, time = 0
  while (moonCentre - height - MOON_RADIUS > 12 && time < 300) {
    const earthAltitude = height - EARTH.radius, moonAltitude = moonCentre - height - MOON_RADIUS
    const [altitude, atmosphere] = earthAltitude < moonAltitude ? [earthAltitude, EARTH.atmosphere] : [moonAltitude, 0]
    const surface = THREE.MathUtils.lerp(SURFACE_SPEED.min, SURFACE_SPEED.max, THREE.MathUtils.smoothstep(altitude, 5, 80))
    const travel = THREE.MathUtils.smoothstep(altitude, Math.max(atmosphere, 50), 1000)
    const desired = THREE.MathUtils.lerp(surface, SPACE_SPEED, travel) * (boost ? 2.3 : 1)
    speed = desired < speed ? desired : THREE.MathUtils.lerp(speed, desired, 1 - Math.exp(-dt * 1.7))
    height += speed * dt
    time += dt
  }
  return +time.toFixed(1)
}

/**
 * Lit side over dark side of the Moon: sunlight (2.4) plus the hemisphere light,
 * over the hemisphere light alone. `earthshine` scales the hemisphere on the Moon.
 */
export function phaseContrast(hemisphere: number, earthshine = 1) {
  return (2.4 + hemisphere * earthshine) / (hemisphere * earthshine)
}
export const EARTHSHINE = 0.12

/** Triangles of a SphereGeometry with these segments. */
export const sphereTriangles = (width: number, height: number) => width * (height - 1) * 2

/** Rough game cost of an option, for the budget panel and the tests. */
export function budget(option: MoonOption) {
  const data = OPTIONS[option]
  const orbit = { radius: data.orbit, inclination: data.inclination }
  const eclipses = data.world ? eclipseSchedule(orbit) : []
  return {
    drawCalls: 1,
    triangles: sphereTriangles(...data.segments),
    occluders: OCCLUDERS_TODAY + (data.world ? 1 : 0),
    worldPictures: WORLD_PICTURES_TODAY + (data.world ? 1 : 0),
    moonSize: +moonDiameterFromGround(data.orbit).toFixed(1),
    fog: data.world ? +fogAmount(data.orbit - EARTH.radius).toFixed(2) : 0,
    trip: data.world ? tripSeconds(data.orbit) : null,
    speed: +moonSpeed(data.orbit).around.toFixed(1),
    speed64: Math.round(moonSpeed(data.orbit, 64).around),
    solarEclipses: eclipses.filter(event => event.type === 'solar').length,
    lunarEclipses: eclipses.filter(event => event.type === 'lunar').length,
    relocation: data.world ? relocationRisk(data.orbit).perMove : 0,
  }
}

/** Sky position of the Moon and the Sun for a person on Earth's ground. */
export function skyAt(time: number, orbit: Orbit, localNormal: Point, spin: number) {
  // Earth turns about +Y by `spin` radians, as world.group.rotation.y in the game.
  const c = Math.cos(spin), s = Math.sin(spin)
  const up = normalize(toPoint(localNormal.x * c + localNormal.z * s, localNormal.y, -localNormal.x * s + localNormal.z * c))
  const earth = earthPosition(time), ground = toPoint(earth.x + up.x * EARTH.radius, earth.y + up.y * EARTH.radius, earth.z + up.z * EARTH.radius)
  const elevation = (target: Point) => Math.asin(THREE.MathUtils.clamp(dot(up, normalize(sub(target, ground))), -1, 1)) * DEGREES
  return { up, ground, moon: elevation(moonPosition(time, orbit)), sun: elevation(toPoint(0, 0, 0)) }
}
