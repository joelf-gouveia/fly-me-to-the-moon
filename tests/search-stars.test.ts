import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { nearestCreature, searchProbe } from '../src/search-stars'
import { emptyBook, find, parseBook, SEARCH, SEARCH_CREATURE, searchDone, searching, STICKERS } from '../src/stickers'
import type { SearchProbe, StickerId } from '../src/stickers'
import { createTerrain, OCCATOR } from '../src/terrain'
import type { World } from '../src/worlds'

function fixture(kind: World['kind'], radius: number, cloudHeight = 0): World {
  const group = new THREE.Group(); group.position.set(100, 20, -50)
  return { name: kind, kind, radius, atmosphere: 0, cloudHeight, color: 0, sky: new THREE.Color(), group, surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain(kind === 'sun' ? 'mercury' : kind, 7), seed: 7, visit: 1, armed: false, gas: false }
}
/** A probe with nothing found: high over flat ground at the equator. */
const probe = (change: Partial<SearchProbe> = {}): SearchProbe => ({
  near: true, altitude: 200, clearance: 200, radius: 100, cloudHeight: 40, up: { x: 1, y: 0, z: 0 },
  ground: { height: 0, land: 0, river: 0, detail: 0 }, creatures: {}, ...change,
})
const unit = (x: number, y: number, z: number) => { const length = Math.hypot(x, y, z); return { x: x / length, y: y / length, z: z / length } }

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

  it('tests the altitude tasks', () => {
    expect(searchDone('sun', probe({ altitude: SEARCH.sun - 1 }))).toBe(true)
    expect(searchDone('sun', probe({ altitude: SEARCH.sun + 1 }))).toBe(false)
    for (const id of ['venus', 'jupiter', 'uranus', 'neptune'] as StickerId[]) {
      expect(searchDone(id, probe({ altitude: 39 }))).toBe(true)
      expect(searchDone(id, probe({ altitude: 41 }))).toBe(false)
    }
    expect(searchDone('mars', probe({ clearance: 7, altitude: 9 }))).toBe(true)
    expect(searchDone('mars', probe({ clearance: 9, altitude: 7 }))).toBe(false)
  })

  it('tests the place tasks: the south pole of Vesta, Occator on Ceres and the rings of Saturn', () => {
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
  })

  it('tests the creature tasks: a duck on Earth and a unicorn on Blossom Haven', () => {
    expect(SEARCH_CREATURE).toEqual({ earth: 'duck', fairy: 'unicorn' })
    expect(searchDone('earth', probe({ creatures: { duck: 11.5 } }))).toBe(true)
    expect(searchDone('earth', probe({ creatures: { duck: 13, cow: 2 } }))).toBe(false)
    expect(searchDone('fairy', probe({ creatures: { unicorn: 6 } }))).toBe(true)
    // The Frog Prince floats where the ducks of Earth paddle. He is not a unicorn.
    expect(searchDone('fairy', probe({ creatures: { frogPrince: 2 } }))).toBe(false)
  })

  it('tests the terrain tasks: a crater on Mercury and a dark sea on the Moon, both low', () => {
    const crater = { height: -2, land: 0, river: 0, detail: 0, crater: 0.8 }
    expect(searchDone('mercury', probe({ clearance: 10, ground: crater }))).toBe(true)
    expect(searchDone('mercury', probe({ clearance: 30, ground: crater }))).toBe(false)
    expect(searchDone('mercury', probe({ clearance: 10, ground: { ...crater, crater: 0.2 } }))).toBe(false)
    const sea = { height: -1, land: 0, river: 0, detail: 0, mare: 0.9 }
    expect(searchDone('moon', probe({ clearance: 10, ground: sea }))).toBe(true)
    expect(searchDone('moon', probe({ clearance: 10, ground: { ...sea, mare: 0.3 } }))).toBe(false)
  })

  it('finds deep craters on Mercury and dark seas on the Moon in the terrain', () => {
    // Enough of the ground passes, so a child finds a place in free flight.
    for (const [kind, key, limit] of [['mercury', 'crater', SEARCH.crater], ['moon', 'mare', SEARCH.mare]] as const) {
      for (const seed of [1, 2, 3]) {
        const sample = createTerrain(kind, seed)
        let hits = 0
        const count = 4000
        for (let i = 0; i < count; i++) {
          const y = 1 - 2 * (i + 0.5) / count, r = Math.sqrt(1 - y * y), angle = i * 2.399963
          if ((sample(r * Math.cos(angle), y, r * Math.sin(angle))[key] ?? 0) > limit) hits++
        }
        expect(hits / count, `${kind} ${seed}`).toBeGreaterThan(0.03)
      }
    }
    // Only the cratered worlds have a crater value.
    expect(createTerrain('earth', 1)(0, 1, 0).crater).toBeUndefined()
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
    expect(searchDone('earth', result)).toBe(true)
    expect(nearestCreature(earth, fairy, 'duck')).toBe(near)
    expect(nearestCreature(earth, fairy, 'unicorn')).toBeNull()
  })
})
