import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { HOME_SIZES, homeSizeById, MOON_HOME, moonHomeDistance, moonHomeOffset, planHop, pickHomeSize } from '../src/relocation'
import { createTerrain, seededRandom } from '../src/terrain'
import { HOME_START_POSITION, WORLD_DATA } from '../src/worlds'
import type { World } from '../src/worlds'
import { PROPORTIONS } from '../src/proportions'
import { MOON } from '../src/moon'
import { plan } from '../src/foliage/planting'

/**
 * The hop of Blossom Haven from the wandering home study (docs/wandering-home-study.md): any of ten
 * sizes, and a place around the Sun or as a moon of Earth, Saturn, Uranus or Neptune.
 */
function world(kind: World['kind'], radius: number, atmosphere: number, position: THREE.Vector3): World {
  const group = new THREE.Group(); group.position.copy(position)
  return { name: kind, kind, radius, atmosphere, cloudHeight: 0, color: 0, sky: new THREE.Color(), group, surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain(kind === 'sun' ? 'mercury' : kind, 1), seed: 1, visit: 1, armed: false, gas: false }
}
/** The worlds of the game at their start places, as createWorlds() puts them. */
function system() {
  const worlds = WORLD_DATA.map(([, kind, radius, orbit, angle, , atmosphere]) => world(kind, radius * PROPORTIONS.size, atmosphere * PROPORTIONS.size,
    new THREE.Vector3(Math.cos(angle) * orbit * PROPORTIONS.spacing, 0, Math.sin(angle) * orbit * PROPORTIONS.spacing)))
  const earth = worlds.find(item => item.kind === 'earth')!
  worlds.push(world('moon', MOON.radius, 0, earth.group.position.clone().add(new THREE.Vector3(MOON.orbit, 0, 0))))
  const home = world('fairy', 110 * PROPORTIONS.size, 52 * PROPORTIONS.size, new THREE.Vector3(...HOME_START_POSITION))
  worlds.push(home, world('sun', 600 * PROPORTIONS.sun, 0, new THREE.Vector3()))
  return { worlds, home, byKind: (kind: string) => worlds.find(item => item.kind === kind)! }
}

describe('the sizes of the home', () => {
  it('has ten sizes from Ceres to Jupiter, with the size of today among them', () => {
    expect(HOME_SIZES).toHaveLength(10)
    expect(HOME_SIZES[0].id).toBe('ceres')
    expect(HOME_SIZES.at(-1)!.radius).toBe(470 * PROPORTIONS.size)
    const today = homeSizeById('today')!
    expect([today.radius, today.atmosphere, today.cloudHeight]).toEqual([137.5, 65, 30])
    // A small home keeps room to fly under its clouds.
    expect(HOME_SIZES[0].cloudHeight).toBeGreaterThan(12)
  })
  it('gives any size at a hop, each with the same chance', () => {
    const random = seededRandom(26), counts = new Map<string, number>()
    for (let i = 0; i < 5000; i++) { const size = pickHomeSize(random); counts.set(size.id, (counts.get(size.id) ?? 0) + 1) }
    expect(counts.size).toBe(10)
    for (const count of counts.values()) expect(count).toBeGreaterThan(400)
  })
  it('keeps the plants of a big home at the count of an Earth-size home', () => {
    const count = (radius: number) => plan('H2', { kind: 'fairy', radius, seed: 7, sample: createTerrain('fairy', 7) }).batches.reduce((sum, batch) => sum + batch.count, 0)
    const earthSize = count(220 * PROPORTIONS.size), jupiterSize = count(470 * PROPORTIONS.size)
    expect(jupiterSize / earthSize).toBeGreaterThan(0.8)
    expect(jupiterSize / earthSize).toBeLessThan(1.25)
  })
})

describe('a moon home', () => {
  it('finds the paths of the study table', () => {
    const { worlds, byKind } = system()
    const today = homeSizeById('today')!
    expect(Math.round(moonHomeDistance(byKind('saturn'), today, worlds)!)).toBe(1518)
    expect(Math.round(moonHomeDistance(byKind('earth'), today, worlds)!)).toBe(1532)
    // Earth has room up to the size of Venus; Saturn has room at each size.
    expect(moonHomeDistance(byKind('earth'), homeSizeById('venus')!, worlds)).not.toBeNull()
    expect(moonHomeDistance(byKind('earth'), homeSizeById('earth')!, worlds)).toBeNull()
    for (const size of HOME_SIZES) expect(moonHomeDistance(byKind('saturn'), size, worlds)).not.toBeNull()
    expect(MOON_HOME.hosts).not.toContain('mars')
  })
  it('keeps the path at its distance, and turns its plane with the planet', () => {
    const offset = moonHomeOffset(1500, 1.1, 0.7)
    expect(offset.length()).toBeCloseTo(1500)
    expect(moonHomeOffset(1500, 0, 0).toArray().map(value => Math.round(value))).toEqual([1500, 0, 0])
    // At the angle 0 of the path the home is on the far side of the planet from the Sun.
    const turned = moonHomeOffset(1500, 0, Math.PI / 2)
    expect(turned.x).toBeCloseTo(0)
    expect(turned.z).toBeCloseTo(1500)
  })
})

describe('the plan of a hop', () => {
  it('goes around the Sun or around each planet with room, at random', () => {
    const { worlds, home } = system()
    const random = seededRandom(152), fairy = new THREE.Vector3(-1e6, 0, 0)
    const places = new Map<string, number>()
    for (let i = 0; i < 400; i++) {
      const hop = planHop(home, worlds, fairy, false, random)!
      expect(hop).not.toBeNull()
      const place = hop.host?.kind ?? 'sun'
      places.set(place, (places.get(place) ?? 0) + 1)
      expect(hop.position.distanceTo(home.group.position)).toBeGreaterThanOrEqual(1400 * PROPORTIONS.spacing)
      if (hop.host) expect(hop.position.distanceTo(hop.host.group.position)).toBeCloseTo(hop.distance)
      home.group.position.copy(hop.position)
    }
    expect([...places.keys()].sort()).toEqual(['earth', 'neptune', 'saturn', 'sun', 'uranus'])
    // Each size has room around the Sun, so the Sun gets the most hops.
    expect(places.get('sun')).toBeGreaterThan(places.get('earth')!)
  })
  it('follows the size and the place of a check', () => {
    const { worlds, home } = system()
    const hop = planHop(home, worlds, new THREE.Vector3(-1e6, 0, 0), false, seededRandom(3), { size: 'jupiter', host: 'uranus' })!
    expect(hop.size.id).toBe('jupiter')
    expect(hop.host?.kind).toBe('uranus')
    expect(planHop(home, worlds, new THREE.Vector3(-1e6, 0, 0), false, seededRandom(3), { host: 'sun' })!.host).toBeNull()
  })
})
