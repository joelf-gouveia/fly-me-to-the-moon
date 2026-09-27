import * as THREE from 'three'
import { orientFlight, SPACE_SPEED, stepFlight } from '../../src/flight'
import type { FlightInput, FlightState } from '../../src/flight'
import { journeyHeading } from '../../src/journey'
import { visitTransition } from '../../src/terrain'
import { surfaceRadius } from '../../src/worlds'
import type { World } from '../../src/worlds'

/**
 * The rules of flight into and out of a world, for the transition study (docs/planet-transition-study.md).
 * `today` runs the game code: stepFlight() of src/flight.ts and the guided flight of updateFairy() in src/main.ts.
 * The three options are proposals. They do not change the game.
 */
export type Option = 'today' | 'retune' | 'onesky' | 'door'
export const TRANSITION_OPTIONS: Option[] = ['today', 'retune', 'onesky', 'door']
export const OPTIONS: Record<Option, { letter: string; name: string; line: string; color: string }> = {
  today: { letter: '—', name: 'Today', line: 'The game now: two steering rules and ten boundaries.', color: '#8f96a3' },
  retune: { letter: 'A', name: 'Retune', line: 'Keep the two steering rules. Remove the snaps, the hard brake and the trap at the edge of space.', color: '#3987e5' },
  onesky: { letter: 'B', name: 'One sky', line: 'One steering rule everywhere. The up of the sky turns from the solar system to the world as the world fills the view.', color: '#d95926' },
  door: { letter: 'C', name: 'Cloud door', line: 'B, plus a short glide through the clouds on the way in and a lift to space on the way out.', color: '#199e70' },
}

/** Turn rates of turnFlight() in src/flight.ts, in radians per second, and the pitch limit near a world. */
export const TURN = { nearPitch: 0.72, nearYaw: 0.78, spacePitch: 0.65, spaceYaw: 0.7, level: 0.85, limit: 1.35 } as const
/** Options A to C: the largest brake on a straight dive, in m/s². Today the brake reaches about 1,000 m/s². */
export const BRAKE = 240
/** Option B: the up of the sky is the world's up when the world is this wide (half angle, degrees), and space up below the smaller value. */
export const SKY_ANGLES = [8, 20] as const
/** Option C: the glide down and the lift up. */
export const DOOR = { down: 3.2, up: 2.5, landing: 30, reach: 160, liftReach: 220, liftHeight: 4, liftSpeed: 200, liftPitch: 40 } as const
/** The roll of options A to C turns to the up of the sky at this rate (1/s), instead of in one frame. */
const ROLL_RATE = 3

export type Input = FlightInput
export type Sample = {
  t: number; altitude: number; clearance: number; speed: number
  /** The angle of flight above the local horizon of the world, in degrees. */
  pitch: number
  /** The largest turn of the fairy in this frame (heading or up), in degrees. */
  turn: number
  /** The deceleration in this frame, m/s². */
  brake: number
  mode: 'ground' | 'air' | 'edge' | 'space' | 'door'
  /** Option C: the cloud veil (0 to 1) and the wide camera (0 to 1). */
  veil: number
  wide: number
  guided: boolean
  events: ('rebuild' | 'arrive' | 'door')[]
}

const Y = new THREE.Vector3(0, 1, 0)
const scratch = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4() }
const forwardOf = (q: THREE.Quaternion, target = new THREE.Vector3()) => target.set(0, 0, -1).applyQuaternion(q)
const upOf = (q: THREE.Quaternion, target = new THREE.Vector3()) => target.set(0, 1, 0).applyQuaternion(q)
const degrees = THREE.MathUtils.radToDeg

