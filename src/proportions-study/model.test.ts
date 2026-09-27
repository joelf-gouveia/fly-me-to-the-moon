import { describe, expect, it } from 'vitest'
import { checks, codeChanges, ideal, layout, metrics, PRESETS, TARGETS, TODAY } from './model'

const failing = (settings: typeof TODAY) => checks(metrics(settings)).filter(item => !item.pass).map(item => item.id)

describe('proportions study', () => {
  it('copies the game before the change: the Moon orbit, the belt and the trips', () => {
    const world = layout(TODAY)
    expect(world.earth.radius).toBe(220)
    expect(world.moon.orbit).toBeCloseTo(1100)
    expect(world.moon.radius).toBeCloseTo(60)
    const today = metrics(TODAY)
    expect(today.belt).toEqual({ mars: 163, jupiter: 135 })
    // The study of the Moon measured 19 s from the meadow to the Moon.
    expect(today.trips.moon).toBeCloseTo(19, 0)
    expect(today.aroundEarth).toBeGreaterThan(110)
    expect(today.aroundEarth).toBeLessThan(140)
  })

  it('finds why the Moon looks like a planet today: its orbit is more than half the gap to Mercury', () => {
    const today = metrics(TODAY)
    expect(today.nearest).toBe('Mercury')
    expect(today.pairing).toBeGreaterThan(0.5)
    expect(failing(TODAY)).toEqual(['pair', 'close'])
  })

  it('shows that larger planets alone do not make a pair, and larger spacing does', () => {
    const bigger = metrics({ ...TODAY, size: 1.4 }), wider = metrics({ ...TODAY, spacing: 2.5 })
    expect(bigger.pairing).toBeGreaterThan(metrics(TODAY).pairing)
    expect(wider.pairing).toBeCloseTo(metrics(TODAY).pairing / 2.5, 5)
  })

  it('meets every target with planets ×1.25, and finds no set above 1.4', () => {
    const best = PRESETS.ideal.value()
    expect(best.size).toBe(1.25)
    expect(failing(best)).toEqual([])
    expect(best.spacing).toBeGreaterThan(2)
    expect(best.speed).toBeGreaterThan(1.5)
    expect(ideal(1.4)).not.toBeNull()
    expect(ideal(1.5)).toBeNull()
    // At 1.5 the trees and animals get too sparse.
    expect(metrics({ ...TODAY, size: 1.5 }, false).lifeDensity).toBeLessThan(0.5)
  })

  it('makes a close Moon of real size too large in the sky', () => {
    expect(metrics({ ...TODAY, moonOrbit: 3, moonSize: 0.273 }, false).moonSky).toBeGreaterThan(14)
    expect(metrics({ ...TODAY, moonOrbit: 3.5, moonSize: 0.273 }, false).moonSky).toBeLessThan(14)
  })

  it('makes trips longer with more spacing, and the speed slider brings them back', () => {
    const wide = { ...TODAY, spacing: 2.5 }
    // The climb and the landing do not grow with the spacing, so the trip grows less than the gap.
    expect(metrics(wide, false).trips.mars).toBeGreaterThan(metrics(TODAY, false).trips.mars * 1.5)
    expect(metrics({ ...wide, speed: 2.25 }, false).trips.mars).toBeLessThan(35)
  })

  it('lists the game constants for a setting and fails the wide preset on purpose', () => {
    const rows = codeChanges({ ...TODAY, spacing: 2, size: 1.5 })
    expect(rows.find(row => row.name.includes('HOME_START_POSITION'))!.next).toBe('20,000 · 2,400 · 18,000')
    expect(rows.find(row => row.name.includes('radii · Earth'))!.next).toBe('330')
    expect(failing(PRESETS.wide.value()).length).toBeGreaterThan(3)
    expect(TARGETS).toHaveLength(12)
  })
})
