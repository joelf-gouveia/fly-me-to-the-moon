import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { hairOptions } from '../../src/customization'
import { createFairyRig, createSkyDancerAnimation, skyDancer } from '../../src/fairy'
import { bodyIds, createBodyFairy, measureBody } from './bodies'

const look = { hair: 'ponytail', hairColor: 'plum', dress: 'rose', wings: 'dew', wingColor: 'dewdrop', skin: 'peach' } as const

describe('fairy body study', () => {
  const measured = Object.fromEntries(bodyIds.map(id => [id, measureBody(createBodyFairy(id))]))

  it('records the loose joints, the bone stretch and the wing gap of today', () => {
    const today = measured.today
    expect(today.joints.filter(joint => joint.fill < 0.9).map(joint => joint.name)).toEqual(expect.arrayContaining(['shoulder L', 'shoulder R']))
    expect(today.stretch).toBeGreaterThan(0.5)
    expect(today.wingGap).toBeGreaterThan(0.08)
    expect(today.faceCruise).toBeCloseTo(32)
    expect(today.faceBoost).toBeCloseTo(66)
  })

  it('closes every joint and attaches the wing roots in A, B and C', () => {
    for (const id of ['joined', 'smooth', 'storybook'] as const) {
      expect(measured[id].openJoints, id).toBe(0)
      expect(Math.min(...measured[id].joints.map(joint => joint.fill)), id).toBeGreaterThanOrEqual(0.9)
      expect(measured[id].wingGap, id).toBeLessThan(0.004)
    }
  })

  it('keeps each bone of B and C at one length, and B reaches the hands of today', () => {
    const rig = createFairyRig({ withTrail: false })
    for (const id of ['smooth', 'storybook'] as const) expect(measured[id].stretch, id).toBeLessThan(1e-6)
    for (const id of ['smooth'] as const) {
      const fairy = createBodyFairy(id)
      for (let k = 0; k < 8; k++) {
        const boost = k % 2
        rig.pose(skyDancer, boost, k * 0.4)
        fairy.pose(skyDancer, boost, k * 0.4)
        fairy.root.updateMatrixWorld(true)
        rig.root.updateMatrixWorld(true)
        const wrist = fairy.jointSamples().find(joint => joint.name === 'wrist R')!.world
        const body = rig.root.getObjectByName('fairy-body')!
        expect(wrist.distanceTo(body.localToWorld(rig.targets[1].wrist.clone())), id).toBeLessThan(0.02)
      }
    }
  })

  it('lets the arms of C float around the Sky Dancer pose, and keeps the other arms still in cruise', () => {
    expect(measured.storybook.handTravel).toBeGreaterThan(0.1)
    expect(measured.storybook.handTravel).toBeLessThan(0.4)
    for (const id of ['today', 'joined', 'smooth'] as const) expect(measured[id].handTravel, id).toBeLessThan(1e-6)
    // In boost, each hand of C reaches ahead along the flight line (-z of the flight root).
    const fairy = createBodyFairy('storybook')
    for (let k = 0; k < 8; k++) {
      fairy.pose(skyDancer, 1, k * 0.23)
      fairy.root.updateMatrixWorld(true)
      const at = new Map(fairy.jointSamples().map(joint => [joint.name, joint.world]))
      for (const s of ['L', 'R']) {
        const reach = at.get(`wrist ${s}`)!.clone().sub(at.get(`shoulder ${s}`)!).normalize()
        expect(-reach.z, s).toBeGreaterThan(0.5)
      }
    }
  })

  it('lifts the head of C to look ahead, and only C', () => {
    expect(measured.storybook.faceCruise).toBeCloseTo(16)
    expect(measured.storybook.faceBoost).toBeCloseTo(36)
    for (const id of ['joined', 'smooth'] as const) expect(measured[id].faceCruise).toBeCloseTo(32)
  })

  it('keeps the hair, the look and the flight transform of the game on every body', () => {
    for (const id of bodyIds) {
      const fairy = createBodyFairy(id)
      const animation = createSkyDancerAnimation(fairy)
      fairy.root.position.set(3, 4, 5)
      const position = fairy.root.position.clone()
      for (const { id: hair } of hairOptions) {
        fairy.applyLook({ ...look, hair })
        const visible = hairOptions.filter(option => fairy.root.getObjectByName(`hair-${option.id}`)!.visible)
        expect(visible.map(option => option.id), id).toEqual([hair])
      }
      animation.update(0.3, true)
      expect(fairy.root.position.equals(position), id).toBe(true)
      expect(THREE.MathUtils.radToDeg(fairy.root.getObjectByName('fairy-body')!.rotation.x), id).toBeLessThan(-32)
    }
  })

  it('keeps the long hair of C on the line of the body when the head lifts', () => {
    const direction = (id: 'smooth' | 'storybook') => {
      const fairy = createBodyFairy(id)
      fairy.applyLook(look)
      fairy.pose(skyDancer, 0, 0)
      fairy.root.updateMatrixWorld(true)
      const group = fairy.root.getObjectByName('hair-ponytail')!
      const meshes: THREE.Mesh[] = []
      group.traverse(child => { if (child instanceof THREE.Mesh) meshes.push(child) })
      const [root, tip] = [meshes[2], meshes[meshes.length - 1]].map(mesh => mesh.getWorldPosition(new THREE.Vector3()))
      return tip.sub(root).normalize()
    }
    expect(THREE.MathUtils.radToDeg(direction('smooth').angleTo(direction('storybook')))).toBeLessThan(8)
  })
})
