import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain, groundHeight, HOME_SEED } from '../src/terrain'
import type { PlanetKind } from '../src/terrain'
import { MOON } from '../src/moon'
import { PROPORTIONS } from '../src/proportions'
import { homeCottageNormal, meadowNormal, regenerateWorld, surfaceRadius } from '../src/worlds'
import type { World } from '../src/worlds'
import { RING, RING_LINE_MAX, ringLine, ringLines, ringPass, sceneryObstacles } from '../src/rings'
import type { RingObstacle, RingPlacement } from '../src/rings'

function world(kind: PlanetKind, seed: number, mobile = false): World {
  const group = new THREE.Group(), surface = new THREE.Group(), clouds = new THREE.Group()
  group.add(surface, clouds)
  const radius = kind === 'fairy' ? 110 * PROPORTIONS.size : kind === 'moon' ? MOON.radius : 220 * PROPORTIONS.size
  return {
    name: kind, kind, radius, atmosphere: kind === 'moon' ? 0 : 78, cloudHeight: kind === 'moon' ? 0 : 34,
    color: 0, sky: new THREE.Color(), group, surface, clouds, sample: createTerrain(kind, seed),
    seed, visit: 0, armed: false, gas: false, mobile,
  }
}

const cache = new Map<string, World>()
/** A built world: ground, water, trees or candy, the cottage and the creatures. A test can share it. */
function built(kind: PlanetKind, seed: number, fresh = false) {
  const key = `${kind}:${seed}`
  if (!fresh && cache.has(key)) return cache.get(key)!
  const target = world(kind, seed)
  regenerateWorld(target, seed)
  if (!fresh) cache.set(key, target)
  return target
}

const above = (target: World, position: THREE.Vector3) => position.length() - surfaceRadius(target, position.clone().normalize())

/** Every rule of a safe ring: height, ground under the disc, dry land, and clear of the scenery. */
function expectSafe(target: World, rings: RingPlacement[], obstacles: RingObstacle[]) {
  for (const ring of rings) {
    const normal = ring.position.clone().normalize()
    expect(above(target, ring.position)).toBeGreaterThanOrEqual(RING.low)
    expect(above(target, ring.position)).toBeLessThanOrEqual(RING.high)
    expect(Math.abs(ring.axis.length() - 1)).toBeLessThan(1e-6)
    // The ring stands up: its axis lies nearly along the ground.
    expect(Math.abs(ring.axis.dot(normal))).toBeLessThan(0.35)
    if (target.kind === 'earth' || target.kind === 'fairy') {
      const sample = target.sample(normal.x, normal.y, normal.z)
      expect(sample.height).toBeGreaterThan(0.7)
      expect(sample.river).toBeLessThan(0.1)
    }
    for (const obstacle of obstacles) {
      const apart = normal.angleTo(obstacle.normal) * target.radius
      const clear = apart >= RING.radius + obstacle.radius + 1.5 || obstacle.top + 1.2 <= ring.position.length() - RING.radius
      expect(clear).toBe(true)
    }
  }
}

/** The lines of a world, by line number. */
const byLine = (rings: RingPlacement[]) => [...new Set(rings.map(ring => ring.line))].map(line => rings.filter(ring => ring.line === line))

