import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { species } from '../../src/creatures/habitat'
import type { Species } from '../../src/creatures/habitat'
import { fairytale, fairytaleOrder, habitatOf, replacements, residentInfo } from '../../src/creatures/fairytale'
import type { Fairytale } from '../../src/creatures/fairytale'
import { createFairytaleCreature } from '../../src/creatures/fairytale-models'

/** Horizontal reach of the body from the model origin. Magic effects do not collide, so they are excluded. */
function bodyReach(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3(), point = new THREE.Vector3()
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (parent.userData.effect) return
    // Exact: every vertex, not the box of a rotated box.
    const positions = object.geometry.attributes.position
    for (let i = 0; i < positions.count; i++) box.expandByPoint(point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld))
  })
  return { reach: Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)), box }
}

describe('fairytale replacements', () => {
  it('replaces every Blossom Haven resident exactly once, and keeps its habitat', () => {
    for (const kind of Object.keys(species) as Species[]) expect(replacements[kind]).toBeDefined()
    expect(replacements.butterfly).toBe('pegasus')
    expect(new Set(Object.values(replacements)).size).toBe(fairytaleOrder.length)
    for (const kind of fairytaleOrder) expect(replacements[fairytale[kind].replaces]).toBe(kind)
    expect(habitatOf('frogPrince')).toBe('water')
    expect(habitatOf('unicorn')).toBe('land')
  })

  for (const kind of fairytaleOrder) {
    it(`builds the ${fairytale[kind].name} inside the footprint of the ${residentInfo(fairytale[kind].replaces).name.toLowerCase()}`, () => {
      const model = createFairytaleCreature(kind as Fairytale)
      for (const [time, moving] of [[0, false], [1.3, true], [2.7, false], [5.1, true]] as const) {
        model.animate(time, moving, { details: true, magic: true, motion: true })
        const { reach, box } = bodyReach(model.root)
        expect(reach).toBeLessThanOrEqual(residentInfo(fairytale[kind].replaces).footprint)
        // Land and water creatures stand on the ground or the water; they do not sink into it.
        if (kind !== 'pegasus') expect(box.min.y).toBeGreaterThan(-0.08)
      }
      // A ceiling on the draw cost. Today the animals have 8 to 28 meshes; these have 37 to 46.
      expect(model.meshes()).toBeLessThanOrEqual(48)
      model.root.traverse(object => {
        if (object instanceof THREE.Mesh) for (const value of object.position.toArray()) expect(Number.isFinite(value)).toBe(true)
      })
      model.dispose()
    })
  }

  for (const kind of fairytaleOrder) {
    it(`merges the static parts of the ${fairytale[kind].name} for the game without a change of shape`, () => {
      const full = createFairytaleCreature(kind), merged = createFairytaleCreature(kind, { merge: true })
      const all = { details: true, magic: true, motion: true }
      full.animate(2.7, false, all); merged.animate(2.7, false, all)
      const a = bodyReach(full.root).box, b = bodyReach(merged.root).box
      for (const [x, y] of [[a.min, b.min], [a.max, b.max]]) expect(x.distanceTo(y)).toBeLessThan(1e-4)
      // Today the animals have 8 to 28 meshes.
      expect(merged.meshes()).toBeLessThanOrEqual(24)
      expect(merged.meshes()).toBeLessThan(full.meshes() / 2)
      full.dispose(); merged.dispose()
    })
  }

  it('hides the signature details and the magic when they are off', () => {
    const model = createFairytaleCreature('frogPrince')
    const hidden = () => { let count = 0; model.root.traverse(object => { if (!object.visible) count++ }); return count }
    model.animate(1, false, { details: true, magic: true, motion: true })
    expect(hidden()).toBe(0)
    // The crown, the lotus, and the bubbles.
    model.animate(1, false, { details: false, magic: false, motion: true })
    expect(hidden()).toBe(3)
    model.dispose()
  })
})
