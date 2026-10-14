import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createTerrain, HOME_SEED } from '../../src/terrain'
import { regenerateWorld, meadowNormal } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { CreatureObstacles, offsetNormal, populateSphere, sampleResident, SphericalHabitat } from '../../src/creatures/spherical'
import { speciesById } from '../../src/creatures/catalog'
import { species } from '../../src/creatures/habitat'
import type { Species } from '../../src/creatures/habitat'
import { createPopulation } from '../../src/creatures/population'

function groundMesh(height: (normal: THREE.Vector3) => number, radius = 220) {
  const geometry = new THREE.SphereGeometry(1, 512, 256), n = new THREE.Vector3()
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    n.fromBufferAttribute(position, i).normalize().multiplyScalar(radius + height(n))
    position.setXYZ(i, n.x, n.y, n.z)
  }
  geometry.computeBoundingSphere()
  return geometry
}

function worldFixture(kind: 'earth' | 'fairy' | 'mars', seed: number): World {
  const group = new THREE.Group(), surface = new THREE.Group(), clouds = new THREE.Group()
  group.add(surface, clouds)
  return { name: kind, kind, radius: kind === 'fairy' ? 190 : 220, atmosphere: 70, cloudHeight: 0,
    color: 0xffffff, sky: new THREE.Color(), group, surface, clouds, sample: createTerrain(kind, seed),
    seed, visit: 0, armed: false, gas: false }
}

