import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { MOON, moonOffset } from '../src/moon'
import { airVeil, clearsBall, DIARY, DIARY_KEY, emptyDiary, inPicture, inShadow, isFull, litPart, loadDiary, lookStep, moonPlace, moonSight, newLook, parseDiary, PLACE_LINES, saveDiary, see, shapeIcon, shapeOf, SHAPES, shapeSeen } from '../src/moon-diary'
import type { MoonSight } from '../src/moon-diary'
import { PROPORTIONS } from '../src/proportions'

// Earth of the game: radius 275 m and 97.5 m of air, at the middle of the scene. The Sun is far along +X.
const EARTH = { group: { position: new THREE.Vector3() }, radius: 220 * PROPORTIONS.size, atmosphere: 78 * PROPORTIONS.size }
const SUN = new THREE.Vector3(8250, 0, 0)
const moonAt = (x: number, y: number, z: number) => ({ group: { position: new THREE.Vector3(x, y, z) }, radius: MOON.radius })
/** A camera at `eye` that looks at `target`, with the view of the game. */
function cameraAt(eye: THREE.Vector3, target: THREE.Vector3) {
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.08, 80000)
  camera.position.copy(eye)
  camera.up.copy(eye).normalize()
  camera.lookAt(target)
  camera.updateMatrixWorld()
  return camera
}
const clear: MoonSight = { onEarth: true, inView: true, aboveHorizon: true, sunUp: false, eclipse: false, veil: 0.3, cover: 0, lit: 0.5, elongation: 90 }

describe('the shapes of the Moon', () => {
  it('has five shapes in the order of the lit part', () => {
    expect(SHAPES.map(shape => shape.id)).toEqual(['new', 'crescent', 'half', 'gibbous', 'full'])
    expect(SHAPES.map(shape => shape.below)).toEqual([...SHAPES.map(shape => shape.below)].sort((a, b) => a - b))
  })

  it('names the shape for each lit part', () => {
    expect([0, 0.05, 0.099].map(lit => shapeOf(lit).id)).toEqual(['new', 'new', 'new'])
    expect([0.1, 0.2, 0.349].map(lit => shapeOf(lit).id)).toEqual(['crescent', 'crescent', 'crescent'])
    expect([0.35, 0.5, 0.649].map(lit => shapeOf(lit).id)).toEqual(['half', 'half', 'half'])
    expect([0.65, 0.8, 0.879].map(lit => shapeOf(lit).id)).toEqual(['gibbous', 'gibbous', 'gibbous'])
    expect([0.88, 0.95, 1].map(lit => shapeOf(lit).id)).toEqual(['full', 'full', 'full'])
    // The drawing of each shape is a drawing of that shape.
    for (const shape of SHAPES) expect(shapeOf(shape.lit).id).toBe(shape.id)
  })

  it('draws a dark disc for the new Moon and a lit part for the others', () => {
    expect(shapeIcon(0)).not.toContain('<path')
    for (const shape of SHAPES.slice(1)) expect(shapeIcon(shape.lit)).toContain('<path')
    expect(shapeIcon(0.5)).toContain('aria-hidden="true"')
    // The line between light and dark of a half Moon is straight: an ellipse with no width.
    expect(shapeIcon(0.5)).toContain('A0.0 40')
  })

  it('gives a short line and a hint to each shape', () => {
    expect(SHAPES[0].line).toBe('The Moon hides today.')
    for (const shape of SHAPES) {
      expect(shape.line.length).toBeLessThanOrEqual(24)
      expect(shape.hint.length).toBeLessThanOrEqual(40)
    }
  })
})

