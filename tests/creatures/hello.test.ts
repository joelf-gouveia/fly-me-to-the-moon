import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { canSayHello, HELLO, heartCount, heartPool, heartPose, helloLength, helloLift, helloPoint, helloTurn } from '../../src/creatures/hello'
import type { HeartPose } from '../../src/creatures/hello'
import { createPopulation } from '../../src/creatures/population'
import { CreatureObstacles } from '../../src/creatures/spherical'

const pose: HeartPose = { rise: 0, sway: 0, size: 0, alpha: 0, spin: 0 }

describe('creature hello rules', () => {
  it('says hello within 6 m and only after 8 s of rest', () => {
    expect(canSayHello(5.9, 0)).toBe(true)
    expect(canSayHello(6, 0)).toBe(true)
    expect(canSayHello(6.1, 0)).toBe(false)
    expect(canSayHello(2, 10, 3)).toBe(false)
    expect(canSayHello(2, 10.9, 3)).toBe(false)
    expect(canSayHello(2, 11, 3)).toBe(true)
    expect(canSayHello(9, 30, 3)).toBe(false)
  })

  it('looks ahead on the path of the fairy, so the hello starts before she arrives', () => {
    const out = new THREE.Vector3()
    // Cruise at 11 m/s: the point is 1.1 s ahead.
    helloPoint(new THREE.Vector3(0, 100, 0), new THREE.Vector3(11, 0, 0), out)
    expect(out.x).toBeCloseTo(11 * HELLO.lead)
    expect(out.y).toBe(100)
    // A creature 15 m ahead is out of reach of the fairy, but in reach of the point ahead.
    const creature = new THREE.Vector3(15, 98, 0)
    expect(canSayHello(creature.distanceTo(new THREE.Vector3(0, 100, 0)), 0)).toBe(false)
    expect(canSayHello(creature.distanceTo(out), 0)).toBe(true)
    // A boost does not look farther than the limit, and a fairy that stands still looks at her own place.
    expect(helloPoint(new THREE.Vector3(), new THREE.Vector3(40, 0, 0), out).x).toBeCloseTo(HELLO.leadLimit)
    expect(helloPoint(new THREE.Vector3(1, 2, 3), new THREE.Vector3(), out).toArray()).toEqual([1, 2, 3])
  })

  it('hops two times on land and bobs lower on the water', () => {
    expect(helloLift(0, false)).toBe(0)
    expect(helloLift(0.95, false)).toBe(0)
    const land = [0.225, 0.675].map(age => helloLift(age, false))
    const water = [0.225, 0.675].map(age => helloLift(age, true))
    expect(land[0]).toBeCloseTo(0.55)
    expect(land[1]).toBeCloseTo(0.35)
    expect(helloLift(0.45, false)).toBeCloseTo(0)
    expect(water[0]).toBeLessThan(land[0] / 3)
    for (let age = 0; age < 1; age += 0.01) expect(helloLift(age, false)).toBeGreaterThanOrEqual(0)
  })

  it('turns to the fairy and back again', () => {
    expect(helloTurn(0)).toBe(0)
    expect(helloTurn(0.3)).toBe(1)
    expect(helloTurn(1.2)).toBe(1)
    expect(helloTurn(2)).toBe(0)
  })

  it('sends up 2 or 3 hearts, and half on a phone', () => {
    expect([0, 1].map(index => heartCount(index, false))).toEqual([2, 3])
    expect([0, 1].map(index => heartCount(index, true))).toEqual([1, 2])
    expect(heartPool(true)).toBe(heartPool(false) / 2)
    expect(heartPool(false)).toBe(HELLO.pool * HELLO.hearts)
  })

  it('floats each heart up, then fades it', () => {
    expect(heartPose(0.1, 0, pose)).toBe(false)
    expect(heartPose(0.5, 0, pose)).toBe(true)
    const low = pose.rise
    expect(heartPose(1.5, 0, pose)).toBe(true)
    expect(pose.rise).toBeGreaterThan(low)
    expect(heartPose(0.5, 2, pose)).toBe(false)
    expect(heartPose(helloLength(3) + 0.01, 2, pose)).toBe(false)
    expect(heartPose(0.12 + HELLO.heartLife - 0.2, 0, pose)).toBe(false)
  })
})

