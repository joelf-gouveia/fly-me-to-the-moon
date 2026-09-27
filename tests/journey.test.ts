import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createHomeGuide, homeApproachPoint, journeyHeading } from '../src/journey'
import { nearestWorldAt, orientFlight, stepFlight } from '../src/flight'
import { createTerrain, HOME_SEED } from '../src/terrain'
import { HOME_START_POSITION, surfaceRadius } from '../src/worlds'
import type { World } from '../src/worlds'

function fixture(kind: 'earth' | 'fairy', seed = 123): World {
  const group = new THREE.Group()
  if (kind === 'fairy') group.position.set(...HOME_START_POSITION)
  else group.position.set(3289, 0, 264)
  return {
    kind, name: kind === 'earth' ? 'Earth' : 'Blossom Haven',
    radius: kind === 'earth' ? 220 : 110, atmosphere: kind === 'earth' ? 78 : 52,
    cloudHeight: 30, color: 0, sky: new THREE.Color(), group,
    surface: new THREE.Group(), clouds: new THREE.Group(),
    sample: createTerrain(kind, kind === 'fairy' ? HOME_SEED : seed),
    seed, visit: 1, armed: false, gas: false,
  }
}

function simulateJourney(normal: THREE.Vector3, seed: number, fromHome = false, boost = false, homePosition?: THREE.Vector3) {
  const earth = fixture('earth', seed), home = fixture('fairy'), worlds = [earth, home]
  if (homePosition) {
    home.group.position.copy(homePosition)
    const sun = fixture('earth')
    sun.kind = 'sun'; sun.radius = 600; sun.atmosphere = 0; sun.group.position.set(0, 0, 0)
    worlds.push(sun)
  }
  const start = fromHome ? home : earth
  const position = normal.clone().multiplyScalar(surfaceRadius(start, normal) + 6).add(start.group.position)
  const quaternion = new THREE.Quaternion()
  const tangent = normal.clone().cross(Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize()
  orientFlight(quaternion, tangent, normal)
  const state = { position, quaternion, speed: 11 }
  const target = homeApproachPoint(home), targetQuaternion = new THREE.Quaternion()
  const matrix = new THREE.Matrix4(), origin = new THREE.Vector3()
  const delta = 1 / 30
  let discoveredAt = Infinity, minimumClearance = Infinity
  for (let frame = 0; frame < 180 / delta; frame++) {
    const nearest = nearestWorldAt(position, worlds)
    const localNormal = position.clone().sub(nearest.group.position).normalize()
    const clearance = position.distanceTo(nearest.group.position) - surfaceRadius(nearest, localNormal)
    if (position.distanceTo(home.group.position) - home.radius < 60) discoveredAt = Math.min(discoveredAt, frame * delta)
    if (nearest === home && position.distanceTo(target) < 15 && clearance < 35) {
      return { seconds: frame * delta, discoveredAt, minimumClearance, remaining: position.distanceTo(target) }
    }
    const heading = journeyHeading(position, target, nearest, nearest === home)
    const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion)
    matrix.lookAt(origin, heading, cameraUp)
    targetQuaternion.setFromRotationMatrix(matrix)
    quaternion.slerp(targetQuaternion, 1 - Math.exp(-delta * 1.5))
    stepFlight(state, nearest, delta, { yaw: 0, pitch: 0.00001, boost })
    for (const world of worlds) {
      const direction = position.clone().sub(world.group.position).normalize()
      minimumClearance = Math.min(minimumClearance, position.distanceTo(world.group.position) - surfaceRadius(world, direction))
    }
  }
  return { seconds: Infinity, discoveredAt, minimumClearance, remaining: position.distanceTo(target) }
}

