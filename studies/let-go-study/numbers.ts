import * as THREE from 'three'
import { orientFlight, SPACE_SPEED } from '../../src/flight'
import type { FlightState } from '../../src/flight'
import { MOON } from '../../src/moon'
import { PROPORTIONS } from '../../src/proportions'
import { createTerrain } from '../../src/terrain'
import type { PlanetKind } from '../../src/terrain'
import { meadowNormal, surfaceRadius, WORLD_DATA } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { createPilot, fingers, GLIDE_RATE, handsOn, NO_KEYS, OPTION_IDS, pilotStep, REST_DELAY, STOP_SPEED } from './model'
import type { Controls, OptionId, Phase } from './model'

/**
 * The numbers of the let go study. Each number comes from a run of the flight code of the game
 * (stepFlight() and hoverFlight() of src/flight.ts) with the control models of model.ts, over
 * the terrain of Earth. The page, the clips and the test use the same runs.
 */
export const FPS = 30
export const DT = 1 / FPS

/** Earth at the size of the game (src/proportions.ts), with the terrain of seed 1234. It stands still. */
export function earthWorld(seed = 1234): World {
  const [name, kind, radius, , , color, atmosphere, cloudHeight] = WORLD_DATA.find(row => row[1] === 'earth')!
  return {
    name, kind, radius: radius * PROPORTIONS.size, atmosphere: atmosphere * PROPORTIONS.size, cloudHeight: cloudHeight * PROPORTIONS.size,
    color, sky: new THREE.Color(), group: new THREE.Group(), surface: new THREE.Group(), clouds: new THREE.Group(),
    sample: createTerrain('earth', seed), seed, visit: 1, armed: false, gas: false,
  } as World
}

/** A local direction at right angles to `dir`: the heading of a path on the ground (tangentOf() of the feature ideas study). */
export function headingAt(dir: THREE.Vector3, turn = 0) {
  const axis = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  return new THREE.Vector3().crossVectors(dir, axis).normalize().applyAxisAngle(dir.clone().normalize(), turn)
}

/** A pose `height` m above the ground of the world in the direction `dir`, level, heading along `heading`. */
export function poseOver(world: World, dir: THREE.Vector3, height: number, heading = headingAt(dir, 0.9)): FlightState {
  const normal = dir.clone().normalize().applyQuaternion(world.group.quaternion)
  const position = world.group.position.clone().addScaledVector(normal, surfaceRadius(world, normal) + height)
  const quaternion = new THREE.Quaternion()
  const flat = heading.clone().addScaledVector(normal, -heading.dot(normal)).normalize()
  orientFlight(quaternion, flat, normal)
  return { position, quaternion, speed: 11 }
}

// ---- The tour: the same small trip for each option -----------------------------------------------------

/** The five parts of the tour over the meadow, in seconds. The clips T, A, B and C fly it. */
export const TOUR = { straight: [0, 3], left: [3, 5], stop: [5, 8.5], look: [8.5, 11], on: [11, 14] } as const
export const TOUR_SECONDS = 14
/** A tap of Hover or Fly in T lasts this long (s). */
const TAP = 0.15
const inPart = (t: number, [from, to]: readonly [number, number]) => t >= from && t < to

/**
 * The keys of the tour for each option. The intent is the same: fly straight, turn left, stop to
 * look, look around to the right, and fly on. Each option needs different keys for it.
 */
