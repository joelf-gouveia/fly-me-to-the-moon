import * as THREE from 'three'
import { homeCottagePosition, surfaceRadius } from './worlds'
import type { World } from './worlds'

/** A visible, safe next direction; never point a child through a planet. */
export function journeyHeading(position: THREE.Vector3, target: THREE.Vector3, nearest: World, arriving: boolean) {
  const normal = position.clone().sub(nearest.group.position).normalize()
  const heading = target.clone().sub(position)
  const distance = heading.length()
  heading.normalize()
  const radius = position.distanceTo(nearest.group.position)
  // On arrival we may descend, but route around the solid surface to a far-side cottage.
  const safeRadius = arriving ? surfaceRadius(nearest, normal) + 8 : nearest.radius + nearest.atmosphere + 55
  const along = THREE.MathUtils.clamp(nearest.group.position.clone().sub(position).dot(heading), 0, distance)
  const closest = position.clone().addScaledVector(heading, along).distanceTo(nearest.group.position)
  // A world's core is a landing target: descend towards it instead of routing around it.
  const landing = target.distanceTo(nearest.group.position) < nearest.radius * 0.5
  if (radius < safeRadius || (!landing && closest < safeRadius - 2)) {
    const tangent = heading.clone().addScaledVector(normal, -heading.dot(normal))
    if (tangent.lengthSq() < 0.001) tangent.crossVectors(normal, Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0))
    tangent.normalize()
    const lift = radius < safeRadius ? THREE.MathUtils.clamp((safeRadius - radius) / 45, 0.12, 1.5) : 0.08
    return tangent.addScaledVector(normal, lift).normalize()
  }
  return heading
}

export function homeApproachPoint(home: World) {
  // Approach a broad meadow just before the cottage, leaving the front view clear.
  const normal = new THREE.Vector3(0, -1, -0.19).normalize().applyQuaternion(home.group.quaternion)
  return home.group.position.clone().addScaledVector(normal, surfaceRadius(home, normal) + 12)
}

/** The flower marks the actual cottage, independently of the safe flight route. */
export function homeMarkerPosition(home: World) {
  return homeCottagePosition(home, 8)
}

export function createHomeGuide() {
  let enabled = false, idle = 0
  return {
    get enabled() { return enabled },
    start() { enabled = true; idle = 2 },
    stop() { enabled = false; idle = 0 },
    update(delta: number, steering: boolean) {
      if (!enabled) return false
      if (steering) idle = 0
      else idle = Math.min(2, idle + delta)
      return !steering && idle >= 2
    },
  }
}
