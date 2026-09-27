import * as THREE from 'three'
import type { TerrainSample } from './terrain'
import { PROPORTIONS } from './proportions'

export type Point = { x: number; y: number; z: number }

const TAU = Math.PI * 2
const DEGREES = 180 / Math.PI
/** SOLAR_ORBIT_SECONDS in src/orbits.ts. A test keeps the two values the same. */
export const MOON_YEAR_SECONDS = 3600
/** Earth's angle at time 0, from `data` in src/worlds.ts. The start phase uses it. */
const EARTH_START_ANGLE = 0.08

/** Earth's radius in the game: 220 base units at the size of src/proportions.ts. */
const EARTH_RADIUS = 220 * PROPORTIONS.size

/**
 * Option C of the Moon study (docs/moon-study.md), at the proportions of the proportions
 * study (docs/proportions-study.md): radius 0.273 of Earth, as in the real Solar System,
 * and an orbit of 3.5 Earth radii. Sizes and times are stylized.
 */
export const MOON = {
  radius: Math.round(EARTH_RADIUS * 0.273), orbit: EARTH_RADIUS * 3.5, inclination: 28,
  /** The node line, and the elongation at time 0: a last-quarter Moon in the morning sky. */
  node: 40, elongation: 270,
  /** One new moon each 300 s: 12 lunar months in one game year. */
  synodic: 300,
  color: 0xbdb8ae, seed: 0x3004,
  /** The fairy moves with the Moon up to this height above its ground: its flight near zone. */
  carry: 85,
  /** The part of the hemisphere light that the Moon gets, from far away and from close by. */
  earthshine: 0.12, earthshineNear: 0.5,
} as const

/** The Moon turns with Earth's spin. The planets orbit the other way, so this is longer. */
export const MOON_SIDEREAL_SECONDS = 1 / (1 / MOON.synodic - 1 / MOON_YEAR_SECONDS)

export type MoonOrbit = { radius: number; inclination: number; node?: number; elongation?: number }
export const MOON_ORBIT: MoonOrbit = { radius: MOON.orbit, inclination: MOON.inclination }

/**
 * The Moon relative to Earth's centre at orbit time `time` (orbits.elapsed).
 * For a flat orbit the angle is a = node − u, so the Moon turns with Earth's spin.
 * After MOON_YEAR_SECONDS it is back at its start.
 */
export function moonOffset(time: number, orbit: MoonOrbit = MOON_ORBIT): Point {
  const node = (orbit.node ?? MOON.node) / DEGREES
  const inclination = orbit.inclination / DEGREES
  const sunAngle = EARTH_START_ANGLE + Math.PI
  const start = node - (sunAngle - (orbit.elongation ?? MOON.elongation) / DEGREES)
  const u = start + time / MOON_SIDEREAL_SECONDS * TAU
  const cu = Math.cos(u), su = Math.sin(u)
  return {
    x: orbit.radius * (cu * Math.cos(node) + su * Math.cos(inclination) * Math.sin(node)),
    y: orbit.radius * su * Math.sin(inclination),
    z: orbit.radius * (cu * Math.sin(node) - su * Math.cos(inclination) * Math.cos(node)),
  }
}

const frameX = new THREE.Vector3(), frameY = new THREE.Vector3(), frameZ = new THREE.Vector3(), ahead = new THREE.Vector3()
const basis = new THREE.Matrix4()
/** Tidal lock: local +X (the near side) faces Earth, local +Y is the orbit normal. */
export function tidalQuaternion(time: number, target: THREE.Quaternion, orbit: MoonOrbit = MOON_ORBIT) {
  const now = moonOffset(time, orbit), next = moonOffset(time + 0.01, orbit)
  frameX.set(-now.x, -now.y, -now.z).normalize()
  ahead.set(next.x - now.x, next.y - now.y, next.z - now.z)
  frameY.crossVectors(frameX, ahead).normalize()
  frameZ.crossVectors(frameX, frameY)
  return target.setFromRotationMatrix(basis.makeBasis(frameX, frameY, frameZ))
}

