import * as THREE from 'three'
import { auToGame, BELT_BASE as BELT, DWARF_WORLDS } from '../../src/belt'
import { MOON, moonOffset } from '../../src/moon'
// The study works in base units: the game before the proportions change. The game now
// multiplies these values by PROPORTIONS in src/proportions.ts.
import { HOME_START_BASE as HOME_START_POSITION } from '../../src/worlds'

export type Point = { x: number; y: number; z: number }

/**
 * The six numbers of the study. `size` scales every world except the Sun, with its air
 * and clouds. `spacing` scales every distance from the Sun. The Moon is set in Earth
 * units: its orbit in Earth radii and its radius as a part of Earth's radius.
 */
export type Proportions = { size: number; sun: number; spacing: number; moonOrbit: number; moonSize: number; speed: number }

// A copy of `data` in src/worlds.ts: name, kind, radius, orbit, angle, colour, atmosphere, cloud height.
export const PLANETS = [
  ['Mercury', 'mercury', 95, 1400, 0.28, 0xb7a58d, 0, 0],
  ['Venus', 'venus', 170, 2250, 1.18, 0xd5a36d, 95, 48],
  ['Earth', 'earth', 220, 3300, 0.08, 0x83c5e8, 78, 34],
  ['Mars', 'mars', 145, 4500, 2.12, 0xd7a087, 42, 23],
  ['Jupiter', 'jupiter', 470, 6300, 4.2, 0xd7bb9c, 145, 38],
  ['Saturn', 'saturn', 390, 8500, 5.18, 0xe1cb9e, 130, 35],
  ['Uranus', 'uranus', 285, 10900, 3.05, 0x96d9df, 100, 28],
  ['Neptune', 'neptune', 275, 13600, 5.82, 0x638ecb, 105, 32],
] as const
export const EARTH_RADIUS = 220, SUN_RADIUS = 600, HOME = { radius: 110, atmosphere: 52 }
/** Game flight: open-space speed, the boost factor, and the altitude where full speed starts (src/flight.ts). */
export const FLIGHT = { space: 430, boost: 2.3, surfaceMin: 11, surfaceMax: 32, rampEnd: 1000 }
/** The camera far plane in src/main.ts, and the life counts on Earth in src/worlds.ts. */
export const CAMERA_FAR = 80000, EARTH_TREES = 3400, EARTH_ANIMALS = 28
export const MAP_SCALE = 14500

/** The game before the change: the Moon of the Moon study at 1,100 m, with radius 60 m. */
export const TODAY: Proportions = { size: 1, sun: 1, spacing: 1, moonOrbit: 1100 / EARTH_RADIUS, moonSize: 60 / EARTH_RADIUS, speed: 1 }
/** Real ratios for the Moon: 60.3 Earth radii away, 0.273 of Earth's radius. */
export const REAL_MOON = { orbit: 60.3, size: 0.273 }

export type Body = { name: string; kind: string; radius: number; atmosphere: number; cloud: number; orbit: number; color: number; position: Point }