describe('creature hello in the population', () => {
  function population(mobile = false) {
    const radius = 110
    const ground = new THREE.SphereGeometry(radius + 2, 256, 128), water = new THREE.SphereGeometry(radius, 64, 32)
    const parent = new THREE.Group()
    const anchor = new THREE.Vector3(1, 0, 0.3).normalize()
    const creatures = createPopulation(parent, ground, water, radius, true, new CreatureObstacles(), 123, anchor, 28, mobile)
    const camera = anchor.clone().multiplyScalar(radius + 10)
    creatures.update(0.1, camera)
    const model = creatures.group.children.find(item => item.visible && item.userData.species !== 'duck')!
    // The fairy is 2.4 m over the feet of the creature.
    const fairyAt = () => model.position.clone().normalize().multiplyScalar(model.position.length() + 2.4)
      .applyQuaternion(parent.quaternion).add(parent.position)
    return { creatures, parent, camera, model, fairyAt, dispose: () => { creatures.dispose(); ground.dispose(); water.dispose() } }
  }

  it('hops on its ground after update(), also when the world turns and moves', () => {
    const { creatures, parent, camera, model, fairyAt, dispose } = population()
    parent.position.set(40, -12, 300)
    parent.rotation.y = 1.1
    parent.updateMatrixWorld(true)
    const world = camera.clone().applyQuaternion(parent.quaternion).add(parent.position)
    creatures.update(0.1, world)
    expect(creatures.greet(0.1, fairyAt())).toBeGreaterThan(0)
    const name = model.name
    let highest = 0
    for (let i = 0; i < 20; i++) {
      parent.rotation.y += 0.01
      parent.position.x += 0.5
      creatures.update(1 / 30, world)
      creatures.greet(1 / 30, fairyAt())
      const hello = creatures.helloState().active.find(item => item.name === name)!
      expect(hello.clearance).toBeGreaterThanOrEqual(0)
      highest = Math.max(highest, hello.clearance)
    }
    expect(highest).toBeGreaterThan(0.3)
    expect(highest).toBeLessThan(0.6)
    expect(creatures.helloState().hearts).toBeGreaterThan(0)
    dispose()
  })

  it('rests 8 s, stops in a pause, and ends the hello on the route', () => {
    const { creatures, camera, model, fairyAt, dispose } = population()
    expect(creatures.greet(0.1, fairyAt())).toBeGreaterThan(0)
    const first = creatures.helloState().count
    // The pause: a delta of 0 holds the hop and starts no hello.
    creatures.update(0.4, camera); creatures.greet(0.4, fairyAt())
    const held = model.position.clone()
    for (let i = 0; i < 5; i++) { creatures.update(0, camera); expect(creatures.greet(0, fairyAt())).toBe(0) }
    expect(model.position.distanceTo(held)).toBeLessThan(1e-9)
    // The hello ends after about 2.5 s, and no second hello comes in the rest time.
    const active = () => creatures.helloState().active.some(item => item.name === model.name)
    for (let step = 0; step < 70; step++) {
      creatures.update(0.1, camera); creatures.greet(0.1, fairyAt())
      if (step > 22) expect(active()).toBe(false)
    }
    expect(creatures.helloState().count).toBeGreaterThanOrEqual(first)
    let again = false
    for (let step = 0; step < 12; step++) { creatures.update(0.1, camera); creatures.greet(0.1, fairyAt()); again ||= active() }
    expect(again).toBe(true)
    dispose()
  })

  it('keeps the hearts in one draw call and inside the pool', () => {
    for (const mobile of [false, true]) {
      const { creatures, parent, camera, dispose } = population(mobile)
      const points = parent.getObjectByName('creature-hearts') as THREE.Points
      expect(points).toBeInstanceOf(THREE.Points)
      expect(creatures.group.getObjectByName('creature-hearts')).toBeUndefined()
      // The fairy visits every visible creature in one frame.
      for (const model of creatures.group.children.filter(item => item.visible)) {
        creatures.greet(0.01, model.position.clone().normalize().multiplyScalar(model.position.length() + 2))
      }
      creatures.update(0.5, camera); creatures.greet(0.5, new THREE.Vector3(0, 0, 0))
      expect(creatures.helloState().hearts).toBeLessThanOrEqual(heartPool(mobile))
      expect(points.geometry.drawRange.count).toBe(creatures.helloState().hearts)
      dispose()
      expect(points.parent).toBeNull()
    }
  })
})