export function normalAt(world: World, position: THREE.Vector3, target = new THREE.Vector3()) {
  return target.copy(position).sub(world.group.position).normalize()
}
export function altitudeOf(world: World, position: THREE.Vector3) {
  return position.distanceTo(world.group.position) - world.radius
}
export function clearanceOf(world: World, position: THREE.Vector3) {
  return position.distanceTo(world.group.position) - surfaceRadius(world, normalAt(world, position))
}
/** turnFlight() in src/flight.ts: the height where the world steering starts. */
export function steerShell(world: World) { return Math.max(world.atmosphere * 1.55, 85) }
/** Options B and C: "release to cruise" levels the fairy below this altitude, a little above the clouds. */
export function levelCeiling(world: World) { return world.cloudHeight ? world.cloudHeight + 12 : 40 }
/** Option B: how much the world is the sky (0 to 1), from its half angle in the view. */
export function skyWeight(world: World, position: THREE.Vector3) {
  const angle = degrees(Math.asin(Math.min(1, world.radius / position.distanceTo(world.group.position))))
  return THREE.MathUtils.smoothstep(angle, SKY_ANGLES[0], SKY_ANGLES[1])
}
/** The altitude where a world has a half angle of `angle` degrees. */
export function altitudeForAngle(world: World, angle: number) {
  return world.radius / Math.sin(THREE.MathUtils.degToRad(angle)) - world.radius
}

/** The horizontal heading. A straight dive has none; then the head of the fairy gives it, not an arbitrary axis. */
function tangentOf(forward: THREE.Vector3, up: THREE.Vector3, fairyUp: THREE.Vector3, target: THREE.Vector3) {
  target.copy(forward).addScaledVector(up, -forward.dot(up))
  if (target.lengthSq() < 1e-4) target.copy(fairyUp).addScaledVector(up, -fairyUp.dot(up))
  if (target.lengthSq() < 1e-6) target.crossVectors(up, Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : Y)
  return target.normalize()
}

/** A pitch limit that eases the fairy back to the limit, instead of a step to it. */
function softPitch(pitch: number, input: number, delta: number, rate: number) {
  const sign = Math.sign(pitch) || 1
  if (Math.abs(pitch) > TURN.limit) {
    let next = sign * (TURN.limit + (Math.abs(pitch) - TURN.limit) * Math.exp(-delta * 2.5))
    if (input && Math.sign(input) !== sign) next += input * delta * rate
    return next
  }
  return THREE.MathUtils.clamp(pitch + input * delta * rate, -TURN.limit, TURN.limit)
}

/** Options A to C: the lowest pitch near the ground. The fairy pulls up before the ground, instead of a step at it. */
function groundFlare(pitch: number, clearance: number) {
  return Math.max(pitch, -Math.PI / 2 * THREE.MathUtils.smoothstep(clearance, 3, 30))
}

/** Orients the fairy on `forward`. Her up turns to `skyUp` at ROLL_RATE, and it is exact when it is within half a degree. */
function settleRoll(quaternion: THREE.Quaternion, forward: THREE.Vector3, skyUp: THREE.Vector3, delta: number) {
  const current = upOf(quaternion, scratch.a)
  current.addScaledVector(forward, -current.dot(forward))
  const goal = scratch.b.copy(skyUp).addScaledVector(forward, -skyUp.dot(forward))
  if (goal.lengthSq() < 1e-6) goal.copy(current)
  if (current.lengthSq() < 1e-6) current.copy(goal)
  current.normalize(); goal.normalize()
  const angle = current.angleTo(goal)
  if (angle > 0.01) {
    const axis = scratch.c.crossVectors(current, goal)
    if (axis.lengthSq() < 1e-8) axis.copy(forward)
    current.applyAxisAngle(axis.normalize(), angle * (1 - Math.exp(-delta * ROLL_RATE)))
    orientFlight(quaternion, forward, current)
  } else orientFlight(quaternion, forward, goal)
}

/** The speed of options A to C. It rises as today, but it falls on a curve that never brakes harder than BRAKE on a straight dive. */
function nextSpeed(state: FlightState, altitude: number, clearance: number, floor: number, boost: boolean, delta: number) {
  const factor = boost ? 2.3 : 1
  const base = THREE.MathUtils.lerp(11, 32, THREE.MathUtils.smoothstep(clearance, 5, 80)) * factor
  const cap = Math.sqrt(base * base + 2 * BRAKE * Math.max(0, altitude - floor))
  const desired = Math.min(SPACE_SPEED * factor, cap)
  state.speed = desired < state.speed ? desired : THREE.MathUtils.lerp(state.speed, desired, 1 - Math.exp(-delta * 1.7))
}