describe('the lit part, the horizon, the shadow and the air', () => {
  const eye = new THREE.Vector3(0, 285, 0)

  it('measures the lit part of the disc from the eye', () => {
    // The Moon away from the Sun: full. The Moon toward the Sun: new. The Moon to the side: half.
    expect(litPart(new THREE.Vector3(), new THREE.Vector3(-960, 0, 0), SUN)).toBeCloseTo(1, 5)
    expect(litPart(new THREE.Vector3(), new THREE.Vector3(960, 0, 0), SUN)).toBeCloseTo(0, 5)
    // The Sun of the game is near, so a Moon to the side shows a little more than one half.
    expect(litPart(new THREE.Vector3(), new THREE.Vector3(0, 0, 960), SUN)).toBeGreaterThan(0.5)
    expect(litPart(new THREE.Vector3(), new THREE.Vector3(0, 0, 960), SUN)).toBeLessThan(0.6)
    // The Moon is near: the lit part changes with the place of the eye on Earth.
    const moon = new THREE.Vector3(0, 0, 960)
    expect(litPart(new THREE.Vector3(275, 0, 0), moon, SUN)).toBeGreaterThan(litPart(new THREE.Vector3(-275, 0, 0), moon, SUN) + 0.2)
  })

  it('knows when Earth hides a thing in the sky', () => {
    const centre = EARTH.group.position
    expect(clearsBall(eye, new THREE.Vector3(0, 960, 0), centre, 281)).toBe(true)
    expect(clearsBall(eye, new THREE.Vector3(0, -960, 0), centre, 281)).toBe(false)
    expect(clearsBall(eye, new THREE.Vector3(960, 500, 0), centre, 281)).toBe(true)
    // Along the flat horizon the line stays above the ball. A little lower, the ground hides the target.
    expect(clearsBall(eye, new THREE.Vector3(960, 285, 0), centre, 281)).toBe(true)
    expect(clearsBall(eye, new THREE.Vector3(960, -100, 0), centre, 281)).toBe(false)
    // A ball behind the eye hides nothing.
    expect(clearsBall(new THREE.Vector3(0, 600, 0), new THREE.Vector3(0, 960, 0), centre, 281)).toBe(true)
  })

  it('knows when the shadow of Earth touches the Moon', () => {
    const centre = EARTH.group.position
    expect(inShadow(centre, 275, new THREE.Vector3(-960, 0, 0), MOON.radius, SUN)).toBe(true)
    // The edge of the shadow: the middle of the Moon is one Earth radius and one Moon radius from the line.
    // The Sun is very far here, so the shadow keeps its width.
    const far = new THREE.Vector3(1e9, 0, 0)
    expect(inShadow(centre, 275, new THREE.Vector3(-960, 275 + MOON.radius - 2, 0), MOON.radius, far)).toBe(true)
    expect(inShadow(centre, 275, new THREE.Vector3(-960, 275 + MOON.radius + 2, 0), MOON.radius, far)).toBe(false)
    // The Sun of the game is near: the shadow is wider behind Earth.
    expect(inShadow(centre, 275, new THREE.Vector3(-960, 275 + MOON.radius + 2, 0), MOON.radius, SUN)).toBe(true)
    expect(inShadow(centre, 275, new THREE.Vector3(-960, 275 + MOON.radius + 60, 0), MOON.radius, SUN)).toBe(false)
    // A new Moon is between Earth and the Sun: no shadow of Earth.
    expect(inShadow(centre, 275, new THREE.Vector3(960, 0, 0), MOON.radius, SUN)).toBe(false)
    expect(inShadow(centre, 275, new THREE.Vector3(0, 0, 960), MOON.radius, SUN)).toBe(false)
  })

  it('finds thick air along the horizon and thin air above', () => {
    const centre = EARTH.group.position, ground = EARTH.radius, top = EARTH.radius + EARTH.atmosphere
    const up = airVeil(eye, new THREE.Vector3(0, 960, 0), centre, ground, top)
    const slope = airVeil(eye, new THREE.Vector3(960 * Math.cos(0.5), 285 + 960 * Math.sin(0.5), 0), centre, ground, top)
    const level = airVeil(eye, new THREE.Vector3(960, 285, 0), centre, ground, top)
    expect(up).toBeLessThan(slope)
    expect(slope).toBeLessThan(level)
    // Near the ground a Moon over the fairy is clear, and a Moon on the horizon is not.
    expect(up).toBeLessThan(DIARY.veil)
    expect(level).toBeGreaterThan(DIARY.veil)
    expect(level).toBeLessThanOrEqual(0.96)
    // Above the clouds the air is thin: a Moon on the horizon is clear.
    expect(airVeil(new THREE.Vector3(0, 275 + 60, 0), new THREE.Vector3(960, 335, 0), centre, ground, top)).toBeLessThan(DIARY.veil)
    expect(airVeil(new THREE.Vector3(0, 275 + 97, 0), new THREE.Vector3(0, 960, 0), centre, ground, top)).toBeLessThan(0.01)
  })

  it('knows when a point is in the picture', () => {
    const camera = cameraAt(eye, new THREE.Vector3(960, 285, 0))
    expect(inPicture(new THREE.Vector3(960, 285, 0), camera)).toBe(true)
    expect(inPicture(new THREE.Vector3(960, 285 + 300, 0), camera)).toBe(true)
    // Far above the view, to the side of the view, and behind the camera.
    expect(inPicture(new THREE.Vector3(960, 285 + 700, 0), camera)).toBe(false)
    expect(inPicture(new THREE.Vector3(300, 285, 960), camera)).toBe(false)
    expect(inPicture(new THREE.Vector3(-960, 285, 0), camera)).toBe(false)
    // The edge of the picture does not count: the Moon is a wide disc.
    const edge = new THREE.Vector3(0.96, 0, 0.5).unproject(camera)
    expect(inPicture(edge, camera)).toBe(false)
    expect(inPicture(edge, camera, 1)).toBe(true)
  })
})