export function tourKeys(option: OptionId, t: number): { controls: Controls; tap: boolean } {
  const c: Controls = { ...NO_KEYS }
  const straight = inPart(t, TOUR.straight), left = inPart(t, TOUR.left), look = inPart(t, TOUR.look), on = inPart(t, TOUR.on)
  if (left) c.yaw = 1
  if (look) c.yaw = -1
  let tap = false
  switch (option) {
    case 'T':
      // Hover from the start of the stop to the end of the look: a tap of Hover, later a tap of Fly.
      c.hover = t >= TOUR.stop[0] && t < TOUR.look[1]
      tap = (t >= TOUR.stop[0] && t < TOUR.stop[0] + TAP) || (t >= TOUR.on[0] && t < TOUR.on[0] + TAP)
      break
    case 'A':
      // Straight ahead needs a key: Boost is the only key that does not turn her.
      if (straight || on) c.boost = true
      break
    case 'B':
      if (straight || left || on) c.fly = true
      break
    case 'C':
      break
  }
  return { controls: c, tap }
}

export type TourFrame = { t: number; phase: Phase; speed: number; hands: boolean; fingers: number; position: THREE.Vector3; heading: number }
export type TourResult = {
  option: OptionId
  frames: TourFrame[]
  /** Seconds with at least one finger down, and with two. */
  handsSeconds: number
  twoFingerSeconds: number
  /** Presses: each new press of a key or a button, taps included. */
  presses: number
  /** Metres from the place of the "stop" intent (t = 5 s) to the place where she waits. Null when she does not stop before the look. */
  stopMetres: number | null
  /** Seconds from the "stop" intent to the wait. */
  stopSeconds: number | null
  /** The turn of the look in degrees, and the metres that she moves in it. */
  lookTurn: number
  lookMetres: number
  /** The metres of the whole tour. */
  metres: number
}

/**
 * Counts the presses: a new press of each key or button counts once. Fly, Boost, each arrow and a
 * tap of Hover are different buttons, so a change from one to another in one frame is a press.
 */
function createPressCount() {
  let down = new Set<string>(), count = 0
  return {
    add(controls: Controls, tap = false) {
      const now = new Set<string>()
      if (controls.yaw > 0) now.add('left')
      if (controls.yaw < 0) now.add('right')
      if (controls.pitch > 0) now.add('up')
      if (controls.pitch < 0) now.add('down')
      if (controls.boost) now.add('boost')
      if (controls.fly) now.add('fly')
      if (tap) now.add('tap')
      for (const key of now) if (!down.has(key)) count++
      down = now
    },
    get count() { return count },
  }
}

/** The heading of the fairy around the up of the world, in degrees from the start heading. */
function headingAngle(state: FlightState, world: World, reference: THREE.Vector3) {
  const up = state.position.clone().sub(world.group.position).normalize()
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.quaternion)
  forward.addScaledVector(up, -forward.dot(up)).normalize()
  const ref = reference.clone().addScaledVector(up, -reference.dot(up)).normalize()
  return THREE.MathUtils.radToDeg(Math.atan2(new THREE.Vector3().crossVectors(ref, forward).dot(up), ref.dot(forward)))
}

