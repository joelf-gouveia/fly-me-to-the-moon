import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  COMET, COMET_LAYERS, COMET_YEAR_SECONDS, cometPosition, cometState, cometVelocity, tailHit, tailLength,
  touchesCometPath,
} from '../src/comet'
import { createComet } from '../src/comet-sky'
import { BELT } from '../src/belt'
import { MOON } from '../src/moon'
import { SOLAR_ORBIT_SECONDS } from '../src/orbits'
import { PROPORTIONS } from '../src/proportions'
import { clearHomePosition, findHomePosition, occupiedRadius } from '../src/relocation'
import { createTerrain, seededRandom } from '../src/terrain'
import { HOME_START_POSITION, WORLD_DATA } from '../src/worlds'
import type { World } from '../src/worlds'
import type { Point } from '../src/comet'

const length = (p: Point) => Math.hypot(p.x, p.y, p.z)
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y + a.z * b.z
const add = (a: Point, b: Point, scale = 1): Point => ({ x: a.x + b.x * scale, y: a.y + b.y * scale, z: a.z + b.z * scale })

/** The planets in the game, on their orbits at orbit time `time`, as src/orbits.ts moves them. */
const planets = WORLD_DATA.map(([name, kind, radius, orbit, angle, , atmosphere]) => ({
  name, kind, radius: radius * PROPORTIONS.size, atmosphere: atmosphere * PROPORTIONS.size, orbit: orbit * PROPORTIONS.spacing, angle,
}))
const planetAt = (planet: typeof planets[number], time: number): Point => {
  const angle = planet.angle + time / SOLAR_ORBIT_SECONDS * Math.PI * 2
  return { x: Math.cos(angle) * planet.orbit, y: 0, z: Math.sin(angle) * planet.orbit }
}
const occupied = (planet: typeof planets[number]) => Math.max(planet.radius + planet.atmosphere, planet.kind === 'saturn' ? planet.radius * 2.1 : planet.kind === 'uranus' ? planet.radius * 2.05 : 0)

function fixture(kind: World['kind'], radius: number, position: Point, atmosphere = 52): World {
  const group = new THREE.Group(); group.position.set(position.x, position.y, position.z)
  return { name: kind, kind, radius, atmosphere, cloudHeight: 24, color: 0, sky: new THREE.Color(), group, surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain(kind === 'sun' ? 'mercury' : kind, 1), seed: 1, visit: 1, armed: false, gas: false }
}

describe('the comet orbit', () => {
  it('is a long ellipse through the inner solar system, six passes in each game year', () => {
    expect(COMET_YEAR_SECONDS).toBe(SOLAR_ORBIT_SECONDS)
    expect(SOLAR_ORBIT_SECONDS % COMET.period).toBe(0)
    let near = Infinity, far = 0
    for (let t = 0; t < COMET.period; t += 0.5) {
      const r = length(cometPosition(t))
      near = Math.min(near, r); far = Math.max(far, r)
    }
    expect(near).toBeGreaterThan(COMET.perihelion - 5)
    expect(near).toBeLessThan(COMET.perihelion + 5)
    expect(far).toBeGreaterThan(COMET.aphelion - 5)
    expect(far).toBeLessThan(COMET.aphelion + 5)
    // One pass later, and one game year later, the comet is at the same place.
    for (const t of [0, 37.5, 410]) {
      expect(length(add(cometPosition(t + COMET.period), cometPosition(t), -1))).toBeLessThan(0.01)
      expect(length(add(cometPosition(t + COMET_YEAR_SECONDS), cometPosition(t), -1))).toBeLessThan(0.01)
    }
  })

  it('is fast near the Sun and slow far from it, and turns the same way as the planets', () => {
    const speeds = Array.from({ length: 600 }, (_, t) => ({ r: length(cometPosition(t)), v: length(cometVelocity(t)) }))
    const nearest = speeds.reduce((a, b) => (a.r < b.r ? a : b)), farthest = speeds.reduce((a, b) => (a.r > b.r ? a : b))
    expect(nearest.v).toBeGreaterThan(5 * farthest.v)
    // The velocity agrees with a small step of the position.
    const t = 123.4, step = add(cometPosition(t + 0.01), cometPosition(t - 0.01), -1)
    expect(length(add(cometVelocity(t), step, -50))).toBeLessThan(0.5)
    // The planets turn from +X to +Z. The comet turns the same way: its angular momentum has the same sign.
    const p = cometPosition(t), v = cometVelocity(t)
    expect(p.z * v.x - p.x * v.z).toBeLessThan(0)
  })

  it('never meets a planet, its air, its rings, the Moon path or the Sun', () => {
    for (const planet of planets) {
      // The nucleus and the coma stay clear of the air, the rings and the Moon path by 250 m more.
      let nucleus = Infinity
      for (let t = 0; t < COMET.period; t += 0.25) {
        const p = cometPosition(t)
        nucleus = Math.min(nucleus, Math.hypot(Math.hypot(p.x, p.z) - planet.orbit, p.y) - COMET.coma)
      }
      const need = occupied(planet) + 250 + (planet.kind === 'earth' ? MOON.orbit + MOON.radius : 0)
      expect(nucleus, planet.name).toBeGreaterThan(need)
    }
    let sun = Infinity
    for (let t = 0; t < COMET.period; t += 0.1) sun = Math.min(sun, length(cometPosition(t)))
    expect(sun).toBeGreaterThan(600 * PROPORTIONS.sun * 2)
  })

  it('passes near Earth soon after the start, where the fairy can see it', () => {
    const earth = planets.find(planet => planet.kind === 'earth')!
    let closest = Infinity, when = 0
    for (let t = 0; t < 200; t += 0.5) {
      const d = length(add(cometPosition(t), planetAt(earth, t), -1))
      if (d < closest) { closest = d; when = t }
    }
    expect(when).toBeGreaterThan(60)
    expect(when).toBeLessThan(120)
    expect(closest).toBeGreaterThan(MOON.orbit + MOON.radius + 250)
    expect(closest).toBeLessThan(2500)
  })
})