describe('what the child sees', () => {
  const fairy = new THREE.Vector3(0, 285, 0)

  it('measures the Moon in the picture of the flight', () => {
    const moon = moonAt(0, 960, 300)
    const camera = cameraAt(new THREE.Vector3(0, 287, -8), moon.group.position)
    const sight = moonSight(fairy, camera, EARTH, moon, SUN, true, 0.2)
    expect(sight).toMatchObject({ onEarth: true, inView: true, aboveHorizon: true, eclipse: false, cover: 0.2 })
    expect(sight.lit).toBeGreaterThan(0.35)
    expect(sight.lit).toBeLessThan(0.65)
    expect(sight.elongation).toBeGreaterThan(70)
    expect(sight.elongation).toBeLessThan(100)
    expect(sight.veil).toBeLessThan(DIARY.veil)
    expect(shapeSeen(sight)).toBe('half')
    // The same Moon behind the camera.
    const away = cameraAt(new THREE.Vector3(0, 287, 8), new THREE.Vector3(0, 285, -960))
    expect(moonSight(fairy, away, EARTH, moon, SUN, true, 0).inView).toBe(false)
  })

  it('needs the air of Earth', () => {
    const moon = moonAt(0, 960, 300)
    const high = new THREE.Vector3(0, 275 + 120, 0)
    expect(moonSight(high, cameraAt(high, moon.group.position), EARTH, moon, SUN, true, 0).onEarth).toBe(false)
    // In the air of Earth, but near a different world.
    expect(moonSight(fairy, cameraAt(fairy, moon.group.position), EARTH, moon, SUN, false, 0).onEarth).toBe(false)
  })

  it('sees a Moon in the sky from low over the sea', () => {
    // The camera is 3 m above the base radius of Earth: below the margin for hills.
    const low = new THREE.Vector3(0, EARTH.radius + 3, 0), high = moonAt(300, 960, 0), under = moonAt(960, -200, 0)
    expect(moonSight(low, cameraAt(low, high.group.position), EARTH, high, SUN, true, 0).aboveHorizon).toBe(true)
    expect(moonSight(low, cameraAt(low, under.group.position), EARTH, under, SUN, true, 0).aboveHorizon).toBe(false)
  })

  it('sees no Moon below the horizon, and knows when the Sun is up', () => {
    const below = moonAt(0, -960, 0)
    const sight = moonSight(fairy, cameraAt(fairy, below.group.position), EARTH, below, SUN, true, 0)
    expect(sight.aboveHorizon).toBe(false)
    expect(shapeSeen(sight)).toBeNull()
    // The fairy is on the edge of the day: the Sun is on her horizon. On the night side Earth hides it.
    expect(sight.sunUp).toBe(true)
    const night = new THREE.Vector3(-285, 0, 0), moon = moonAt(-960, 400, 0)
    expect(moonSight(night, cameraAt(night, moon.group.position), EARTH, moon, SUN, true, 0).sunUp).toBe(false)
  })

  it('sees the eclipse of a full Moon', () => {
    const night = new THREE.Vector3(-285, 0, 0), dark = moonAt(-960, 100, 0)
    const sight = moonSight(night, cameraAt(night, dark.group.position), EARTH, dark, SUN, true, 0)
    expect(sight.lit).toBeGreaterThan(0.95)
    expect(sight.eclipse).toBe(true)
    expect(shapeSeen(sight)).toBeNull()
    // A full Moon above the shadow of Earth.
    const bright = moonAt(-880, 400, 0)
    const full = moonSight(night, cameraAt(night, bright.group.position), EARTH, bright, SUN, true, 0)
    expect(full.eclipse).toBe(false)
    expect(shapeSeen(full)).toBe('full')
  })

  it('gives a shape only when the child can see it', () => {
    expect(shapeSeen(clear)).toBe('half')
    expect(shapeSeen({ ...clear, onEarth: false })).toBeNull()
    expect(shapeSeen({ ...clear, inView: false })).toBeNull()
    expect(shapeSeen({ ...clear, aboveHorizon: false })).toBeNull()
    expect(shapeSeen({ ...clear, eclipse: true })).toBeNull()
    // Behind clouds, and behind the thick air of the horizon.
    expect(shapeSeen({ ...clear, cover: DIARY.cover })).toBeNull()
    expect(shapeSeen({ ...clear, cover: DIARY.cover - 0.01 })).toBe('half')
    expect(shapeSeen({ ...clear, veil: DIARY.veil })).toBeNull()
    // The day and the night count the same.
    expect(shapeSeen({ ...clear, sunUp: true })).toBe('half')
    expect(shapeSeen({ ...clear, lit: 0.2 })).toBe('crescent')
    expect(shapeSeen({ ...clear, lit: 0.75 })).toBe('gibbous')
    expect(shapeSeen({ ...clear, lit: 0.95 })).toBe('full')
  })

  it('says where the Moon is now', () => {
    expect(moonPlace(clear)).toBe('up')
    expect(moonPlace({ ...clear, aboveHorizon: false })).toBe('down')
    expect(moonPlace({ ...clear, onEarth: false })).toBe('away')
    // Clouds and the view change nothing: the Moon is in the sky.
    expect(moonPlace({ ...clear, cover: 1, inView: false })).toBe('up')
    for (const line of Object.values(PLACE_LINES)) expect(line.length).toBeLessThanOrEqual(64)
  })

  it('fills the new Moon when it hides next to the Sun', () => {
    const hidden = { ...clear, lit: 0.03, elongation: 20, sunUp: true }
    expect(shapeSeen(hidden)).toBe('new')
    // The new Moon has no light: thick air changes nothing. Clouds hide the sky.
    expect(shapeSeen({ ...hidden, veil: 0.9 })).toBe('new')
    expect(shapeSeen({ ...hidden, cover: 0.9 })).toBeNull()
    // After sunset, the Sun is not in the sky.
    expect(shapeSeen({ ...hidden, sunUp: false })).toBeNull()
    expect(shapeSeen({ ...hidden, inView: false })).toBeNull()
    expect(shapeSeen({ ...hidden, onEarth: false })).toBeNull()
  })
})

