import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain, groundHeight, HOME_SEED } from '../src/terrain'
import type { PlanetKind } from '../src/terrain'
import { MOON } from '../src/moon'
import { PROPORTIONS } from '../src/proportions'
import { homeCottageNormal, meadowNormal, regenerateWorld, surfaceRadius } from '../src/worlds'
import type { World } from '../src/worlds'
import { RING, RING_CHIME, RING_LINE_MAX, RING_SCALE, RING_SHAPE_NAMES, RING_SHAPES, RING_WORLDS, ringCountBase, ringGeometry, ringLine, ringLines, ringNotes, ringNumbers, ringPass, ringShapeAt, ringShapeNotes, ringShapePoints, ringShapeTube, sceneryObstacles, shapeLine } from '../src/rings'
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
    const earth = built('earth', 41)
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

  it('makes the second line of each world a shape line that starts after the end of the first line', () => {
    const cases: [PlanetKind, number][] = [['earth', 44], ['earth', 1234], ['fairy', HOME_SEED], ['moon', MOON.seed]]
    for (const [kind, seed] of cases) {
      const groups = byLine(ringLines(built(kind, seed)))
      groups.forEach((line, number) => line.forEach((ring, index) => {
        expect(ring.line).toBe(number)
        expect(ring.shape).toBe(ringShapeAt(number, index))
      }))
      // The first line counts, and the second line has each shape one time or more.
      expect(groups[0].every(ring => ring.shape === null)).toBe(true)
      expect(new Set(groups[1].map(ring => ring.shape))).toEqual(new Set(RING_SHAPES))
      // The shapes start 40 m or more from the last ring of the count line, and near it.
      const gap = groups[1][0].position.distanceTo(groups[0][groups[0].length - 1].position)
      expect(gap).toBeGreaterThanOrEqual(40)
      expect(gap).toBeLessThan(110)
    }
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

  it('gives a crowded world all its lines: the lines keep clear of the large obstacles only', () => {
    const earth = built('earth', 44, true)
    // A tall plant of 15 m at 2,000 places: no room for a line that keeps clear of each one.
    const plants = Array.from({ length: 2000 }, (_, i) => {
      const y = 1 - (i + 0.5) / 1000, angle = i * 2.399963
      return { normal: new THREE.Vector3(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle)), radius: 15, top: earth.radius + 40 }
    })
    expect(ringLine(earth, 5, { obstacles: plants })).toEqual([])
    const rings = ringLines(earth, earth.seed, plants)
    expect(new Set(rings.map(ring => ring.line)).size).toBe(5)
    // A large obstacle, such as the cottage, stays clear in each rule.
    const cottage = [{ normal: rings[0].position.clone().normalize(), radius: 24, top: earth.radius + 40 }]
    const clear = ringLines(earth, earth.seed, [...plants, ...cottage])
    expect(new Set(clear.map(ring => ring.line)).size).toBe(5)
    for (const ring of clear) expect(ring.position.clone().normalize().angleTo(cottage[0].normal) * earth.radius).toBeGreaterThan(24)
  }, 120000)

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

describe('the count of a ring line', () => {
  const free = (length: number) => Array.from({ length }, () => false)

  it('counts a new line from the ring nearest to the fairy, from each end', () => {
    expect(ringNumbers(free(5), 0, 0)).toEqual([1, 2, 3, 4, 5])
    expect(ringNumbers(free(5), 4, 0)).toEqual([5, 4, 3, 2, 1])
    expect(ringNumbers(free(7), 0, 0)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('counts from the middle of a line to the two sides', () => {
    expect(ringNumbers(free(5), 2, 0)).toEqual([3, 2, 1, 2, 3])
  })

  it('goes on from the last ring that the fairy took', () => {
    // She took rings 0 and 1 as 1 and 2.
    expect(ringNumbers([true, true, false, false, false], 1, 2)).toEqual([0, 0, 3, 4, 5])
    // She started in the middle, flew to the end, and comes back: the rings on the way are gone.
    expect(ringNumbers([false, false, true, true, true], 4, 3)).toEqual([5, 4, 0, 0, 0])
  })

  it('never gives a number above the length of the line', () => {
    for (let length = 5; length <= RING_LINE_MAX; length++) for (let from = 0; from < length; from++) {
      expect(Math.max(...ringNumbers(free(length), from, 0))).toBeLessThanOrEqual(length)
    }
  })

  it('counts on past a ring that she missed: the next ring that she takes has the next number', () => {
    // She took ring 0 as 1 and flew past ring 1. Before ring 1 she is nearest to it: ring 2 is 3 if she takes ring 1.
    expect(ringNumbers([true, false, false, false, false], 1, 1)).toEqual([0, 2, 3, 4, 5])
    // After ring 1 she is nearest to ring 2: it is 2, and ring 1 is 3 if she turns back.
    expect(ringNumbers([true, false, false, false, false], 2, 1)).toEqual([0, 3, 2, 3, 4])
    // She took ring 2 as 2. Ring 1 is behind her: it is 3 if she turns back.
    expect(ringNumbers([true, false, true, false, false], 2, 2)).toEqual([0, 3, 0, 3, 4])
  })

  it('never shows a number above the length of the line, also when rings came back in a slow count', () => {
    for (let length = 5; length <= RING_LINE_MAX; length++) for (let from = 0; from < length; from++) for (let base = 0; base < length; base++) {
      const numbers = ringNumbers(free(length), from, base)
      expect(Math.max(...numbers)).toBeLessThanOrEqual(length)
      // The ring nearest to her is always the next number.
      expect(numbers[from]).toBe(base + 1)
    }
  })

  it('counts on from the last ring, and starts again after the gap and after the full count', () => {
    expect(ringCountBase(null, 5, 100)).toBe(0)
    expect(ringCountBase({ number: 3, at: 100 }, 5, 100 + RING.countGap)).toBe(3)
    expect(ringCountBase({ number: 3, at: 100 }, 5, 100 + RING.countGap + 0.1)).toBe(0)
    // The line of five is complete at 5: the next ring is 1. A line of seven goes on to 7.
    expect(ringCountBase({ number: 5, at: 100 }, 5, 101)).toBe(0)
    expect(ringCountBase({ number: 5, at: 100 }, 7, 101)).toBe(5)
    expect(ringCountBase({ number: 7, at: 100 }, 7, 101)).toBe(0)
  })

  it('gives a rising scale, with the notes of before for the third ring', () => {
    expect(RING_SCALE).toHaveLength(RING_LINE_MAX)
    RING_SCALE.slice(1).forEach((note, index) => expect(note).toBeGreaterThan(RING_SCALE[index]))
    for (let number = 1; number <= RING_LINE_MAX; number++) {
      const [note, fifth] = ringNotes(number)
      expect(note).toBe(RING_SCALE[number - 1])
      expect(fifth / note).toBeCloseTo(1.5, 2)
    }
    expect(ringNotes(3)[0]).toBe(RING_CHIME[0])
    expect(ringNotes(3)[1]).toBeCloseTo(RING_CHIME[1], -1)
    // A number outside the scale takes the nearest note.
    expect(ringNotes(0)).toEqual(ringNotes(1))
    expect(ringNotes(9)).toEqual(ringNotes(RING_LINE_MAX))
  })
})

describe('the shape lines', () => {
  it('makes the second and the fourth line of a world a shape line, and never the first', () => {
    expect([0, 1, 2, 3, 4].map(shapeLine)).toEqual([false, true, false, true, false])
    // Earth has two shape lines of five lines. Blossom Haven and the Moon have one of three.
    const shapeLines = (lines: number) => Array.from({ length: lines }, (_, line) => line).filter(shapeLine).length
    expect(shapeLines(RING_WORLDS.earth!)).toBe(2)
    expect(shapeLines(RING_WORLDS.fairy!)).toBe(1)
    expect(shapeLines(RING_WORLDS.moon!)).toBe(1)
  })

  it('gives each ring of a shape line a shape, in order, and no shape in a count line', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(index => ringShapeAt(1, index))).toEqual(['circle', 'triangle', 'square', 'star', 'heart', 'circle', 'triangle'])
    // The second shape line starts at the triangle. Each line of five rings or more has all the shapes.
    expect([0, 1, 2, 3, 4].map(index => ringShapeAt(3, index))).toEqual(['triangle', 'square', 'star', 'heart', 'circle'])
    for (const line of [0, 2, 4]) for (let index = 0; index < RING_LINE_MAX; index++) expect(ringShapeAt(line, index)).toBeNull()
    for (const shape of RING_SHAPES) expect(RING_SHAPE_NAMES[shape]).toMatch(/^[A-Z][a-z]+$/)
  })

  it('makes each shape about the size of the ring, so the disc of the pass is a fair test', () => {
    for (const shape of RING_SHAPES) {
      const points = ringShapePoints(shape)
      // No corner is more than a small margin outside the disc of the pass.
      expect(Math.max(...points.map(([x, y]) => Math.hypot(x, y)))).toBeLessThanOrEqual(RING.radius + RING.reach + 0.15)
      // The shape is as large as the torus, or nearly: its width and its height.
      for (const axis of [0, 1]) {
        const span = Math.max(...points.map(point => point[axis])) - Math.min(...points.map(point => point[axis]))
        expect(span).toBeGreaterThanOrEqual(RING.radius * 2 - 0.6)
      }
      // The fairy fits in the middle: each side is 1.2 m or more from the ring centre.
      let inner = Infinity, area = 0
      points.forEach(([ax, ay], i) => {
        const [bx, by] = points[(i + 1) % points.length]
        const t = THREE.MathUtils.clamp(-(ax * (bx - ax) + ay * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2), 0, 1)
        inner = Math.min(inner, Math.hypot(ax + t * (bx - ax), ay + t * (by - ay)))
        area += ax * by - bx * ay
      })
      expect(inner).toBeGreaterThanOrEqual(1.2)
      // Counter-clockwise, and the same in a mirror: the child sees the ring from the two sides.
      expect(area).toBeGreaterThan(0)
      for (const [x, y] of points) expect(points.some(([mx, my]) => Math.abs(mx + x) < 1e-9 && Math.abs(my - y) < 1e-9)).toBe(true)
      // The lowest point stays near the bottom of the torus, which ringClear() keeps over the ground.
      expect(Math.min(...points.map(point => point[1]))).toBeGreaterThanOrEqual(-RING.radius - 0.4)
      // The top stays under the plate.
      expect(Math.max(...points.map(point => point[1])) + RING.tube * 2.2).toBeLessThan(RING.dotsHeight - RING.dotsSize / 2)
    }
    // The circle is the torus.
    for (const [x, y] of ringShapePoints('circle')) expect(Math.hypot(x, y)).toBeCloseTo(RING.radius, 9)
  })

  it('builds a closed tube along each outline, with its faces to the outside', () => {
    for (const shape of RING_SHAPES) {
      const points = ringShapePoints(shape), { positions, index } = ringShapeTube(shape, 6)
      expect(positions).toHaveLength(points.length * 6 * 3)
      expect(index).toHaveLength(points.length * 6 * 6)
      const vertex = (i: number) => new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      for (let face = 0; face < index.length; face += 3) {
        const [a, b, c] = [vertex(index[face]), vertex(index[face + 1]), vertex(index[face + 2])]
        const normal = b.clone().sub(a).cross(c.clone().sub(a))
        // The side of the outline that this face goes along.
        const i = Math.floor(index[face] / 6), [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length]
        const middle = a.clone().add(b).add(c).divideScalar(3), from = new THREE.Vector3(ax, ay, 0), along = new THREE.Vector3(bx - ax, by - ay, 0).normalize()
        const out = middle.sub(from).addScaledVector(along, -middle.dot(along))
        expect(normal.dot(out)).toBeGreaterThan(0)
      }
      // The tube stays near its outline: a mitre is at most 2.2 times the tube.
      for (let i = 0; i < positions.length / 3; i++) {
        const [x, y] = points[Math.floor(i / 6)]
        expect(Math.hypot(positions[i * 3] - x, positions[i * 3 + 1] - y, positions[i * 3 + 2])).toBeLessThanOrEqual(RING.tube * 2.2 + 1e-9)
      }
    }
  })

  it('puts the torus and the four other shapes in one geometry, each with its part number', () => {
    const geometry = ringGeometry(true), parts = geometry.attributes.ringPart
    expect(parts.count).toBe(geometry.attributes.position.count)
    expect([...new Set(parts.array as Float32Array)]).toEqual([0, 1, 2, 3, 4])
    // A triangle of the index never joins two parts.
    const index = geometry.index!.array
    for (let i = 0; i < index.length; i += 3) expect(new Set([parts.getX(index[i]), parts.getX(index[i + 1]), parts.getX(index[i + 2])]).size).toBe(1)
    // A phone draws less than 1,200 triangles for a ring, and only one part of them has a size.
    expect(index.length / 3).toBeLessThan(1200)
  })

  it('gives each shape its own note of the scale', () => {
    RING_SHAPES.forEach((shape, index) => expect(ringShapeNotes(shape)).toEqual(ringNotes(index + 1)))
    expect(new Set(RING_SHAPES.map(shape => ringShapeNotes(shape)[0])).size).toBe(RING_SHAPES.length)
  })
})
