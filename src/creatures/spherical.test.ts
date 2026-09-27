import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createTerrain, HOME_SEED } from '../terrain'
import { regenerateWorld, meadowNormal } from '../worlds'
import type { World } from '../worlds'
import { CreatureObstacles, offsetNormal, populateSphere, sampleResident, SphericalHabitat } from './spherical'
import { replacements } from './fairytale'
import { species } from './habitat'
import type { Species } from './habitat'
import { createPopulation } from './population'

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
  it('raises only Earth to 40 per species while retaining spacing and the visible limit', () => {
    for (const fairy of [false, true]) {
      const radius = fairy ? 110 : 220
      const geometry = groundMesh(n => n.z > 0 ? 3 : -2, radius)
      const water = new THREE.SphereGeometry(radius, 64, 32)
      const population = createPopulation(new THREE.Group(), geometry, water, radius, fairy,
        new CreatureObstacles(), 123, new THREE.Vector3(1, 0, 0.3).normalize())
      for (const kind of Object.keys(species)) {
        expect(population.residents.filter(resident => resident.kind === kind)).toHaveLength(fairy ? 32 : 40)
      }
      for (let i = 0; i < population.residents.length; i++) {
        for (let j = i + 1; j < population.residents.length; j++) {
          expect(population.residents[i].route[0].distanceTo(population.residents[j].route[0]) * radius).toBeGreaterThanOrEqual(4)
        }
      }
      population.update(0, new THREE.Vector3(1, 0, 0.3).normalize().multiplyScalar(radius + 10))
      expect(population.group.children.filter(model => model.visible).length).toBeLessThanOrEqual(28)
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
          for (let i = 1; i < resident.route.length; i++) {
            expect(ground.safeSegment(resident.kind, resident.route[i - 1], resident.route[i])).toBe(true)
            expect(obstacles.clearSegment(resident.route[i - 1], resident.route[i], radius, species[resident.kind].footprint)).toBe(true)
          }
          for (let t = 0; t < 120; t += 1.7) {
            sampleResident(resident, t, normal, forward)
            expect(normal.length()).toBeCloseTo(1)
            expect(normal.dot(forward)).toBeCloseTo(0)
            for (let i = 0; i < 8; i++) {
              const bodyEdge = offsetNormal(normal, i * Math.PI / 4, species[resident.kind].footprint, radius)
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
    expect(original.group.children.length).toBeGreaterThan(0)
    expect(original.group.children.every(child => !child.userData.fairytale)).toBe(true)
    const before = original.group.children.map(child => child.position.toArray())
    original.update(0, camera)
    expect(original.group.children.map(child => child.position.toArray())).toEqual(before)
    original.update(5, camera)
    expect(original.group.children.map(child => child.position.toArray())).not.toEqual(before)
    original.update(0, new THREE.Vector3(10000, 0, 0))
    expect(original.group.children.length).toBe(0)
    regenerateWorld(earth, 45)
    expect(original.group.parent).toBeNull()
    expect(earth.creatures).not.toBe(original)
    expect(earth.creatures!.residents[0].route).not.toEqual(original.residents[0].route)

    const home = worldFixture('fairy', HOME_SEED)
    regenerateWorld(home)
    const homePopulation = home.creatures!
    const homeCamera = new THREE.Vector3(0, -205, -20)
    homePopulation.update(0, homeCamera)
    expect(homePopulation.group.children.length).toBeGreaterThan(0)
    // Blossom Haven shows only fairytale creatures, each in the slot of the animal it replaces.
    for (const child of homePopulation.group.children) expect(child.userData.fairytale).toBe(replacements[child.userData.species as Species])
    const localPositions = homePopulation.group.children.map(child => child.position.toArray())
    const translation = new THREE.Vector3(4100, 500, 800)
    home.group.position.add(translation); homeCamera.add(translation)
    homePopulation.update(0, homeCamera)
    expect(homePopulation.group.children.map(child => child.position.toArray())).toEqual(localPositions)
    regenerateWorld(home, 999)
    expect(home.creatures).toBe(homePopulation)
    const mars = worldFixture('mars', 99)
    regenerateWorld(mars, 99)
    expect(mars.creatures).toBeUndefined()
  })
})
