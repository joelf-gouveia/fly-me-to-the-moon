import * as THREE from 'three'
import { surfaceRadius } from '../../../src/worlds'
import type { World } from '../../../src/worlds'
import type { Lab } from '../../feature-ideas-study/lab'
import { tipToSun } from '../../learn-and-play-study/features/shared'

/**
 * The parts that the clips of the living worlds study share: a place from a latitude and a
 * longitude, a flight on a great circle with a height profile, the Sun of the clip and the label.
 */
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
export const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
export const smooth = (x: number) => x * x * (3 - 2 * x)

/** The bench sets `mobile`: the skies then use the phone budget (half the tufts). */
export const QUALITY = { mobile: false }

/** A local direction of a world from a latitude and a longitude in degrees. */
export function dirAt(lat: number, lon: number) {
  const phi = THREE.MathUtils.degToRad(lat), lambda = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda))
}

/** The local direction `metres` from `start` on the great circle to the east (or to `toward`). */
export function along(world: World, start: THREE.Vector3, metres: number, toward?: THREE.Vector3) {
  const east = toward ? toward.clone() : new THREE.Vector3(0, 1, 0).cross(start)
  if (east.lengthSq() < 1e-6) east.set(1, 0, 0)
  const axis = new THREE.Vector3().crossVectors(start, east).normalize()
  return start.clone().normalize().applyAxisAngle(axis, metres / world.radius)
}

/**
 * A height profile: pairs of [part of the flight, height above the radius of the world]. The
 * height between two pairs is a smooth step. The flight never goes lower than `floor` m above the ground.
 */
export type Profile = [number, number][]
export function heightAt(profile: Profile, u: number) {
  const next = profile.findIndex(([at]) => at >= u)
  if (next <= 0) return profile[next < 0 ? profile.length - 1 : 0][1]
  const [u0, h0] = profile[next - 1], [u1, h1] = profile[next]
  return h0 + (h1 - h0) * smooth(ramp(u, u0, u1))
}

/**
 * A flight of `length` m on a great circle from `start`, with the heights of `profile`
 * (above the radius of the world). The rail is in world positions, at the pose of the world now.
 */
export function flight(lab: Lab, world: World, start: THREE.Vector3, length: number, profile: Profile, { duration, floor = 4, toward, from = 0 }: { duration: number; floor?: number; toward?: THREE.Vector3; from?: number }) {
  world.group.updateMatrixWorld(true)
  const points: THREE.Vector3[] = []
  const steps = Math.max(12, Math.round(length / 8))
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const dir = along(world, start, u * length, toward)
    const normal = dir.clone().applyQuaternion(world.group.quaternion)
    const ground = surfaceRadius(world, normal)
    const radius = Math.max(world.radius + heightAt(profile, u), ground + floor)
    points.push(world.group.position.clone().addScaledVector(normal, radius))
  }
  lab.setRailPoints(world, points, from, from + duration)
  return points
}

/** The Sun of a clip: `elevation` degrees up over the local direction `dir`. Returns the undo. */
export function sunOver(lab: Lab, world: World, dir: THREE.Vector3, elevation: number) {
  return tipToSun(lab, world, dir, elevation)
}

/** A small label at the foot of the clip. */
export function label(lab: Lab, text: string) {
  const element = document.createElement('div')
  element.setAttribute('style', 'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:7px 16px;border-radius:999px;background:rgba(14,18,38,.78);color:#fff6e4;font:600 15px/1.2 system-ui,sans-serif;letter-spacing:.02em;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.25)')
  element.innerHTML = text
  lab.overlay.append(element)
  return (next: string) => { if (element.innerHTML !== next) element.innerHTML = next }
}
