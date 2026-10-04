import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { rayCraters } from '../src/planet-paint'
import { CANYON, canyonLatitude, DARK_SPOT, inCanyon, inStorm, loopAt, RED_SPOT } from '../src/search-places'
import type { Direction } from '../src/search-places'
import { nearestCreature, searchProbe } from '../src/search-stars'
import { emptyBook, find, lapStep, newLap, parseBook, SEARCH, SEARCH_CREATURE, searchDone, searching, STICKERS } from '../src/stickers'
import type { SearchProbe } from '../src/stickers'
import { PROMINENCES } from '../src/sun-look'
import { sunDirection } from '../src/sun-paint'
import { createTerrain, OCCATOR } from '../src/terrain'
import type { World } from '../src/worlds'

function fixture(kind: World['kind'], radius: number, cloudHeight = 0): World {
  const group = new THREE.Group(); group.position.set(100, 20, -50)
  const surface = new THREE.Group()
  group.add(surface)
  return { name: kind, kind, radius, atmosphere: 0, cloudHeight, color: 0, sky: new THREE.Color(), group, surface, clouds: new THREE.Group(), sample: createTerrain(kind === 'sun' ? 'mercury' : kind, 7), seed: 7, visit: 1, armed: false, gas: false }
}
/** A probe with nothing found: high over flat ground at the equator. */
const probe = (change: Partial<SearchProbe> = {}): SearchProbe => ({
  near: true, altitude: 200, clearance: 200, radius: 100, cloudHeight: 40, up: { x: 1, y: 0, z: 0 },
  ground: { height: 0, land: 0, river: 0, detail: 0 }, creatures: {}, ...change,
})
const unit = (x: number, y: number, z: number) => { const length = Math.hypot(x, y, z); return { x: x / length, y: y / length, z: z / length } }
const RADIANS = Math.PI / 180
/** A direction on the ground paint of a rocky world: its longitude is atan2(z, x). */
const onGround = (latitude: number, longitude: number) => ({ x: Math.cos(latitude * RADIANS) * Math.cos(longitude * RADIANS), y: Math.sin(latitude * RADIANS), z: Math.cos(latitude * RADIANS) * Math.sin(longitude * RADIANS) })
/** A direction on the painted map of a giant: its longitude is atan2(z, -x). */
const onMap = (latitude: number, longitude: number) => ({ x: -Math.cos(latitude * RADIANS) * Math.cos(longitude * RADIANS), y: Math.sin(latitude * RADIANS), z: Math.cos(latitude * RADIANS) * Math.sin(longitude * RADIANS) })