/** Every world at time 0. All worlds turn together about the Sun, so their gaps never change. */
export function layout(p: Proportions) {
  const place = (orbit: number, angle: number): Point => ({ x: Math.cos(angle) * orbit, y: 0, z: Math.sin(angle) * orbit })
  const planets: Body[] = PLANETS.map(([name, kind, radius, orbit, angle, color, atmosphere, cloud]) => ({
    name, kind, color, radius: radius * p.size, atmosphere: atmosphere * p.size, cloud: cloud * p.size,
    orbit: orbit * p.spacing, position: place(orbit * p.spacing, angle),
  }))
  const dwarfs: Body[] = DWARF_WORLDS.map(world => ({
    name: world.name, kind: world.id, color: world.color, radius: world.radius * p.size, atmosphere: 0, cloud: 0,
    orbit: auToGame(world.au, BELT) * p.spacing, position: place(auToGame(world.au, BELT) * p.spacing, world.angle),
  }))
  const earth = planets[2]
  const moonRadius = EARTH_RADIUS * p.size * p.moonSize, moonOrbit = earth.radius * p.moonOrbit
  const offset = moonOffset(0, { radius: moonOrbit, inclination: MOON.inclination })
  const moon: Body = {
    name: 'Moon', kind: 'moon', color: MOON.color, radius: moonRadius, atmosphere: 0, cloud: 0, orbit: moonOrbit,
    position: { x: earth.position.x + offset.x, y: offset.y, z: earth.position.z + offset.z },
  }
  const [hx, hy, hz] = HOME_START_POSITION
  const home: Body = {
    name: 'Blossom Haven', kind: 'fairy', color: 0xf3acd1, radius: HOME.radius * p.size, atmosphere: HOME.atmosphere * p.size, cloud: 24 * p.size,
    orbit: Math.hypot(hx, hz) * p.spacing, position: { x: hx * p.spacing, y: hy * p.spacing, z: hz * p.spacing },
  }
  const belt = { inner: BELT.inner * p.spacing, outer: BELT.outer * p.spacing, halfHeight: BELT.halfHeight * p.spacing }
  return { planets, dwarfs, earth, moon, home, belt, sunRadius: SUN_RADIUS * p.sun }
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
const smoothstep = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b)
/** Angular diameter in degrees of a sphere of this radius at this centre distance. */
export const apparent = (centre: number, radius: number) => 2 * Math.asin(Math.min(1, radius / centre)) * 180 / Math.PI

/**
 * Seconds for a guided trip in a straight line, from 7 m above one world to 12 m above
 * the other, with the speed rules of stepFlight(). Other worlds on the way are not in it.
 */
export function tripSeconds(from: Body, to: Body, speed: number, boost = false) {
  const gap = distance(from.position, to.position), dt = 1 / 30
  let x = from.radius + 7, v = FLIGHT.surfaceMin, time = 0
  while (gap - x - to.radius > 12 && time < 600) {
    const a = x - from.radius, b = gap - x - to.radius
    const [altitude, atmosphere] = a < b ? [a, from.atmosphere] : [b, to.atmosphere]
    const surface = THREE.MathUtils.lerp(FLIGHT.surfaceMin, FLIGHT.surfaceMax, smoothstep(altitude, 5, 80))
    const desired = THREE.MathUtils.lerp(surface, FLIGHT.space * speed, smoothstep(altitude, Math.max(atmosphere, 50), FLIGHT.rampEnd)) * (boost ? FLIGHT.boost : 1)
    v = desired < v ? desired : THREE.MathUtils.lerp(v, desired, 1 - Math.exp(-dt * 1.7))
    x += v * dt
    time += dt
  }
  return +time.toFixed(1)
}

/** Eclipses in one game year, with the game shader's point Sun. See docs/moon-study.md. */
export function eclipses(p: Proportions, step = 0.25) {
  const { earth, moon } = layout(p)
  const orbit = { radius: moon.orbit, inclination: MOON.inclination }
  let solar = 0, lunar = 0, previous: string | null = null
  for (let time = 0; time < 3600; time += step) {
    const angle = 0.08 + time / 3600 * Math.PI * 2
    const e = { x: Math.cos(angle) * earth.orbit, y: 0, z: Math.sin(angle) * earth.orbit }, o = moonOffset(time, orbit)
    const m = { x: e.x + o.x, y: o.y, z: e.z + o.z }
    const de = Math.hypot(e.x, e.z), dm = Math.hypot(m.x, m.y, m.z)
    const gap = Math.acos(THREE.MathUtils.clamp((e.x * m.x + e.z * m.z) / (de * dm), -1, 1))
    const touch = gap < Math.asin(earth.radius / de) + Math.asin(moon.radius / dm)
    const now = touch ? (dm < de ? 'solar' : 'lunar') : null
    if (now && now !== previous) now === 'solar' ? solar++ : lunar++
    previous = now
  }
  return { solar, lunar }
}