/** The ground limit of stepFlight(). */
function keepAboveGround(state: FlightState, world: World) {
  const normal = normalAt(world, state.position, scratch.a)
  const minimum = surfaceRadius(world, normal) + (world.gas ? 8 : 2.3)
  if (state.position.distanceTo(world.group.position) >= minimum) return
  state.position.copy(world.group.position).addScaledVector(normal, minimum)
  const forward = forwardOf(state.quaternion, scratch.b)
  const tangent = scratch.c.copy(forward).addScaledVector(normal, -forward.dot(normal)).normalize()
  if (tangent.lengthSq() > 0.1) orientFlight(state.quaternion, tangent.addScaledVector(normal, 0.09).normalize(), normal.clone())
}

type Door = {
  kind: 'down' | 'up'; t: number; duration: number
  n0: THREE.Vector3; h0: THREE.Vector3; r: number
  x: [number, number, number, number]; y: [number, number, number, number]
  rebuilt: boolean
}

export type Start = { position: THREE.Vector3; quaternion: THREE.Quaternion; speed: number }

export function createPilot(option: Option, world: World, start: Start, guided = false, target?: THREE.Vector3) {
  const state: FlightState = { position: start.position.clone(), quaternion: start.quaternion.clone(), speed: start.speed }
  const skyUp = new THREE.Vector3().copy(Y).lerp(normalAt(world, state.position), skyWeight(world, state.position)).normalize()
  if (option === 'onesky' || option === 'door') settleRoll(state.quaternion, forwardOf(state.quaternion), skyUp, 1000)
  if (option !== 'today') {
    // The steady speed of the option at the start height.
    const floor = option === 'door' ? steerShell(world) : option === 'onesky' ? levelCeiling(world) : Math.max(world.atmosphere, 50)
    state.speed = Math.min(state.speed, Math.sqrt(32 * 32 + 2 * BRAKE * Math.max(0, altitudeOf(world, state.position) - floor)))
  }
  let armed = altitudeOf(world, state.position) > Math.max(70, world.atmosphere * 1.5)
  let door: Door | null = null
  let lastAltitude = altitudeOf(world, state.position)
  let time = 0
  const destination = target ?? world.group.position
  const landing = !target
  const pilot = { state, guided, option, get door() { return door }, get armed() { return armed }, step, skyUp }

  function glideHeading() {
    const heading = journeyHeading(state.position, destination, world, landing)
    if (option === 'today' || !landing) return heading
    // Options A to C aim at a glide into the air, not at the core of the world.
    const normal = normalAt(world, state.position)
    const tangent = tangentOf(forwardOf(state.quaternion), normal, upOf(state.quaternion), new THREE.Vector3())
    const glide = tangent.multiplyScalar(Math.cos(0.44)).addScaledVector(normal, -Math.sin(0.44))
    const shell = steerShell(world)
    return glide.lerp(heading, THREE.MathUtils.smoothstep(altitudeOf(world, state.position), shell, shell * 3)).normalize()
  }

  function beginDoor(kind: Door['kind']) {
    const n0 = normalAt(world, state.position)
    const forward = forwardOf(state.quaternion)
    const h0 = tangentOf(forward, n0, upOf(state.quaternion), new THREE.Vector3())
    const pitch = Math.asin(THREE.MathUtils.clamp(forward.dot(n0), -1, 1))
    const y0 = altitudeOf(world, state.position)
    const duration = kind === 'down' ? DOOR.down : DOOR.up
    const r = world.radius + y0
    const reach = kind === 'down' ? DOOR.reach : DOOR.liftReach
    const end = n0.clone().multiplyScalar(Math.cos(reach / r)).addScaledVector(h0, Math.sin(reach / r))
    const y1 = kind === 'down' ? surfaceRadius(world, end) - world.radius + DOOR.landing : world.atmosphere * DOOR.liftHeight
    let vy0 = state.speed * Math.sin(pitch) * duration
    if (kind === 'down') vy0 = Math.max(vy0, -2.7 * (y0 - y1))
    // The glide ends at the cruise speed of the landing height, so the speed has no step after it.
    const endSpeed = kind === 'down' ? THREE.MathUtils.lerp(11, 32, THREE.MathUtils.smoothstep(DOOR.landing, 5, 80)) : DOOR.liftSpeed
    const endPitch = kind === 'down' ? 0 : THREE.MathUtils.degToRad(DOOR.liftPitch)
    door = {
      kind, t: 0, duration, n0, h0, r, rebuilt: false,
      x: [0, state.speed * Math.cos(pitch) * duration, reach, endSpeed * Math.cos(endPitch) * duration],
      y: [y0, vy0, y1, endSpeed * Math.sin(endPitch) * duration],
    }
  }

  /** One frame of the glide or the lift: a curve in along-track distance and altitude. */
  function stepDoor(delta: number, boost: boolean, events: Sample['events']) {
    const d = door!
    d.t = Math.min(d.duration, d.t + delta * (boost ? 1.4 : 1))
    const s = d.t / d.duration
    // Quintic Hermite with no acceleration at the two ends: the start and the flare at the end are gradual.
    const h = [1 - 10 * s ** 3 + 15 * s ** 4 - 6 * s ** 5, s - 6 * s ** 3 + 8 * s ** 4 - 3 * s ** 5, 10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5, -4 * s ** 3 + 7 * s ** 4 - 3 * s ** 5]
    const dh = [-30 * s ** 2 + 60 * s ** 3 - 30 * s ** 4, 1 - 18 * s ** 2 + 32 * s ** 3 - 15 * s ** 4, 30 * s ** 2 - 60 * s ** 3 + 30 * s ** 4, -12 * s ** 2 + 28 * s ** 3 - 15 * s ** 4]
    const x = d.x.reduce((sum, value, i) => sum + value * h[i], 0), y = d.y.reduce((sum, value, i) => sum + value * h[i], 0)
    const dx = d.x.reduce((sum, value, i) => sum + value * dh[i], 0), dy = d.y.reduce((sum, value, i) => sum + value * dh[i], 0)
    const angle = x / d.r
    const normal = d.n0.clone().multiplyScalar(Math.cos(angle)).addScaledVector(d.h0, Math.sin(angle))
    const heading = d.n0.clone().multiplyScalar(-Math.sin(angle)).addScaledVector(d.h0, Math.cos(angle))
    state.position.copy(world.group.position).addScaledVector(normal, world.radius + y)
    const along = dx * (world.radius + y) / d.r
    const forward = heading.multiplyScalar(along).addScaledVector(normal, dy)
    state.speed = forward.length() / d.duration * (boost ? 1.4 : 1)
    settleRoll(state.quaternion, forward.normalize(), normal, delta)
    skyUp.copy(normal)
    if (d.kind === 'down' && !d.rebuilt && s >= 0.45) {
      d.rebuilt = true
      if (armed) { armed = false; events.push('rebuild') }
    }
    if (s >= 1) {
      door = null
      if (d.kind === 'down' && pilot.guided) { pilot.guided = false; events.push('arrive') }
    }
    return { veil: d.kind === 'down' ? Math.sin(Math.PI * s) ** 2 : 0, wide: Math.sin(Math.PI * s) }
  }

  function stepRetune(delta: number, input: Input, hold: boolean) {
    const previousUp = normalAt(world, state.position)
    const altitude = altitudeOf(world, state.position)
    const near = altitude < steerShell(world)
    const forward = forwardOf(state.quaternion)
    if (near) {
      let pitch = Math.asin(THREE.MathUtils.clamp(forward.dot(previousUp), -1, 1))
      pitch = groundFlare(softPitch(pitch, input.pitch, delta, TURN.nearPitch), clearanceOf(world, state.position))
      // "Release to cruise" levels the fairy inside the air only. Above it, she keeps her climb or her dive.
      if (!hold && !input.pitch && altitude < (world.atmosphere || 85)) pitch *= Math.exp(-delta * TURN.level)
      const tangent = tangentOf(forward, previousUp, upOf(state.quaternion), new THREE.Vector3()).applyAxisAngle(previousUp, input.yaw * delta * TURN.nearYaw)
      forward.copy(tangent).multiplyScalar(Math.cos(pitch)).addScaledVector(previousUp, Math.sin(pitch))
      settleRoll(state.quaternion, forward, previousUp, delta)
    } else {
      state.quaternion.multiply(scratch.q.setFromEuler(new THREE.Euler(input.pitch * delta * TURN.spacePitch, input.yaw * delta * TURN.spaceYaw, 0, 'YXZ'))).normalize()
      forwardOf(state.quaternion, forward)
    }
    nextSpeed(state, altitude, clearanceOf(world, state.position), Math.max(world.atmosphere, 50), input.boost, delta)
    state.position.addScaledVector(forward, state.speed * delta)
    if (near) state.quaternion.premultiply(scratch.q.setFromUnitVectors(previousUp, normalAt(world, state.position)))
    keepAboveGround(state, world)
  }

  function stepOneSky(delta: number, input: Input, hold: boolean) {
    const previousUp = normalAt(world, state.position)
    const altitude = altitudeOf(world, state.position)
    const weight = skyWeight(world, state.position)
    const ceiling = levelCeiling(world)
    // The up of the sky: space up (the plane of the orbits) far away, the world's up when it fills the view.
    const goal = scratch.a.copy(Y).lerp(previousUp, weight)
    if (goal.lengthSq() < 1e-6) goal.copy(previousUp)
    skyUp.lerp(goal.normalize(), 1 - Math.exp(-delta * 4)).normalize()
    if (altitude < ceiling) skyUp.copy(previousUp)
    const forward = forwardOf(state.quaternion)
    let pitch = Math.asin(THREE.MathUtils.clamp(forward.dot(skyUp), -1, 1))
    pitch = groundFlare(softPitch(pitch, input.pitch, delta, TURN.nearPitch), clearanceOf(world, state.position))
    if (!hold && !input.pitch && altitude < ceiling) pitch *= Math.exp(-delta * TURN.level)
    const tangent = tangentOf(forward, skyUp, upOf(state.quaternion), new THREE.Vector3()).applyAxisAngle(skyUp, input.yaw * delta * TURN.nearYaw)
    forward.copy(tangent).multiplyScalar(Math.cos(pitch)).addScaledVector(skyUp, Math.sin(pitch))
    settleRoll(state.quaternion, forward, skyUp, delta)
    // Option C slows to the glide speed at the door, at the steering shell.
    nextSpeed(state, altitude, clearanceOf(world, state.position), option === 'door' ? steerShell(world) : ceiling, input.boost, delta)
    state.position.addScaledVector(forward, state.speed * delta)
    // The world carries the attitude along its curve as much as it is the sky.
    const curve = new THREE.Quaternion().slerp(scratch.q.setFromUnitVectors(previousUp, normalAt(world, state.position)), weight)
    state.quaternion.premultiply(curve)
    skyUp.applyQuaternion(curve)
    keepAboveGround(state, world)
  }

  function step(delta: number, input: Input): Sample {
    time += delta
    const events: Sample['events'] = []
    const before = forwardOf(state.quaternion), beforeUp = upOf(state.quaternion), beforeSpeed = state.speed
    let veil = 0, wide = 0
    if (pilot.guided && (input.yaw || input.pitch) && !door) pilot.guided = false
    if (door) ({ veil, wide } = stepDoor(delta, input.boost, events))
    else {
      let hold = false
      if (pilot.guided) {
        const normal = normalAt(world, state.position)
        const clearance = clearanceOf(world, state.position)
        const arrived = landing
          ? option === 'today' ? clearance < (world.gas ? 40 : 12) : clearance < (world.gas ? 40 : DOOR.landing)
          : false
        if (arrived) {
          pilot.guided = false
          events.push('arrive')
          if (option === 'today') {
            // updateFairy() in src/main.ts: the guided journey becomes a cruise on an east-west heading.
            const heading = new THREE.Vector3().crossVectors(normal, Y)
            heading.addScaledVector(normal, -heading.dot(normal)).normalize()
            if (heading.lengthSq() < 0.01) heading.set(1, 0, 0)
            orientFlight(state.quaternion, heading, normal)
          }
        } else {
          const heading = glideHeading()
          scratch.m.lookAt(new THREE.Vector3(), heading, upOf(state.quaternion))
          state.quaternion.slerp(scratch.q.setFromRotationMatrix(scratch.m), 1 - Math.exp(-delta * 1.5))
          hold = true
        }
      }
      const steer = pilot.guided ? { yaw: 0, pitch: hold ? 0.00001 : 0, boost: input.boost } : input
      if (option === 'today') stepFlight(state, world, delta, steer)
      else if (option === 'retune') stepRetune(delta, { ...steer, pitch: hold ? 0 : steer.pitch }, hold)
      else stepOneSky(delta, { ...steer, pitch: hold ? 0 : steer.pitch }, hold)
    }
    const altitude = altitudeOf(world, state.position)
    if (option === 'door' && !door) {
      const normal = normalAt(world, state.position)
      const pitch = Math.asin(THREE.MathUtils.clamp(forwardOf(state.quaternion).dot(normal), -1, 1))
      const top = steerShell(world)
      if (lastAltitude >= top && altitude < top && pitch < -0.17) { beginDoor('down'); events.push('door') }
      else if (lastAltitude < levelCeiling(world) && altitude >= levelCeiling(world) && pitch > 0.35) { beginDoor('up'); events.push('door') }
    }
    // The visit rule of updateNearestWorld() in src/main.ts. Option C rebuilds inside the cloud veil instead.
    const visit = visitTransition(armed, altitude, world.atmosphere)
    if (option !== 'door' || !door) {
      if (visit.regenerate && option !== 'door') events.push('rebuild')
      armed = option === 'door' ? (armed || altitude > Math.max(70, world.atmosphere * 1.5)) : visit.armed
    }
    lastAltitude = altitude
    const forward = forwardOf(state.quaternion), normal = normalAt(world, state.position)
    const turn = Math.max(degrees(before.angleTo(forward)), degrees(beforeUp.angleTo(upOf(state.quaternion))))
    const clearance = clearanceOf(world, state.position)
    return {
      t: time, altitude, clearance, speed: state.speed,
      pitch: degrees(Math.asin(THREE.MathUtils.clamp(forward.dot(normal), -1, 1))),
      turn, brake: Math.max(0, (beforeSpeed - state.speed) / delta),
      mode: door || events.includes('door') ? 'door' : clearance < 20 ? 'ground' : altitude < world.atmosphere ? 'air' : altitude < steerShell(world) ? 'edge' : 'space',
      veil, wide, guided: pilot.guided, events,
    }
  }
  return pilot
}

