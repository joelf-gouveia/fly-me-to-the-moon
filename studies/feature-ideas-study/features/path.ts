import * as THREE from 'three'
import type { World } from '../../../src/worlds'
import type { Lab, RailPoint } from '../lab'

/** A local direction at right angles to `dir`: the heading of a path on the ground. */
export function tangentOf(dir: THREE.Vector3, turn = 0) {
  const axis = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  return new THREE.Vector3().crossVectors(dir, axis).normalize().applyAxisAngle(dir.clone().normalize(), turn)
}

/**
 * A rail on the ground of a world: it starts at `start` (local), goes toward `heading` (local),
 * and each stop is [metres along the path, metres to the side, height above the ground].
 */
export function groundRail(lab: Lab, world: World, start: THREE.Vector3, heading: THREE.Vector3, stops: [number, number, number][]): RailPoint[] {
  const side = new THREE.Vector3().crossVectors(start, heading).normalize()
  return stops.map(([along, across, alt]) => {
    let dir = lab.stepAlong(world, start, heading, along)
    if (across) dir = lab.stepAlong(world, dir, side, across)
    return { dir, alt }
  })
}