/** Everything the study reports for one set of proportions. */
export function metrics(p: Proportions, withEclipses = true) {
  const world = layout(p)
  const { earth, moon, planets, dwarfs, home, belt } = world
  const others = [...planets.filter(body => body !== earth), ...dwarfs, home]
  const nearest = others.reduce((best, body) => distance(body.position, earth.position) < distance(best.position, earth.position) ? body : best)
  const nearestDistance = distance(nearest.position, earth.position)
  const mercury = planets[0], mars = planets[3], jupiter = planets[4], neptune = planets[7]
  const aroundSpeed = THREE.MathUtils.lerp(FLIGHT.surfaceMin, FLIGHT.surfaceMax, smoothstep(7, 5, 80))
  const span = Math.max(...[...planets, ...dwarfs, home].map(body => Math.hypot(body.position.x, body.position.z) + body.radius)) * 2
  return {
    earthRadius: earth.radius, moonRadius: moon.radius, moonOrbit: moon.orbit,
    nearest: nearest.name, nearestDistance,
    /** The Moon's orbit as a part of the distance to the nearest world. Small values read as a pair. */
    pairing: moon.orbit / nearestDistance,
    moonSky: apparent(moon.orbit - earth.radius, moon.radius),
    sunSky: apparent(earth.orbit - earth.radius, world.sunRadius),
    earthFromMoon: apparent(moon.orbit - moon.radius, earth.radius),
    moonVsMercury: moon.radius / mercury.radius,
    trips: {
      moon: tripSeconds(earth, moon, p.speed), mars: tripSeconds(earth, mars, p.speed),
      neptune: tripSeconds(earth, neptune, p.speed), home: tripSeconds(earth, home, p.speed),
    },
    aroundEarth: Math.round(Math.PI * 2 * (earth.radius + 7) / aroundSpeed),
    /** Trees and animals per square metre on Earth with today's counts. */
    lifeDensity: 1 / p.size ** 2,
    treesForToday: Math.round(EARTH_TREES * p.size ** 2),
    /** Terrain heights are in metres, so the relief looks smaller on a larger world. */
    relief: 1 / p.size,
    belt: { mars: Math.round(belt.inner - (mars.orbit + mars.radius + mars.atmosphere)), jupiter: Math.round(jupiter.orbit - jupiter.radius - jupiter.atmosphere - belt.outer) },
    moonRoom: Math.round(nearestDistance - moon.orbit - moon.radius - nearest.radius - nearest.atmosphere),
    span: Math.round(span),
    eclipses: withEclipses ? eclipses(p) : null,
  }
}
export type Metrics = ReturnType<typeof metrics>

