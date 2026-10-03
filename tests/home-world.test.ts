import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain, groundHeight, HOME_CLEARING_HEIGHT, HOME_SEED } from '../src/terrain'
import { HOME_START_POSITION, homeCottageNormal, homeCottagePosition, regenerateWorld, surfaceRadius } from '../src/worlds'
import { homeMarkerPosition } from '../src/journey'
import { PROPORTIONS } from '../src/proportions'
import type { World } from '../src/worlds'

function homeFixture(): World {
  const group = new THREE.Group(), surface = new THREE.Group(), clouds = new THREE.Group()
  group.position.set(...HOME_START_POSITION)
  group.add(surface, clouds)
  return {
    // The game sizes: base sizes at the proportions of src/proportions.ts.
    name: 'Blossom Haven', kind: 'fairy', radius: 110 * PROPORTIONS.size, atmosphere: 52 * PROPORTIONS.size, cloudHeight: 24 * PROPORTIONS.size,
    color: 0xf3acd1, sky: new THREE.Color(0xe7b6e8), group, surface, clouds,
    sample: createTerrain('fairy', HOME_SEED), seed: HOME_SEED, visit: 0, armed: false, gas: false,
  }
}

describe('Blossom Haven', () => {
  it('starts far from Earth with the flower anchored above the cottage on its own planet', () => {
    const home = homeFixture()
    const earthOrbit = 3300 * PROPORTIONS.spacing
    const earth = new THREE.Vector3(Math.cos(0.08) * earthOrbit, 0, Math.sin(0.08) * earthOrbit)
    expect(home.group.position.distanceTo(earth)).toBeGreaterThan(10000 * PROPORTIONS.spacing)
    const marker = homeMarkerPosition(home)
    expect(marker.distanceTo(homeCottagePosition(home))).toBeCloseTo(8)
    expect(marker.distanceTo(home.group.position)).toBeCloseTo(home.radius + HOME_CLEARING_HEIGHT + 8)
    expect(marker.distanceTo(earth)).toBeGreaterThan(10000 * PROPORTIONS.spacing)
  })
  it('has reproducible gentle meadows, seas and rivers with water-safe collision', () => {
    const sample = createTerrain('fairy', HOME_SEED)
    const repeat = createTerrain('fairy', HOME_SEED)
    let meadow = 0, water = 0, river = 0
    for (let i = 0; i < 4000; i++) {
      const y = 1 - (i + 0.5) / 2000, angle = i * 2.399963
      const x = Math.sqrt(1 - y * y) * Math.cos(angle), z = Math.sqrt(1 - y * y) * Math.sin(angle)
      const value = sample(x, y, z)
      expect(value).toEqual(repeat(x, y, z))
      expect(groundHeight('fairy', value)).toBeGreaterThanOrEqual(0)
      expect(value.height).toBeLessThan(11)
      if (value.height > 1 && value.height < 5) meadow++
      if (value.height < 0) water++
      if (value.land > 2 && value.height < 0 && value.river > 0.8) river++
    }
    expect(meadow).toBeGreaterThan(100)
    expect(water).toBeGreaterThan(100)
    expect(river).toBeGreaterThan(10)
  })

  it('keeps a dry south-pole cottage clearing with matching surface targets', () => {
    const world = homeFixture()
    for (const x of [0, 0.02, 0.06, 0.1]) {
      const value = world.sample(x, -Math.sqrt(1 - x * x), 0)
      expect(value.height).toBeCloseTo(HOME_CLEARING_HEIGHT)
      expect(value.river).toBe(0)
    }
    expect(surfaceRadius(world, homeCottageNormal())).toBe(140.5)
    expect(homeCottagePosition(world).toArray()).toEqual([25000, 2859.5, 22500])
    expect(homeCottagePosition(world, 20).toArray()).toEqual([25000, 2839.5, 22500])
  })

  it('builds its flower cottage once and preserves the same home on later visits', () => {
    const world = homeFixture()
    regenerateWorld(world, 999)
    expect(world.seed).toBe(HOME_SEED)
    expect(world.visit).toBe(1)
    const cottage = world.surface.getObjectByName('flower-cottage')
    expect(cottage).toBeDefined()
    expect(cottage!.position.toArray()).toEqual([0, -140.5, 0])
    for (const name of ['foliage-lollipop', 'foliage-cane', 'foliage-cottonTree', 'foliage-toadstool', 'foliage-crystal', 'soda-bubbles']) {
      const mesh = world.surface.getObjectByName(name) as THREE.InstancedMesh
      expect(mesh).toBeDefined()
      expect(mesh.count).toBeGreaterThan(0)
    }
    const ground = world.surface.children[0]
    const sample = world.sample
    regenerateWorld(world, 888)
    expect(world.visit).toBe(1)
    expect(world.seed).toBe(HOME_SEED)
    expect(world.sample).toBe(sample)
    expect(world.surface.children[0]).toBe(ground)
    expect(world.surface.getObjectByName('flower-cottage')).toBe(cottage)
  })
})
