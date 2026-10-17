import { describe, expect, it } from 'vitest'
import { jet, JETS, turnRate, WIND_SCALE, zone } from './skies/data'
import { CLIPS, DECISIONS, OPTIONS, WORLDS } from './model'

describe('the real jets of the study', () => {
  it('gives Jupiter a prograde equator, westward jets near 12° and the strongest eastward jet near 23°', () => {
    expect(jet(JETS.jupiter, 0)).toBeGreaterThan(100)
    expect(jet(JETS.jupiter, 12)).toBeLessThan(0)
    expect(jet(JETS.jupiter, -12)).toBeLessThan(0)
    expect(jet(JETS.jupiter, 24)).toBeGreaterThan(100)
  })

  it('gives Uranus and Neptune a retrograde equator and prograde jets near 60° to 70°', () => {
    for (const kind of ['uranus', 'neptune'] as const) {
      expect(jet(JETS[kind], 0)).toBeLessThan(0)
      expect(jet(JETS[kind], 65)).toBeGreaterThan(200)
    }
    // Neptune has the fastest winds: about 400 m/s to the west at the equator.
    expect(jet(JETS.neptune, 0)).toBe(-400)
    expect(Math.abs(jet(JETS.neptune, 0))).toBeGreaterThan(Math.abs(jet(JETS.uranus, 0)))
  })

  it('gives Saturn one wide prograde jet of about 400 m/s', () => {
    expect(jet(JETS.saturn, 0)).toBeGreaterThan(400)
    expect(jet(JETS.saturn, 15)).toBeGreaterThan(200)
  })

  it('moves the clouds slower than the fairy', () => {
    for (const kind of Object.keys(JETS) as (keyof typeof JETS)[]) {
      for (let lat = -80; lat <= 80; lat += 5) expect(Math.abs(jet(JETS[kind], lat) * WIND_SCALE)).toBeLessThan(20)
    }
  })

  it('turns a band at the speed of its jet, against the spin when the jet is negative', () => {
    expect(turnRate(JETS.neptune, 0, 400)).toBeLessThan(0)
    expect(turnRate(JETS.jupiter, 0, 600)).toBeCloseTo(jet(JETS.jupiter, 0) * WIND_SCALE / 600, 8)
  })

  it('puts the white zone of Jupiter on the equator and the dark belts near 12°', () => {
    expect(zone('jupiter', 0)).toBeGreaterThan(0.9)
    expect(zone('jupiter', 12)).toBeLessThan(-0.4)
    expect(zone('jupiter', -12)).toBeLessThan(-0.4)
  })
})

describe('the page of the study', () => {
  it('has a clip for today and for each option', () => {
    for (const id of ['T', 'A', 'B', 'C']) expect(CLIPS.some(clip => clip.id === id)).toBe(true)
    expect(CLIPS.every(clip => clip.moments.length === 3)).toBe(true)
  })

  it('recommends one option, and the first choice of the first decision is that option', () => {
    const recommended = OPTIONS.filter(option => option.recommended)
    expect(recommended).toHaveLength(1)
    expect(DECISIONS[0].options[0]).toContain(recommended[0].id)
  })

  it('gives each world a source and a fact for a child', () => {
    for (const world of WORLDS) {
      expect(world.sources.length).toBeGreaterThan(0)
      expect(world.sources.every(source => source.url.startsWith('https://'))).toBe(true)
      expect(world.facts.length).toBeGreaterThan(0)
    }
  })
})
