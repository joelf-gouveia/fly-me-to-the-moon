import * as THREE from 'three'

// F14 · The Moon shapes diary (docs/learn-and-play-study.md): one place for each shape of the Moon
// that the child sees from Earth. This file has the rules and the saved diary. It needs no browser.
// The note and the diary in Worlds are in src/moon-diary-ui.ts.

export type ShapeId = 'new' | 'crescent' | 'half' | 'gibbous' | 'full'
export type Shape = {
  id: ShapeId
  name: string
  /** The lit part of the drawing, from 0 to 1. */
  lit: number
  /** The shape counts while the lit part of the Moon is below this value. */
  below: number
  /** One short line for the child. */
  line: string
  /** The hint of an empty place. */
  hint: string
}

/**
 * The five shapes, from the lit part of the disc that the fairy sees. The orbit of the Moon leans 28°,
 * so in some months the new Moon stays 28° from the Sun (7% lit) and the full Moon is 96% lit.
 * The limits of "new" (10% lit: less than 37° from the Sun) and "full" (88% lit) give each month a new
 * Moon and a full Moon. From the middle of Earth, a month of 300 s has 29 s or more of the new Moon, 36 s
 * or more of the full Moon with no eclipse, and 56 s or more of each other shape.
 */
export const SHAPES: readonly Shape[] = [
  { id: 'new', name: 'New Moon', lit: 0, below: 0.1, line: 'The Moon hides today.', hint: 'Look near the Sun. The Moon hides there.' },
  { id: 'crescent', name: 'Crescent', lit: 0.2, below: 0.35, line: 'A thin curve of light.', hint: 'Look for a thin Moon.' },
  { id: 'half', name: 'Half Moon', lit: 0.5, below: 0.65, line: 'One half is bright.', hint: 'Look for a half Moon.' },
  { id: 'gibbous', name: 'Almost full', lit: 0.8, below: 0.88, line: 'Almost a full circle.', hint: 'Look for a Moon that is almost round.' },
  { id: 'full', name: 'Full Moon', lit: 1, below: Infinity, line: 'A round, bright Moon!', hint: 'Look for a round Moon.' },
]
const ids = new Set<string>(SHAPES.map(shape => shape.id))
export const isShapeId = (value: unknown): value is ShapeId => typeof value === 'string' && ids.has(value)
export const shapeById = (id: ShapeId) => SHAPES.find(shape => shape.id === id)!
/** The shape of the Moon for the lit part of its disc, from 0 (new) to 1 (full). */
export const shapeOf = (lit: number) => SHAPES.find(shape => lit < shape.below)!