describe('the look', () => {
  it('counts a shape after the look time', () => {
    const look = newLook()
    // The first frame starts the look. Each later frame adds its time.
    expect(lookStep(look, 'half', 0.1)).toBeNull()
    expect(look).toEqual({ shape: 'half', time: 0 })
    for (let i = 0; i < 7; i++) expect(lookStep(look, 'half', 0.1)).toBeNull()
    expect(look.time).toBeCloseTo(0.7)
    expect(look.time).toBeLessThan(DIARY.look)
    expect(lookStep(look, 'half', 0.2)).toBe('half')
    // The shape still counts on the next frames: the diary keeps it once (see()).
    expect(lookStep(look, 'half', 0.1)).toBe('half')
  })

  it('starts again after a break or a new shape', () => {
    const look = newLook()
    for (let i = 0; i < 6; i++) lookStep(look, 'half', 0.1)
    // The Moon leaves the view for one frame.
    expect(lookStep(look, null, 0.1)).toBeNull()
    expect(lookStep(look, 'half', 0.1)).toBeNull()
    expect(look.time).toBe(0)
    for (let i = 0; i < 6; i++) lookStep(look, 'half', 0.1)
    expect(lookStep(look, 'gibbous', 0.1)).toBeNull()
    expect(look).toEqual({ shape: 'gibbous', time: 0 })
    // No Moon counts nothing, for any time. A paused flight (0 s) counts nothing.
    const none = newLook()
    expect(lookStep(none, null, 100)).toBeNull()
    for (let i = 0; i < 100; i++) expect(lookStep(none, 'full', 0)).toBeNull()
  })
})