// Each built world takes some seconds: ground, trees, candy and creatures.
describe('sparkle ring placement', { timeout: 120000 }, () => {
  it('finds the tall scenery: trees on Earth, candy and the cottage on Blossom Haven', () => {
    const earth = built('earth', 44)
    const trees = sceneryObstacles(earth)
    expect(trees.length).toBeGreaterThan(1000)
    for (const tree of trees.slice(0, 200)) {
      const ground = earth.radius + groundHeight('earth', earth.sample(tree.normal.x, tree.normal.y, tree.normal.z))
      expect(tree.top - ground).toBeGreaterThan(1.2)
      expect(tree.top - ground).toBeLessThan(8)
    }
    const home = built('fairy', HOME_SEED)
    const candy = sceneryObstacles(home)
    expect(candy.some(item => item.radius === 24 && item.normal.distanceTo(homeCottageNormal()) < 1e-6)).toBe(true)
    // Lollipops are the tallest candy: up to 9.5 m.
    expect(Math.max(...candy.map(item => item.top - home.radius))).toBeGreaterThan(9)
  })

  it('puts 5 to 7 safe rings in each line of Earth, Blossom Haven and the Moon', () => {
    const cases: [PlanetKind, number, number][] = [['earth', 44, 5], ['earth', 1234, 5], ['fairy', HOME_SEED, 3], ['moon', MOON.seed, 3]]
    for (const [kind, seed, lines] of cases) {
      const target = built(kind, seed)
      const obstacles = sceneryObstacles(target)
      const rings = ringLines(target, seed, obstacles)
      const groups = byLine(rings)
      expect(groups).toHaveLength(lines)
      for (const line of groups) {
        expect(line.length).toBeGreaterThanOrEqual(5)
        expect(line.length).toBeLessThanOrEqual(RING_LINE_MAX)
        // A smooth, gentle curve: even steps, small turns, small changes of height.
        for (let i = 1; i < line.length; i++) {
          const step = line[i].position.distanceTo(line[i - 1].position)
          expect(step).toBeGreaterThan(8)
          expect(step).toBeLessThan(RING.spacing * 1.25 * 1.1 + 1)
          expect(Math.abs(line[i].position.length() - line[i - 1].position.length())).toBeLessThanOrEqual(2.5 + 1e-9)
          expect(line[i].axis.angleTo(line[i - 1].axis)).toBeLessThan(0.35)
        }
      }
      expectSafe(target, rings, obstacles)
      // The lines keep 40 m apart.
      for (const a of rings) for (const b of rings) if (a.line !== b.line) expect(a.position.distanceTo(b.position)).toBeGreaterThanOrEqual(40)
    }
  })

  it('gives the same lines for the same seed and new lines for a new Earth', () => {
    const first = ringLines(built('earth', 77)).map(ring => ring.position.toArray())
    const again = ringLines(built('earth', 77)).map(ring => ring.position.toArray())
    const next = ringLines(built('earth', 78)).map(ring => ring.position.toArray())
    expect(again).toEqual(first)
    expect(next).not.toEqual(first)
  })

  it('starts the first Earth line ahead of the fairy at the meadow', () => {
    const earth = built('earth', 44)
    const meadow = meadowNormal(earth)
    const heading = new THREE.Vector3().crossVectors(meadow, new THREE.Vector3(0, 1, 0)).normalize()
    const start = meadow.clone().multiplyScalar(surfaceRadius(earth, meadow) + 7)
    const ring = ringLines(earth)[0]
    const toRing = ring.position.clone().sub(start)
    expect(toRing.length()).toBeLessThan(120)
    expect(toRing.normalize().dot(heading)).toBeGreaterThan(0.3)
    // Near the height of the fairy: she can fly straight into it.
    expect(Math.abs(ring.position.length() - start.length())).toBeLessThan(5)
  })

  it('keeps clear of an obstacle in the way and returns no line when there is no room', () => {
    const earth = world('earth', 44)
    const free = ringLine(earth, 5)
    expect(free.length).toBeGreaterThanOrEqual(5)
    // A tall tower at each ring of the free line: the new line goes around them.
    const towers = free.map(ring => ({ normal: ring.position.clone().normalize(), radius: 2, top: earth.radius + 40 }))
    const around = ringLine(earth, 5, { obstacles: towers })
    expect(around.length).toBeGreaterThanOrEqual(5)
    expectSafe(earth, around, towers)
    // A forest of tall towers everywhere: no room for a line.
    const wall = Array.from({ length: 2000 }, (_, i) => {
      const y = 1 - (i + 0.5) / 1000, angle = i * 2.399963
      return { normal: new THREE.Vector3(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle)), radius: 30, top: earth.radius + 40 }
    })
    expect(ringLine(earth, 5, { obstacles: wall })).toEqual([])
  })

  it('places the rings in the frame of the world group, whatever its turn', () => {
    const earth = built('earth', 44, true)
    const before = ringLines(earth).map(ring => ring.position.toArray())
    earth.group.rotation.set(0.3, 1.2, 0)
    const after = ringLines(earth).map(ring => ring.position.toArray())
    expect(after).toHaveLength(before.length)
    after.flat().forEach((value, i) => expect(value).toBeCloseTo(before.flat()[i], 6))
  })
})

describe('sparkle ring pass', () => {
  const centre = new THREE.Vector3(10, 5, -3), axis = new THREE.Vector3(1, 0, 0)
  const point = (x: number, y = 5, z = -3) => new THREE.Vector3(x, y, z)

  it('takes a ring when the fairy flies through the disc', () => {
    expect(ringPass(point(9.7), point(10.2), centre, axis)).toBe(true)
    expect(ringPass(point(10.2), point(9.7), centre, axis)).toBe(true)
    expect(ringPass(point(9.7, 7), point(10.2, 7), centre, axis)).toBe(true)
  })

  it('takes a ring at boost speed: a long step from one side to the other', () => {
    // 30 m/s at 20 frames a second is 1.5 m in one frame; the start and the end are both far from the plane.
    expect(ringPass(point(9.2), point(10.8), centre, axis)).toBe(true)
    expect(ringPass(point(4), point(16, 6, -2), centre, axis)).toBe(true)
  })

  it('does not take a ring the fairy flies past or toward', () => {
    expect(ringPass(point(9.2, 5 + RING.radius + RING.reach + 0.1), point(10.8, 5 + RING.radius + RING.reach + 0.1), centre, axis)).toBe(false)
    expect(ringPass(point(4), point(8), centre, axis)).toBe(false)
    expect(ringPass(point(12), point(16), centre, axis)).toBe(false)
    // Along the plane, outside the disc.
    expect(ringPass(point(10, 20), point(10, 12), centre, axis)).toBe(false)
  })

  it('takes a ring when the fairy stops in it, near its plane', () => {
    expect(ringPass(point(9.5), point(9.5), centre, axis)).toBe(true)
    expect(ringPass(point(8), point(8), centre, axis)).toBe(false)
  })
})
