import * as THREE from 'three'
import { seededRandom } from '../terrain'

/**
 * The parts that the skies of the worlds share (option B of the living worlds study,
 * docs/living-worlds-study.md): the frame, the stats for the browser checks, places on a sphere,
 * and the GLSL of a storm that turns in place.
 */

/** What the loop of src/main.ts gives a sky on each frame. */
export type SkyFrame = {
  /** The clock of the skies in seconds. It stops with reduced motion. */
  time: number
  camera: THREE.Camera
  /** Reduced motion: no flash, no spark, and nothing moves. */
  still: boolean
}

/** What a browser check reads: the parts of the sky, if they show, and the events now. */
export type SkyStats = { parts: string[]; visible: boolean; flash: number; sparks: number; devils: number }

/** The living sky of a world: its clouds and its events. */
export type Sky = {
  update(frame: SkyFrame): void
  dispose(): void
  stats(): SkyStats
}

/** A part of a sky. `flash` and `sparks` are the strength of the events now, for the stats. */
export type SkyPart = { name: string; update(frame: SkyFrame): void; dispose(): void; flash?: () => number; sparks?: () => number; devils?: () => number }

/** One sky from parts. The parts of the clouds (`inside`) show only inside the air, as the puffs of before. */
export function skyOf(world: { group: THREE.Group; radius: number; atmosphere: number }, parts: SkyPart[], inside: THREE.Object3D[]): Sky {
  let visible = false
  // Hidden until the first frame: a world far away shows its painted map, not its clouds.
  for (const item of inside) item.visible = false
  return {
    update(frame) {
      // An airless world: "inside" is low over the ground, where its sparks show.
      visible = frame.camera.position.distanceTo(world.group.position) - world.radius < (world.atmosphere ? world.atmosphere * 1.2 : 80)
      for (const item of inside) item.visible = visible
      for (const part of parts) part.update(frame)
    },
    dispose() { parts.forEach(part => part.dispose()) },
    stats: () => ({
      parts: parts.map(part => part.name), visible,
      flash: Math.max(0, ...parts.map(part => part.flash?.() ?? 0)),
      sparks: parts.reduce((sum, part) => sum + (part.sparks?.() ?? 0), 0),
      devils: parts.reduce((sum, part) => sum + (part.devils?.() ?? 0), 0),
    }),
  }
}

/** The latitude of a local direction in degrees. */
export const latOf = (dir: THREE.Vector3) => THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(dir.y / dir.length(), -1, 1)))

/**
 * A local direction from a latitude and a map longitude in degrees: the longitude of the painted maps
 * (mapLongitude() in src/search-places.ts, atan2(z, -x)).
 */
export function dirOnMap(lat: number, mapLon: number) {
  const phi = THREE.MathUtils.degToRad(lat), lambda = THREE.MathUtils.degToRad(mapLon - 180)
  return new THREE.Vector3(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda))
}

/** Even places on a sphere (a Fibonacci sphere), each with a small random shift. */
export function spherePlaces(count: number, seed: number, jitter = 0.5) {
  const random = seededRandom(seed), golden = Math.PI * (3 - Math.sqrt(5))
  const step = Math.sqrt(4 * Math.PI / count) * jitter
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i + 0.5) / count * 2, ring = Math.sqrt(1 - y * y), angle = i * golden
    return new THREE.Vector3(Math.cos(angle) * ring + (random() - 0.5) * step, y + (random() - 0.5) * step, Math.sin(angle) * ring + (random() - 0.5) * step).normalize()
  })
}

/** Places near the local direction `centre`, inside `radius` metres on a world of radius `worldRadius`. */
export function placesNear(centre: THREE.Vector3, radius: number, worldRadius: number, count: number, seed: number) {
  const random = seededRandom(seed), c = centre.clone().normalize()
  const { east, north } = frameAt(c)
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

/** A number from 0 to 1 for an integer and a seed, the same each time: the slots of the flashes and the sparks. */
export function slotRandom(slot: number, seed: number) {
  let t = Math.imul(slot ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed, 0xc2b2ae35)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** A soft round glow for the light of a flash or a spark. */
export function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

/** The GLSL of a storm that turns in place: 1 inside the oval, the spiral of its clouds, and its edge. */
export function vortexGlsl(name: string) {
  return /* glsl */`
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