/** Flies the tour with the control model of `option` over the meadow of `world`, 8 m above the ground. */
export function runTour(option: OptionId, world = earthWorld()): TourResult {
  const dir = meadowNormal(world)
  const state = poseOver(world, dir, 8)
  const reference = new THREE.Vector3(0, 0, -1).applyQuaternion(state.quaternion)
  const pilot = createPilot(option)
  const frames: TourFrame[] = []
  let handsSeconds = 0, twoFingerSeconds = 0, metres = 0
  const presses = createPressCount()
  let stopAt: THREE.Vector3 | null = null, stopMetres: number | null = null, stopSeconds: number | null = null
  let lookStart: number | null = null, lookEnd = 0, lookFrom: THREE.Vector3 | null = null, lookMetres = 0, unwrapped = 0, lastHeading = 0
  for (let frame = 0; frame <= TOUR_SECONDS * FPS; frame++) {
    const t = frame * DT
    const { controls, tap } = tourKeys(option, t)
    const from = state.position.clone()
    pilotStep(pilot, state, world, DT, controls)
    metres += from.distanceTo(state.position)
    const hands = handsOn(option, controls) || tap
    const count = Math.max(fingers(option, controls), tap ? 1 : 0)
    if (hands) handsSeconds += DT
    if (count >= 2) twoFingerSeconds += DT
    presses.add(controls, tap)
    if (t >= TOUR.stop[0] && !stopAt) stopAt = state.position.clone()
    if (stopAt && stopMetres === null && pilot.phase === 'wait' && t < TOUR.look[0]) {
      stopMetres = stopAt.distanceTo(state.position); stopSeconds = t - TOUR.stop[0]
    }
    const heading = headingAngle(state, world, reference)
    let step = heading - lastHeading
    if (step > 180) step -= 360
    if (step < -180) step += 360
    unwrapped += step
    lastHeading = heading
    if (inPart(t, TOUR.look)) {
      if (lookStart === null) { lookStart = unwrapped; lookFrom = state.position.clone() }
      lookEnd = unwrapped
      lookMetres = lookFrom!.distanceTo(state.position)
    }
    frames.push({ t, phase: pilot.phase, speed: state.speed, hands, fingers: count, position: state.position.clone(), heading: unwrapped })
  }
  return { option, frames, handsSeconds, twoFingerSeconds, presses: presses.count, stopMetres, stopSeconds, lookTurn: Math.abs(lookEnd - (lookStart ?? 0)), lookMetres, metres }
}

// ---- The stop at each speed --------------------------------------------------------------------------------

export type SpeedCase = { id: string; name: string; height: number; boost: boolean }
export const SPEED_CASES: SpeedCase[] = [
  { id: 'meadow', name: 'Over the meadow, 8 m up', height: 8, boost: false },
  { id: 'clouds', name: 'Below the clouds, 30 m up', height: 30, boost: false },
  { id: 'space', name: 'In open space, 1.5 km up', height: 1500, boost: false },
  { id: 'boost', name: 'In open space with Boost', height: 1500, boost: true },
]
export type StopRow = { id: string; name: string; speed: number; rows: Record<OptionId, { metres: number; seconds: number }>; idle: Record<OptionId, number> }

/**
 * The stop when all keys go up. The fairy first flies 6 s level at the height of the case (the
 * speed of the game at that height), then all keys go up. `rows` is the way to the wait (T: the
 * tap of Hover). `idle` is the way in 10 s with no key: the child puts the phone down.
 */
export function stopRows(world = earthWorld()): StopRow[] {
  const dir = meadowNormal(world)
  return SPEED_CASES.map(item => {
    const start = poseOver(world, dir, item.height)
    if (item.height > 500) orientFlight(start.quaternion, dir.clone(), headingAt(dir))
    const cruise = (option: OptionId) => {
      const state: FlightState = { position: start.position.clone(), quaternion: start.quaternion.clone(), speed: 11 }
      const pilot = createPilot(option)
      const keys: Controls = { ...NO_KEYS, boost: item.boost, fly: true }
      // Option C rests after 3 s with no key, so a key that does not turn her (Boost or Fly) holds the cruise.
      for (let i = 0; i < 6 * FPS; i++) pilotStep(pilot, state, world, DT, option === 'A' || option === 'C' ? { ...keys, boost: true } : keys)
      if (!item.boost && (option === 'A' || option === 'C')) {
        // A and C have no key for a straight flight at cruise speed. The speed of T is the cruise speed.
        const reference = { position: start.position.clone(), quaternion: start.quaternion.clone(), speed: 11 }
        const today = createPilot('T')
        for (let i = 0; i < 6 * FPS; i++) pilotStep(today, reference, world, DT, NO_KEYS)
        state.position.copy(reference.position); state.quaternion.copy(reference.quaternion); state.speed = reference.speed
        pilot.idle = 0
      }
      return { state, pilot }
    }
    const rows = {} as StopRow['rows'], idle = {} as StopRow['idle']
    let speed = 0
    for (const option of OPTION_IDS) {
      // The way to the wait: T taps Hover; the others let go of every key.
      {
        const { state, pilot } = cruise(option)
        if (option === 'T') speed = state.speed
        let metres = 0, seconds = 0
        const keys: Controls = option === 'T' ? { ...NO_KEYS, hover: true } : NO_KEYS
        for (let i = 0; i < 30 * FPS && state.speed > 0; i++) {
          const from = state.position.clone()
          pilotStep(pilot, state, world, DT, keys)
          metres += from.distanceTo(state.position); seconds += DT
          if (pilot.phase === 'wait') break
        }
        rows[option] = { metres, seconds }
      }
      // Ten seconds with no key. T flies on.
      {
        const { state, pilot } = cruise(option)
        let metres = 0
        for (let i = 0; i < 10 * FPS; i++) {
          const from = state.position.clone()
          pilotStep(pilot, state, world, DT, NO_KEYS)
          metres += from.distanceTo(state.position)
        }
        idle[option] = metres
      }
    }
    return { id: item.id, name: item.name, speed, rows, idle }
  })
}

