import { describe, expect, it } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import { advanceHour, lightingAtElevation, sampleHour, solarElevation } from './model'

describe('solar geometry', () => {
  const center = new Vector3(), sun = new Vector3(10000, 0, 0)
  it('distinguishes opposite sides of a planet and is translation invariant', () => {
    const point = new Vector3(110, 0, 0)
    expect(solarElevation(point, center, sun)).toBeCloseTo(90)
    expect(solarElevation(point.clone().negate(), center, sun)).toBeCloseTo(-90)
    const offset = new Vector3(1000, -400, 300)
    expect(solarElevation(point.clone().add(offset), offset, sun.clone().add(offset))).toBeCloseTo(90)
  })
  it('responds to axial rotation without a separate time-of-day clock', () => {
    const point = new Vector3(110, 0, 0).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI))
    expect(solarElevation(point, center, sun)).toBeCloseTo(-90)
  })
  it('does not invent a spin-driven cycle at the polar cottage', () => {
    const pole = new Vector3(0, -110, 0)
    const elevation = solarElevation(pole, center, sun)
    pole.applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 2.1))
    expect(solarElevation(pole, center, sun)).toBeCloseTo(elevation)
  })
  it('recomputes sunlight after relocation', () => {
    const offset = new Vector3(20000, 0, 0)
    expect(solarElevation(new Vector3(110, 0, 0).add(offset), offset, sun)).toBeCloseTo(-90)
  })
})

describe('lighting proposal', () => {
  it('removes direct sun and reveals stars at midnight while keeping gentle fill', () => {
    const night = sampleHour(0, 'gentle')
    expect(night.sunIntensity).toBe(0)
    expect(night.stars).toBe(1)
    expect(night.ambientIntensity).toBeGreaterThan(sampleHour(0, 'deep').ambientIntensity)
    expect(sampleHour(12, 'gentle').stars).toBe(0)
    expect(sampleHour(12, 'gentle').sunIntensity).toBe(3)
  })
  it('wraps midnight continuously and advances only positive active time', () => {
    expect(advanceHour(23.9, 1, 48)).toBeCloseTo(0.4)
    expect(advanceHour(12, 0, 48)).toBe(12)
    expect(advanceHour(12, -1, 48)).toBe(12)
    expect(sampleHour(0, 'gentle').day).toBe(sampleHour(24, 'gentle').day)
  })
  it('has continuous twilight transitions at the horizon', () => {
    const before = lightingAtElevation(-0.001, 'gentle'), after = lightingAtElevation(0.001, 'gentle')
    expect(Math.abs(before.sunIntensity - after.sunIntensity)).toBeLessThan(0.002)
    expect(Math.abs(before.ambientIntensity - after.ambientIntensity)).toBeLessThan(0.002)
  })
})