describe('the comet tails', () => {
  it('point away from the Sun at every place of the orbit, with the Sun anywhere', () => {
    for (const sun of [{ x: 0, y: 0, z: 0 }, { x: 500, y: -40, z: 900 }]) {
      for (let t = 0; t < COMET.period; t += 7) {
        const state = cometState(t, sun)
        const fromSun = add(state.position, sun, -1)
        expect(dot(state.away, fromSun) / length(fromSun)).toBeCloseTo(1, 6)
        expect(length(state.away)).toBeCloseTo(1, 6)
        // The dust tail bends back along the orbit, across the tail.
        expect(Math.abs(dot(state.trailing, state.away))).toBeLessThan(1e-6)
        expect(dot(state.trailing, state.velocity)).toBeLessThanOrEqual(1e-6)
      }
    }
  })

  it('are longer near the Sun', () => {
    expect(tailLength(COMET.perihelion)).toBeGreaterThan(tailLength(3300 * PROPORTIONS.spacing))
    expect(tailLength(3300 * PROPORTIONS.spacing)).toBeCloseTo(1100)
    expect(tailLength(3300 * PROPORTIONS.spacing)).toBeGreaterThan(tailLength(COMET.aphelion))
    const near = cometState(0 - COMET.start / 360 * COMET.period), far = cometState(COMET.period / 2 - COMET.start / 360 * COMET.period)
    expect(near.distance).toBeCloseTo(COMET.perihelion, 0)
    expect(far.distance).toBeCloseTo(COMET.aphelion, 0)
    expect(near.dust.length).toBeGreaterThan(2 * far.dust.length)
    expect(near.ion.length).toBeGreaterThan(near.dust.length)
  })

  it('know when a point is inside a tail, and not behind the Sun side of the head', () => {
    const state = cometState(90)
    const at = (u: number, across = 0) => {
      const side = { x: state.away.y * state.trailing.z - state.away.z * state.trailing.y, y: state.away.z * state.trailing.x - state.away.x * state.trailing.z, z: state.away.x * state.trailing.y - state.away.y * state.trailing.x }
      const depth = u * state.dust.length
      return add(add(add(state.position, state.away, depth), state.trailing, state.dust.bend * u * u * state.dust.length), side, across)
    }
    expect(tailHit(at(0.3), state)).toMatchObject({ inside: true, tail: 'dust' })
    expect(tailHit(at(0.3), state).along).toBeCloseTo(0.3, 6)
    expect(tailHit(at(0.9), state).inside).toBe(true)
    // Beside the tail, toward the Sun, and past the end of both tails.
    expect(tailHit(at(0.3, 400), state).inside).toBe(false)
    expect(tailHit(at(-0.05), state).inside).toBe(false)
    expect(tailHit(add(state.position, state.away, state.ion.length * 1.02), state).inside).toBe(false)
    // The long ion tail goes past the end of the dust tail, on the straight axis.
    expect(tailHit(add(state.position, state.away, state.dust.length * 1.1), state)).toMatchObject({ inside: true, tail: 'ion' })
  })
})