/** The glide of A, B and C from `speed` m/s, in closed form: metres and seconds to STOP_SPEED. */
export function glideOf(speed: number) {
  if (speed <= STOP_SPEED) return { metres: 0, seconds: 0 }
  return { metres: (speed - STOP_SPEED) / GLIDE_RATE, seconds: Math.log(speed / STOP_SPEED) / GLIDE_RATE }
}

// ---- Up to open space -------------------------------------------------------------------------------------------

/** Open space: the height where the flight of the game reaches the space speed (smoothstep to 1,000 m in stepFlight()). */
export const SPACE_HEIGHT = 1000
/** The height of the steering shell of Earth (turnFlight() in src/flight.ts): above it, a held W can loop her. */
export const shellOf = (world: World) => Math.max(world.atmosphere * 1.55, 85)

export type LeaveResult = { option: OptionId; seconds: number | null; handsSeconds: number; presses: number; keys: string }

/**
 * From the meadow, 8 m up, to 1,000 m above the ground. Each option climbs with W (with Fly in B)
 * to 10 m above the steering shell, and then:
 * - T lets go: she flies on.
 * - A holds Boost: no other key goes straight.
 * - B holds Fly.
 * - C lets go, and taps W for 0.15 s each 2.7 s, before the rest.
 */
export function runLeave(option: OptionId, world = earthWorld(), limit = 120): LeaveResult {
  const state = poseOver(world, meadowNormal(world), 8)
  const pilot = createPilot(option)
  const shell = shellOf(world) + 10
  let climbed = false, handsSeconds = 0, tapUntil = -1
  const presses = createPressCount()
  for (let frame = 0; frame <= limit * FPS; frame++) {
    const t = frame * DT
    const altitude = state.position.distanceTo(world.group.position) - world.radius
    if (altitude >= SPACE_HEIGHT) return { option, seconds: t, handsSeconds, presses: presses.count, keys: LEAVE_KEYS[option] }
    if (altitude > shell) climbed = true
    const keys: Controls = { ...NO_KEYS }
    if (!climbed) { keys.pitch = 1; if (option === 'B') keys.fly = true }
    else if (option === 'A') keys.boost = true
    else if (option === 'B') keys.fly = true
    else if (option === 'C') {
      if (pilot.idle >= REST_DELAY - 0.3 && t > tapUntil) tapUntil = t + 0.15
      if (t < tapUntil) keys.pitch = 1
    }
    pilotStep(pilot, state, world, DT, keys)
    if (handsOn(option, keys)) handsSeconds += DT
    presses.add(keys)
  }
  return { option, seconds: null, handsSeconds, presses: presses.count, keys: LEAVE_KEYS[option] }
}
const LEAVE_KEYS: Record<OptionId, string> = {
  T: 'Hold W, then let go',
  A: 'Hold W, then hold Boost',
  B: 'Hold Fly and W, then hold Fly',
  C: 'Hold W, then tap W before each rest',
}

