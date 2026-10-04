import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain, groundHeight, visitTransition } from '../src/terrain'
import { hoverFlight, orientFlight, SPACE_SPEED, stepFlight, WORLD_CARRY, worldCarry } from '../src/flight'
import type { World } from '../src/worlds'

function testWorld(): World {
  return {
    name: 'Earth', kind: 'earth', radius: 220, atmosphere: 78, cloudHeight: 34,
    color: 0x83c5e8, sky: new THREE.Color(), group: new THREE.Group(),
    surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain('earth', 1234),
    seed: 1234, visit: 1, armed: false, gas: false,
  }
}

describe('procedural landscapes', () => {
  it('reproduces a visit seed and changes geography with a new visit', () => {
    const a = createTerrain('earth', 123), b = createTerrain('earth', 123), c = createTerrain('earth', 456)
    expect(a(1, 0, 0)).toEqual(b(1, 0, 0))
    expect(a(1, 0, 0)).not.toEqual(c(1, 0, 0))
  })

  it('contains dry meadows, ocean basins, and water-filled inland channels', () => {
    const sample = createTerrain('earth', 123)
    let meadows = 0, oceans = 0, rivers = 0
    for (let i = 0; i < 6000; i++) {
      const y = 1 - (i + 0.5) / 3000
      const angle = i * 2.399963
      const v = sample(Math.sqrt(1-y*y)*Math.cos(angle), y, Math.sqrt(1-y*y)*Math.sin(angle))
      if (v.height > 1.5 && v.height < 5) meadows++
      if (v.land < -1) oceans++
      if (v.land > 2 && v.height < 0 && v.river > 0.8) rivers++
      expect(groundHeight('earth', v)).toBeGreaterThanOrEqual(0)
    }
    expect(meadows).toBeGreaterThan(100)
    expect(oceans).toBeGreaterThan(100)
    expect(rivers).toBeGreaterThan(20)
  })

  it('regenerates only once per space-to-atmosphere visit', () => {
    let armed = false, visits = 0
    for (const altitude of [10, 35, 90, 110, 125, 90, 70, 62, 60, 65, 61, 20]) {
      const transition = visitTransition(armed, altitude, 78)
      armed = transition.armed
      if (transition.regenerate) visits++
    }
    expect(visits).toBe(1)
    expect(armed).toBe(false)
  })
})

describe('spherical flight', () => {
  it('keeps an idle cruise near the surface through a full circumnavigation', () => {
    const world = testWorld()
    const position = new THREE.Vector3(0, 250, 0), quaternion = new THREE.Quaternion()
    orientFlight(quaternion, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0))
    const state = { position, quaternion, speed: 11 }
    for (let i = 0; i < 10000; i++) stepFlight(state, world, 1/60, { yaw: 0, pitch: 0, boost: false })
    expect(position.length()).toBeGreaterThan(249)
    expect(position.length()).toBeLessThan(255)
    expect(quaternion.length()).toBeCloseTo(1, 5)
  })

  it('can climb through the cloud layer and escape into space', () => {
    const world = testWorld()
    const position = new THREE.Vector3(0, 230, 0), quaternion = new THREE.Quaternion()
    orientFlight(quaternion, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0))
    const state = { position, quaternion, speed: 11 }
    // Hold climb until atmosphere exit, then continue along the escape heading.
    for (let i = 0; i < 1200; i++) {
      const pitch = position.length() < world.radius + world.atmosphere * 1.56 ? 1 : 0
      stepFlight(state, world, 1/60, { yaw: 0, pitch, boost: false })
    }
    expect(position.length() - world.radius).toBeGreaterThan(world.atmosphere * 1.5)
  })

  it('turns in place while hovering and keeps the look angle', () => {
    const world = testWorld()
    const position = new THREE.Vector3(0, 250, 0), quaternion = new THREE.Quaternion()
    orientFlight(quaternion, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0))
    const state = { position, quaternion, speed: 11 }
    for (let i = 0; i < 60; i++) hoverFlight(state, world, 1/60, { yaw: 1, pitch: 1 })
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion)
    expect(position.toArray()).toEqual([0, 250, 0])
    expect(state.speed).toBe(0)
    expect(forward.z).toBeLessThan(-0.5)
    const lookUp = forward.y
    expect(lookUp).toBeGreaterThan(0.5)
    for (let i = 0; i < 120; i++) hoverFlight(state, world, 1/60, { yaw: 0, pitch: 0 })
    expect(new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).y).toBeCloseTo(lookUp, 6)
  })

  it('prevents boosted descents from crossing the sampled ground or water', () => {
    const world = testWorld()
    const position = new THREE.Vector3(0, 260, 0), quaternion = new THREE.Quaternion()
    orientFlight(quaternion, new THREE.Vector3(0.2, -1, 0).normalize(), new THREE.Vector3(1, 0, 0))
    const state = { position, quaternion, speed: 430 }
    for (let i = 0; i < 1200; i++) {
      stepFlight(state, world, 1/30, { yaw: 0, pitch: -1, boost: true })
      const normal = position.clone().normalize()
      const height = groundHeight('earth', world.sample(normal.x, normal.y, normal.z))
      expect(position.length()).toBeGreaterThanOrEqual(world.radius + height + 2.29)
    }
  })
})

describe('the carry of a world', () => {
  it('is full near the world and fades out higher up', () => {
    expect(worldCarry(0)).toBe(1)
    expect(worldCarry(WORLD_CARRY.full)).toBe(1)
    expect(worldCarry((WORLD_CARRY.full + WORLD_CARRY.none) / 2)).toBeCloseTo(0.5)
    expect(worldCarry(WORLD_CARRY.none)).toBe(0)
    expect(worldCarry(20000)).toBe(0)
  })

  it('is full where the fairy is slower than the fastest world', () => {
    // Near a world the flight speed is 32 m/s plus a part of the space speed (stepFlight()).
    // Blossom Haven moves at about 59 m/s on its orbit, and Neptune at about 63 m/s.
    const speedAt = (altitude: number) => THREE.MathUtils.lerp(32, SPACE_SPEED, THREE.MathUtils.smoothstep(altitude, 65, 1000))
    expect(speedAt(150)).toBeLessThan(63)
    expect(speedAt(WORLD_CARRY.full)).toBeGreaterThan(63 * 5)
  })
})
