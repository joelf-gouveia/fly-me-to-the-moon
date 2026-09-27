import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain, HOME_SEED } from '../terrain'
import { regenerateWorld } from '../worlds'
import type { World } from '../worlds'
import { budget, CLEAR_ANGLE, cloudLayout, COTTAGE, HOME, MAX_TERRAIN, puffsOverCottage } from './model'
import type { CloudOption } from './model'

const options: CloudOption[] = ['today', 'tint', 'puffs', 'cones']

function gameClouds() {
  const group = new THREE.Group(), surface = new THREE.Group(), clouds = new THREE.Group()
  group.add(surface, clouds)
  const home: World = {
    name: 'Blossom Haven', kind: 'fairy', radius: HOME.radius, atmosphere: HOME.atmosphere, cloudHeight: HOME.cloudHeight,
    color: 0xf3acd1, sky: new THREE.Color(0xe7b6e8), group, surface, clouds,
    sample: createTerrain('fairy', HOME_SEED), seed: HOME_SEED, visit: 0, armed: false, gas: false,
  }
  regenerateWorld(home)
  return clouds.children[0] as THREE.InstancedMesh
}

describe('cotton candy cloud study', () => {
  it('shows the clouds of the game as option B', () => {
    const mesh = gameClouds(), layout = cloudLayout('puffs', 'desktop')
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3()
    const color = new THREE.Color()
    expect(mesh.count).toBe(layout.puffs.length)
    layout.puffs.forEach((puff, i) => {
      mesh.getMatrixAt(i, matrix); matrix.decompose(position, rotation, scale)
      expect(position.distanceTo(puff.position)).toBeLessThan(1e-3)
      expect(scale.distanceTo(puff.scale)).toBeLessThan(1e-3)
      mesh.getColorAt(i, color)
      expect(color.getHex()).toBe(puff.color)
    })
  })

  it('gives C the tufts of B', () => {
    const b = cloudLayout('puffs', 'desktop'), c = cloudLayout('cones', 'desktop')
    expect(c.puffs.map(puff => puff.position.toArray())).toEqual(b.puffs.map(puff => puff.position.toArray()))
  })

  it('keeps every puff and cone in the sky, above the highest terrain', () => {
    for (const option of options) for (const device of ['desktop', 'phone'] as const) {
      const layout = cloudLayout(option, device)
      for (const puff of layout.puffs) expect(puff.position.length() - HOME.radius - puff.scale.y).toBeGreaterThan(MAX_TERRAIN + 10)
      for (const cone of layout.cones) expect(cone.position.length() - cone.length - HOME.radius).toBeGreaterThan(MAX_TERRAIN + 2)
      for (const sparkle of layout.sparkles) expect(sparkle.length() - HOME.radius).toBeGreaterThan(MAX_TERRAIN + 2)
    }
  })

  it('keeps the column above the cottage clear in B and C only', () => {
    expect(puffsOverCottage(cloudLayout('today', 'desktop'))).toBeGreaterThan(0)
    for (const option of ['puffs', 'cones'] as const) {
      const layout = cloudLayout(option, 'desktop')
      expect(puffsOverCottage(layout)).toBe(0)
      for (const tuft of layout.tufts) expect(tuft.angleTo(COTTAGE)).toBeGreaterThan(CLEAR_ANGLE)
    }
  })

  it('draws half of everything on a phone', () => {
    for (const option of options) {
      const desktop = budget(option, 'desktop'), phone = budget(option, 'phone')
      expect(phone.puffs).toBe(desktop.puffs / 2)
      expect(phone.cones).toBeLessThanOrEqual(Math.ceil(desktop.cones / 2))
      expect(phone.sparkles).toBe(desktop.sparkles / 2)
      expect(phone.drawCalls).toBe(desktop.drawCalls)
    }
  })

  it('reports a budget per option', () => {
    expect(budget('today', 'desktop')).toMatchObject({ puffs: 300, drawCalls: 1, triangles: 24000, transparent: true })
    // A changes the colors and nothing else.
    expect(budget('tint', 'desktop')).toMatchObject({ puffs: 300, drawCalls: 1, triangles: 24000, transparent: true })
    expect(budget('puffs', 'desktop')).toMatchObject({ puffs: 300, tufts: 50, cones: 0, drawCalls: 1, transparent: false })
    expect(budget('cones', 'desktop')).toMatchObject({ puffs: 300, cones: 10, sparkles: 600, drawCalls: 3 })
    expect(budget('puffs', 'phone').triangles).toBeLessThan(budget('today', 'desktop').triangles * 1.1)
  })

  it('gives the same clouds on every load', () => {
    for (const option of options) {
      const a = cloudLayout(option, 'desktop'), b = cloudLayout(option, 'desktop')
      expect(a.puffs.map(puff => [puff.position.toArray(), puff.color])).toEqual(b.puffs.map(puff => [puff.position.toArray(), puff.color]))
    }
    const colors = new Set(cloudLayout('tint', 'desktop').puffs.map(puff => puff.color))
    expect(colors.size).toBeGreaterThan(20)
  })
})
