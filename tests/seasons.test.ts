import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { morningSpin, solarElevation } from '../src/daylight'
import {
  createSeasonUniforms, declination, EARTH_TILT, fallAt, leanEarth, localYear, LOOK_LAG, plantSeason, seasonAt, seasonStrength, setSeason,
  snowCover, warmth, yearOf, yearOfDate,
} from '../src/seasons'
import { meadowNormal } from '../src/worlds'
import type { World } from '../src/worlds'
import { createTerrain } from '../src/terrain'

/** Earth at an angle of its orbit, with the Sun at the origin. Only the parts that the lean reads. */
function earthAt(angle: number) {
  const group = new THREE.Group()
  group.position.set(Math.cos(angle) * 8250, 0, Math.sin(angle) * 8250)
  return { group, kind: 'earth' } as unknown as World
}
const sun = new THREE.Vector3()
/** The latitude of the place with the Sun overhead, from the geometry of a leaned Earth. */
function sunLatitude(earth: World) {
  const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(earth.group.quaternion)
  return THREE.MathUtils.radToDeg(Math.asin(axis.dot(sun.clone().sub(earth.group.position).normalize())))
}

describe('the Sun through the year', () => {
  it('is over the equator at the equinoxes and over a tropic at the solstices', () => {
    expect(declination(0)).toBeCloseTo(0)
    expect(declination(0.25)).toBeCloseTo(EARTH_TILT)
    expect(declination(0.5)).toBeCloseTo(0)
    expect(declination(0.75)).toBeCloseTo(-EARTH_TILT)
  })

  it('reads the year from a real date', () => {
    expect(yearOfDate(new Date(Date.UTC(2026, 2, 20)))).toBeCloseTo(0)
    expect(yearOfDate(new Date(Date.UTC(2026, 5, 21)))).toBeCloseTo(0.25, 1)
    expect(yearOfDate(new Date(Date.UTC(2027, 0, 5)))).toBeCloseTo(0.8, 1)
  })
})

describe('the lean of Earth', () => {
  it('puts the Sun over the latitude of the day, for each start of the year', () => {
    for (const start of [0.08, 2.1, 4.4]) for (const year of [0, 0.125, 0.25, 0.4, 0.5, 0.75, 0.9]) {
      const earth = earthAt(start)
      leanEarth(earth, sun, year)
      expect(sunLatitude(earth)).toBeCloseTo(declination(year), 4)
      expect(yearOf(earth, sun)).toBeCloseTo(year, 6)
      expect(earth.tilt!.angle).toBe(EARTH_TILT)
    }
  })

  it('keeps its axis in space, so the orbit makes the year', () => {
    const earth = earthAt(0.08)
    leanEarth(earth, sun, 0.1)
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(earth.group.quaternion)
    for (const part of [0.15, 0.4, 0.65, 0.9]) {
      const angle = 0.08 + part * Math.PI * 2
      earth.group.position.set(Math.cos(angle) * 8250, 0, Math.sin(angle) * 8250)
      expect(new THREE.Vector3(0, 1, 0).applyQuaternion(earth.group.quaternion).distanceTo(axis)).toBeCloseTo(0)
      expect(yearOf(earth, sun)).toBeCloseTo((0.1 + part) % 1, 6)
      expect(sunLatitude(earth)).toBeCloseTo(declination(0.1 + part), 4)
    }
  })

  it('keeps rotation.y as the daily spin about the leaned axis', () => {
    const earth = earthAt(1)
    leanEarth(earth, sun, 0.3)
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(earth.group.quaternion)
    earth.group.rotation.y = 1.7
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(earth.group.quaternion).distanceTo(axis)).toBeCloseTo(0)
    expect(new THREE.Vector3(1, 0, 0).applyQuaternion(earth.group.quaternion).dot(axis)).toBeCloseTo(0)
  })

  it('gives the start meadow a morning Sun in each season', () => {
    const place = new THREE.Vector3(0.6, 0.5, 0.62).normalize()
    for (const year of [0, 0.25, 0.5, 0.75]) {
      const earth = earthAt(0.08)
      leanEarth(earth, sun, year)
      earth.group.rotation.y = morningSpin(place, earth.group.position, sun, 25, earth.tilt!.lean)
      const position = place.clone().applyQuaternion(earth.group.quaternion).multiplyScalar(275).add(earth.group.position)
      // morningSpin() looks at each degree of the spin, so the height is near 25°.
      expect(Math.abs(solarElevation(position, earth.group.position, sun) - 25)).toBeLessThan(3)
    }
  })

  it('has a world with no lean at the year 0', () => {
    expect(yearOf(earthAt(1), sun)).toBe(0)
  })
})

