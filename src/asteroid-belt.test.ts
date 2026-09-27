import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createAsteroidBelt } from './asteroid-belt'
import { auToGame, BELT, BELT_LAYERS, dwarfPosition, DWARF_WORLDS, NEAR_CELLS, sampleBeltPoint, touchesBelt } from './belt'
import { createPlanetaryOrbits } from './orbits'
import { createTerrain, groundHeight, seededRandom } from './terrain'
import type { World } from './worlds'

function fixture(kind: World['kind'], radius: number, orbit: number, angle: number): World {
  const group = new THREE.Group(); group.position.set(Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit)
  return { name: kind, kind, radius, atmosphere: 0, cloudHeight: 0, color: 0, sky: new THREE.Color(), group, surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain(kind === 'sun' ? 'mercury' : kind, 1), seed: 1, visit: 1, armed: false, gas: false }
}

function camera(position: THREE.Vector3) {
  const view = new THREE.PerspectiveCamera(58, 1.6, 0.08, 80000)
  view.position.copy(position)
  return view
}

describe('asteroid belt in the game', () => {
  it('turns with the planets, so Ceres and Vesta stay in their place in the belt', () => {
    const scene = new THREE.Scene()
    const dwarfs = DWARF_WORLDS.map(world => fixture(world.id, world.radius, auToGame(world.au), world.angle))
    const orbits = createPlanetaryOrbits(scene, [fixture('sun', 600, 0, 0), ...dwarfs])
    const belt = createAsteroidBelt(scene)
    for (const seconds of [0, 700, 2400.5]) {
      orbits.update(seconds - orbits.elapsed)
      belt.update(orbits.elapsed, camera(new THREE.Vector3(0, 9000, 0)), new THREE.Vector3(), 0, 800)
      DWARF_WORLDS.forEach((world, index) => {
        const centre = dwarfPosition(world)
        const expected = belt.group.localToWorld(new THREE.Vector3(centre.x, centre.y, centre.z))
        expect(dwarfs[index].group.position.distanceTo(expected)).toBeLessThan(1e-6)
      })
    }
  })

  it('draws rocks only near a camera in the belt, never into the camera or the fairy', () => {
    const scene = new THREE.Scene(), belt = createAsteroidBelt(scene)
    belt.update(0, camera(new THREE.Vector3(0, 9000, 0)), new THREE.Vector3(0, 9000, 0), 0, 800)
    expect(belt.stats.rocks).toBe(0)

    const random = seededRandom(5)
    for (let i = 0; i < 12; i++) {
      const p = sampleBeltPoint(random, 0.3), fairy = new THREE.Vector3(p.x, p.y, p.z)
      const view = camera(fairy.clone().add(new THREE.Vector3(0, 2.8, 8)))
      belt.update(i * 90, view, fairy, i, 800)
      const local = (point: THREE.Vector3) => belt.group.worldToLocal(point.clone())
      const fairyLocal = local(fairy), cameraLocal = local(view.position)
      const matrix = new THREE.Matrix4(), centre = new THREE.Vector3(), scale = new THREE.Vector3(), quaternion = new THREE.Quaternion()
      let drawn = 0
      for (const mesh of belt.group.children.filter(child => child instanceof THREE.InstancedMesh)) {
        for (let j = 0; j < mesh.count; j++) {
          mesh.getMatrixAt(j, matrix); matrix.decompose(centre, quaternion, scale)
          const reach = scale.x * belt.stats.extent
          expect(centre.distanceTo(fairyLocal)).toBeGreaterThan(reach)
          expect(centre.distanceTo(cameraLocal)).toBeGreaterThan(reach)
          drawn++
        }
      }
      expect(drawn).toBe(belt.stats.rocks)
      expect(drawn).toBeLessThanOrEqual(belt.stats.capacity)
    }
    expect(belt.stats.rocks).toBeGreaterThan(0)
  })

  it('draws half of the dust and rocks on a phone', () => {
    const desktop = createAsteroidBelt(new THREE.Scene()), phone = createAsteroidBelt(new THREE.Scene(), true)
    expect(desktop.stats.dust).toBe(BELT_LAYERS.desktop.dust)
    expect(phone.stats.dust).toBe(desktop.stats.dust / 2)
    expect(phone.stats.capacity).toBe(BELT_LAYERS.phone.perCell * NEAR_CELLS)
    expect(phone.stats.capacity).toBe(desktop.stats.capacity / 2)
  })

  it('keeps Ceres round and gives Vesta its south-pole basin', () => {
    const ceres = createTerrain('ceres', 3), vesta = createTerrain('vesta', 3)
    const random = seededRandom(9), direction = new THREE.Vector3()
    let highest = 0
    for (let i = 0; i < 2000; i++) {
      direction.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize()
      highest = Math.max(highest, Math.abs(groundHeight('ceres', ceres(direction.x, direction.y, direction.z))))
    }
    expect(highest).toBeLessThan(26 * 0.1)
    expect(vesta(0, -1, 0).height).toBeLessThan(vesta(0, 1, 0).height - 2)
  })

  it('calls every point of the belt volume the belt, in world and belt coordinates', () => {
    expect(touchesBelt({ x: 0, y: 0, z: -(BELT.inner + BELT.outer) / 2 })).toBe(true)
    expect(touchesBelt({ x: BELT.inner - 1, y: 0, z: 0 })).toBe(false)
    expect(touchesBelt({ x: BELT.inner + 1, y: BELT.halfHeight + 1, z: 0 })).toBe(false)
  })
})