/** Proposed targets. They are design choices for a storybook game, not physics. */
export const TARGETS = [
  { id: 'pair', label: 'The Moon reads as Earth’s companion', goal: 'Orbit at most 20% of the distance to the nearest world', pass: (m: Metrics) => m.pairing <= 0.2, value: (m: Metrics) => `${Math.round(m.pairing * 100)}%` },
  { id: 'close', label: 'The Moon stays close to Earth', goal: 'Orbit at most 4 Earth radii', pass: (m: Metrics) => m.moonOrbit / m.earthRadius <= 4.001, value: (m: Metrics) => `${(m.moonOrbit / m.earthRadius).toFixed(1)} R` },
  { id: 'sky', label: 'The Moon is a clear disc from the ground', goal: '4° to 14° wide', pass: (m: Metrics) => m.moonSky >= 4 && m.moonSky <= 14, value: (m: Metrics) => `${m.moonSky.toFixed(1)}°` },
  { id: 'small', label: 'The Moon is smaller than every planet', goal: 'At most 0.75 of Mercury’s radius', pass: (m: Metrics) => m.moonVsMercury <= 0.75, value: (m: Metrics) => m.moonVsMercury.toFixed(2) },
  { id: 'moonTrip', label: 'A trip to the Moon', goal: '8 to 25 s', pass: (m: Metrics) => m.trips.moon >= 8 && m.trips.moon <= 25, value: (m: Metrics) => `${m.trips.moon} s` },
  { id: 'marsTrip', label: 'A trip from Earth to Mars', goal: 'At most 35 s: no slower than today', pass: (m: Metrics) => m.trips.mars <= 35, value: (m: Metrics) => `${m.trips.mars} s` },
  { id: 'farTrip', label: 'A trip from Earth to Neptune', goal: 'At most 50 s: no slower than today', pass: (m: Metrics) => m.trips.neptune <= 50, value: (m: Metrics) => `${m.trips.neptune} s` },
  { id: 'around', label: 'Once around Earth near the ground', goal: '90 to 200 s', pass: (m: Metrics) => m.aroundEarth >= 90 && m.aroundEarth <= 200, value: (m: Metrics) => `${m.aroundEarth} s` },
  { id: 'life', label: 'Trees and animals stay close together', goal: 'At least 50% of today’s density', pass: (m: Metrics) => m.lifeDensity >= 0.5, value: (m: Metrics) => `${Math.round(m.lifeDensity * 100)}%` },
  { id: 'belt', label: 'The asteroid belt has room', goal: 'At least 100 m from Mars and Jupiter', pass: (m: Metrics) => Math.min(m.belt.mars, m.belt.jupiter) >= 100, value: (m: Metrics) => `${Math.min(m.belt.mars, m.belt.jupiter)} m` },
  { id: 'moonRoom', label: 'The Moon has room', goal: 'At least 300 m to the nearest world', pass: (m: Metrics) => m.moonRoom >= 300, value: (m: Metrics) => `${m.moonRoom} m` },
  { id: 'draw', label: 'The camera can draw the whole system', goal: `System at most ${CAMERA_FAR * 0.9 / 1000} km wide`, pass: (m: Metrics) => m.span <= CAMERA_FAR * 0.9, value: (m: Metrics) => `${(m.span / 1000).toFixed(1)} km` },
] as const

export const checks = (m: Metrics) => TARGETS.map(target => ({ id: target.id, label: target.label, goal: target.goal, pass: target.pass(m), value: target.value(m) }))

const GRID = {
  spacing: [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3],
  moonOrbit: [2.5, 3, 3.5, 4],
  moonSize: [0.2, 0.225, 0.25, 0.273],
  speed: [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3],
}
/**
 * How far a set of proportions is from today. The planet size is the choice of the
 * designer, so it is not in the cost; a faster flight and a smaller Moon cost the most.
 */
export const changeCost = (p: Proportions) =>
  Math.abs(Math.log(p.spacing)) + 1.5 * Math.abs(Math.log(p.speed)) + 3 * Math.abs(Math.log(p.moonSize / TODAY.moonSize)) + 0.2 * Math.abs(Math.log(p.moonOrbit / 3.5))

/**
 * The smallest change from today that meets every target, for a planet size that the
 * designer chooses. Cheap targets go first; the trip times need a flight simulation,
 * so the search tries the slowest speed first. Null when no set in the grid passes.
 */
export function ideal(size = 1.25, sun = TODAY.sun) {
  let best: Proportions | null = null, bestCost = Infinity
  const cheap = TARGETS.filter(target => !target.id.endsWith('Trip'))
  const trips = TARGETS.filter(target => target.id.endsWith('Trip'))
  for (const spacing of GRID.spacing) for (const moonOrbit of GRID.moonOrbit) for (const moonSize of GRID.moonSize) {
    const base = { size, sun, spacing, moonOrbit, moonSize, speed: 1 }
    if (changeCost(base) >= bestCost) continue
    if (!cheap.every(target => target.pass(metrics(base, false)))) continue
    for (const speed of GRID.speed) {
      const candidate = { ...base, speed }
      const cost = changeCost(candidate)
      if (cost >= bestCost) break
      if (trips.every(target => target.pass(metrics(candidate, false)))) { best = candidate; bestCost = cost; break }
    }
  }
  return best
}