describe('optional home guide', () => {
  it('starts only by choice, yields to steering, rejoins after two seconds, and stops fully', () => {
    const guide = createHomeGuide()
    expect(guide.enabled).toBe(false)
    expect(guide.update(10, false)).toBe(false)
    guide.start()
    expect(guide.enabled).toBe(true)
    expect(guide.update(0, false)).toBe(true)
    expect(guide.update(0.1, true)).toBe(false)
    expect(guide.enabled).toBe(true)
    expect(guide.update(1.9, false)).toBe(false)
    expect(guide.update(0.11, false)).toBe(true)
    guide.stop()
    expect(guide.enabled).toBe(false)
    expect(guide.update(10, false)).toBe(false)
  })

  it('routes away from the Earth surface instead of pointing through it', () => {
    const earth = fixture('earth'), home = fixture('fairy')
    const normal = new THREE.Vector3(0, -1, 0)
    const position = earth.group.position.clone().addScaledVector(normal, surfaceRadius(earth, normal) + 6)
    const heading = journeyHeading(position, homeApproachPoint(home), earth, false)
    expect(heading.length()).toBeCloseTo(1)
    expect(heading.dot(normal)).toBeGreaterThan(0)
  })

  it('reaches the home approach safely from varied Earth landscapes and hemispheres', () => {
    const normals = [
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
      ...Array.from({ length: 18 }, (_, i) => {
        const y = 1 - (i + 0.5) / 9, angle = i * 2.399963
        return new THREE.Vector3(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
      }),
    ]
    const results = [123, 456, 789].flatMap((seed) => normals.map((normal) => ({ seed, normal: normal.toArray(), ...simulateJourney(normal, seed) })))
    const failures = results.filter((result) => !Number.isFinite(result.seconds) || result.minimumClearance < 2.299)
    expect(failures, JSON.stringify(failures)).toEqual([])
    expect(results.every((result) => result.discoveredAt <= result.seconds)).toBe(true)
    console.info(`Home guide: ${results.length} Earth routes; ${Math.min(...results.map((result) => result.seconds)).toFixed(1)}–${Math.max(...results.map((result) => result.seconds)).toFixed(1)} seconds; minimum clearance ${Math.min(...results.map((result) => result.minimumClearance)).toFixed(2)}.`)
  })

  it('can go around the home planet to its far-side cottage without crossing the ground', () => {
    const result = simulateJourney(new THREE.Vector3(0, 1, 0), 123, true)
    expect(result.seconds, JSON.stringify(result)).toBeLessThan(180)
    expect(result.minimumClearance).toBeGreaterThanOrEqual(2.299)
  })

  it('still arrives safely when a child holds boost throughout the journey', () => {
    const result = simulateJourney(new THREE.Vector3(0, -1, 0), 123, false, true)
    expect(result.seconds, JSON.stringify(result)).toBeLessThan(180)
    expect(result.minimumClearance).toBeGreaterThanOrEqual(2.299)
  })

  it('descends to a chosen world from space instead of circling it', () => {
    const earth = fixture('earth')
    for (const offset of [[1500, 300, 0], [-900, -1200, 400], [0, 1800, -600]]) {
      const position = earth.group.position.clone().add(new THREE.Vector3(...offset))
      const quaternion = new THREE.Quaternion()
      orientFlight(quaternion, new THREE.Vector3(0, 0, 1).cross(position.clone().sub(earth.group.position)).normalize(), new THREE.Vector3(0, 1, 0))
      const state = { position, quaternion, speed: 430 }
      const matrix = new THREE.Matrix4(), origin = new THREE.Vector3(), targetQuaternion = new THREE.Quaternion()
      const delta = 1 / 30
      let seconds = Infinity, minimumClearance = Infinity
      for (let frame = 0; frame < 120 / delta; frame++) {
        const normal = position.clone().sub(earth.group.position).normalize()
        const clearance = position.distanceTo(earth.group.position) - surfaceRadius(earth, normal)
        minimumClearance = Math.min(minimumClearance, clearance)
        if (clearance < 12) { seconds = frame * delta; break }
        const heading = journeyHeading(position, earth.group.position, earth, true)
        matrix.lookAt(origin, heading, new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion))
        targetQuaternion.setFromRotationMatrix(matrix)
        quaternion.slerp(targetQuaternion, 1 - Math.exp(-delta * 1.5))
        stepFlight(state, earth, delta, { yaw: 0, pitch: 0.00001, boost: false })
      }
      expect(seconds, JSON.stringify({ offset, remaining: position.distanceTo(earth.group.position) })).toBeLessThan(60)
      expect(minimumClearance).toBeGreaterThanOrEqual(2.299)
    }
  })

  it('guides to relocated homes in the inner and outer system, including across the Sun', () => {
    const positions = [[-5000, 0, 0], [13000, 800, 2000], [1300, 700, -400], [0, -1200, -12500]]
    for (const position of positions) {
      const result = simulateJourney(new THREE.Vector3(0, 1, 0), 123, false, false, new THREE.Vector3(...position))
      expect(result.seconds, JSON.stringify({ position, ...result })).toBeLessThan(180)
      expect(result.minimumClearance).toBeGreaterThanOrEqual(2.299)
    }
  })
})
