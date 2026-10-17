import * as THREE from 'three'
import { hoverFlight, SPACE_SPEED, stepFlight } from '../../src/flight'
import type { FlightState } from '../../src/flight'
import { surfaceRadius } from '../../src/worlds'
import type { World } from '../../src/worlds'

/**
 * The control models of the let go study (docs/let-go-study.md). `T` is the game today:
 * stepFlight() and hoverFlight() of src/flight.ts, with the hover toggle of src/main.ts. A, B and
 * C are proposals. They use the same two functions, and a glide to a stop when the keys are up.
 * The study does not change the game.
 */
export type OptionId = 'T' | 'A' | 'B' | 'C'
export const OPTION_IDS: OptionId[] = ['T', 'A', 'B', 'C']

/** The keys and buttons of one frame. `fly` is the Fly key of B. `hover` is the hover state of today (T). */
export type Controls = { yaw: number; pitch: number; boost: boolean; fly: boolean; hover: boolean }
export const NO_KEYS: Controls = { yaw: 0, pitch: 0, boost: false, fly: false, hover: false }

/** The glide to a stop: the speed falls by this rate (1/s). At 3.5 the speed is 3% after 1 s. */
export const GLIDE_RATE = 3.5
/** Below this speed (m/s) the glide ends and she waits. */
export const STOP_SPEED = 0.3
/** Option C: the seconds with no key before she starts to glide to a stop. */
export const REST_DELAY = 3

/** What the fairy does in a frame: she flies, she glides to a stop, or she waits in the air. */
export type Phase = 'fly' | 'glide' | 'wait'
export type Pilot = { option: OptionId; idle: number; resting: boolean; phase: Phase }
export function createPilot(option: OptionId): Pilot {
  return { option, idle: 0, resting: false, phase: 'fly' }
}

const forward = new THREE.Vector3(), before = new THREE.Vector3(), after = new THREE.Vector3()
const turn = new THREE.Quaternion(), tangent = new THREE.Vector3(), basis = new THREE.Matrix4(), origin = new THREE.Vector3()

/**
 * One frame of the glide to a stop. The fairy keeps her heading, and the speed falls by
 * GLIDE_RATE. Near a world she keeps her angle to the ground, and the ground stops her as in
 * stepFlight(). Returns false when the speed is below STOP_SPEED: then she waits.
 */
export function glideFlight(state: FlightState, world: World, delta: number) {
  state.speed *= Math.exp(-GLIDE_RATE * delta)
  if (state.speed < STOP_SPEED) { state.speed = 0; return false }
  before.copy(state.position).sub(world.group.position).normalize()
  const altitude = state.position.distanceTo(world.group.position) - world.radius
  forward.set(0, 0, -1).applyQuaternion(state.quaternion)
  state.position.addScaledVector(forward, state.speed * delta)
  after.copy(state.position).sub(world.group.position).normalize()
  if (altitude < Math.max(world.atmosphere * 1.55, 85)) {
    turn.setFromUnitVectors(before, after)
    state.quaternion.premultiply(turn)
  }
  const minimum = surfaceRadius(world, after) + (world.gas ? 8 : 2.3)
  if (state.position.distanceTo(world.group.position) < minimum) {
    state.position.copy(world.group.position).addScaledVector(after, minimum)
    forward.set(0, 0, -1).applyQuaternion(state.quaternion)
    tangent.copy(forward).addScaledVector(after, -forward.dot(after)).normalize()
    if (tangent.lengthSq() > 0.1) {
      basis.lookAt(origin, tangent, after)
      state.quaternion.setFromRotationMatrix(basis)
    }
  }
  return true
}

/** The glide, then the wait. In a wait the arrows turn her in place, as hoverFlight() does today. */
function stopFlight(pilot: Pilot, state: FlightState, world: World, delta: number, input: Controls, turnInPlace: boolean) {
  if (state.speed > 0 && glideFlight(state, world, delta)) { pilot.phase = 'glide'; return }
  pilot.phase = 'wait'
  hoverFlight(state, world, delta, turnInPlace ? input : { yaw: 0, pitch: 0 })
}

/**
 * One frame of flight with the control model of an option.
 * - T, today: she flies with no keys. Hover (Q or the Hover button) stops her at once.
 * - A, any key flies: an arrow or Boost moves her. With no key she glides to a stop.
 * - B, hold to fly: the Fly key moves her, and the arrows steer. Boost is a second Fly key
 *   that flies fast. With both up she glides to a stop, and the arrows turn her in place.
 * - C, rest after a pause: she flies with no keys, as today. After REST_DELAY s with no key she
 *   glides to a stop. An arrow or Boost starts her again.
 */
export function pilotStep(pilot: Pilot, state: FlightState, world: World, delta: number, input: Controls) {
  const steer = { yaw: input.yaw, pitch: input.pitch, boost: input.boost }
  const any = Boolean(input.yaw || input.pitch || input.boost)
  switch (pilot.option) {
    case 'T':
      if (input.hover) { pilot.phase = 'wait'; hoverFlight(state, world, delta, input) }
      else { pilot.phase = 'fly'; stepFlight(state, world, delta, steer) }
      return
    case 'A':
      if (any) { pilot.phase = 'fly'; stepFlight(state, world, delta, steer) }
      else stopFlight(pilot, state, world, delta, input, false)
      return
    case 'B':
      if (input.fly || input.boost) { pilot.phase = 'fly'; stepFlight(state, world, delta, steer) }
      else stopFlight(pilot, state, world, delta, input, true)
      return
    case 'C':
      if (any) { pilot.idle = 0; pilot.resting = false }
      else pilot.idle += delta
      if (pilot.idle >= REST_DELAY) pilot.resting = true
      if (!pilot.resting) { pilot.phase = 'fly'; stepFlight(state, world, delta, steer) }
      else stopFlight(pilot, state, world, delta, input, false)
  }
}

/** True when a finger (or a key) is down in this frame. A tap of Hover counts as a press, not a hold. */
export function handsOn(option: OptionId, input: Controls) {
  return Boolean(input.yaw || input.pitch || input.boost || (option === 'B' && input.fly))
}
/** The number of fingers down: two when the thumbs hold Fly and an arrow. */
export function fingers(option: OptionId, input: Controls) {
  return Number(Boolean(input.yaw || input.pitch)) + Number(input.boost || (option === 'B' && input.fly))
}

export { SPACE_SPEED }
