import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  buildMagicPlants, createMagicUniforms, MAGIC_CHANGE_SECONDS, MAGIC_PLANTS, MAGIC_SEASONS, MAGIC_SPREAD, MAGIC_STEP, magicAt, magicOffset,
  setMagic, stepMagicYear,
} from '../src/magic-seasons'
import { CreatureObstacles } from '../src/creatures/spherical'
import { HOME_MOVE_SECONDS } from '../src/relocation'
import { createTerrain, HOME_SEED } from '../src/terrain'
import { PROPORTIONS } from '../src/proportions'
import type { World } from '../src/worlds'

/** Blossom Haven with its surface group and its season uniforms: the parts that the planting reads. */
function home(mobile = false) {
  return { kind: 'fairy', radius: 110 * PROPORTIONS.size, seed: HOME_SEED, sample: createTerrain('fairy', HOME_SEED), surface: new THREE.Group(), magic: createMagicUniforms(), mobile } as unknown as World
}

describe('the magic seasons of Blossom Haven', () => {
  it('has four seasons, each with a name, plants and a thing in the air', () => {
    expect(MAGIC_SEASONS.map(season => season.id)).toEqual(['blossom', 'bubble', 'lantern', 'crystal'])
    expect(new Set(MAGIC_SEASONS.map(season => season.air)).size).toBe(4)
    expect(new Set(MAGIC_SEASONS.map(season => season.ground)).size).toBe(4)
    expect(MAGIC_PLANTS).toHaveLength(MAGIC_SEASONS.length)
    for (const plantings of MAGIC_PLANTS) expect(plantings.length).toBeGreaterThan(0)
  })

  it('starts each season at the cottage, in the order of the list', () => {
    expect(magicOffset(-1)).toBeCloseTo(0)
    MAGIC_SEASONS.forEach((season, index) => {
      const at = magicAt(-1, index * MAGIC_STEP)
      expect(at.season).toBe(season)
      expect(at.full).toBeCloseTo(1)
    })
    expect(magicAt(-1, 1).season.id).toBe('blossom')
  })

  it('goes out in a ring: the far side gets a season three seasons later', () => {
    expect(magicOffset(1)).toBeCloseTo(MAGIC_SPREAD)
    expect(magicOffset(0)).toBeCloseTo(MAGIC_SPREAD / 2)
    // At the start of a visit the cottage has Blossom time and the far side has Bubble time.
    expect(magicAt(1, 0).season.id).toBe('bubble')
    expect(magicAt(1, 0.75).season.id).toBe('blossom')
    // At one moment the planet shows more than one season.
    expect(new Set([-1, -0.5, 0, 0.5, 1].map(y => magicAt(y, 0.5).index)).size).toBeGreaterThan(1)
  })

  it('is half full at a change of season', () => {
    expect(magicAt(-1, MAGIC_STEP / 2).full).toBeCloseTo(0)
  })
})

describe('the clock of the magic year', () => {
  it('goes one season in 20 s and stops at the target', () => {
    let year = 0
    for (let i = 0; i < MAGIC_CHANGE_SECONDS * 30; i++) year = stepMagicYear(year, MAGIC_STEP, 1 / 30)
    expect(year).toBeCloseTo(MAGIC_STEP)
    expect(stepMagicYear(year, MAGIC_STEP, 5)).toBeCloseTo(MAGIC_STEP)
    expect(stepMagicYear(0, MAGIC_STEP, MAGIC_CHANGE_SECONDS / 2)).toBeCloseTo(MAGIC_STEP / 2)
  })

  it('does not move in a pause, and stays with no hop', () => {
    expect(stepMagicYear(0.1, 0.25, 0)).toBe(0.1)
    expect(stepMagicYear(0.25, 0.25, 1)).toBe(0.25)
  })

  it('makes a year of 20 minutes: four hops of 5 minutes', () => {
    expect(HOME_MOVE_SECONDS / MAGIC_STEP).toBe(20 * 60)
    expect(MAGIC_CHANGE_SECONDS).toBeLessThan(HOME_MOVE_SECONDS)
  })
})

describe('the season uniforms', () => {
  it('start with no season, and take the magic year', () => {
    const uniforms = createMagicUniforms()
    expect(uniforms.magicOn.value).toBe(0)
    setMagic(uniforms, 0.3)
    expect(uniforms.magicOn.value).toBe(1)
    expect(uniforms.magicYear.value).toBe(0.3)
  })
})

describe('the season plants', () => {
  it('makes one mesh for each kind, on dry ground and away from the cottage', () => {
    const world = home()
    const meshes = buildMagicPlants(world, new CreatureObstacles())
    expect(meshes.map(mesh => mesh.name)).toEqual(['magic-blossom-blossomTree', 'magic-blossom-giantFlower', 'magic-bubble-bubble', 'magic-lantern-toadstool', 'magic-crystal-crystal'])
    expect(world.surface.children).toHaveLength(5)
    const matrix = new THREE.Matrix4(), normal = new THREE.Vector3()
    for (const mesh of meshes) {
      expect(mesh.count).toBeGreaterThan(300)
      for (let i = 0; i < mesh.count; i += 7) {
        mesh.getMatrixAt(i, matrix)
        normal.setFromMatrixPosition(matrix).normalize()
        const sample = world.sample(normal.x, normal.y, normal.z)
        expect(sample.height).toBeGreaterThanOrEqual(1)
        expect(sample.river).toBeLessThanOrEqual(0.1)
        if (normal.y < 0) expect(Math.hypot(normal.x, normal.z)).toBeGreaterThanOrEqual(0.09)
      }
    }
  })

  it('keeps a season plant out of a plant of the gardens and off the path of a creature', () => {
    const free = buildMagicPlants(home(), new CreatureObstacles())
    // One large plant of a garden and one creature path, each at the place of a season plant.
    const matrix = new THREE.Matrix4()
    const taken = new THREE.Vector3(), path = new THREE.Vector3()
    free[0].getMatrixAt(0, matrix); taken.setFromMatrixPosition(matrix).normalize()
    free[2].getMatrixAt(0, matrix); path.setFromMatrixPosition(matrix).normalize()
    const obstacles = new CreatureObstacles(), world = home()
    obstacles.add(taken, world.radius, 4)
    const meshes = buildMagicPlants(world, obstacles, [path])
    const normal = new THREE.Vector3()
    for (const mesh of meshes) for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix)
      normal.setFromMatrixPosition(matrix).normalize()
      expect(normal.distanceTo(taken) * world.radius).toBeGreaterThan(4)
      expect(normal.distanceTo(path) * world.radius).toBeGreaterThan(2.5)
    }
  })

  it('gives a phone half of the plants', () => {
    const full = buildMagicPlants(home(), new CreatureObstacles()), half = buildMagicPlants(home(true), new CreatureObstacles())
    full.forEach((mesh, index) => expect(half[index].count).toBeLessThanOrEqual(Math.ceil(mesh.count / 2) + 1))
  })

  it('makes the same plants at each start', () => {
    const first = buildMagicPlants(home(), new CreatureObstacles()), second = buildMagicPlants(home(), new CreatureObstacles())
    first.forEach((mesh, index) => expect(Array.from(mesh.instanceMatrix.array.slice(0, 160))).toEqual(Array.from(second[index].instanceMatrix.array.slice(0, 160))))
  })
})