// ---- Scenarios -----------------------------------------------------------------------------------

export type ScenarioId = 'leave-release' | 'leave-hold' | 'dive' | 'space-down' | 'guided-in' | 'guided-out'
export type Scenario = { name: string; short: string; note: string; duration: number; guided?: boolean; target?: boolean; from: 'meadow' | 'above' | 'pole' }
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  'leave-release': { name: 'Climb above the clouds, then let go', short: 'Climb, let go', from: 'meadow', duration: 25, note: 'Hold W from the meadow until 70 m, then release. A child lets go when the clouds are below.' },
  'leave-hold': { name: 'Hold W to space', short: 'Hold W', from: 'meadow', duration: 25, note: 'Hold W from the meadow for the whole run.' },
  dive: { name: 'Fly straight at Earth, no keys', short: 'Dive, no keys', from: 'above', duration: 25, note: 'Start 1,400 m above Earth, head at its centre, rolled 90°. Touch no key.' },
  'space-down': { name: 'Hold S above Earth', short: 'Hold S', from: 'pole', duration: 20, note: 'Start 1,200 m above Earth, level. Hold S for the whole run.' },
  'guided-in': { name: 'Worlds → Earth from space', short: 'Guided in', from: 'above', duration: 25, guided: true, note: 'A guided journey to Earth from 1,400 m, as the Worlds picture starts it.' },
  'guided-out': { name: 'Worlds → a far world', short: 'Guided out', from: 'meadow', duration: 30, guided: true, target: true, note: 'A guided journey from the meadow to a world far away.' },
}
export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[]
export const RELEASE_AT = 70

