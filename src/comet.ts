import { PROPORTIONS } from './proportions'

export type Point = { x: number; y: number; z: number }

const TAU = Math.PI * 2
const DEGREES = 180 / Math.PI

/** SOLAR_ORBIT_SECONDS in src/orbits.ts. A test keeps the two values the same. */
export const COMET_YEAR_SECONDS = 3600
/** Earth's orbit in the game: 3,300 base units at the spacing of src/proportions.ts. */
const EARTH_ORBIT = 3300 * PROPORTIONS.spacing

/**
 * The comet of F8 (docs/feature-ideas-study.md). A long ellipse through the inner solar
 * system, in base units at the spacing of src/proportions.ts. The perihelion is between the
 * Sun and Mercury; the aphelion is at the outer edge of the asteroid belt, clear of Jupiter.
 * One pass takes 600 s at 1× World speed: six passes in each game year, so the comet comes
 * back at the same place in each year of the planets.
 */
export const COMET = {
  perihelion: 880 * PROPORTIONS.spacing, aphelion: 5600 * PROPORTIONS.spacing,
  period: 600,
  /** The tilt keeps the comet 1,900 m above or below Earth's orbit where it crosses it. */
  inclination: 20,
  /** The perihelion is on the node line, so the comet crosses the plane of the planets only inside Mercury and outside Mars. */
  perihelionArgument: 0,
  /** The node line and the mean anomaly at time 0: the first pass near Earth is at about 90 s. */
  node: -125.93, start: -4.26,
  /** The radius of the icy nucleus and of the glowing coma. */
  nucleus: 8, coma: 130,
} as const

export type CometOrbit = typeof COMET

export type Tail = { length: number; head: number; end: number; bend: number }
export type CometState = {
  position: Point
  velocity: Point
  /** The distance from the Sun. */
  distance: number
  /** The unit direction away from the Sun. Both tails point this way. */
  away: Point
  /** The unit direction behind the motion, across the tail. The dust tail bends this way. */
  trailing: Point
  dust: Tail
  ion: Tail
}

/** The dust tail is 1,100 m long at Earth's distance from the Sun, and longer near the Sun. */
export const TAIL = { reach: 1100, min: 450, max: 2000, power: 0.8, ion: 1.3 } as const

/** Particles of the two tails and sparkles. A phone draws half. */
export const COMET_LAYERS = { desktop: { dust: 5200, ion: 2200, sparkles: 192 }, phone: { dust: 2600, ion: 1100, sparkles: 96 } } as const

/** The length of the dust tail at this distance from the Sun. */
export function tailLength(distance: number) {
  return Math.min(TAIL.max, Math.max(TAIL.min, TAIL.reach * Math.pow(EARTH_ORBIT / Math.max(distance, 1), TAIL.power)))
}

/** The dust tail and the ion tail at this distance from the Sun. */
export function cometTails(distance: number): { dust: Tail; ion: Tail } {
  const length = tailLength(distance)
  return {
    dust: { length, head: 16, end: length * 0.18, bend: 0.14 },
    ion: { length: length * TAIL.ion, head: 6, end: length * 0.05, bend: 0 },
  }
}

/** The radius of a tail at `u`: 0 at the head and 1 at the end. */
export function tailRadius(tail: Tail, u: number) {
  return tail.head + (tail.end - tail.head) * Math.pow(Math.min(1, Math.max(0, u)), 0.75)
}

const semiMajor = (orbit: CometOrbit) => (orbit.perihelion + orbit.aphelion) / 2
const eccentricity = (orbit: CometOrbit) => (orbit.aphelion - orbit.perihelion) / (orbit.aphelion + orbit.perihelion)

/** Turn a point of the orbit plane (p to the perihelion, q along the motion) into game space. */
function toSpace(p: number, q: number, orbit: CometOrbit): Point {
  const w = orbit.perihelionArgument / DEGREES, i = orbit.inclination / DEGREES, node = orbit.node / DEGREES
  const x1 = p * Math.cos(w) - q * Math.sin(w), y1 = p * Math.sin(w) + q * Math.cos(w)
  const flat = y1 * Math.cos(i)
  // The planets turn from +X to +Z, and the comet turns the same way.
  return { x: x1 * Math.cos(node) - flat * Math.sin(node), y: y1 * Math.sin(i), z: x1 * Math.sin(node) + flat * Math.cos(node) }
}

/** The eccentric anomaly for orbit time `time` (Kepler's equation, Newton steps). */
export function eccentricAnomaly(time: number, orbit: CometOrbit = COMET) {
  const e = eccentricity(orbit)
  let mean = (orbit.start / DEGREES + time / orbit.period * TAU) % TAU
  if (mean > Math.PI) mean -= TAU
  if (mean < -Math.PI) mean += TAU
  let anomaly = e > 0.8 ? Math.PI * Math.sign(mean || 1) : mean
  for (let step = 0; step < 12; step++) anomaly -= (anomaly - e * Math.sin(anomaly) - mean) / (1 - e * Math.cos(anomaly))
  return anomaly
}

