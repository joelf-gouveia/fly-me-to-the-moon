import { describe, expect, it } from 'vitest'
import { HOME_START_POSITION } from '../../src/worlds'
import { SOLAR_ORBIT_SECONDS } from '../../src/orbits'
import {
  CLIPS, dayHours, DECISIONS, declination, directionOf, EARTH_TILT, groundColour, localYear, MAGIC, magicAt, magicColour, magicOffset,
  noonElevation, PALETTE, PATTERNS, seaIce, seasonAt, seasonStrength, snowCover, warmth, YEAR_SECONDS, yearOfDate,
} from './model'

describe('the Sun through the year', () => {
  it('is over the equator at the equinoxes and over a tropic at the solstices', () => {
    expect(declination(0)).toBeCloseTo(0)
    expect(declination(0.25)).toBeCloseTo(EARTH_TILT)
    expect(declination(0.5)).toBeCloseTo(0)
    expect(declination(0.75)).toBeCloseTo(-EARTH_TILT)
  })

  it('stays over the equator with no tilt: the game of today', () => {
    for (const year of [0, 0.2, 0.25, 0.6, 0.75]) expect(declination(year, 0)).toBeCloseTo(0)
    expect(dayHours(45, declination(0.25, 0))).toBeCloseTo(12)
    expect(dayHours(80, declination(0.75, 0))).toBeCloseTo(12)
  })

  it('is high in summer and low in winter at 45° N', () => {
    expect(noonElevation(45, declination(0.25))).toBeCloseTo(68.4)
    expect(noonElevation(45, declination(0.75))).toBeCloseTo(21.6)
    expect(dayHours(45, declination(0.25))).toBeCloseTo(15.4, 1)
    expect(dayHours(45, declination(0.75))).toBeCloseTo(8.6, 1)
  })

  it('gives the equator 12 hours each day, and a pole one long day and one long night', () => {
    for (const year of [0, 0.25, 0.5, 0.75]) expect(dayHours(0, declination(year))).toBeCloseTo(12)
    expect(dayHours(80, declination(0.25))).toBe(24)
    expect(dayHours(80, declination(0.75))).toBe(0)
    expect(noonElevation(-90, declination(0.25))).toBeLessThan(0)
  })

  it('has a year of one orbit of the game', () => {
    expect(YEAR_SECONDS).toBe(SOLAR_ORBIT_SECONDS)
  })

  it('reads the year from a real date', () => {
    expect(yearOfDate(new Date(Date.UTC(2026, 2, 20)))).toBeCloseTo(0)
    expect(yearOfDate(new Date(Date.UTC(2026, 5, 21)))).toBeCloseTo(0.25, 1)
    expect(yearOfDate(new Date(Date.UTC(2027, 0, 5)))).toBeCloseTo(0.8, 1)
  })
})

describe('the place changes the season', () => {
  it('gives the two hemispheres opposite seasons', () => {
    expect(seasonAt(45, 0.3).name).toBe('summer')
    expect(seasonAt(-45, 0.3).name).toBe('winter')
    expect(seasonAt(45, 0.6).name).toBe('autumn')
    expect(seasonAt(-45, 0.6).name).toBe('spring')
    expect(localYear(-45, 0.3)).toBeCloseTo(0.8)
  })

  it('has no season near the equator and the full season from 24°, the leaf forest of the game', () => {
    expect(seasonStrength(0)).toBe(0)
    expect(seasonStrength(10)).toBe(0)
    expect(seasonAt(5, 0.3).name).toBeNull()
    expect(seasonStrength(17)).toBeGreaterThan(0.2)
    expect(seasonStrength(17)).toBeLessThan(0.8)
    expect(seasonStrength(24)).toBeCloseTo(1)
    expect(seasonStrength(40)).toBeCloseTo(1)
    expect(seasonStrength(-60)).toBe(1)
  })

  it('makes a place warm when the noon Sun is high', () => {
    expect(warmth(23.4, declination(0.25))).toBeCloseTo(1)
    expect(warmth(45, declination(0.25))).toBeGreaterThan(warmth(45, declination(0.75)))
    // The equator changes little; 60° changes a lot.
    expect(warmth(0, declination(0.25)) - warmth(0, declination(0))).toBeGreaterThan(-0.1)
    expect(warmth(60, declination(0.25)) - warmth(60, declination(0.75))).toBeGreaterThan(0.6)
  })

  it('moves the snow line with the season', () => {
    // The look comes one eighth of a year after the Sun: the coldest look is at 0.875.
    expect(snowCover(45, 0.875)).toBe(1)
    expect(snowCover(45, 0.375)).toBe(0)
    expect(snowCover(-45, 0.375)).toBe(1)
    expect(snowCover(0, 0.875)).toBe(0)
    // 0.125 is the look of the equinox: snow above 52°, in the snow line belt of the game.
    expect(snowCover(45, 0.125)).toBe(0)
    expect(snowCover(58, 0.125)).toBe(1)
    // In the coldest look the snow is in the leaf forest, from 28°.
    expect(snowCover(32, 0.875)).toBeGreaterThan(0.9)
    expect(snowCover(20, 0.875)).toBe(0)
    // A mountain of 12 m has snow where the meadow has none.
    expect(snowCover(40, 0.125)).toBe(0)
    expect(snowCover(40, 0.125, EARTH_TILT, 12)).toBeGreaterThan(0)
  })

  it('puts ice on the sea only near a cold pole', () => {
    expect(seaIce(80, 0.875)).toBe(1)
    expect(seaIce(80, 0.375)).toBe(0)
    expect(seaIce(30, 0.875)).toBe(0)
  })

  it('paints the equator with the grass of today all year, and 45° with four colours', () => {
    const equator = new Set([0, 0.25, 0.5, 0.75].map(year => groundColour(0, year)))
    expect(equator.size).toBe(1)
    const meadow = new Set([0.125, 0.375, 0.625, 0.875].map(year => groundColour(45, year)))
    expect(meadow.size).toBe(4)
    expect(PALETTE.ground).toHaveLength(4)
  })
})