/**
 * True when a sphere of this radius can meet the Moon. The Moon turns around Earth,
 * so the test is a sphere around Earth that holds the whole orbit, at every tilt.
 */
export function touchesMoonPath(position: Point, earth: Point, radius = 0, orbit = MOON.orbit) {
  return Math.hypot(position.x - earth.x, position.y - earth.y, position.z - earth.z) < orbit + MOON.radius + radius
}

const toMoon = new THREE.Vector3(), moonToSun = new THREE.Vector3(), moonToGround = new THREE.Vector3()
/**
 * Moonlight at a place on Earth. `strength` scales the night fill: 1 under a high full
 * moon, 0.45 on a night with no Moon, so nights stay gentle.
 */
export function moonlightAt(ground: THREE.Vector3, up: THREE.Vector3, moon: THREE.Vector3, sun: THREE.Vector3) {
  toMoon.copy(moon).sub(ground).normalize()
  const elevation = Math.asin(THREE.MathUtils.clamp(up.dot(toMoon), -1, 1)) * DEGREES
  moonToSun.copy(sun).sub(moon).normalize()
  moonToGround.copy(ground).sub(moon).normalize()
  const illuminated = (1 + moonToSun.dot(moonToGround)) / 2
  const above = THREE.MathUtils.smoothstep(elevation, -4, 8)
  return { elevation, illuminated, above, strength: 0.45 + 0.55 * illuminated * above, direction: toMoon.clone() }
}

/** Earthshine for a camera at this height above the Moon's ground. Close by, the ground stays readable. */
export const earthshineAt = (altitude: number) => THREE.MathUtils.lerp(MOON.earthshineNear, MOON.earthshine, THREE.MathUtils.smoothstep(altitude, 40, 400))

/**
 * The Moon material: no fog, so it shows from Earth's ground, and a dark night side,
 * so its phases show. `earthshine` scales the hemisphere light on the Moon only.
 */
export function createMoonMaterial() {
  const earthshine = { value: MOON.earthshine as number }
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, fog: false })
  material.onBeforeCompile = shader => {
    shader.uniforms.earthshine = earthshine
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float earthshine;')
      .replace('#include <lights_fragment_end>', '#if defined( RE_IndirectDiffuse )\n\tirradiance *= earthshine;\n#endif\n#include <lights_fragment_end>')
  }
  material.customProgramCacheKey = () => 'moon-earthshine'
  return { material, earthshine }
}

const HIGHLAND = new THREE.Color(0xbdb8ae), MARIA = new THREE.Color(0x7c7d82), BRIGHT = new THREE.Color(0xf1eee6)
const TYCHO = new THREE.Vector3(0.66, -0.6, 0.45).normalize()
const TYCHO_EAST = new THREE.Vector3().crossVectors(TYCHO, new THREE.Vector3(0, 1, 0)).normalize()
const TYCHO_NORTH = new THREE.Vector3().crossVectors(TYCHO_EAST, TYCHO)
const flat = new THREE.Vector3()
/** Grey highlands, darker maria, and the young crater Tycho with its bright rays. */
export function moonGroundColor(direction: THREE.Vector3, sample: TerrainSample, target: THREE.Color) {
  const angle = direction.angleTo(TYCHO)
  if (angle < 0.06) return target.copy(BRIGHT)
  flat.copy(direction).addScaledVector(TYCHO, -direction.dot(TYCHO))
  const rays = THREE.MathUtils.smoothstep(Math.cos(Math.atan2(flat.dot(TYCHO_NORTH), flat.dot(TYCHO_EAST)) * 11 + sample.detail * 2), 0.9, 1) * Math.max(0, 1 - angle / 0.95)
  return target.copy(HIGHLAND).lerp(MARIA, sample.mare ?? 0).multiplyScalar(0.88 + sample.detail * 0.16).lerp(BRIGHT, rays * 0.3)
}
