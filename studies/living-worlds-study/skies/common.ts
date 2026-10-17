import * as THREE from 'three'
import type { World } from '../../../src/worlds'
import { seededRandom } from '../../../src/terrain'

/** What a sky part of the study does on each frame and at the end. */
export type SkyPart = { update(time: number, camera: THREE.Vector3): void; dispose(): void; calls?: number }

/** One part made of several parts. */
export function parts(list: SkyPart[]): SkyPart {
  return {
    update(time, camera) { list.forEach(part => part.update(time, camera)) },
    dispose() { list.forEach(part => part.dispose()) },
    calls: list.reduce((sum, part) => sum + (part.calls ?? 1), 0),
  }
}

/** Hides the cloud puffs of today (buildClouds() in src/worlds.ts) and gives them back at the end. */
export function hidePuffs(world: World): SkyPart {
  const puffs = world.clouds.getObjectByName('cloud-puffs') as THREE.InstancedMesh | undefined
  const count = puffs?.count ?? 0
  if (puffs) puffs.count = 0
  return { update() {}, dispose() { if (puffs) puffs.count = count }, calls: 0 }
}

/** The latitude of a local direction in degrees. */
export const latOf = (dir: THREE.Vector3) => THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(dir.y / dir.length(), -1, 1)))

/** Even places on a sphere (a Fibonacci sphere), each with a small random shift. */
export function spherePlaces(count: number, seed: number, jitter = 0.5) {
  const random = seededRandom(seed), golden = Math.PI * (3 - Math.sqrt(5))
  const step = Math.sqrt(4 * Math.PI / count) * jitter
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i + 0.5) / count * 2, ring = Math.sqrt(1 - y * y), angle = i * golden
    return new THREE.Vector3(Math.cos(angle) * ring + (random() - 0.5) * step, y + (random() - 0.5) * step, Math.sin(angle) * ring + (random() - 0.5) * step).normalize()
  })
}

/** Places near the local direction `centre`, inside `radius` metres on the ground of a world of radius `worldRadius`. */
export function placesNear(centre: THREE.Vector3, radius: number, worldRadius: number, count: number, seed: number) {
  const random = seededRandom(seed), c = centre.clone().normalize()
  const east = new THREE.Vector3(0, 1, 0).cross(c).normalize(), north = new THREE.Vector3().crossVectors(c, east)
  return Array.from({ length: count }, () => {
    const r = Math.sqrt(random()) * radius / worldRadius, a = random() * Math.PI * 2
    return c.clone().addScaledVector(east, Math.cos(a) * r).addScaledVector(north, Math.sin(a) * r).normalize()
  })
}

/** A tangent frame at a local direction: east, north and up. */
export function frameAt(dir: THREE.Vector3) {
  const up = dir.clone().normalize()
  const east = new THREE.Vector3(0, 1, 0).cross(up)
  if (east.lengthSq() < 1e-6) east.set(1, 0, 0)
  east.normalize()
  return { up, east, north: new THREE.Vector3().crossVectors(up, east) }
}

/** The GLSL of a vortex: an oval storm at a local direction, which turns in place. */
export function vortexGlsl(name: string) {
  return /* glsl */`
// ${name}: 1 inside the oval, the spiral of the clouds in it, and the edge.
vec3 ${name}(vec3 d, vec3 middle, vec3 east, vec3 north, vec2 size, float spin, float time) {
  vec2 p = vec2(dot(d - middle, east), dot(d - middle, north)) / size;
  float r = length(p);
  float turn = spin * time * (1.4 - r);
  float c = cos(turn), s = sin(turn);
  vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  float arms = lwFbm(vec3(q * 3.2, 1.7)) * 0.7 + 0.5 * sin(atan(q.y, q.x) * 2.0 + r * 9.0) * 0.3;
  return vec3(1.0 - smoothstep(0.82, 1.0, r), arms, smoothstep(0.65, 0.95, r) * (1.0 - smoothstep(0.95, 1.12, r)));
}`
}