describe('the place changes the season', () => {
  it('gives the two hemispheres opposite seasons', () => {
    expect(seasonAt(32, 0.3)).toBe('summer')
    expect(seasonAt(-32, 0.3)).toBe('winter')
    expect(seasonAt(32, 0.6)).toBe('autumn')
    expect(seasonAt(-32, 0.6)).toBe('spring')
    expect(localYear(-32, 0.3)).toBeCloseTo(0.8)
  })

  it('has no season near the equator and the full season from 24°, the leaf forest of the game', () => {
    expect(seasonStrength(0)).toBe(0)
    expect(seasonStrength(10)).toBe(0)
    expect(seasonAt(5, 0.3)).toBeNull()
    expect(seasonStrength(17)).toBeGreaterThan(0.2)
    expect(seasonStrength(17)).toBeLessThan(0.8)
    expect(seasonStrength(24)).toBeCloseTo(1)
    expect(seasonStrength(-60)).toBe(1)
  })

  it('makes a place warm when the noon Sun is high', () => {
    expect(warmth(23.4, declination(0.25))).toBeCloseTo(1)
    expect(warmth(45, declination(0.25))).toBeGreaterThan(warmth(45, declination(0.75)))
  })

  it('moves the snow line with the season', () => {
    // The look comes one eighth of a year after the Sun: the coldest look of the north is at 0.875.
    expect(snowCover(32, 0.875)).toBeGreaterThan(0.9)
    expect(snowCover(20, 0.875)).toBe(0)
    expect(snowCover(32, 0.375)).toBe(0)
    expect(snowCover(-32, 0.375)).toBeGreaterThan(0.9)
    expect(snowCover(45, 0.125)).toBe(0)
    expect(snowCover(58, 0.125)).toBe(1)
    // A mountain of 12 m has snow where the meadow has none.
    expect(snowCover(40, 0.125)).toBe(0)
    expect(snowCover(40, 0.125, EARTH_TILT, 12)).toBeGreaterThan(0)
  })

  it('puts snow in the air in the cold, leaves in autumn and petals in spring', () => {
    expect(fallAt(32, 0.875).fall).toBe('snow')
    expect(fallAt(32, 0.625).fall).toBe('leaf')
    expect(fallAt(32, 0.125).fall).toBe('petal')
    expect(fallAt(32, 0.375).fall).toBeNull()
    expect(fallAt(0, 0.625).amount).toBe(0)
    expect(fallAt(-32, 0.125).fall).toBe('leaf')
  })

  it('knows which plants lose their leaves', () => {
    expect(plantSeason('oak')).toBe('leaf')
    expect(plantSeason('birch')).toBe('leaf')
    expect(plantSeason('pine')).toBe('evergreen')
    expect(plantSeason('palm')).toBe('evergreen')
    expect(plantSeason('grass')).toBe('small')
    expect(plantSeason('flowers')).toBe('flower')
  })
})

describe('the season uniforms', () => {
  it('start with no season, and take the look of a day with its lag', () => {
    const uniforms = createSeasonUniforms()
    expect(uniforms.seasonOn.value).toBe(0)
    setSeason(uniforms, 0.25 + LOOK_LAG)
    expect(uniforms.seasonOn.value).toBe(1)
    expect(uniforms.seasonQ.value).toBeCloseTo(0.25)
    expect(uniforms.seasonDecl.value.x).toBeCloseTo(Math.sin(THREE.MathUtils.degToRad(EARTH_TILT)))
  })
})

describe('the start meadow', () => {
  it('is in the leaf forest of the north, from 24° to 34°, on dry land', () => {
    for (const seed of [1, 7, 42, 1234, 98765]) {
      const world = { seed, sample: createTerrain('earth', seed) } as unknown as World
      const meadow = meadowNormal(world)
      const latitude = THREE.MathUtils.radToDeg(Math.asin(meadow.y))
      expect(latitude).toBeGreaterThanOrEqual(24)
      expect(latitude).toBeLessThanOrEqual(34.1)
      expect(seasonStrength(latitude)).toBeCloseTo(1, 1)
      expect(world.sample(meadow.x, meadow.y, meadow.z).height).toBeGreaterThan(1.5)
    }
  })
})
