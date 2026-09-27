import { describe, expect, it } from 'vitest'
import { createField, heightAt, populate, poseOnRoute, safeSegment } from '../../src/creatures/habitat'
import type { Field, LivingWorld } from '../../src/creatures/habitat'

describe('creature habitat boundaries', () => {
  it('rejects a water channel between two dry endpoints and a land barrier between wet endpoints', () => {
    const field: Field = { size: 31, spacing: 0.6, heights: new Float32Array(31 * 31).fill(2), seed: 1, world: 'earth' }
    const a = { x: -4, z: 0 }, b = { x: 4, z: 0 }
    for (let row = 0; row < 31; row++) field.heights[row * 31 + 15] = -2
    expect(safeSegment(field, 'rabbit', a, a)).toBe(true)
    expect(safeSegment(field, 'rabbit', b, b)).toBe(true)
    expect(safeSegment(field, 'rabbit', a, b)).toBe(false)
    for (let i = 0; i < field.heights.length; i++) field.heights[i] *= -1
    expect(safeSegment(field, 'duck', a, a)).toBe(true)
    expect(safeSegment(field, 'duck', a, b)).toBe(false)
  })

  it('skips missing habitats and respects the full body footprint at shorelines and edges', () => {
    const field: Field = { size: 41, spacing: 0.6, heights: new Float32Array(41 * 41).fill(-2), seed: 1, world: 'earth' }
    expect(populate(field, 9).every(resident => resident.kind === 'duck')).toBe(true)
    expect(safeSegment(field, 'duck', { x: 11.8, z: 0 }, { x: 11.8, z: 0 })).toBe(false)
    field.heights.fill(2)
    field.heights[20 * 41 + 21] = -1
    expect(safeSegment(field, 'rabbit', { x: 0, z: 0 }, { x: 0, z: 0 })).toBe(false)
  })

  for (const world of ['earth', 'fairy'] as LivingWorld[]) {
    it(`keeps every animated creature in its habitat on regenerated ${world} terrain`, () => {
      for (const seed of [1, 41, 9102, 0xb10550]) {
        const field = createField(world, seed), residents = populate(field, seed ^ 999)
        expect(new Set(residents.map(r => r.kind)).size).toBe(4)
        expect(populate(field, seed ^ 999)).toEqual(residents)
        expect(populate(field, seed ^ 123)).not.toEqual(residents)
        for (const resident of residents) {
          for (let i = 1; i < resident.route.length; i++) expect(safeSegment(field, resident.kind, resident.route[i - 1], resident.route[i])).toBe(true)
          for (let t = 0; t < 120; t += 0.37) {
            const p = poseOnRoute(resident, t)
            expect(safeSegment(field, resident.kind, p, p)).toBe(true)
            const height = heightAt(field, p.x, p.z)
            if (resident.kind === 'duck') expect(height).toBeLessThan(-0.35)
            else expect(height).toBeGreaterThan(0.45)
          }
        }
      }
    })
  }
})