describe('the magic seasons of Blossom Haven', () => {
  const cottage = directionOf(-90), farSide = directionOf(90)

  it('has four seasons, each with a name, plants and a thing in the air', () => {
    expect(MAGIC.map(season => season.id)).toEqual(['blossom', 'bubble', 'lantern', 'crystal'])
    for (const season of MAGIC) {
      expect(season.plants.length).toBeGreaterThan(0)
      expect(season.air.length).toBeGreaterThan(0)
    }
    expect(new Set(MAGIC.map(season => season.ground)).size).toBe(4)
  })

  it('starts each season at the cottage, in the order of the list (the patches have no first place)', () => {
    for (const pattern of PATTERNS.filter(item => item.id !== 'patches')) {
      expect(magicOffset(pattern.id, cottage)).toBeCloseTo(0)
      MAGIC.forEach((season, index) => {
        const at = magicAt(pattern.id, cottage, index / 4)
        expect(at.season).toBe(season)
        expect(at.full).toBeCloseTo(1)
      })
    }
  })

  it('gives the far side an earlier season with the rings and the two halves, and the same season with the whole planet', () => {
    expect(magicAt('rings', farSide, 0.5).season.id).toBe('crystal')
    expect(magicAt('rings', directionOf(0), 0.5).index).not.toBe(magicAt('rings', cottage, 0.5).index)
    expect(magicAt('halves', farSide, 0.5).season.id).toBe('blossom')
    expect(magicAt('whole', farSide, 0.5).season.id).toBe('lantern')
  })

  it('gives two places of one latitude different seasons with the patches only', () => {
    const seasons = (pattern: 'rings' | 'patches') => new Set(Array.from({ length: 36 }, (_, i) => magicAt(pattern, directionOf(20, i * 10), 0.5).index))
    expect(seasons('rings').size).toBe(1)
    expect(seasons('patches').size).toBeGreaterThan(1)
  })

  it('paints each season with its ground colour', () => {
    expect(new Set(MAGIC.map((_, index) => magicColour('rings', cottage, index / 4))).size).toBe(4)
  })
})

describe('the game of today', () => {
  it('keeps the Sun 5° above the cottage at the south pole until the first hop', () => {
    const [x, y, z] = HOME_START_POSITION
    expect(Math.asin(y / Math.hypot(x, y, z)) * 180 / Math.PI).toBeCloseTo(5.1, 1)
  })
})

describe('the page', () => {
  it('has a clip and a picture for each clip, and four season pictures for E2 and B2', () => {
    const media = Object.keys(import.meta.glob('../../public/studies/seasons/*.{webm,jpg}')).map(path => path.split('/').at(-1))
    for (const clip of CLIPS) {
      expect(media).toContain(`${clip.id}.webm`)
      expect(media).toContain(`${clip.id}.jpg`)
    }
    for (const id of ['E2', 'B2']) for (let index = 0; index < 4; index++) expect(media).toContain(`${id}-${index}.jpg`)
  })

  it('has four clips of each world, a recommendation in each decision of one answer, and each magic season in decision 4', () => {
    expect(CLIPS.filter(clip => clip.world === 'earth')).toHaveLength(4)
    expect(CLIPS.filter(clip => clip.world === 'fairy')).toHaveLength(4)
    for (const decision of DECISIONS.filter(item => !item.multi)) expect(decision.options.some(option => option.includes('(recommended)'))).toBe(true)
    expect(DECISIONS.find(decision => decision.id === 'magic')!.options).toHaveLength(MAGIC.length)
  })
})
