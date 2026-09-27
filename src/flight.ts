import * as THREE from 'three'
import { surfaceRadius } from './worlds'
import type { World } from './worlds'
import { PROPORTIONS } from './proportions'

/** Flight speed in open space: 430 m/s in base units, faster with the spacing of src/proportions.ts. */
export const SPACE_SPEED = 430 * PROPORTIONS.speed

export type FlightState = { position: THREE.Vector3; quaternion: THREE.Quaternion; speed: number }
export type FlightInput = { yaw: number; pitch: number; boost: boolean }

const forward = new THREE.Vector3(), up = new THREE.Vector3(), tangent = new THREE.Vector3()
const previousUp = new THREE.Vector3(), nextUp = new THREE.Vector3()
const rotation = new THREE.Quaternion(), basis = new THREE.Matrix4()
const origin = new THREE.Vector3(), worldUp = new THREE.Vector3(0, 1, 0)

export function orientFlight(quaternion: THREE.Quaternion, heading: THREE.Vector3, normal: THREE.Vector3) {
  basis.lookAt(origin, heading, normal)
  quaternion.setFromRotationMatrix(basis)
}

export function nearestWorldAt(position: THREE.Vector3, worlds: World[]) {
  return worlds.reduce((nearest, world) =>
    position.distanceTo(world.group.position) - world.radius < position.distanceTo(nearest.group.position) - nearest.radius ? world : nearest)
}

/** Turns the heading and leaves `forward` on the new heading. Returns true near the world. */
function turnFlight(state: FlightState, world: World, delta: number, input: Omit<FlightInput, 'boost'>, level: boolean) {
  previousUp.copy(state.position).sub(world.group.position).normalize()
  const altitude = state.position.distanceTo(world.group.position) - world.radius
  const near = altitude < Math.max(world.atmosphere * 1.55, 85)
  forward.set(0, 0, -1).applyQuaternion(state.quaternion)

  if (near) {
    up.copy(previousUp)
    let pitch = Math.asin(THREE.MathUtils.clamp(forward.dot(up), -1, 1))
    pitch = THREE.MathUtils.clamp(pitch + input.pitch * delta * 0.72, -1.35, 1.35)
    if (level && !input.pitch) pitch *= Math.exp(-delta * 0.85)
    tangent.copy(forward).addScaledVector(up, -forward.dot(up))
    if (tangent.lengthSq() < 0.0001) tangent.crossVectors(up, Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : worldUp)
    tangent.normalize().applyAxisAngle(up, input.yaw * delta * 0.78)
    forward.copy(tangent).multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch))
    orientFlight(state.quaternion, forward, up)
  } else {
    rotation.setFromEuler(new THREE.Euler(input.pitch * delta * 0.65, input.yaw * delta * 0.7, 0, 'YXZ'))
    state.quaternion.multiply(rotation).normalize()
    forward.set(0, 0, -1).applyQuaternion(state.quaternion)
  }
  return near
}

/** Turns in place while hovering. The look angle stays where the player leaves it. */
export function hoverFlight(state: FlightState, world: World, delta: number, input: Omit<FlightInput, 'boost'>) {
  state.speed = 0
  if (input.yaw || input.pitch) turnFlight(state, world, delta, input, false)
}

export function stepFlight(state: FlightState, world: World, delta: number, input: FlightInput) {
  const near = turnFlight(state, world, delta, input, true)
  const altitude = state.position.distanceTo(world.group.position) - world.radius
  const clearance = state.position.distanceTo(world.group.position) - surfaceRadius(world, previousUp)

  const surfaceSpeed = THREE.MathUtils.lerp(11, 32, THREE.MathUtils.smoothstep(clearance, 5, 80))
  const travel = THREE.MathUtils.smoothstep(altitude, Math.max(world.atmosphere, 50), 1000)
  const desiredSpeed = THREE.MathUtils.lerp(surfaceSpeed, SPACE_SPEED, travel) * (input.boost ? 2.3 : 1)
  // Immediate slowing on approach prevents a space-speed step through terrain.
  state.speed = desiredSpeed < state.speed ? desiredSpeed : THREE.MathUtils.lerp(state.speed, desiredSpeed, 1 - Math.exp(-delta * 1.7))
  state.position.addScaledVector(forward, state.speed * delta)

  nextUp.copy(state.position).sub(world.group.position).normalize()
  if (near) {
    rotation.setFromUnitVectors(previousUp, nextUp)
    state.quaternion.premultiply(rotation)
  }
  const minimum = surfaceRadius(world, nextUp) + (world.gas ? 8 : 2.3)
  if (state.position.distanceTo(world.group.position) < minimum) {
    state.position.copy(world.group.position).addScaledVector(nextUp, minimum)
    forward.set(0, 0, -1).applyQuaternion(state.quaternion)
    tangent.copy(forward).addScaledVector(nextUp, -forward.dot(nextUp)).normalize()
    if (tangent.lengthSq() > 0.1) orientFlight(state.quaternion, tangent.addScaledVector(nextUp, 0.09).normalize(), nextUp)
  }
}
