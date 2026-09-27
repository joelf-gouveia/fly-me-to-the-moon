import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { candyTufts, CLEAR_ANGLE, TUFT_REACH } from './cotton-candy'
import { createTerrain, HOME_SEED } from './terrain'
import type { PlanetKind } from './terrain'
import { homeCottageNormal, regenerateWorld } from './worlds'
import type { World } from './worlds'

function world(kind: PlanetKind, mobile = false): World {
  const group = new THREE.Group(), surface = new THREE.Group(), clouds = new THREE.Group()
  group.add(surface, clouds)
  const home = kind === 'fairy'
  return {
    name: kind, kind, radius: home ? 110 : 220, atmosphere: home ? 52 : 78, cloudHeight: home ? 24 : 34,
    color: 0xf3acd1, sky: new THREE.Color(), group, surface, clouds, sample: createTerrain(kind, HOME_SEED),
    seed: HOME_SEED, visit: 0, armed: false, gas: false, mobile,
  }
}

const cloudMesh = (target: World) => target.clouds.children[0] as THREE.InstancedMesh

describe('cotton candy clouds', () => {
  it('gives Blossom Haven one instanced mesh of 300 puffs, and 150 on a phone', () => {
    for (const [mobile, count] of [[false, 300], [true, 150]] as const) {
      const home = world('fairy', mobile)
      regenerateWorld(home)
      const mesh = cloudMesh(home)
      expect(home.clouds.children).toHaveLength(1)
      expect(mesh.name).toBe('cotton-candy-clouds')
      expect(mesh.count).toBe(count)
      expect(mesh.instanceColor).not.toBeNull()
    }
  })

  it('uses a built-in lit material, so the sun shading can patch it', () => {
    const home = world('fairy')
    regenerateWorld(home)
    const material = cloudMesh(home).material as THREE.Material
    expect(material.type).toBe('MeshStandardMaterial')
    expect(material.transparent).toBe(false)
    expect(material.customProgramCacheKey()).toBe('cotton-floss')
  })

  it('keeps the column above the cottage clear and every puff above the terrain', () => {
    const cottage = homeCottageNormal()
    for (const tuft of candyTufts(110, 24, 50, HOME_SEED, cottage)) {
      expect(tuft.normal.angleTo(cottage)).toBeGreaterThan(CLEAR_ANGLE + TUFT_REACH / 134)
      for (const puff of tuft.puffs) {
        expect(puff.up.angleTo(cottage) - Math.max(puff.scale.x, puff.scale.z) / puff.position.length()).toBeGreaterThan(CLEAR_ANGLE)
        // The fairy terrain is at most 8 m high.
        expect(puff.position.length() - 110 - puff.scale.y).toBeGreaterThan(18)
      }
    }
  })

  it('does not change the clouds of other worlds', () => {
    const earth = world('earth')
    regenerateWorld(earth)
    const mesh = cloudMesh(earth)
    expect(mesh.name).toBe('')
    expect(mesh.count).toBe(1050)
    expect((mesh.material as THREE.Material).transparent).toBe(true)
  })
})
