import { describe, expect, it } from 'vitest'
import { Color, Quaternion, Vector3 } from 'three'
import { daylightAt, morningSpin, skyColor, skyProfile, solarElevation } from '../src/daylight'

describe('solar elevation', () => {
  const center = new Vector3(), sun = new Vector3(10000, 0, 0)
  it('distinguishes noon, midnight and the horizon, independent of translation', () => {
    const point = new Vector3(220, 0, 0)
    expect(solarElevation(point, center, sun)).toBeCloseTo(90)
    expect(solarElevation(point.clone().negate(), center, sun)).toBeCloseTo(-90)
    // A finite Sun distance puts it slightly below the horizon at the terminator.
    expect(solarElevation(new Vector3(0, 0, 220), center, sun)).toBeCloseTo(-Math.atan(220 / 10000) * 180 / Math.PI)
    const offset = new Vector3(1000, -400, 300)
    expect(solarElevation(point.clone().add(offset), offset, sun.clone().add(offset))).toBeCloseTo(90)
  })
  it('follows axial spin at the equator but not at a pole', () => {
    const spin = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)
    expect(solarElevation(new Vector3(220, 0, 0).applyQuaternion(spin), center, sun)).toBeCloseTo(-90)
    const pole = new Vector3(0, -220, 0)
    const before = solarElevation(pole, center, sun)
    expect(solarElevation(pole.clone().applyQuaternion(spin), center, sun)).toBeCloseTo(before)
  })
  it('recomputes after a world moves to the other side of the Sun', () => {
    const moved = new Vector3(20000, 0, 0)
    expect(solarElevation(new Vector3(220, 0, 0).add(moved), moved, sun)).toBeCloseTo(-90)
  })
})

describe('daylight factors', () => {
  it('shows full day at noon and full night with stars at midnight', () => {
    expect(daylightAt(60)).toMatchObject({ day: 1, night: 0, stars: 0, twilight: 0 })
    expect(daylightAt(-60)).toMatchObject({ day: 0, night: 1, stars: 1, twilight: 0 })
  })
  it('keeps twilight near the horizon and changes gradually', () => {
    expect(daylightAt(-1).twilight).toBeGreaterThan(0.8)
    expect(daylightAt(30).twilight).toBe(0)
    for (let elevation = -30; elevation < 30; elevation++) {
      expect(daylightAt(elevation + 1).day).toBeGreaterThanOrEqual(daylightAt(elevation).day)
      expect(daylightAt(elevation + 1).day - daylightAt(elevation).day).toBeLessThan(0.12)
    }
  })
})

describe('sky colors', () => {
  const earth = skyProfile({ kind: 'earth', sky: new Color(0x83c5e8) })
  it('uses the world sky by day and the night palette after dark', () => {
    expect(skyColor(earth, daylightAt(60), new Color()).getHex()).toBe(0x83c5e8)
    expect(skyColor(earth, daylightAt(-60), new Color()).getHex()).toBe(earth.night.getHex())
  })
  it('hides most stars behind thick Venus clouds', () => {
    expect(skyProfile({ kind: 'venus', sky: new Color() }).starClarity).toBeLessThan(0.2)
    expect(skyProfile({ kind: 'mars', sky: new Color() }).starClarity).toBe(1)
  })
})

describe('morning start', () => {
  it('turns a meadow into rising mid-morning light', () => {
    const center = new Vector3(3300, 0, 250), sun = new Vector3()
    const meadow = new Vector3(0.3, 0.25, -0.9).normalize()
    const angle = morningSpin(meadow, center, sun)
    const axis = new Vector3(0, 1, 0)
    const at = (turn: number) => solarElevation(meadow.clone().applyAxisAngle(axis, turn).multiplyScalar(220).add(center), center, sun)
    expect(at(angle)).toBeGreaterThan(15)
    expect(at(angle)).toBeLessThan(35)
    expect(at(angle + 0.05)).toBeGreaterThan(at(angle))
  })
})