describe('in-game spherical creatures', () => {
  it('draws at most the cap of animals, with a marker for each near animal, on a computer and on a phone', () => {
    for (const mobile of [false, true]) for (const fairy of [false, true]) {
      const radius = fairy ? 137.5 : 275, kind = fairy ? 'fairy' as const : 'earth' as const, seed = fairy ? HOME_SEED : 44
      const sample = createTerrain(kind, seed)
      const geometry = groundMesh(n => sample(n.x, n.y, n.z).height, radius)
      const water = new THREE.SphereGeometry(radius, 64, 32)
      const population = createPopulation(new THREE.Group(), geometry, water, { kind, radius, seed, sample, mobile },
        new CreatureObstacles(), 123, new THREE.Vector3(1, 0, 0.3).normalize())
      expect(population.residents.length).toBeGreaterThan(fairy ? 150 : 1500)
      for (const item of population.herds.flatMap(herd => herd.members.map(() => herd))) expect(item.species.world).toBe(kind)
      // From 60 m over a place, each herd in reach is drawn, up to the cap and the limit of the draw calls.
      for (const herd of population.herds.slice(0, 40)) {
        population.update(0.1, herd.route[0].clone().multiplyScalar(radius + 60))
        const stats = population.stats()
        expect(stats.drawn).toBeLessThanOrEqual(population.limits.cap)
        expect(stats.batches).toBeLessThanOrEqual(population.limits.calls)
        expect(population.group.children.filter(model => model.visible).length).toBe(stats.near)
      }
      population.dispose(); geometry.dispose(); water.dispose()
    }
  })

  it('places feet on rendered triangles, including the longitude seam and poles', () => {
    const geometry = groundMesh(n => 3 + n.z * 2), habitat = new SphericalHabitat(geometry, 220)
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    const raycaster = new THREE.Raycaster()
    for (const n of [new THREE.Vector3(1, 0.2, 0.1), new THREE.Vector3(-1, 0.3, 0.00001), new THREE.Vector3(-1, 0.3, -0.00001), new THREE.Vector3(0.001, 1, 0), new THREE.Vector3(0, -1, 0.001)]) {
      n.normalize(); raycaster.set(new THREE.Vector3(), n)
      const hit = raycaster.intersectObject(mesh)[0]
      expect(hit).toBeDefined()
      expect(habitat.radiusAt(n)).toBeCloseTo(hit.distance, 5)
    }
    geometry.dispose(); mesh.material.dispose()
  })

  it('rejects a narrow river between valid endpoints, and checks full cow clearance', () => {
    const geometry = groundMesh(n => Math.abs(n.z) < 0.007 ? -2 : 3)
    const ground = new SphericalHabitat(geometry, 220)
    const a = new THREE.Vector3(1, 0, -0.03).normalize(), b = new THREE.Vector3(1, 0, 0.03).normalize()
    expect(ground.safeSegment('cow', a, a)).toBe(true)
    expect(ground.safeSegment('cow', b, b)).toBe(true)
    expect(ground.safeSegment('cow', a, b)).toBe(false)
    const obstacles = new CreatureObstacles()
    obstacles.add(a, 220, 1)
    expect(obstacles.clearSegment(a, b, 220, species.cow.footprint)).toBe(false)
    geometry.dispose()
  })

  for (const kind of ['earth', 'fairy'] as const) {
    it(`keeps all four species in their habitats through spherical routes on ${kind}`, () => {
      for (const seed of [11, 987, HOME_SEED]) {
        const terrain = createTerrain(kind, seed), radius = kind === 'earth' ? 220 : 190
        const geometry = groundMesh(n => terrain(n.x, n.y, n.z).height, radius)
        const ground = new SphericalHabitat(geometry, radius), obstacles = new CreatureObstacles()
        obstacles.add(new THREE.Vector3(0, -1, 0), radius, 12)
        const residents = populateSphere(ground, obstacles, seed, new THREE.Vector3(1, 0, 0), 8)
        expect(new Set(residents.map(r => r.kind)).size).toBe(4)
        const normal = new THREE.Vector3(), forward = new THREE.Vector3()
        for (const resident of residents) {
          const kind = resident.kind as Species
          for (let i = 1; i < resident.route.length; i++) {
            expect(ground.safeSegment(kind, resident.route[i - 1], resident.route[i])).toBe(true)
            expect(obstacles.clearSegment(resident.route[i - 1], resident.route[i], radius, species[kind].footprint)).toBe(true)
          }
          for (let t = 0; t < 120; t += 1.7) {
            sampleResident(resident, t, normal, forward)
            expect(normal.length()).toBeCloseTo(1)
            expect(normal.dot(forward)).toBeCloseTo(0)
            for (let i = 0; i < 8; i++) {
              const bodyEdge = offsetNormal(normal, i * Math.PI / 4, species[kind].footprint, radius)
              const h = ground.radiusAt(bodyEdge) - radius
              if (resident.kind === 'duck') expect(h).toBeLessThan(-0.4)
              else expect(h).toBeGreaterThan(0.4)
            }
          }
        }
        geometry.dispose()
      }
    })
  }

  it('integrates regeneration, pause, distance culling and persistent home relocation', () => {
    const earth = worldFixture('earth', 44)
    regenerateWorld(earth, 44)
    const original = earth.creatures!
    expect(original.residents.length).toBeGreaterThan(50)
    const camera = meadowNormal(earth).multiplyScalar(earth.radius + 12)
    original.update(0, camera)
    // The markers of the near animals: Earth has no fairytale creature.
    const shown = () => original.group.children.filter(child => child.visible)
    expect(shown().length).toBeGreaterThan(0)
    expect(shown().every(child => !child.userData.fairytale)).toBe(true)
    const before = shown().map(child => child.position.toArray())
    original.update(0, camera)
    expect(shown().map(child => child.position.toArray())).toEqual(before)
    original.update(5, camera)
    expect(shown().map(child => child.position.toArray())).not.toEqual(before)
    original.update(0, new THREE.Vector3(10000, 0, 0))
    expect(shown().length).toBe(0)
    expect(original.stats().drawn).toBe(0)
    regenerateWorld(earth, 45)
    expect(original.group.parent).toBeNull()
    expect(earth.creatures).not.toBe(original)
    expect(earth.creatures!.residents[0].route).not.toEqual(original.residents[0].route)

    const home = worldFixture('fairy', HOME_SEED)
    regenerateWorld(home)
    const homePopulation = home.creatures!
    const homeCamera = new THREE.Vector3(0, -205, -20)
    homePopulation.update(0, homeCamera)
    const homeShown = () => homePopulation.group.children.filter(child => child.visible)
    expect(homeShown().length).toBeGreaterThan(0)
    // Blossom Haven shows only its own creatures.
    for (const child of homeShown()) expect(speciesById(child.userData.fairytale).world).toBe('fairy')
    const localPositions = homeShown().map(child => child.position.toArray())
    const translation = new THREE.Vector3(4100, 500, 800)
    home.group.position.add(translation); homeCamera.add(translation)
    homePopulation.update(0, homeCamera)
    expect(homeShown().map(child => child.position.toArray())).toEqual(localPositions)
    regenerateWorld(home, 999)
    expect(home.creatures).toBe(homePopulation)
    const mars = worldFixture('mars', 99)
    regenerateWorld(mars, 99)
    expect(mars.creatures).toBeUndefined()
  })
})