/** The constants to change in the game for these proportions. */
export function codeChanges(p: Proportions) {
  const m = (value: number) => Math.round(value).toLocaleString('en')
  const world = layout(p)
  return [
    { file: 'src/worlds.ts', name: '`data` radii · Earth', today: '220', next: m(world.earth.radius) },
    { file: 'src/worlds.ts', name: '`data` orbits · Earth', today: '3,300', next: m(world.earth.orbit) },
    { file: 'src/worlds.ts', name: '`data` atmosphere · cloud height · Earth', today: '78 · 34', next: `${m(world.earth.atmosphere)} · ${m(world.earth.cloud)}` },
    { file: 'src/worlds.ts', name: 'Sun radius', today: '600', next: m(world.sunRadius) },
    { file: 'src/worlds.ts', name: '`HOME_START_POSITION`', today: '10,000 · 1,200 · 9,000', next: HOME_START_POSITION.map(value => m(value * p.spacing)).join(' · ') },
    { file: 'src/worlds.ts', name: 'Blossom Haven radius', today: '110', next: m(world.home.radius) },
    { file: 'src/moon.ts', name: '`MOON.radius` · `MOON.orbit`', today: '60 · 1,100', next: `${m(world.moon.radius)} · ${m(world.moon.orbit)}` },
    { file: 'src/belt.ts', name: '`BELT` inner · outer · halfHeight', today: `${m(BELT.inner)} · ${m(BELT.outer)} · ${BELT.halfHeight}`, next: `${m(world.belt.inner)} · ${m(world.belt.outer)} · ${m(world.belt.halfHeight)}` },
    { file: 'src/belt.ts', name: '`DWARF_WORLDS` radius · Ceres · Vesta', today: '26 · 18', next: ['Ceres', 'Vesta'].map(name => m(world.dwarfs.find(body => body.name === name)!.radius)).join(' · ') },
    { file: 'src/relocation.ts', name: '`findHomePosition()` radius · height', today: '1,100–14,400 · ±1,600', next: `${m(1100 * p.spacing)}–${m(14400 * p.spacing)} · ±${m(1600 * p.spacing)}` },
    { file: 'src/adventure.ts', name: 'Solar map scale', today: '14,500', next: m(MAP_SCALE * p.spacing) },
    { file: 'src/flight.ts', name: 'Open-space speed', today: '430 m/s', next: `${m(FLIGHT.space * p.speed)} m/s` },
    { file: 'src/main.ts', name: 'Sun glow size', today: '2,450', next: m(2450 * p.sun) },
    { file: 'src/main.ts', name: 'Fog density in the air (fogBase)', today: '0.0018', next: (0.0018 / p.size).toPrecision(2) },
    { file: 'src/worlds.ts', name: 'Earth trees, to keep today’s density', today: '3,400', next: m(EARTH_TREES * p.size ** 2) },
  ]
}

export const PRESETS: Record<'today' | 'ideal' | 'wide', { name: string; line: string; value: () => Proportions }> = {
  today: { name: 'Today', line: 'The game as it is now.', value: () => ({ ...TODAY }) },
  ideal: { name: 'Planets ×1.25', line: 'Planets 25% larger, and the smallest other change that meets every target.', value: () => ideal(1.25) ?? { ...TODAY, size: 1.25 } },
  wide: { name: 'Wide sky', line: 'Much larger worlds and spacing. Most targets fail: this shows the limits.', value: () => ({ size: 2, sun: 1.5, spacing: 3, moonOrbit: 3, moonSize: 0.273, speed: 3 }) },
}
