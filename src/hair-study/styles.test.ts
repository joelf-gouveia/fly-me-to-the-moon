import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { defaultFairyLook } from '../customization'
import { createFairyRig } from '../fairy'
import { addStudyHair, areaFromBehind, candidateIds, measureStyle, studyStyles } from './styles'

function build() {
  const rig = createFairyRig({ withTrail: false })
  return { rig, hair: addStudyHair(rig) }
}

describe('fairy hair study', () => {
  it('lists the three game styles first and eight new candidates after them', () => {
    expect(studyStyles.map(style => style.id)).toEqual(['bun', 'bob', 'tails', ...candidateIds])
    expect(studyStyles.filter(style => style.inGame)).toHaveLength(3)
    expect(new Set(studyStyles.map(style => style.label)).size).toBe(11)
  })

  it('shows one style at a time and keeps the look colors on the new styles', () => {
    const { rig, hair } = build()
    hair.show('ponytail', { ...defaultFairyLook, hairColor: 'mint' })
    const visible = studyStyles.filter(({ id }) => rig.root.getObjectByName(`hair-${id}`)!.visible).map(style => style.id)
    expect(visible).toEqual(['ponytail'])
    const part = rig.root.getObjectByName('hair-ponytail')!.children[0] as THREE.Mesh
    expect((part.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x98dcc0)
    hair.show('bob', defaultFairyLook)
    expect(rig.root.getObjectByName('hair-bob')!.visible).toBe(true)
    expect(rig.root.getObjectByName('hair-ponytail')!.visible).toBe(false)
  })

  it('straightens the moving styles in boost and leaves the rest pose alone when still', () => {
    const { rig, hair } = build()
    const reach = (id: string) => {
      rig.root.updateMatrixWorld(true)
      const group = rig.root.getObjectByName(`hair-${id}`)!
      const pivots: THREE.Object3D[] = []
      group.traverse(child => { if (child instanceof THREE.Group && child !== group) pivots.push(child) })
      const tip = pivots.at(-1)!.children[0]
      return pivots[0].getWorldPosition(new THREE.Vector3()).distanceTo(tip.getWorldPosition(new THREE.Vector3()))
    }
    for (const id of ['ponytail', 'braid', 'twinBraids', 'longWaves']) {
      hair.animate(0, 0, 'still')
      const rest = reach(id)
      hair.animate(5, 0, 'still')
      expect(reach(id)).toBeCloseTo(rest, 9)
      hair.animate(0, 1, 'still')
      expect(reach(id), id).toBeGreaterThan(rest)
    }
  })

  // Bob and Tails keep their first shape (src/fairy-hair.ts). The test records their
  // known contact, so that a change to them shows. Every other style follows every rule.
  const firstShape: Record<string, { wings: string[]; ears: boolean }> = {
    bob: { wings: ['luna', 'flutter'], ears: false },
    tails: { wings: ['petal', 'luna', 'flutter'], ears: true },
  }

  it('keeps every style joined to the cap, the ears visible and the wings clear', () => {
    const { rig, hair } = build()
    const report = studyStyles.map(({ id }) => ({ id, ...measureStyle(rig, hair, id, defaultFairyLook) }))
    const bare = areaFromBehind(rig.root.getObjectByName('fairy-body')!, [])
    console.table(report.map(row => ({ ...row, hairArea: `${Math.round(row.hairArea / bare.hairArea * 100)}%`, beyondCap: row.beyondCap.toFixed(4), wingContact: row.wingContact.join(' ') })))
    for (const row of report) {
      const known = firstShape[row.id]
      expect(row.attached, `${row.id} has a part that does not join the cap`).toBe(true)
      expect(row.earsVisible, `${row.id} ear check`).toBe(known ? known.ears : true)
      expect(row.wingContact, `${row.id} wing check`).toEqual(known ? known.wings : [])
      expect(row.meshes).toBeLessThanOrEqual(24)
      expect(row.hairArea).toBeGreaterThanOrEqual(bare.hairArea)
    }
  })
})
