import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { hairOptions } from '../src/customization'
import { createFairyRig, createSkyDancerAnimation } from '../src/fairy'

describe('Sky Dancer integration', () => {
  it('blends boost and recovery on the visual body without changing the flight transform', () => {
    const rig = createFairyRig({ withTrail: false })
    const animation = createSkyDancerAnimation(rig)
    rig.root.position.set(30, 200, 50)
    rig.root.quaternion.setFromEuler(new THREE.Euler(0.2, 1.1, -0.4))
    const position = rig.root.position.clone(), heading = rig.root.quaternion.clone()
    const body = rig.root.getObjectByName('fairy-body')!
    expect(THREE.MathUtils.radToDeg(body.rotation.x)).toBeCloseTo(-32)
    animation.update(0.125, true)
    expect(THREE.MathUtils.radToDeg(body.rotation.x)).toBeLessThan(-32)
    expect(THREE.MathUtils.radToDeg(body.rotation.x)).toBeGreaterThan(-66)
    animation.update(0.125, true)
    expect(THREE.MathUtils.radToDeg(body.rotation.x)).toBeCloseTo(-66)
    animation.update(0, false)
    expect(THREE.MathUtils.radToDeg(body.rotation.x)).toBeCloseTo(-66)
    animation.update(0.4, false)
    expect(THREE.MathUtils.radToDeg(body.rotation.x)).toBeCloseTo(-32)
    expect(rig.root.position.equals(position)).toBe(true)
    expect(rig.root.quaternion.equals(heading)).toBe(true)
  })

  it('keeps wing phase continuous and preserves boost when changing saved appearance', () => {
    const rig = createFairyRig({ withTrail: false })
    const animation = createSkyDancerAnimation(rig)
    for (let i = 0; i < 600; i++) animation.update(1/60, false)
    let phase = animation.phase
    for (let i = 0; i < 30; i++) {
      animation.update(1/60, true)
      const advance = (animation.phase - phase + Math.PI * 2) % (Math.PI * 2)
      expect(advance).toBeGreaterThan(0)
      expect(advance).toBeLessThanOrEqual(5.2 * Math.PI * 2 / 60 + 0.00001)
      phase = animation.phase
    }
    rig.applyLook({ hair: 'bob', hairColor: 'lavender', dress: 'buttercup', wings: 'luna', wingColor: 'violet', skin: 'cocoa' })
    expect(rig.root.getObjectByName('hair-bob')!.visible).toBe(true)
    expect(rig.root.getObjectByName('hair-bun')!.visible).toBe(false)
    expect(rig.root.getObjectByName('wings-luna')!.visible).toBe(true)
    expect(rig.root.getObjectByName('wings-petal')!.visible).toBe(false)
    expect(animation.boost).toBe(1)
    expect(THREE.MathUtils.radToDeg(rig.root.getObjectByName('fairy-body')!.rotation.x)).toBeCloseTo(-66)
  })

  it('builds every hair style once and shows only the chosen one', () => {
    const rig = createFairyRig({ withTrail: false })
    for (const { id } of hairOptions) {
      rig.applyLook({ hair: id, hairColor: 'honey', dress: 'rose', wings: 'petal', wingColor: 'dewdrop', skin: 'peach' })
      const visible = hairOptions.filter(option => rig.root.getObjectByName(`hair-${option.id}`)!.visible).map(option => option.id)
      expect(visible).toEqual([id])
    }
    expect(hairOptions).toHaveLength(9)
  })

  it('swings the long hair gently in flight and keeps it at rest with no motion', () => {
    const rig = createFairyRig({ withTrail: false })
    rig.applyLook({ hair: 'ponytail', hairColor: 'plum', dress: 'rose', wings: 'petal', wingColor: 'dewdrop', skin: 'peach' })
    const group = rig.root.getObjectByName('hair-ponytail')!
    const tip = () => {
      let last: THREE.Object3D = group
      group.traverse(child => { if (child instanceof THREE.Mesh) last = child })
      rig.root.updateMatrixWorld(true)
      return last.getWorldPosition(new THREE.Vector3())
    }
    const animation = createSkyDancerAnimation(rig)
    animation.update(0.3, false)
    const first = tip()
    animation.update(0.4, false)
    expect(tip().distanceTo(first)).toBeGreaterThan(0.001)
    rig.animateHair(0, 0, 0)
    const rest = tip()
    rig.animateHair(3, 0, 0)
    expect(tip().distanceTo(rest)).toBeLessThan(1e-9)
  })

  it('builds the Storybook body, which lifts the head to look ahead', () => {
    const rig = createFairyRig({ withTrail: false })
    for (const name of ['bodice', 'sash', 'wing-bow', 'face', 'neck', 'upper-arm', 'thigh', 'hand', 'slipper']) {
      expect(rig.root.getObjectByName(name), name).toBeDefined()
    }
    for (const name of ['torso', 'tunic', 'back-seam', 'foot']) expect(rig.root.getObjectByName(name), name).toBeUndefined()
    const animation = createSkyDancerAnimation(rig)
    const pivot = rig.root.getObjectByName('fairy-head-pivot')!
    expect(THREE.MathUtils.radToDeg(pivot.rotation.x)).toBeCloseTo(16)
    animation.update(0.25, true)
    expect(THREE.MathUtils.radToDeg(pivot.rotation.x)).toBeCloseTo(30)
    // The head, the hair and the ears turn together.
    for (const name of ['head', 'hair-cap', 'ear', 'hair-bun']) {
      let parent = rig.root.getObjectByName(name)!.parent
      while (parent && parent !== pivot) parent = parent.parent
      expect(parent, name).toBe(pivot)
    }
  })

  it('keeps the bones of the arms and legs at one length', () => {
    const rig = createFairyRig({ withTrail: false })
    const animation = createSkyDancerAnimation(rig)
    const lengths = () => rig.joints.flatMap(j => [j.shoulder.distanceTo(j.elbow), j.elbow.distanceTo(j.wrist), j.hip.distanceTo(j.knee), j.knee.distanceTo(j.ankle)])
    const rest = lengths()
    for (let i = 0; i < 40; i++) {
      animation.update(0.05, i > 20)
      lengths().forEach((length, k) => expect(length).toBeCloseTo(rest[k], 9))
    }
  })

  it('leaves out the body below the head when asked', () => {
    const rig = createFairyRig({ withTrail: false, body: false })
    for (const name of ['bodice', 'upper-arm', 'hand', 'face']) expect(rig.root.getObjectByName(name), name).toBeUndefined()
    expect(rig.root.getObjectByName('head')).toBeDefined()
    expect(rig.joints).toBe(rig.targets)
  })
})