/** The comet relative to the Sun at eccentric anomaly `anomaly`. */
export function cometAtAnomaly(anomaly: number, orbit: CometOrbit = COMET): Point {
  const a = semiMajor(orbit), e = eccentricity(orbit)
  return toSpace(a * (Math.cos(anomaly) - e), a * Math.sqrt(1 - e * e) * Math.sin(anomaly), orbit)
}

/** The comet relative to the Sun at orbit time `time` (orbits.elapsed). */
export function cometPosition(time: number, orbit: CometOrbit = COMET): Point {
  return cometAtAnomaly(eccentricAnomaly(time, orbit), orbit)
}

/** The velocity of the comet in m/s of orbit time. */
export function cometVelocity(time: number, orbit: CometOrbit = COMET): Point {
  const a = semiMajor(orbit), e = eccentricity(orbit), anomaly = eccentricAnomaly(time, orbit)
  const rate = TAU / orbit.period / (1 - e * Math.cos(anomaly))
  return toSpace(-a * Math.sin(anomaly) * rate, a * Math.sqrt(1 - e * e) * Math.cos(anomaly) * rate, orbit)
}

const unit = (v: Point): Point => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l } }
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y + a.z * b.z

/** The comet, its tails and their frame at orbit time `time`. `centre` is the Sun. */
export function cometState(time: number, centre: Point = { x: 0, y: 0, z: 0 }, orbit: CometOrbit = COMET): CometState {
  const local = cometPosition(time, orbit), velocity = cometVelocity(time, orbit)
  const distance = Math.hypot(local.x, local.y, local.z)
  const away = unit(local)
  // Behind the motion, across the tail. A real dust tail bends back along the orbit.
  const along = dot(velocity, away)
  let trailing = { x: along * away.x - velocity.x, y: along * away.y - velocity.y, z: along * away.z - velocity.z }
  if (Math.hypot(trailing.x, trailing.y, trailing.z) < 1e-6) trailing = Math.abs(away.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }
  return {
    position: { x: centre.x + local.x, y: centre.y + local.y, z: centre.z + local.z },
    velocity, distance, away, trailing: unit(trailing), ...cometTails(distance),
  }
}

/**
 * Is `point` inside a tail? The test measures along the tail axis and across it, with the
 * bend of the dust tail. `along` is 0 at the head and 1 at the end of the tail that holds the point.
 */
export function tailHit(point: Point, state: CometState) {
  const relative = { x: point.x - state.position.x, y: point.y - state.position.y, z: point.z - state.position.z }
  const depth = dot(relative, state.away)
  for (const [name, tail] of [['dust', state.dust], ['ion', state.ion]] as const) {
    const u = depth / tail.length
    if (u <= 0 || u >= 1) continue
    const bend = tail.bend * u * u * tail.length
    const off = Math.hypot(
      relative.x - state.away.x * depth - state.trailing.x * bend,
      relative.y - state.away.y * depth - state.trailing.y * bend,
      relative.z - state.away.z * depth - state.trailing.z * bend,
    )
    if (off < tailRadius(tail, u) * 0.9) return { inside: true, tail: name, along: u }
  }
  return { inside: false, tail: null, along: 0 }
}

/**
 * The path of the comet, with its longest tail, in the half plane of distance from the Sun's
 * axis and height. The planets and Blossom Haven turn on circles about this axis, so a circle
 * clear of these points is clear of the comet and of its tails at every time.
 */
const PATH: Array<{ radius: number; height: number; reach: number }> = []
for (let i = 0; i < 720; i++) {
  const p = cometAtAnomaly(i / 720 * TAU), distance = Math.hypot(p.x, p.y, p.z)
  const { dust, ion } = cometTails(distance)
  const radius = Math.hypot(p.x, p.z)
  PATH.push({ radius, height: p.y, reach: COMET.coma })
  // The tails point away from the Sun, along the ray from the Sun through the comet.
  for (const u of [0.25, 0.5, 0.75, 1]) {
    const scale = 1 + u * ion.length / distance
    PATH.push({ radius: radius * scale, height: p.y * scale, reach: tailRadius(dust, u) })
  }
}

/** The smallest distance from a circle about the Sun's axis to the comet, its coma and its tails. */
export function cometPathClearance(radius: number, height: number) {
  let clearance = Infinity
  for (const point of PATH) clearance = Math.min(clearance, Math.hypot(point.radius - radius, point.height - height) - point.reach)
  return clearance
}

/**
 * True when a sphere of this radius, on its circle about the Sun, can meet the comet or its
 * tails. The comet does not turn with the planets, so the test uses the whole path.
 */
export function touchesCometPath(position: Point, radius = 0) {
  const r = Math.hypot(position.x, position.z), h = position.y
  for (const point of PATH) {
    const reach = radius + point.reach, dr = point.radius - r, dh = point.height - h
    if (dr * dr + dh * dh < reach * reach) return true
  }
  return false
}