describe('the comet in the scene', () => {
  it('draws half the particles on a phone, and finds the fairy in the tail', () => {
    expect(COMET_LAYERS.phone.dust * 2).toBe(COMET_LAYERS.desktop.dust)
    expect(COMET_LAYERS.phone.ion * 2).toBe(COMET_LAYERS.desktop.ion)
    const camera = new THREE.PerspectiveCamera(58, 1.6, 0.08, 80000)
    const desktop = createComet(new THREE.Scene()), phone = createComet(new THREE.Scene(), true)
    expect(desktop.stats.dust).toBe(5200)
    expect(phone.stats.dust).toBe(2600)
    const sun = new THREE.Vector3(), forward = new THREE.Vector3(0, 0, -1)
    const state = cometState(90)
    const inside = new THREE.Vector3(state.position.x, state.position.y, state.position.z).addScaledVector(new THREE.Vector3(state.away.x, state.away.y, state.away.z), 200)
    desktop.update(90, sun, camera, new THREE.Vector3(), forward, 0, 1 / 60, 800)
    expect(desktop.inTail).toBe(false)
    desktop.update(90, sun, camera, inside, forward, 0, 1 / 60, 800)
    expect(desktop.inTail).toBe(true)
    expect(desktop.entered).toBe(true)
    expect(desktop.glow).toBe(1)
    expect(desktop.stats.sparkles).toBeGreaterThan(30)
    // The tail frame: local +Z points away from the Sun.
    const tails = desktop.group.getObjectByName('comet-tails')!
    const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(tails.quaternion)
    expect(axis.dot(new THREE.Vector3(state.away.x, state.away.y, state.away.z))).toBeCloseTo(1, 5)
    // A second entry soon after gives no second chime.
    desktop.update(90, sun, camera, new THREE.Vector3(), forward, 0, 1 / 60, 800)
    desktop.update(90, sun, camera, inside, forward, 0, 1 / 60, 800)
    expect(desktop.entered).toBe(false)
    // Inside an atmosphere the comet fades out, and the fairy is not in a tail she cannot see.
    desktop.update(90, sun, camera, inside, forward, 0, 1 / 60, 800, 0)
    expect(desktop.group.visible).toBe(false)
    expect(desktop.inTail).toBe(false)
  })
})

describe('Blossom Haven and the comet', () => {
  it('keeps the home clear of the comet path and its tails', () => {
    const home = fixture('fairy', 110 * PROPORTIONS.size, { x: HOME_START_POSITION[0], y: HOME_START_POSITION[1], z: HOME_START_POSITION[2] }, 52 * PROPORTIONS.size)
    const worlds = [home, fixture('sun', 600 * PROPORTIONS.sun, { x: 0, y: 0, z: 0 }, 0), ...planets.map(planet => fixture(planet.kind, planet.radius, planetAt(planet, 0), planet.atmosphere))]
    const fairy = new THREE.Vector3(1e6, 0, 0)
    // The start place is clear.
    expect(touchesCometPath(home.group.position, occupiedRadius(home) + 250)).toBe(false)
    // The comet now, a place on its path, and a place in its tail are not.
    for (const t of [0, 90, 300, 450]) {
      const state = cometState(t)
      const now = new THREE.Vector3(state.position.x, state.position.y, state.position.z)
      expect(clearHomePosition(now, home, worlds, fairy, false)).toBe(false)
      // The same distance and height on the far side of the Sun: the home turns there later.
      expect(clearHomePosition(new THREE.Vector3(-now.x, now.y, -now.z), home, worlds, fairy, false)).toBe(false)
      const tail = now.clone().addScaledVector(new THREE.Vector3(state.away.x, state.away.y, state.away.z), state.dust.length * 0.6)
      expect(clearHomePosition(tail, home, worlds, fairy, false)).toBe(false)
    }
    // Every new home is clear of the comet for a whole game year.
    const random = seededRandom(0xc0e7)
    for (let move = 0; move < 40; move++) {
      const next = findHomePosition(home, worlds, fairy, false, random)
      expect(next).not.toBeNull()
      home.group.position.copy(next!)
      const radius = Math.hypot(next!.x, next!.z), angle = Math.atan2(next!.z, next!.x)
      let closest = Infinity, inTail = 0
      for (let t = 0; t < COMET_YEAR_SECONDS; t += 2) {
        // The home turns with the planets; the comet does not.
        const a = angle + t / SOLAR_ORBIT_SECONDS * Math.PI * 2
        const place = { x: Math.cos(a) * radius, y: next!.y, z: Math.sin(a) * radius }
        const state = cometState(t)
        closest = Math.min(closest, length(add(place, state.position, -1)))
        if (tailHit(place, state).inside) inTail++
      }
      expect(closest).toBeGreaterThan(occupiedRadius(home) + COMET.coma)
      expect(inTail).toBe(0)
      expect(Math.abs(next!.y) < BELT.halfHeight && radius > BELT.inner && radius < BELT.outer).toBe(false)
    }
  })
})
