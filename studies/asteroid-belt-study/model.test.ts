import { describe, expect, it } from 'vitest'
import { seededRandom } from '../../src/terrain'
import {
  auToGame, BELT, beltDensity, budget, cellRocks, clearances, dwarfPosition, DWARF_WORLDS, gameToAu,
  insideDwarfWorld, KIRKWOOD_GAPS, nearCellsAround, relocationRisk, ringRocks, sampleBeltPoint, touchesBelt,
} from './model'

describe('asteroid belt study', () => {
  it('keeps the belt and its largest rocks clear of Mars and Jupiter', () => {
    const { mars, jupiter } = clearances()
    expect(mars).toBeGreaterThan(100)
    expect(jupiter).toBeGreaterThan(100)
    expect(gameToAu(auToGame(2.77))).toBeCloseTo(2.77)
  })

  it('places every sample inside the belt, with the Kirkwood gaps nearly empty', () => {
    const random = seededRandom(3), counts = new Map<number, number>()
    for (let i = 0; i < 60000; i++) {
      const point = sampleBeltPoint(random)
      expect(touchesBelt(point)).toBe(true)
      const bin = Math.round(point.au * 100)
      counts.set(bin, (counts.get(bin) ?? 0) + 1)
    }
    for (const gap of KIRKWOOD_GAPS.slice(0, 3)) {
      const bin = Math.round(gap.au * 100)
      const beside = ((counts.get(bin - 4) ?? 0) + (counts.get(bin + 4) ?? 0)) / 2
      expect(counts.get(bin) ?? 0).toBeLessThan(beside * 0.35)
    }
    expect(beltDensity(2.0)).toBe(0)
    expect(beltDensity(2.72)).toBeGreaterThan(beltDensity(2.3))
  })

  it('finds that relocation can put Blossom Haven into the belt today', () => {
    expect(touchesBelt({ x: 5200, y: 0, z: 0 }, 204)).toBe(true)
    expect(touchesBelt({ x: 4000, y: 0, z: 0 }, 204)).toBe(false)
    const risk = relocationRisk()
    expect(risk).toBeGreaterThan(0.005)
    expect(risk).toBeLessThan(0.05)
  })

  it('reports a budget per option, with half the objects on a phone', () => {
    expect(budget('ribbon', 'desktop')).toMatchObject({ dust: 12000, rocks: 0, drawCalls: 2, matrixUpdates: 0 })
    expect(budget('ring', 'desktop')).toMatchObject({ rocks: 3200, drawCalls: 5, triangles: 3200 * 80 })
    expect(budget('living', 'desktop')).toMatchObject({ worlds: 2, drawCalls: 8 })
    for (const option of ['ribbon', 'ring', 'living'] as const) {
      const desktop = budget(option, 'desktop'), phone = budget(option, 'phone')
      expect(phone.dust).toBe(desktop.dust / 2)
      expect(phone.rocks).toBe(desktop.rocks / 2)
    }
    // The point of option C: rocks close together near the fairy, few rocks in total.
    expect(budget('living', 'desktop').rockSpacing).toBeLessThan(budget('ring', 'desktop').rockSpacing / 2)
    expect(budget('living', 'desktop').rocks).toBeLessThan(budget('ring', 'desktop').rocks)
  })

  it('gives each near-field cell the same rocks on every visit, and none outside the belt', () => {
    expect(cellRocks(43, 0, 3, 14)).toEqual(cellRocks(43, 0, 3, 14))
    expect(cellRocks(0, 0, 0, 14)).toEqual([])
    expect(cellRocks(43, 5, 3, 14)).toEqual([])
    expect(nearCellsAround({ x: 5200, y: 0, z: 0 })).toHaveLength(75)
    expect(ringRocks(200)).toEqual(ringRocks(200))
  })

  it('places the dwarf worlds inside the belt, clear of the gaps', () => {
    for (const world of DWARF_WORLDS) {
      const radius = auToGame(world.au)
      expect(radius - world.radius).toBeGreaterThan(BELT.inner)
      expect(radius + world.radius).toBeLessThan(BELT.outer)
      for (const gap of KIRKWOOD_GAPS) expect(Math.abs(auToGame(gap.au) - radius)).toBeGreaterThan(world.radius)
      // No near-field rock goes through a dwarf world.
      const centre = dwarfPosition(world)
      for (const [ix, iy, iz] of nearCellsAround(centre)) for (const rock of cellRocks(ix, iy, iz, 14)) {
        expect(Math.hypot(rock.x - centre.x, rock.y - centre.y, rock.z - centre.z)).toBeGreaterThan(world.radius + rock.size)
      }
      expect(insideDwarfWorld(centre)).toBe(true)
    }
  })
})