/** A meadow direction and the other start places, in the frame of the world. */
export function scenarioStart(world: World, id: ScenarioId, meadow: THREE.Vector3): Start {
  const centre = world.group.position
  const from = SCENARIOS[id].from
  const quaternion = new THREE.Quaternion()
  if (from === 'meadow') {
    const position = centre.clone().addScaledVector(meadow, surfaceRadius(world, meadow) + 7)
    orientFlight(quaternion, new THREE.Vector3().crossVectors(meadow, Y).normalize(), meadow)
    return { position, quaternion, speed: 11 }
  }
  if (from === 'pole') {
    const normal = new THREE.Vector3(0.2, 1, 0.1).normalize()
    const position = centre.clone().addScaledVector(normal, world.radius + 1200)
    orientFlight(quaternion, new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 0, 1)).normalize(), normal)
    return { position, quaternion, speed: SPACE_SPEED * 0.6 }
  }
  // From space on the side of the world: the head points along the plane of the orbits, rolled 90°.
  const normal = meadow.clone().setY(0).normalize()
  const position = centre.clone().addScaledVector(normal, world.radius + 1400)
  orientFlight(quaternion, normal.clone().negate(), Y)
  quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2))
  return { position, quaternion, speed: SPACE_SPEED }
}

export function scenarioInput(id: ScenarioId, sample: Sample | null, memory: { released: boolean }): Input {
  if (id === 'leave-release') {
    if (sample && sample.altitude > RELEASE_AT) memory.released = true
    return { yaw: 0, pitch: memory.released ? 0 : 1, boost: false }
  }
  if (id === 'leave-hold') return { yaw: 0, pitch: 1, boost: false }
  if (id === 'space-down') return { yaw: 0, pitch: -1, boost: false }
  return { yaw: 0, pitch: 0, boost: false }
}

