import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createRelocationClock, clearHomePosition, findHomePosition, occupiedRadius, relocateHome } from './relocation'
import { createTerrain, seededRandom } from './terrain'
import { BELT, touchesBelt } from './belt'
import { homeApproachPoint, homeMarkerPosition } from './journey'
import type { World } from './worlds'

function fixture(kind: World['kind'], radius: number, position: number[]): World {
  const group = new THREE.Group(); group.position.set(position[0], position[1], position[2])
  return { name: kind, kind, radius, atmosphere: kind === 'sun' ? 0 : 52, cloudHeight: 24, color: 0, sky: new THREE.Color(), group, surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain(kind === 'sun' ? 'mercury' : kind, 1), seed: 1, visit: 1, armed: false, gas: false }
}

describe('five-minute magical relocation', () => {
  it('moves at five active minutes, freezes time for guided trips, and resumes afterwards', () => {
    const clock = createRelocationClock(); let attempts = 0
    const move = () => { attempts++; return true }
    expect(clock.update(299, false, move)).toBe(false)
    expect(clock.update(900, true, move)).toBe(false)
    expect(clock.elapsed).toBe(299)
    expect(clock.update(0, false, move)).toBe(false)
    expect(clock.update(1, false, move)).toBe(true)
    expect(attempts).toBe(1)
    expect(clock.moves).toBe(1)
    expect(clock.elapsed).toBe(0)
  })
  it('allows a manual approach and does not catch up with multiple jumps or count failed moves', () => {
    const clock = createRelocationClock()
    expect(clock.update(300, false, () => false)).toBe(false)
    expect(clock.moves).toBe(0)
    expect(clock.update(1000, false, () => true)).toBe(true)
    expect(clock.moves).toBe(1)
    expect(clock.elapsed).toBe(0)
  })
  it('finds positions throughout the system clear of planets, atmospheres, rings and the fairy', () => {
    const home = fixture('fairy', 110, [3300, 1100, 264])
    const earth = fixture('earth', 220, [3300, 0, 264])
    const saturn = fixture('saturn', 390, [7000, 0, 1000])
    const sun = fixture('sun', 600, [0, 0, 0])
    const worlds = [home, earth, saturn, sun], fairy = new THREE.Vector3(3500, 250, 200)
    const random = seededRandom(152), radii: number[] = []
    for (let i = 0; i < 200; i++) {
      const position = findHomePosition(home, worlds, fairy, false, random)
      expect(position).not.toBeNull()
      expect(clearHomePosition(position!, home, worlds, fairy, false)).toBe(true)
      expect(touchesBelt(position!, occupiedRadius(home))).toBe(false)
      radii.push(Math.hypot(position!.x, position!.z))
      home.group.position.copy(position!)
    }
    expect(Math.min(...radii)).toBeLessThan(3300)
    expect(Math.max(...radii)).toBeGreaterThan(13000)
    expect(occupiedRadius(saturn)).toBeCloseTo(819)
    expect(clearHomePosition(saturn.group.position.clone().add(new THREE.Vector3(850, 0, 0)), home, worlds, fairy, false)).toBe(false)
    expect(clearHomePosition(fairy, home, worlds, fairy, false)).toBe(false)
    // The middle of the asteroid belt, and a place just above it.
    const beltMiddle = (BELT.inner + BELT.outer) / 2
    expect(clearHomePosition(new THREE.Vector3(-beltMiddle, 0, 0), home, worlds, fairy, false)).toBe(false)
    expect(clearHomePosition(new THREE.Vector3(-beltMiddle, BELT.halfHeight + 200, 0), home, worlds, fairy, false)).toBe(false)
    expect(clearHomePosition(new THREE.Vector3(-beltMiddle, BELT.halfHeight + 500, 0), home, worlds, fairy, false)).toBe(true)
    const blocked = fixture('sun', 100000, [0, 0, 0])
    expect(findHomePosition(home, [home, blocked], fairy, false, random)).toBeNull()
  })
  it('carries a visiting fairy at exactly the same local altitude without changing her home', () => {
    const home = fixture('fairy', 110, [3300, 1100, 264])
    const player = home.group.position.clone().add(new THREE.Vector3(0, -125, 0))
    const local = player.clone().sub(home.group.position), sample = home.sample, target = homeApproachPoint(home)
    const marker = homeMarkerPosition(home)
    const next = new THREE.Vector3(-1800, 700, 4000)
    const result = relocateHome(home, next, player)
    expect(result.carrying).toBe(true)
    expect(player.clone().sub(home.group.position).toArray()).toEqual(local.toArray())
    expect(home.sample).toBe(sample)
    expect(home.seed).toBe(1)
    expect(homeApproachPoint(home).distanceTo(target.add(result.offset))).toBeLessThan(1e-10)
    expect(homeMarkerPosition(home).distanceTo(marker.add(result.offset))).toBeLessThan(1e-10)
  })
  it('leaves a manually approaching fairy in space when the planet moves', () => {
    const home = fixture('fairy', 110, [3300, 1100, 264])
    const player = home.group.position.clone().add(new THREE.Vector3(0, -350, 0)), previous = player.clone()
    expect(relocateHome(home, new THREE.Vector3(-5000, 300, 1200), player).carrying).toBe(false)
    expect(player.toArray()).toEqual(previous.toArray())
  })
})
