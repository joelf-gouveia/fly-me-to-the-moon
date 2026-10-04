import { describe, expect, it } from 'vitest'
import { trailIds } from '../../src/fairy-trail'
import { ALL, BEFORE, CAP, DECISIONS, FINDINGS, FINDING_SHOTS, OPTIONS, RECOMMENDED, RULES, SELECTED, TODAY, TOUR, TOUR_SECONDS, circleSpeed, emitCount, inherit, numberOf, optionById, phaseAt, startOf, todayAngle, todayGap, todayLength, trailLength } from './model'

describe('the trail of today', () => {
  it('has a length that changes with the frames in each second', () => {
    expect(todayLength(11, 60)).toBeCloseTo(13.2)
    expect(todayLength(11, 120)).toBeCloseTo(6.6)
    expect(todayLength(11, 30)).toBeCloseTo(26.4)
  })
  it('lasts one third of the time in a boost', () => {
    expect(todayLength(11, 60, true)).toBeCloseTo(todayLength(11, 60) / TODAY.boostPoints)
  })
  it('has a gap of one frame of flight between two dots', () => {
    expect(todayGap(11, 60)).toBeCloseTo(0.183, 3)
    expect(todayGap(967.5, 60)).toBeGreaterThan(8)
  })
  it('goes off the flight path when the world carries the fairy', () => {
    expect(todayAngle(11, 0)).toBe(0)
    expect(todayAngle(11, 11)).toBeCloseTo(45)
    expect(todayAngle(11, 18.6)).toBeGreaterThan(55)
  })
  it('gives the speed of a point on a circle', () => {
    expect(circleSpeed(240 / (Math.PI * 2), 240)).toBeCloseTo(1)
  })
})

describe('the rules of the new trails', () => {
  it('leave a point where it starts below the cap speed', () => {
    expect(inherit(0)).toBe(0)
    expect(inherit(11)).toBe(0)
    expect(inherit(CAP)).toBe(0)
  })
  it('move a point away from the fairy at the cap speed above it', () => {
    for (const speed of [25, 80, 967.5]) expect(speed * (1 - inherit(speed))).toBeCloseTo(CAP)
  })
  it('give a trail with a limit on its length', () => {
    expect(trailLength(11, 1.2)).toBeCloseTo(13.2)
    expect(trailLength(25, 1.2)).toBeCloseTo(1.2 * CAP)
    expect(trailLength(967.5, 1.2)).toBeCloseTo(trailLength(25, 1.2))
  })
  it('make the same number of points in a second at each frame rate', () => {
    for (const fps of [30, 60, 120, 144]) {
      let pool = 0, total = 0
      for (let frame = 0; frame < fps; frame++) {
        const [count, rest] = emitCount(pool, 190, 1 / fps)
        total += count
        pool = rest
      }
      expect(Math.abs(total - 190), `${fps} frames`).toBeLessThanOrEqual(1)
    }
  })
  it('make no points at a rate of zero', () => {
    expect(emitCount(0.4, 0, 0.5)).toEqual([0, 0.4])
  })
})

describe('the flight of the clips', () => {
  it('has a cruise, two turns, a boost, a hover and the time after a ring', () => {
    expect(TOUR.map(phase => phase.label)).toEqual(['Cruise', 'Turn', 'Turn', 'Boost', 'Hover', 'After a sparkle ring'])
    expect(TOUR_SECONDS).toBe(14)
    for (let i = 1; i < TOUR.length; i++) expect(TOUR[i].until).toBeGreaterThan(TOUR[i - 1].until)
  })
  it('gives the phase of each time', () => {
    expect(phaseAt(0).label).toBe('Cruise')
    expect(phaseAt(3).yaw).toBe(1)
    expect(phaseAt(5).yaw).toBe(-1)
    expect(phaseAt(8).boost).toBe(true)
    expect(phaseAt(10).hover).toBe(true)
    expect(phaseAt(13).bonus).toBe(true)
    expect(phaseAt(99).label).toBe('After a sparkle ring')
    expect(startOf('Boost')).toBe(6.5)
    expect(startOf('Cruise')).toBe(0)
  })
  it('takes each picture in the flight', () => {
    for (const option of ALL) expect(option.still ?? 5.6, option.id).toBeLessThan(TOUR_SECONDS)
    for (const finding of FINDING_SHOTS) {
      expect(finding.time).toBeLessThan(TOUR_SECONDS)
      expect(optionById(finding.trail), finding.id).toBeDefined()
    }
    expect(phaseAt(FINDING_SHOTS[2].time).hover).toBe(true)
  })
})

describe('the options', () => {
  it('are fifteen, each with its own id and name, and one removes the trail', () => {
    expect(OPTIONS.length).toBeGreaterThanOrEqual(10)
    expect(OPTIONS).toHaveLength(15)
    expect(new Set(ALL.map(option => option.id)).size).toBe(16)
    expect(new Set(ALL.map(option => option.name)).size).toBe(16)
    expect(numberOf('none')).toBe('01')
    expect(numberOf('bursts')).toBe('12')
    expect(numberOf('shimmer')).toBe('13')
    expect(numberOf('shimmer-feet')).toBe('14')
    expect(numberOf('shimmer-wings')).toBe('15')
    expect(optionById('none')!.frame).toBe('None')
  })
  it('keep the points off space: only the trail of today stays in space', () => {
    expect(BEFORE.frame).toBe('Space')
    for (const option of OPTIONS) expect(option.frame, option.id).not.toBe('Space')
  })
  it('have a magic option for Blossom Haven', () => {
    expect(OPTIONS.filter(option => option.world === 'fairy').map(option => option.id)).toEqual(['candy'])
    expect(optionById('candy')!.family).toBe('Magic')
  })
  it('have four options in the game: 03, 07, 08 and 14', () => {
    expect(SELECTED.map(numberOf)).toEqual(['03', '07', '08', '14'])
    expect(trailIds).toHaveLength(SELECTED.length)
  })
  it('recommend one option', () => {
    expect(optionById(RECOMMENDED)).toBeDefined()
    expect(OPTIONS.some(option => option.id === RECOMMENDED)).toBe(true)
  })
})

describe('the text of the study', () => {
  it('has eight findings and five rules', () => {
    expect(FINDINGS).toHaveLength(8)
    expect(RULES).toHaveLength(5)
  })
  it('asks for one trail from the fifteen options or the trail of today', () => {
    expect(DECISIONS[0].options).toHaveLength(OPTIONS.length + 1)
    expect(DECISIONS.find(decision => decision.id === 'also')!.options).toHaveLength(OPTIONS.length)
  })
  it('marks one answer as recommended in each single choice', () => {
    for (const decision of DECISIONS.filter(decision => !decision.multi)) {
      expect(decision.options.filter(option => option.includes('(recommended)')), decision.id).toHaveLength(1)
    }
  })
})