export function scenarioTarget(world: World, meadow: THREE.Vector3) {
  return world.group.position.clone().addScaledVector(new THREE.Vector3().crossVectors(meadow, Y).normalize().add(meadow).normalize(), 30000)
}

export type Summary = {
  maxTurn: number; maxTurnAt: number; peakBrake: number
  airAt: number | null; spaceAt: number | null; groundAt: number | null
  endAltitude: number; endMode: Sample['mode']; lowest: number; highest: number
  doorTime: number; rebuildAt: number | null; arriveAt: number | null
}
export type Trace = { option: Option; scenario: ScenarioId; samples: Sample[]; summary: Summary }
export const STEP = 1 / 60

export function runScenario(option: Option, id: ScenarioId, world: World, meadow: THREE.Vector3): Trace {
  const scenario = SCENARIOS[id]
  const pilot = createPilot(option, world, scenarioStart(world, id, meadow), scenario.guided, scenario.target ? scenarioTarget(world, meadow) : undefined)
  const samples: Sample[] = []
  const memory = { released: false }
  let last: Sample | null = null
  for (let i = 0; i < Math.round(scenario.duration / STEP); i++) {
    last = pilot.step(STEP, scenarioInput(id, last, memory))
    samples.push(last)
  }
  return { option, scenario: id, samples, summary: summarize(samples, altitudeOf(world, scenarioStart(world, id, meadow).position), world) }
}

