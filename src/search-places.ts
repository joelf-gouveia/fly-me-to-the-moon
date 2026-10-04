import { PROMINENCES } from './sun-look'
import type { Prominence } from './sun-look'

// The places of the scenery that a search task asks for (searchDone() in src/stickers.ts).
// src/planet-paint.ts paints the storms and the canyon from the same numbers, so the task and the
// picture agree. Each direction is a unit vector in the local frame of its world.

export type Direction = { x: number; y: number; z: number }

const DEGREES = 180 / Math.PI
const latitudeOf = (direction: Direction) => Math.asin(Math.max(-1, Math.min(1, direction.y))) * DEGREES
/** Signed longitude difference in degrees, from -180 to 180. */
const turnBetween = (a: number, b: number) => ((a - b + 540) % 360 + 360) % 360 - 180

// ---- The storms of the giants ----------------------------------------------------------------------

/** An elliptic storm on the painted map of a giant. The middle and the half sizes are in degrees. */
export type Storm = { latitude: number; longitude: number; width: number; height: number }
/** Jupiter: the Great Red Spot, larger than life so it reads from far away. */
export const RED_SPOT: Storm = { latitude: -22, longitude: 150, width: 14, height: 7.5 }
/** Neptune: the Great Dark Spot. Its white companion cloud is on its south edge. */
export const DARK_SPOT: Storm = { latitude: -21, longitude: 200, width: 13, height: 6.5 }

/** The longitude of a direction on the painted map of a giant: the u of THREE.SphereGeometry, in degrees. */
export const mapLongitude = (direction: Direction) => (Math.atan2(direction.z, -direction.x) * DEGREES + 360) % 360

/** True over a storm: the same ellipse as oval() in the paint shader. */
export function inStorm(up: Direction, storm: Storm) {
  const latitude = latitudeOf(up)
  const across = turnBetween(mapLongitude(up), storm.longitude) * Math.cos(latitude / DEGREES) / storm.width
  return Math.hypot(across, (latitude - storm.latitude) / storm.height) < 1
}

// ---- The canyon of Mars ----------------------------------------------------------------------------

/**
 * A long canyon along the equator, as Valles Marineris. `longitude` is its middle and `reach` its half
 * length; the paint fades over `fade` at each end. `width` is the half width of the paint, and `near`
 * the half width of the search task. All in degrees.
 */
export const CANYON = { longitude: 120, reach: 40, fade: 10, latitude: -9, wave: 2.5, width: 1.1, near: 3 } as const
/** The longitude of a direction on a rocky world, as the ground paint reads it. */
export const groundLongitude = (direction: Direction) => Math.atan2(direction.z, direction.x) * DEGREES
/** Degrees of longitude from the middle of the canyon. */
export const canyonOffset = (longitude: number) => Math.abs(turnBetween(longitude, CANYON.longitude))
/** The latitude of the canyon at a longitude: it bends a little. */
export const canyonLatitude = (longitude: number) => CANYON.latitude + CANYON.wave * Math.sin(longitude * 0.09)

/** True over the canyon, where its paint is at full strength. */
export function inCanyon(up: Direction) {
  const longitude = groundLongitude(up)
  return canyonOffset(longitude) < CANYON.reach - CANYON.fade && Math.abs(latitudeOf(up) - canyonLatitude(longitude)) < CANYON.near
}

// ---- The loops of fire of the Sun ------------------------------------------------------------------

const cross = (a: Direction, b: Direction): Direction => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
const dot = (a: Direction, b: Direction) => a.x * b.x + a.y * b.y + a.z * b.z
const unit = (a: Direction): Direction => { const length = Math.hypot(a.x, a.y, a.z); return { x: a.x / length, y: a.y / length, z: a.z / length } }

/** The frame of a prominence, as prominenceGeometry() in src/sun-paint.ts: its middle, the line between its feet, and the normal of its plane. */
function loopFrame(loop: Prominence) {
  const latitude = loop.latitude / DEGREES, longitude = loop.longitude / DEGREES, tilt = loop.tilt / DEGREES
  const centre = { x: Math.cos(latitude) * Math.cos(longitude), y: Math.sin(latitude), z: -Math.cos(latitude) * Math.sin(longitude) }
  const east = unit(cross({ x: 0, y: 1, z: 0 }, centre)), north = unit(cross(centre, east))
  const axis = { x: east.x * Math.cos(tilt) + north.x * Math.sin(tilt), y: east.y * Math.cos(tilt) + north.y * Math.sin(tilt), z: east.z * Math.cos(tilt) + north.z * Math.sin(tilt) }
  return { centre, axis, side: unit(cross(centre, axis)) }
}
const LOOP_FRAMES = PROMINENCES.map(loopFrame)
/** The fairy is in the plane of a loop when she is nearer to it than this share of the loop height. The strands lean 0.18 of it. */
export const LOOP_BAND = 0.25

/**
 * The prominence that the fairy flies through, or -1: she is under its arch and in its plane.
 * `distance` is her distance from the centre in radii of the Sun. `turn` is the spin of the
 * prominences about the axis of the Sun, in radians (`rotation.y` of their group).
 */
export function loopAt(up: Direction, distance: number, turn: number) {
  // Into the frame of the prominences, which turn with the Sun.
  const cos = Math.cos(turn), sin = Math.sin(turn)
  const local = { x: up.x * cos - up.z * sin, y: up.y, z: up.x * sin + up.z * cos }
  return PROMINENCES.findIndex((loop, index) => {
    const { centre, axis, side } = LOOP_FRAMES[index]
    const along = Math.atan2(dot(local, axis), dot(local, centre)) / loop.width + 0.5
    if (along <= 0 || along >= 1) return false
    const arch = loop.height * Math.sin(Math.PI * along) ** 0.85
    return distance > 1 && distance - 1 < arch && Math.abs(dot(local, side)) * distance < loop.height * LOOP_BAND
  })
}