/** The drawing of a shape: a dark disc and its lit part, on the right. */
export function shapeIcon(lit: number) {
  const k = 1 - 2 * lit, r = 40
  // A half circle, then an ellipse for the line between light and dark.
  const path = `M50 ${50 - r} A${r} ${r} 0 0 1 50 ${50 + r} A${(Math.abs(k) * r).toFixed(1)} ${r} 0 0 ${k > 0 ? 0 : 1} 50 ${50 - r}Z`
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="#39406a"/>${lit > 0 ? `<path d="${path}" fill="#fff3c4"/>` : ''}</svg>`
}

/** The numbers of the rule "the child sees the Moon". */
export const DIARY = {
  /** The Moon is in the view when its middle is this far inside the edge of the picture (1 is the edge). */
  frame: 0.92,
  /** Hills and trees: the line to the Moon stays this many metres above the ball of Earth. */
  horizon: 6,
  /** The Moon shows through the air when its veil (airVeil()) is below this value. Near the ground, a Moon on the horizon does not. */
  veil: 0.75,
  /** Below the clouds, the sky is clear enough when the cloud cover over the camera is below this value. */
  cover: 0.5,
  /** The child looks at the shape for this time, in seconds of flight, before it counts. */
  look: 0.8,
} as const

/** What the flight loop measures for the diary on each frame (moonSight()). */
export type MoonSight = {
  /** The fairy is in the air of Earth, and Earth is the nearest world. */
  onEarth: boolean
  /** The middle of the Moon is in the picture of the camera. */
  inView: boolean
  /** Earth does not hide the Moon: the Moon is above the horizon. */
  aboveHorizon: boolean
  /** Earth does not hide the Sun. */
  sunUp: boolean
  /** The shadow of Earth touches the Moon: an eclipse makes a full Moon dark. */
  eclipse: boolean
  /** How much the air hides the Moon, from 0 (clear) to 0.96 (airVeil()). The air is thick along the horizon. */
  veil: number
  /** The cloud cover over the camera, from 0 to 1. It is 0 above the clouds. */
  cover: number
  /** The lit part of the disc of the Moon, from 0 to 1, seen from the fairy. */
  lit: number
  /** The angle in the sky between the Moon and the Sun, in degrees. */
  elongation: number
}

const toEye = new THREE.Vector3(), toSun = new THREE.Vector3(), along = new THREE.Vector3(), projected = new THREE.Vector3()

/** The lit part of the disc of the Moon for an eye at `eye`: 0 is a new Moon and 1 is a full Moon. */
export function litPart(eye: THREE.Vector3, moon: THREE.Vector3, sun: THREE.Vector3) {
  toSun.copy(sun).sub(moon).normalize()
  toEye.copy(eye).sub(moon).normalize()
  return (1 + toSun.dot(toEye)) / 2
}

/** True when the straight line from `eye` to `target` does not go through a ball at `centre`. */
export function clearsBall(eye: THREE.Vector3, target: THREE.Vector3, centre: THREE.Vector3, radius: number) {
  along.copy(target).sub(eye)
  const length = along.length()
  along.divideScalar(length)
  // The point of the line that is nearest to the centre of the ball.
  const t = THREE.MathUtils.clamp(toEye.copy(centre).sub(eye).dot(along), 0, length)
  return toEye.copy(eye).addScaledVector(along, t).distanceTo(centre) > radius
}

/** True when a point is in the picture of the camera, `frame` of the way to its edge or less. */
export function inPicture(point: THREE.Vector3, camera: THREE.Camera, frame: number = DIARY.frame) {
  projected.copy(point).project(camera)
  return projected.z > -1 && projected.z < 1 && Math.abs(projected.x) <= frame && Math.abs(projected.y) <= frame
}

/** The numbers of the air shader of addAtmosphere() in src/worlds.ts. */
const AIR = { samples: 12, scale: 0.21, density: 0.028, most: 0.96 } as const
const sample = new THREE.Vector3()
/**
 * How much the air of a world hides a thing in the sky, from 0 (a clear view) to 0.96. It is the
 * opacity that the air shader of addAtmosphere() in src/worlds.ts draws in front of the thing: the air
 * is thick near the ground and along the horizon. `ground` is the base radius of the world, and
 * `top` is the radius of the top of its air.
 */
export function airVeil(eye: THREE.Vector3, target: THREE.Vector3, centre: THREE.Vector3, ground: number, top: number) {
  along.copy(target).sub(eye).normalize()
  toEye.copy(eye).sub(centre)
  const b = toEye.dot(along), hit = Math.sqrt(Math.max(0, b * b - toEye.lengthSq() + top * top))
  const start = Math.max(0, -b - hit), end = Math.max(0, -b + hit)
  let depth = 0
  for (let i = 0; i < AIR.samples; i++) {
    const height = Math.max(0, sample.copy(toEye).addScaledVector(along, THREE.MathUtils.lerp(start, end, (i + 0.5) / AIR.samples)).length() - ground)
    depth += Math.exp(-height / ((top - ground) * AIR.scale)) * (end - start) / AIR.samples
  }
  return (1 - Math.exp(-depth * AIR.density)) * AIR.most
}

/**
 * True when the shadow of a ball touches a second ball: the first ball is between the second ball and the
 * Sun. It is the rule of the planet shadows in src/sun-shading.ts, for the whole of the second ball.
 */
export function inShadow(of: THREE.Vector3, ofRadius: number, on: THREE.Vector3, onRadius: number, sun: THREE.Vector3) {
  toSun.copy(sun).sub(on)
  const sunDistance = toSun.length()
  toSun.divideScalar(sunDistance)
  toEye.copy(of).sub(on)
  const before = toEye.dot(toSun)
  return before > 0 && before < sunDistance && Math.sqrt(Math.max(0, toEye.lengthSq() - before * before)) < ofRadius + onRadius
}

/** A world of the game (World in src/worlds.ts): its middle and its base radius. */
type Ball = { group: { position: THREE.Vector3 }; radius: number }
/**
 * What the child can see of the Moon now. `nearest` says that Earth is the nearest world, and `cover` is
 * the cloud cover over the camera. The function updates the matrices of the camera.
 */
export function moonSight(fairy: THREE.Vector3, camera: THREE.Camera, earth: Ball & { atmosphere: number }, moon: Ball, sun: THREE.Vector3, nearest: boolean, cover: number): MoonSight {
  const centre = earth.group.position, target = moon.group.position
  camera.updateMatrixWorld()
  // Low over the sea the camera is below the margin for hills: the ball of the horizon then stays below the camera.
  const horizon = Math.min(earth.radius + DIARY.horizon, camera.position.distanceTo(centre) - 1)
  const lit = litPart(fairy, target, sun)
  toEye.copy(target).sub(fairy).normalize()
  toSun.copy(sun).sub(fairy).normalize()
  const elongation = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(toEye.dot(toSun), -1, 1)))
  return {
    onEarth: nearest && fairy.distanceTo(centre) - earth.radius < earth.atmosphere,
    inView: inPicture(target, camera),
    aboveHorizon: clearsBall(camera.position, target, centre, horizon),
    sunUp: clearsBall(camera.position, sun, centre, horizon),
    eclipse: inShadow(centre, earth.radius, target, moon.radius, sun),
    veil: airVeil(camera.position, target, centre, earth.radius, earth.radius + earth.atmosphere),
    cover, lit, elongation,
  }
}

/**
 * The shape that the child sees now, or null. The fairy is in the air of Earth, the Moon is in the
 * picture and above the horizon, and no eclipse makes it dark. For a shape with light, the air and the
 * clouds do not hide the Moon. The new Moon has no light to see: it counts when the Sun is up, so the
 * child looks at the place next to the Sun where the Moon hides. The day and the night count the same.
 */
export function shapeSeen(sight: MoonSight): ShapeId | null {
  if (!sight.onEarth || !sight.inView || !sight.aboveHorizon || sight.eclipse || sight.cover >= DIARY.cover) return null
  const shape = shapeOf(sight.lit).id
  if (shape === 'new') return sight.sunUp ? shape : null
  return sight.veil < DIARY.veil ? shape : null
}

/** Where the Moon is for the child: in the sky of Earth, below the horizon of Earth, or the fairy is away from Earth. */
export type MoonPlace = 'up' | 'down' | 'away'
export const moonPlace = (sight: MoonSight): MoonPlace => !sight.onEarth ? 'away' : sight.aboveHorizon ? 'up' : 'down'
/** The line of the diary in Worlds while it has an empty place: where to look now. */
export const PLACE_LINES: Record<MoonPlace, string> = {
  up: 'The Moon is in the sky now. Look up!',
  down: 'The Moon is on the other side of Earth now. It comes back soon.',
  away: 'Look at the Moon from Earth. Each new shape comes here.',
}

/** The time that the child looks at one shape. A shape counts after DIARY.look seconds with no break. */
export type Look = { shape: ShapeId | null; time: number }
export const newLook = (): Look => ({ shape: null, time: 0 })
/** One frame of a look. It changes `look`, and it returns the shape when the look is long enough. */
export function lookStep(look: Look, shape: ShapeId | null, delta: number): ShapeId | null {
  if (shape !== look.shape) { look.shape = shape; look.time = 0 }
  else if (shape) look.time += delta
  return shape && look.time >= DIARY.look ? shape : null
}

/** The saved diary: the shapes that the child saw, in the order in which they came. */
export type Diary = { seen: ShapeId[] }
export const emptyDiary = (): Diary => ({ seen: [] })
/** The first look at a shape gives it its place. A later look changes nothing. */
export function see(diary: Diary, id: ShapeId): { diary: Diary; isNew: boolean } {
  if (diary.seen.includes(id)) return { diary, isNew: false }
  return { diary: { seen: [...diary.seen, id] }, isNew: true }
}
export const isFull = (diary: Diary) => diary.seen.length === SHAPES.length

/** Reads a saved diary. Unknown or repeated shapes are dropped. */
export function parseDiary(value: unknown): Diary {
  if (!value || typeof value !== 'object') return emptyDiary()
  const raw = (value as Record<string, unknown>).seen
  return { seen: Array.isArray(raw) ? [...new Set(raw.filter(isShapeId))] : [] }
}

export const DIARY_KEY = 'fairy-moon-diary'
type Store = Pick<Storage, 'getItem' | 'setItem'>
/** The storage of the browser. Some browsers throw when a page asks for it. */
const browserStore = (): Store | undefined => { try { return globalThis.localStorage } catch { return undefined } }
/** Loads the diary from the browser. A missing or broken value gives an empty diary. */
export function loadDiary(store = browserStore()): Diary {
  try { return parseDiary(JSON.parse(store?.getItem(DIARY_KEY) ?? 'null')) } catch { return emptyDiary() }
}
/** Saves the diary. It returns false when the browser has no storage; the diary then stays for this visit. */
export function saveDiary(diary: Diary, store = browserStore()) {
  try { store!.setItem(DIARY_KEY, JSON.stringify(diary)); return true } catch { return false }
}