export function summarize(samples: Sample[], startAltitude: number, world: World): Summary {
  const summary: Summary = {
    maxTurn: 0, maxTurnAt: 0, peakBrake: 0, airAt: null, spaceAt: null, groundAt: null,
    endAltitude: samples.at(-1)!.altitude, endMode: samples.at(-1)!.mode, lowest: Infinity, highest: -Infinity,
    doorTime: 0, rebuildAt: null, arriveAt: null,
  }
  for (const sample of samples) {
    if (sample.turn > summary.maxTurn) { summary.maxTurn = sample.turn; summary.maxTurnAt = sample.altitude }
    summary.peakBrake = Math.max(summary.peakBrake, sample.brake)
    summary.lowest = Math.min(summary.lowest, sample.altitude)
    summary.highest = Math.max(summary.highest, sample.altitude)
    if (summary.airAt === null && startAltitude > world.atmosphere && sample.altitude < world.atmosphere) summary.airAt = sample.t
    if (summary.spaceAt === null && sample.altitude > 1000) summary.spaceAt = sample.t
    if (summary.groundAt === null && startAltitude > world.atmosphere && sample.clearance < 20) summary.groundAt = sample.t
    if (sample.mode === 'door') summary.doorTime += STEP
    if (summary.rebuildAt === null && sample.events.includes('rebuild')) summary.rebuildAt = sample.t
    if (summary.arriveAt === null && sample.events.includes('arrive')) summary.arriveAt = sample.t
  }
  return summary
}

