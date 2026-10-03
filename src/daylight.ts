import * as THREE from 'three'
import type { World } from './worlds'

/** Stylized art thresholds in degrees of solar elevation, not a physical atmosphere model. */
export const DAYLIGHT = {
  dayStart: -6, dayEnd: 14,
  twilightFloor: -12, twilightPeak: -2, twilightSpread: 22,
  starsFull: -14, starsGone: -3,
} as const

const DEGREES = 180 / Math.PI

/** Degrees of the Sun above the local horizontal plane. All inputs are world-space. */
export function solarElevation(position: THREE.Vector3, center: THREE.Vector3, sun: THREE.Vector3) {
  const up = position.clone().sub(center).normalize()
  const toSun = sun.clone().sub(position).normalize()
  return Math.asin(THREE.MathUtils.clamp(up.dot(toSun), -1, 1)) * DEGREES
}

export function daylightAt(elevation: number) {
  const day = THREE.MathUtils.smoothstep(elevation, DAYLIGHT.dayStart, DAYLIGHT.dayEnd)
  const twilight = (1 - THREE.MathUtils.smoothstep(Math.abs(elevation), 0, DAYLIGHT.twilightSpread))
    * THREE.MathUtils.smoothstep(elevation, DAYLIGHT.twilightFloor, DAYLIGHT.twilightPeak)
  const stars = 1 - THREE.MathUtils.smoothstep(elevation, DAYLIGHT.starsFull, DAYLIGHT.starsGone)
  return { elevation, day, night: 1 - day, twilight, stars }
}

export type Daylight = ReturnType<typeof daylightAt>

export type SkyProfile = {
  day: THREE.Color
  night: THREE.Color
  twilight: THREE.Color
  /** How much of the night star field shows through the air (thick clouds hide it). */
  starClarity: number
}

/** Night and twilight colors per world; the daytime color stays `world.sky`. */
export function skyProfile(world: Pick<World, 'kind' | 'sky'>): SkyProfile {
  const giant = (night: number) => ({ night: new THREE.Color(night), twilight: new THREE.Color(0xd9a37a), starClarity: 0.5 })
  const profile = world.kind === 'earth' ? { night: new THREE.Color(0x0e1a3a), twilight: new THREE.Color(0xf0a27c), starClarity: 1 }
    : world.kind === 'fairy' ? { night: new THREE.Color(0x2b2452), twilight: new THREE.Color(0xf6b08a), starClarity: 1 }
    : world.kind === 'venus' ? { night: new THREE.Color(0x2a1c10), twilight: new THREE.Color(0xe08a4a), starClarity: 0.1 }
    // Mars twilight is blue: fine dust scatters blue light toward the setting Sun.
    : world.kind === 'mars' ? { night: new THREE.Color(0x1a1420), twilight: new THREE.Color(0x7ea6c8), starClarity: 1 }
    : world.kind === 'jupiter' ? giant(0x241a14)
    : world.kind === 'saturn' ? giant(0x261f14)
    : world.kind === 'uranus' ? giant(0x0f2226)
    : world.kind === 'neptune' ? giant(0x0b1430)
    : { night: new THREE.Color(0x02030f), twilight: new THREE.Color(0x02030f), starClarity: 1 }
  return { day: world.sky, ...profile }
}

/** Blend in linear color space, matching the atmosphere shell. */
export function skyColor(profile: SkyProfile, light: Daylight, target: THREE.Color) {
  return target.copy(profile.night).lerp(profile.day, light.day).lerp(profile.twilight, light.twilight * 0.55)
}

/**
 * Spin angle about +Y that puts a planet-local normal in mid-morning light.
 * Rising means positive spin carries the location toward the Sun.
 * `lean` is the lean of the axis of a tilted world (Earth, src/seasons.ts); the spin is about that axis.
 */
export function morningSpin(localNormal: THREE.Vector3, center: THREE.Vector3, sun: THREE.Vector3, targetElevation = 25, lean?: THREE.Quaternion) {
  const toSun = sun.clone().sub(center).normalize()
  if (lean) toSun.applyQuaternion(lean.clone().invert())
  const turned = new THREE.Vector3(), ahead = new THREE.Vector3(), axis = new THREE.Vector3(0, 1, 0)
  let best = 0, bestError = Infinity
  for (let step = 0; step < 360; step++) {
    const angle = step / 360 * Math.PI * 2
    turned.copy(localNormal).applyAxisAngle(axis, angle)
    ahead.copy(localNormal).applyAxisAngle(axis, angle + 0.01)
    if (ahead.dot(toSun) <= turned.dot(toSun)) continue
    const error = Math.abs(Math.asin(THREE.MathUtils.clamp(turned.dot(toSun), -1, 1)) * DEGREES - targetElevation)
    if (error < bestError) { best = angle; bestError = error }
  }
  return best
}
