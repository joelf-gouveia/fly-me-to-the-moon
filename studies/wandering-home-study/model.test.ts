import { describe, expect, it } from 'vitest'
import { HOME_MOVE_SECONDS } from '../../src/relocation'
import { PROPORTIONS } from '../../src/proportions'
import { handTrips, homeAtSize, HOME_BASE, HOP_SECONDS, hopTimes, HOSTS, magicYearSeconds, moonSlot, moonSlotForStay, MOON_REFERENCE, nextSize, novaPixels, SIZES, sizeShares, TODAY_SECONDS } from './numbers'
import { CHANGES, CLIPS, DECISIONS, OPTIONS } from './model'
import { MOMENTS } from './wandering-home-study-capture.mjs'

/**
 * The numbers of the wandering home study come from the game. These tests fail when the game
 * changes a value that the page and docs/wandering-home-study.md show.
 */
describe('the clock', () => {
  it('was 5 minutes at the study, and the game has 2 minutes now', () => {
    expect(TODAY_SECONDS).toBe(300)
    expect(HOME_MOVE_SECONDS).toBe(120)
    expect(HOP_SECONDS).toBe(120)
    expect(hopTimes(HOP_SECONDS, 12)).toHaveLength(6)
  })
  it('makes a magic year of 20, 8 or 16 minutes', () => {
    expect(magicYearSeconds(TODAY_SECONDS)).toBe(20 * 60)
    expect(magicYearSeconds(HOP_SECONDS)).toBe(8 * 60)
    expect(magicYearSeconds(HOP_SECONDS, 2)).toBe(16 * 60)
  })
  it('loses about one trip by hand in four with 2 minutes', () => {
    const trips = handTrips(1500)
    expect(trips.mean).toBeGreaterThan(20)
    expect(trips.mean).toBeLessThan(40)
    expect(trips.lostNew).toBeGreaterThan(trips.lostToday * 2)
  })
})

describe('the sizes', () => {
  it('has the home of today at its game size', () => {
    const today = homeAtSize(HOME_BASE.radius)
    expect(today.radius).toBe(110 * PROPORTIONS.size)
    expect(today.atmosphere).toBe(52 * PROPORTIONS.size)
    expect(today.cloudHeight).toBe(24 * PROPORTIONS.size)
  })
  it('goes from Ceres to Jupiter, smallest first', () => {
    expect(SIZES[0].id).toBe('ceres')
    expect(SIZES.at(-1)!.id).toBe('jupiter')
    for (let i = 1; i < SIZES.length; i++) expect(SIZES[i].base).toBeGreaterThan(SIZES[i - 1].base)
  })
  it('keeps room under the clouds of the smallest home', () => {
    const ceres = homeAtSize(SIZES[0].base)
    expect(ceres.cloudHeight).toBeGreaterThan(12)
  })
  it('walks one or two steps and stops at the ends', () => {
    expect(nextSize(0, 'steps', () => 0)).toBe(0)
    expect(nextSize(SIZES.length - 1, 'steps', () => 0.999)).toBe(SIZES.length - 1)
    const walk = sizeShares('steps', 8000)
    expect(walk.changed).toBeGreaterThan(0.6)
    expect(walk.changed).toBeLessThan(0.7)
    for (const share of walk.shares) expect(share).toBeGreaterThan(0.06)
  })
})

describe('a moon home', () => {
  it('has room around Earth, Saturn, Uranus and Neptune at the size of today', () => {
    const fits = HOSTS.filter(host => moonSlot(host, HOME_BASE.radius).fits)
    expect(fits).toEqual(['earth', 'saturn', 'uranus', 'neptune'])
    expect(Math.round(moonSlot('saturn', HOME_BASE.radius).distance)).toBe(1518)
  })
  it('never has room around Mars: the belt is too near', () => {
    for (const size of SIZES) expect(moonSlot('mars', size.base).reason).toBe('the asteroid belt')
  })
  it('keeps a moon home of Earth outside the path of the Moon', () => {
    expect(moonSlot('earth', SIZES[0].base).distance).toBeGreaterThan(MOON_REFERENCE.distance)
  })
  it('gives Jupiter room with the rule for the stay', () => {
    const stay = moonSlotForStay('jupiter', HOME_BASE.radius, 60)
    expect(stay.fits).toBe(true)
    expect(stay.share).toBeGreaterThan(0.9)
  })
})

describe('the nova', () => {
  it('is small far away without a smallest size', () => {
    expect(novaPixels(137.5 * 4, 10000)).toBeCloseTo(35.7, 0)
    expect(novaPixels(137.5 * 4, 40000)).toBeLessThan(10)
  })
})

describe('the page', () => {
  it('has a clip with three moments for each id of the capture script', () => {
    expect(CLIPS.map(clip => clip.id)).toEqual(Object.keys(MOMENTS))
    for (const clip of CLIPS) expect(clip.moments.map(moment => moment.t)).toEqual(MOMENTS[clip.id as keyof typeof MOMENTS])
  })
  it('recommends one look, and the first option of each decision', () => {
    expect(OPTIONS.filter(option => option.recommended)).toHaveLength(1)
    expect(DECISIONS).toHaveLength(12)
    expect(CHANGES).toHaveLength(6)
  })
})