// ---- Trips in open space -------------------------------------------------------------------------------------------

export type Trip = { id: string; name: string; near: number; far: number; seconds: number; farSeconds: number; boostSeconds: number; farBoostSeconds: number }
const planetData = (kind: string) => {
  const row = WORLD_DATA.find(item => item[1] === kind)!
  return { radius: row[2] * PROPORTIONS.size, orbit: row[3] * PROPORTIONS.spacing, atmosphere: row[6] * PROPORTIONS.size, gas: ['jupiter', 'saturn', 'uranus', 'neptune'].includes(kind) }
}
/** A world for the trip: a ball with the radius, the air and a terrain of the game, at `distance` m from Earth on the x axis. */
function targetWorld(kind: PlanetKind, radius: number, atmosphere: number, gas: boolean, distance: number): World {
  const world = { ...earthWorld(), name: kind, kind, radius, atmosphere, cloudHeight: 0, gas, sample: createTerrain(kind, 77), group: new THREE.Group() } as World
  world.group.position.set(distance, 0, 0)
  return world
}
/**
 * A trip from Earth on a straight line, with the flight of the game: from 10 m above the steering
 * shell of Earth to the steering shell of the target. The worlds stand still at the nearest place of
 * their orbits. Returns the seconds with no keys (T, and Fly held in B) and with Boost held (A).
 */
function flyTrip(target: World, earth: World, boost: boolean) {
  const start = earth.group.position.clone().add(new THREE.Vector3(earth.radius + shellOf(earth) + 10, 0, 0))
  const quaternion = new THREE.Quaternion()
  orientFlight(quaternion, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0))
  const state: FlightState = { position: start, quaternion, speed: 32 }
  const pilot = createPilot(boost ? 'A' : 'T')
  const keys: Controls = { ...NO_KEYS, boost }
  for (let frame = 0; frame < 600 * FPS; frame++) {
    if (state.position.distanceTo(target.group.position) - target.radius <= shellOf(target)) return frame * DT
    const world = state.position.distanceTo(earth.group.position) - earth.radius < state.position.distanceTo(target.group.position) - target.radius ? earth : target
    pilotStep(pilot, state, world, DT, keys)
  }
  return Infinity
}
/**
 * Trips from Earth: the nearest and the farthest place of the two orbits, from ground to ground.
 * The Moon has one distance. The worlds move on their orbits, so a real trip is between the two.
 * The far trip adds the extra metres at the speed of open space to the near trip.
 */
export function trips(): Trip[] {
  const earth = earthWorld(), home = planetData('earth')
  const make = (id: string, name: string, kind: PlanetKind, data: { radius: number; atmosphere: number; gas: boolean }, centre: number, farCentre: number): Trip => {
    const target = targetWorld(kind, data.radius, data.atmosphere, data.gas, centre)
    const seconds = flyTrip(target, earth, false), boostSeconds = flyTrip(target, earth, true)
    const extra = farCentre - centre
    return {
      id, name, near: centre - home.radius - data.radius, far: farCentre - home.radius - data.radius,
      seconds, farSeconds: seconds + extra / SPACE_SPEED, boostSeconds, farBoostSeconds: boostSeconds + extra / (SPACE_SPEED * 2.3),
    }
  }
  const planet = (kind: PlanetKind, name: string) => {
    const data = planetData(kind)
    return make(kind, name, kind, data, Math.abs(data.orbit - home.orbit), data.orbit + home.orbit)
  }
  return [
    make('moon', 'Earth to the Moon', 'moon', { radius: MOON.radius, atmosphere: 0, gas: false }, MOON.orbit, MOON.orbit),
    planet('mars', 'Earth to Mars'),
    planet('jupiter', 'Earth to Jupiter'),
    planet('neptune', 'Earth to Neptune'),
  ]
}
export { SPACE_SPEED }