// ---- Boundaries and the planet frame -------------------------------------------------------------

export type Boundary = { name: string; altitude: number; code: string; kind: 'steer' | 'look' | 'world' }
/** The heights where a rule of the game changes today, from sea level. */
export function boundariesToday(world: World): Boundary[] {
  return [
    { name: 'Sky starts to go blue (camera)', altitude: world.atmosphere * 1.08, code: 'updateEnvironment() in src/main.ts', kind: 'look' },
    { name: 'Sky fully blue (camera)', altitude: world.atmosphere * 0.25, code: 'updateEnvironment() in src/main.ts', kind: 'look' },
    { name: 'Cloud layer', altitude: world.cloudHeight, code: 'buildClouds() in src/worlds.ts', kind: 'look' },
    { name: 'New landscape (on the way in)', altitude: Math.max(30, world.atmosphere * 0.82), code: 'visitTransition() in src/terrain.ts', kind: 'world' },
    { name: 'Visit re-arms (on the way out)', altitude: Math.max(70, world.atmosphere * 1.5), code: 'visitTransition() in src/terrain.ts', kind: 'world' },
    { name: 'The world carries the fairy (from the ground)', altitude: Math.max(world.atmosphere, 6), code: 'animate() in src/main.ts', kind: 'steer' },
    { name: 'Speed starts to rise', altitude: Math.max(world.atmosphere, 50), code: 'stepFlight() in src/flight.ts', kind: 'steer' },
    { name: 'Flight panel says "near", sticker', altitude: Math.max(85, world.atmosphere * 1.5), code: 'updateNearestWorld() in src/main.ts', kind: 'look' },
    { name: 'Steering rule changes', altitude: steerShell(world), code: 'turnFlight() in src/flight.ts', kind: 'steer' },
    { name: 'Full space speed', altitude: 1000, code: 'stepFlight() in src/flight.ts', kind: 'steer' },
  ]
}

/** Option B: the heights that matter. */
export function boundariesOneSky(world: World): Boundary[] {
  return [
    { name: 'The world starts to be the sky', altitude: altitudeForAngle(world, SKY_ANGLES[0]), code: 'skyWeight()', kind: 'steer' },
    { name: 'The world is the sky, and carries the fairy', altitude: altitudeForAngle(world, SKY_ANGLES[1]), code: 'skyWeight()', kind: 'steer' },
    { name: 'Top of the air: sky colour, new landscape', altitude: world.atmosphere, code: 'updateEnvironment(), visitTransition()', kind: 'look' },
    { name: 'Release to cruise (above the clouds)', altitude: levelCeiling(world), code: 'levelCeiling()', kind: 'steer' },
  ]
}

/** The speed of Earth on its orbit at each orbital speed of the game: the jump when the carry of the planet frame stops. */
export function orbitSpeed(orbitRadius: number, factor: number) {
  return 2 * Math.PI * orbitRadius / 3600 * factor
}