describe('search stars', () => {
  it('counts a find once, and only after the hello sticker', () => {
    expect(find(emptyBook(), 'moon').earned).toEqual([])
    const book = { ...emptyBook(), arrived: ['moon' as const] }
    expect(searching(book, 'moon')).toBe(true)
    const first = find(book, 'moon')
    expect(first.earned).toEqual([{ id: 'moon', kind: 'search' }])
    expect(first.book.found).toEqual(['moon'])
    expect(searching(first.book, 'moon')).toBe(false)
    expect(find(first.book, 'moon').earned).toEqual([])
    // A saved star needs its hello sticker.
    expect(parseBook({ arrived: ['moon'], found: ['moon', 'mars'] }).found).toEqual(['moon'])
  })

  it('has a check for each world, and nothing is found high over flat ground', () => {
    for (const sticker of STICKERS) expect(searchDone(sticker.id, probe()), sticker.id).toBe(false)
  })

  it('tests the loops of fire of the Sun: under the arch and in the plane of the loop', () => {
    PROMINENCES.forEach((loop, index) => {
      const centre = sunDirection(loop.latitude, loop.longitude)
      // Half the height of the loop, over its middle.
      expect(loopAt(centre, 1 + loop.height / 2, 0), `loop ${index}`).toBe(index)
      // Above the top of the arch, and below the surface.
      expect(loopAt(centre, 1 + loop.height * 1.1, 0)).toBe(-1)
      expect(loopAt(centre, 0.99, 0)).toBe(-1)
    })
    const [loop] = PROMINENCES
    const centre = sunDirection(loop.latitude, loop.longitude)
    // The loop goes east to west (its tilt is 8°). North of its plane by 5° is out; along it by a third of its width is in.
    const north = sunDirection(loop.latitude + 5, loop.longitude), along = sunDirection(loop.latitude, loop.longitude + loop.width / 3 / RADIANS)
    expect(loopAt(north, 1 + loop.height / 2, 0)).toBe(-1)
    expect(loopAt(along, 1 + loop.height / 4, 0)).toBe(0)
    // Beyond a foot of the loop.
    expect(loopAt(sunDirection(loop.latitude, loop.longitude + loop.width / RADIANS), 1.01, 0)).toBe(-1)
    // The loops turn with the Sun: a group with rotation.y carries the middle of the loop.
    const turned = centre.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.3)
    expect(loopAt(turned, 1 + loop.height / 2, 1.3)).toBe(0)
    expect(loopAt(centre, 1 + loop.height / 2, 1.3)).toBe(-1)
    // radius 100: 6 m above the Sun is half the height of the first loop.
    expect(searchDone('sun', probe({ up: centre, altitude: 6 }))).toBe(true)
    expect(searchDone('sun', probe({ up: turned, altitude: 6, turn: 1.3 }))).toBe(true)
    expect(searchDone('sun', probe({ up: centre, altitude: 30 }))).toBe(false)
  })

  it('tests the ray craters of Mercury: low over the bright middle', () => {
    expect(searchDone('mercury', probe({ clearance: 10, rays: 0.1 }))).toBe(true)
    expect(searchDone('mercury', probe({ clearance: 30, rays: 0.1 }))).toBe(false)
    expect(searchDone('mercury', probe({ clearance: 10, rays: SEARCH.rays + 0.05 }))).toBe(false)
    expect(searchDone('mercury', probe({ clearance: 10 }))).toBe(false)
    // The probe measures the angle to the craters of the seed of the world.
    const mercury = fixture('mercury', 119)
    const craters = rayCraters(mercury.seed)
    expect(craters).toHaveLength(4)
    const over = (direction: THREE.Vector3) => searchProbe(mercury, direction.clone().multiplyScalar(130).add(mercury.group.position), true)
    expect(over(craters[2].centre).rays).toBeCloseTo(0, 5)
    expect(searchDone('mercury', over(craters[2].centre))).toBe(true)
    const away = craters[2].centre.clone().applyAxisAngle(craters[2].east, 0.3)
    expect(Math.min(...craters.map(crater => crater.centre.angleTo(away)))).toBeCloseTo(over(away).rays!, 5)
  })

  it('tests the lap of Venus: to the far side and back to the start, in the air', () => {
    const around = (angle: number, tilt = 0): Direction => ({ x: Math.cos(angle), y: Math.sin(angle) * Math.sin(tilt), z: Math.sin(angle) * Math.cos(tilt) })
    /** Flies from angle `from` to angle `to` in small steps. True when a step completes the lap. */
    const fly = (lap: ReturnType<typeof newLap>, from: number, to: number, tilt = 0) => {
      let done = false
      const steps = Math.ceil(Math.abs(to - from) / 0.05)
      for (let i = 0; i <= steps; i++) done = lapStep(lap, around(from + (to - from) * i / steps, tilt), true) || done
      return done
    }
    // A full lap, in each direction, and over the poles.
    for (const [to, tilt] of [[Math.PI * 2, 0], [-Math.PI * 2, 0], [Math.PI * 2, 1.4]]) {
      const lap = newLap()
      expect(fly(lap, 0, to * 0.8, tilt)).toBe(false)
      expect(fly(lap, to * 0.8, to, tilt)).toBe(true)
    }
    // To the far side and back on the same side is too short for a lap.
    let lap = newLap()
    expect(fly(lap, 0, 2.8)).toBe(false)
    expect(fly(lap, 2.8, 0)).toBe(false)
    // A short flight out and back does not reach the far side.
    lap = newLap()
    fly(lap, 0, 2)
    expect(fly(lap, 2, 0)).toBe(false)
    // Out of the air, the lap starts again.
    lap = newLap()
    fly(lap, 0, 5)
    expect(lapStep(lap, around(5), false)).toBe(false)
    expect(lap).toEqual(newLap())
    expect(fly(lap, 5, Math.PI * 2)).toBe(false)
    // A jump is not a flight.
    lap = newLap()
    fly(lap, 0, 3)
    lapStep(lap, around(6.2), true)
    expect(lap.far).toBe(false)
    expect(fly(lap, 6.2, Math.PI * 2)).toBe(false)
    expect(searchDone('venus', probe({ lap: true }))).toBe(true)
    expect(searchDone('venus', probe({ altitude: 10, lap: false }))).toBe(false)
  })

  it('tests the rainbow of Earth', () => {
    expect(searchDone('earth', probe({ rainbow: 0.5 }))).toBe(true)
    expect(searchDone('earth', probe({ rainbow: 0.5, near: false }))).toBe(false)
    expect(searchDone('earth', probe({ rainbow: SEARCH.rainbow - 0.05 }))).toBe(false)
    // The duck of the first task is no find now.
    expect(searchDone('earth', probe({ creatures: { duck: 2 } }))).toBe(false)
  })

  it('tests the canyon of Mars: low over its dark line', () => {
    const middle = onGround(canyonLatitude(CANYON.longitude), CANYON.longitude)
    expect(inCanyon(middle)).toBe(true)
    expect(searchDone('mars', probe({ up: middle, clearance: 10 }))).toBe(true)
    expect(searchDone('mars', probe({ up: middle, clearance: 30 }))).toBe(false)
    // The canyon bends: its latitude changes along its length.
    for (const longitude of [95, 110, 135, 148]) {
      expect(inCanyon(onGround(canyonLatitude(longitude), longitude)), `${longitude}`).toBe(true)
      expect(inCanyon(onGround(canyonLatitude(longitude) + CANYON.near + 1, longitude)), `${longitude}`).toBe(false)
    }
    // The ends of the canyon fade: no find there, and none on the other side of Mars.
    expect(inCanyon(onGround(canyonLatitude(155), 155))).toBe(false)
    expect(inCanyon(onGround(CANYON.latitude, -60))).toBe(false)
  })

  it('tests the storms of the giants: in the clouds over the Great Red Spot and the Great Dark Spot', () => {
    for (const [id, storm] of [['jupiter', RED_SPOT], ['neptune', DARK_SPOT]] as const) {
      const middle = onMap(storm.latitude, storm.longitude)
      expect(inStorm(middle, storm)).toBe(true)
      expect(searchDone(id, probe({ up: middle, altitude: 30 }))).toBe(true)
      // Above the clouds, and in the clouds away from the storm.
      expect(searchDone(id, probe({ up: middle, altitude: 50 }))).toBe(false)
      expect(searchDone(id, probe({ altitude: 30 }))).toBe(false)
      expect(inStorm(onMap(storm.latitude, storm.longitude + storm.width * 0.8), storm)).toBe(true)
      expect(inStorm(onMap(storm.latitude, storm.longitude + storm.width * 1.3), storm)).toBe(false)
      expect(inStorm(onMap(storm.latitude + storm.height * 1.2, storm.longitude), storm)).toBe(false)
      expect(inStorm(onMap(-storm.latitude, storm.longitude), storm)).toBe(false)
    }
  })

  it('tests the place tasks: the south pole of Vesta, Occator on Ceres and the rings of Saturn and Uranus', () => {
    expect(searchDone('vesta', probe({ up: unit(0.3, -0.95, 0) }))).toBe(true)
    expect(searchDone('vesta', probe({ up: unit(0.3, -0.95, 0), near: false }))).toBe(false)
    expect(searchDone('vesta', probe({ up: unit(1, -0.6, 0) }))).toBe(false)
    const occator = { x: OCCATOR[0], y: OCCATOR[1], z: OCCATOR[2] }
    expect(searchDone('ceres', probe({ up: occator }))).toBe(true)
    expect(searchDone('ceres', probe({ up: unit(OCCATOR[0] + 0.2, OCCATOR[1], OCCATOR[2]) }))).toBe(false)
    // Saturn, radius 100: 160 m from the centre, in the ring plane and 30 m above it.
    expect(searchDone('saturn', probe({ altitude: 60, up: unit(1, 0, 0) }))).toBe(true)
    expect(searchDone('saturn', probe({ altitude: 60, up: unit(160, 30, 0) }))).toBe(true)
    expect(searchDone('saturn', probe({ altitude: 60, up: unit(160, 50, 0) }))).toBe(false)
    expect(searchDone('saturn', probe({ altitude: 10, up: unit(1, 0, 0) }))).toBe(false)
    expect(searchDone('saturn', probe({ altitude: 150, up: unit(0, 0, 1) }))).toBe(false)
    // Uranus: its thin rings are 1.64 to 2 radii from the centre. Saturn has rings at 1.4 radii, Uranus has none there.
    expect(searchDone('uranus', probe({ altitude: 80, up: unit(0, 0, 1) }))).toBe(true)
    expect(searchDone('uranus', probe({ altitude: 80, up: unit(180, 50, 0) }))).toBe(false)
    expect(searchDone('uranus', probe({ altitude: 40, up: unit(1, 0, 0) }))).toBe(false)
    expect(searchDone('saturn', probe({ altitude: 40, up: unit(1, 0, 0) }))).toBe(true)
    expect(searchDone('uranus', probe({ altitude: 10 }))).toBe(false)
  })

  it('tests the soda bubbles of Blossom Haven', () => {
    expect(searchDone('fairy', probe({ bubble: 1 }))).toBe(true)
    expect(searchDone('fairy', probe({ bubble: SEARCH.bubble + 0.5 }))).toBe(false)
    // The unicorn of the first task is no find now, and no task asks for a creature.
    expect(searchDone('fairy', probe({ creatures: { unicorn: 2 } }))).toBe(false)
    expect(SEARCH_CREATURE).toEqual({})
    // The probe reads the places of the bubbles, in the frame of a turned world.
    const home = fixture('fairy', 137.5, 30)
    home.group.rotation.set(0.3, 2, 0)
    const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 4, 3), new THREE.MeshBasicMaterial(), 3)
    bubbles.name = 'soda-bubbles'
    const places = [new THREE.Vector3(140, 0, 0), new THREE.Vector3(0, 0, 141), new THREE.Vector3(0, -139, 0)]
    places.forEach((place, i) => bubbles.setMatrixAt(i, new THREE.Matrix4().makeTranslation(place)))
    home.surface.add(bubbles)
    home.group.updateMatrixWorld(true)
    const fairy = home.surface.localToWorld(places[1].clone().add(new THREE.Vector3(0.6, 0.8, 0)))
    const result = searchProbe(home, fairy, true)
    expect(result.bubble).toBeCloseTo(1, 5)
    expect(searchDone('fairy', result)).toBe(true)
    expect(searchProbe(home, home.surface.localToWorld(new THREE.Vector3(0, 150, 0)), true).bubble).toBeGreaterThan(100)
    expect(searchProbe(fixture('fairy', 137.5), fairy, true).bubble).toBe(Infinity)
  })

  it('tests the terrain task: a dark sea on the Moon, low', () => {
    const sea = { height: -1, land: 0, river: 0, detail: 0, mare: 0.9 }
    expect(searchDone('moon', probe({ clearance: 10, ground: sea }))).toBe(true)
    expect(searchDone('moon', probe({ clearance: 30, ground: sea }))).toBe(false)
    expect(searchDone('moon', probe({ clearance: 10, ground: { ...sea, mare: 0.3 } }))).toBe(false)
  })

  it('finds dark seas on the Moon in the terrain', () => {
    // Enough of the ground passes, so a child finds a place in free flight.
    for (const seed of [1, 2, 3]) {
      const sample = createTerrain('moon', seed)
      let hits = 0
      const count = 4000
      for (let i = 0; i < count; i++) {
        const y = 1 - 2 * (i + 0.5) / count, r = Math.sqrt(1 - y * y), angle = i * 2.399963
        if ((sample(r * Math.cos(angle), y, r * Math.sin(angle)).mare ?? 0) > SEARCH.mare) hits++
      }
      expect(hits / count, `moon ${seed}`).toBeGreaterThan(0.03)
    }
  })

  it('measures the place of the fairy in the local frame of a turned world', () => {
    const vesta = fixture('vesta', 50)
    vesta.group.rotation.set(0.4, 1.2, 0)
    vesta.group.updateMatrixWorld()
    const south = new THREE.Vector3(0.1, -1, 0.05).normalize()
    const position = south.clone().applyQuaternion(vesta.group.quaternion).multiplyScalar(70).add(vesta.group.position)
    const result = searchProbe(vesta, position, true)
    expect(result.up.y).toBeCloseTo(south.y, 6)
    expect(result.altitude).toBeCloseTo(20, 6)
    expect(result.clearance).toBeGreaterThan(result.altitude)
    expect(searchDone('vesta', result)).toBe(true)
  })

  it('gives the rainbow only on Earth, and counts the lap only on Venus', () => {
    const earth = fixture('earth', 220, 34), mars = fixture('mars', 145)
    const over = (world: World) => world.group.position.clone().add(new THREE.Vector3(0, world.radius + 20, 0))
    expect(searchProbe(earth, over(earth), true, { rainbow: 0.6 }).rainbow).toBe(0.6)
    expect(searchProbe(mars, over(mars), true, { rainbow: 0.6 }).rainbow).toBe(0)
    expect(searchProbe(mars, over(mars), true).lap).toBe(false)
    // A lap of Venus, in its air, in steps of 3°.
    const venus = { ...fixture('venus', 212, 60), atmosphere: 119 }
    let laps = 0
    for (let i = 0; i <= 120; i++) {
      const angle = i * 3 * RADIANS
      const done = searchProbe(venus, new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(260).add(venus.group.position), true).lap
      if (done) { laps++; expect(i).toBeGreaterThan(108) }
    }
    expect(laps).toBeGreaterThan(0)
    // Above the air there is no lap.
    for (let i = 0; i <= 120; i++) {
      const angle = i * 3 * RADIANS
      expect(searchProbe(venus, new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(400).add(venus.group.position), true).lap).toBe(false)
    }
  })

  it('measures the nearest creature that shows', () => {
    const earth = fixture('earth', 220, 34)
    const group = new THREE.Group()
    const duck = (name: string, x: number, visible = true) => {
      const model = new THREE.Group(); model.name = name; model.userData.species = 'duck'; model.position.set(x, 220, 0); model.visible = visible
      group.add(model); return model
    }
    duck('far', 30); const near = duck('near', 8); duck('hidden', 1, false)
    earth.group.add(group)
    earth.creatures = { group } as World['creatures']
    earth.group.updateMatrixWorld(true)
    const fairy = earth.group.position.clone().add(new THREE.Vector3(0, 224, 0))
    const result = searchProbe(earth, fairy, true)
    expect(result.creatures.duck).toBeCloseTo(Math.hypot(8, 4), 6)
    expect(nearestCreature(earth, fairy, 'duck')).toBe(near)
    expect(nearestCreature(earth, fairy, 'unicorn')).toBeNull()
  })
})
