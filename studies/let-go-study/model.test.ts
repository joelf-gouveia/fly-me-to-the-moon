import { describe, expect, it } from 'vitest'
import { SPACE_SPEED } from '../../src/flight'
import { CLIPS, DECISIONS, OPTIONS } from './content'
import { MOMENTS } from './let-go-study-capture.mjs'
import { OPTION_IDS } from './model'
import { glideOf, runLeave, runTour, stopRows, trips } from './numbers'

/**
 * The numbers of the let go study come from the flight code of the game. These tests fail when
 * the game changes a value that the page and docs/let-go-study.md show.
 */
const tour = Object.fromEntries(OPTION_IDS.map(id => [id, runTour(id)]))
function near(value: number | null, target: number, step = 0.1) {
  expect(value).not.toBeNull()
  expect(Math.abs(value! - target)).toBeLessThanOrEqual(step)
}

describe('the tour', () => {
  it('needs 4.8 s of hands today and 10.5 s with A and B', () => {
    near(tour.T.handsSeconds, 4.8)
    near(tour.A.handsSeconds, 10.5)
    near(tour.B.handsSeconds, 10.5)
    near(tour.C.handsSeconds, 4.5)
    near(tour.B.twoFingerSeconds, 2)
    expect(tour.T.twoFingerSeconds).toBe(0)
  })
  it('stops her 2.5 m after the child lets go with A and B, and not before the look with C', () => {
    near(tour.T.stopMetres, 0)
    near(tour.A.stopMetres, 2.5, 0.2)
    near(tour.B.stopMetres, 2.5, 0.2)
    expect(tour.C.stopMetres).toBeNull()
  })
  it('turns her in place in the look with T and B only', () => {
    for (const id of OPTION_IDS) near(tour[id].lookTurn, 110, 3)
    expect(tour.T.lookMetres).toBe(0)
    expect(tour.B.lookMetres).toBe(0)
    near(tour.A.lookMetres, 19, 1)
    near(tour.C.lookMetres, 20, 1)
  })
})

describe('the stop and the idle flight', () => {
  const rows = Object.fromEntries(stopRows().map(row => [row.id, row]))
  it('glides 2.9 m over the meadow and 261 m in open space', () => {
    near(rows.meadow.rows.B.metres, 2.9)
    near(rows.space.rows.B.metres, 261, 2)
    near(rows.space.rows.B.seconds, 2.3)
    expect(rows.meadow.rows.T.metres).toBe(0)
    near(rows.meadow.rows.C.metres, 36, 1)
  })
  it('flies 113 m in 10 s over the meadow today, and 9.7 km in open space', () => {
    near(rows.meadow.idle.T, 113, 2)
    near(rows.clouds.idle.T, 166, 2)
    near(rows.space.idle.T / 1000, 9.7)
    near(rows.space.idle.C / 1000, 3.2)
  })
  it('matches the closed form of the glide', () => {
    near(glideOf(rows.meadow.speed).metres, rows.meadow.rows.B.metres, 0.3)
    expect(Math.floor(SPACE_SPEED)).toBe(967)
  })
})

describe('the trips', () => {
  it('climbs to open space in 11.9 s, with 7.4 s of W today', () => {
    const today = runLeave('T'), b = runLeave('B'), a = runLeave('A')
    near(today.seconds, 11.9); near(today.handsSeconds, 7.4)
    near(b.handsSeconds, 11.9)
    near(a.seconds, 9.9)
  })
  it('takes 31 to 48 s from Earth to Neptune', () => {
    const neptune = trips().find(trip => trip.id === 'neptune')!
    near(neptune.seconds, 31.4); near(neptune.farSeconds, 48.4)
    const moon = trips().find(trip => trip.id === 'moon')!
    near(moon.near, 613, 1); near(moon.seconds, 5.3)
  })
})

describe('the page', () => {
  it('has the moments of the capture script', () => {
    for (const clip of CLIPS) expect(clip.moments.map(moment => moment.t)).toEqual(MOMENTS[clip.id])
  })
  it('recommends B, with the recommendation first in each decision', () => {
    expect(OPTIONS.filter(option => option.recommended).map(option => option.id)).toEqual(['B'])
    expect(DECISIONS[0].options[0]).toMatch(/^B/)
    expect(new Set(DECISIONS.map(decision => decision.id)).size).toBe(DECISIONS.length)
  })
})