describe('the saved diary', () => {
  it('keeps each shape once, in the order of the looks', () => {
    let diary = emptyDiary()
    const first = see(diary, 'half')
    expect(first).toEqual({ diary: { seen: ['half'] }, isNew: true })
    diary = first.diary
    expect(see(diary, 'half')).toEqual({ diary, isNew: false })
    diary = see(diary, 'new').diary
    expect(diary.seen).toEqual(['half', 'new'])
    expect(isFull(diary)).toBe(false)
    for (const shape of SHAPES) diary = see(diary, shape.id).diary
    expect(diary.seen).toHaveLength(5)
    expect(isFull(diary)).toBe(true)
    // The first diary did not change.
    expect(first.diary.seen).toEqual(['half'])
  })

  it('reads a saved diary, and drops what it does not know', () => {
    expect(parseDiary({ seen: ['full', 'half'] })).toEqual({ seen: ['full', 'half'] })
    expect(parseDiary({ seen: ['full', 'cheese', 'full', 3, null] })).toEqual({ seen: ['full'] })
    for (const broken of [null, undefined, 3, 'half', [], { seen: 'half' }, { other: [] }]) expect(parseDiary(broken)).toEqual(emptyDiary())
  })

  it('saves in the browser, and works with no storage', () => {
    const values = new Map<string, string>()
    const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    expect(loadDiary(store)).toEqual(emptyDiary())
    expect(saveDiary({ seen: ['crescent', 'full'] }, store)).toBe(true)
    expect(values.get(DIARY_KEY)).toBe('{"seen":["crescent","full"]}')
    expect(loadDiary(store)).toEqual({ seen: ['crescent', 'full'] })
    // A broken value, a browser that blocks its storage, and no storage.
    values.set(DIARY_KEY, '{broken')
    expect(loadDiary(store)).toEqual(emptyDiary())
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadDiary(blocked)).toEqual(emptyDiary())
    expect(saveDiary(emptyDiary(), blocked)).toBe(false)
    expect(loadDiary(undefined)).toEqual(emptyDiary())
    expect(saveDiary(emptyDiary(), undefined)).toBe(false)
  })
})

describe('a lunar month of the game', () => {
  it('has each of the five shapes in each month, with a full Moon outside the eclipse', () => {
    // The orbit of Earth (src/worlds.ts and src/orbits.ts) and of the Moon (src/moon.ts), seen from the middle of Earth.
    const distance = 3300 * PROPORTIONS.spacing, sun = new THREE.Vector3(), earth = new THREE.Vector3(), moon = new THREE.Vector3()
    for (let month = 0; month < 12; month++) {
      const seconds: Record<string, number> = {}
      for (let time = month * MOON.synodic; time < (month + 1) * MOON.synodic; time += 0.5) {
        const angle = 0.08 + time / 3600 * Math.PI * 2, offset = moonOffset(time)
        earth.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)
        moon.set(earth.x + offset.x, earth.y + offset.y, earth.z + offset.z)
        const shape = inShadow(earth, EARTH.radius, moon, MOON.radius, sun) ? 'eclipse' : shapeOf(litPart(earth, moon, sun)).id
        seconds[shape] = (seconds[shape] ?? 0) + 0.5
      }
      for (const shape of SHAPES) expect(seconds[shape.id] ?? 0, `${shape.id} in month ${month}`).toBeGreaterThanOrEqual(25)
    }
  })
})
