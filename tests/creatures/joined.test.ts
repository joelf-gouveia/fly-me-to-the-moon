import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { SPECIES } from '../../src/creatures/catalog'
import { farMaterial, friendParts, hasModel, joinedGeometry, rigMaterial } from '../../src/creatures/joined'

const modelled = SPECIES.filter(species => hasModel(species.id))
const standing = modelled.filter(species => ['walk', 'hop', 'waddle', 'crawl'].includes(species.move) && species.layer !== 'small')

describe('the joined models of the animals', () => {
  it('has a model for each kind of the catalog: the herds, the small life near the fairy, the cards and the friends', () => {
    for (const species of SPECIES) expect(hasModel(species.id), species.id).toBe(true)
  })

  it('stands each walking kind on y = 0, near and far', () => {
    for (const species of standing) for (const quality of ['near', 'far'] as const) {
      const box = joinedGeometry(species.id, quality).boundingBox!
      expect(box.min.y, `${species.id} ${quality}`).toBeGreaterThan(-0.06)
      expect(box.min.y, `${species.id} ${quality}`).toBeLessThan(0.1)
    }
  })

  it('keeps the rig values in range: a code of 0 to 6, a side of -1, 0 or 1', () => {
    for (const species of modelled) {
      const rig = joinedGeometry(species.id, 'near').attributes.aRig
      for (let i = 0; i < rig.count; i += 7) {
        const code = rig.getX(i), side = rig.getW(i)
        expect(Number.isInteger(code) && code >= 0 && code <= 6, `${species.id} code ${code}`).toBe(true)
        expect([-1, 0, 1], species.id).toContain(side)
        expect(Math.abs(rig.getY(i)) + Math.abs(rig.getZ(i)), species.id).toBeLessThan(12)
      }
    }
  })

  it('is one draw call for a whole herd: one geometry, one material, as an InstancedMesh', () => {
    for (const species of modelled) for (const quality of ['near', 'far'] as const) {
      const geometry = joinedGeometry(species.id, quality)
      expect(geometry.groups.length, species.id).toBe(0)
      expect(geometry.attributes.color, species.id).toBeDefined()
      const material = quality === 'near' ? rigMaterial(species.id) : farMaterial(species.id)
      const herd = new THREE.InstancedMesh(geometry, material, 8)
      expect(Array.isArray(herd.material), species.id).toBe(false)
      material.dispose()
    }
  })

  it('makes the far model smaller than the near model', () => {
    for (const species of modelled) {
      expect(joinedGeometry(species.id, 'far').attributes.position.count, species.id).toBeLessThan(joinedGeometry(species.id, 'near').attributes.position.count)
    }
  })

  it('gives each friend with wings its wing parts', () => {
    for (const species of modelled.filter(item => item.friend === 'wings' && !['duck', 'dragonling', 'pegasus'].includes(item.id))) {
      const parts = friendParts(species.id)
      expect(parts.wings, species.id).not.toBeNull()
      expect(parts.body.attributes.position.count, species.id).toBeGreaterThan(0)
    }
  })
})
