import * as THREE from 'three'
import type { Lab } from '../../feature-ideas-study/lab'
import { regenerateWorld } from '../../../src/worlds'
import type { World } from '../../../src/worlds'
import { orientFlight } from '../../../src/flight'
import { PROPORTIONS } from '../../../src/proportions'
import { homeAtSize, MOON_HOME_TILT } from '../numbers'

/**
 * Blossom Haven at a new size, as the clips and the bench need it. The game keeps one landscape
 * for Blossom Haven (regenerateWorld() returns at the second visit), so this sets `visit` to 0
 * and builds the ground, the plants, the candy, the cottage, the clouds and the animals again at
 * the new radius. The terrain has the same seed: the hills keep their places on the sphere. The
 * shell of the air is a mesh of the group (addAtmosphere() in src/worlds.ts); it gets a new
 * sphere and the new radii.
 */
export function resizeHome(home: World, baseRadius: number) {
  const size = homeAtSize(baseRadius)
  const start = performance.now()
  home.radius = size.radius
  home.atmosphere = size.atmosphere
  home.cloudHeight = size.cloudHeight
  home.visit = 0
  regenerateWorld(home)
  const air = home.group.children.find(child => child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial && 'ground' in child.material.uniforms) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | undefined
  if (air) {
    air.geometry.dispose()
    air.geometry = new THREE.SphereGeometry(size.radius + size.atmosphere, 64, 40)
    air.material.uniforms.radius.value = size.radius + size.atmosphere
    air.material.uniforms.ground.value = size.radius
  }
  home.group.updateMatrixWorld(true)
  return performance.now() - start
}

/** The base radius of the home now. */
export const homeBaseRadius = (home: World) => home.radius / PROPORTIONS.size

/** The point of a moon path: `distance` metres from the planet, at `turn` of the path, tilted as in numbers.ts. */
export function moonPoint(host: World, distance: number, turn: number, target = new THREE.Vector3()) {
  const tilt = THREE.MathUtils.degToRad(MOON_HOME_TILT)
  return target.set(Math.cos(turn) * distance, Math.sin(turn) * Math.sin(tilt) * distance, Math.sin(turn) * Math.cos(tilt) * distance).add(host.group.position)
}

/** The path of a moon home, as the orbit paths of src/orbits.ts draw it (the colour of the home, 0.34 of light). */
export function moonPathLine(host: World, distance: number, color: number) {
  const points = Array.from({ length: 257 }, (_, i) => moonPoint(host, distance, i / 256 * Math.PI * 2).sub(host.group.position))
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.34, depthWrite: false, fog: false }))
  line.position.copy(host.group.position)
  line.renderOrder = 2
  return line
}

/** A thin circle that faces the camera: the size of the home today, for a size clip. */
export function sizeRing(radius: number) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 160), new THREE.MeshBasicMaterial({ color: 0xffe39a, transparent: true, opacity: 0.7, depthWrite: false, fog: false, side: THREE.DoubleSide }))
  ring.scale.setScalar(radius)
  ring.renderOrder = 3
  return ring
}

/** Puts the fairy at `position`, heading to `target`, with `up` as the up direction. */
export function poseFairy(lab: Lab, position: THREE.Vector3, target: THREE.Vector3, up = new THREE.Vector3(0, 1, 0)) {
  lab.fairy.position.copy(position)
  const heading = target.clone().sub(position).normalize()
  const level = up.clone().addScaledVector(heading, -up.dot(heading)).normalize()
  orientFlight(lab.fairy.quaternion, heading, level)
}

/** Keeps the old place and the old size of the home, and gives them back at the end of a clip. */
export function keepHome(lab: Lab) {
  const home = lab.home, position = home.group.position.clone(), quaternion = home.group.quaternion.clone()
  const base = homeBaseRadius(home)
  return () => {
    home.group.position.copy(position)
    home.group.quaternion.copy(quaternion)
    if (Math.abs(homeBaseRadius(home) - base) > 0.01) resizeHome(home, base)
    home.group.updateMatrixWorld(true)
  }
}
