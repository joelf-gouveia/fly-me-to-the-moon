import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { jet, JETS, turnRate, WIND_SCALE, zone } from '../src/skies/data'
import { dirOnMap, slotRandom, spherePlaces } from '../src/skies/common'
import { DARK_SPOT, inStorm, mapLongitude, RED_SPOT } from '../src/search-places'
import { PLANET_LOOKS } from '../src/planet-look'
import { WORLD_DATA } from '../src/worlds'
import { STICKERS } from '../src/stickers'

describe('the living skies of the worlds', () => {
  it('moves the bands of the giants with their real jets, in opposite directions', () => {
    expect(jet(JETS.jupiter, 0)).toBeGreaterThan(0)
    expect(jet(JETS.jupiter, 12)).toBeLessThan(0)
    expect(jet(JETS.jupiter, 24)).toBeGreaterThan(100)
    expect(jet(JETS.saturn, 0)).toBeGreaterThan(400)
    for (const kind of ['uranus', 'neptune'] as const) {
      expect(jet(JETS[kind], 0)).toBeLessThan(0)
      expect(jet(JETS[kind], 65)).toBeGreaterThan(200)
    }
    expect(jet(JETS.neptune, 0)).toBe(-400)
  })

  it('shows the winds faster than the clips of the study, and slower than the fairy', () => {
    // The answer to the study: faster, so a child sees the bands slide (the clips had 0.04).
    expect(WIND_SCALE).toBeGreaterThan(0.04)
    for (const kind of Object.keys(JETS) as (keyof typeof JETS)[]) {
      for (let lat = -80; lat <= 80; lat += 5) expect(Math.abs(jet(JETS[kind], lat) * WIND_SCALE)).toBeLessThan(32)
    }
    expect(turnRate(JETS.neptune, 0, 400)).toBeLessThan(0)
  })

  it('puts the white zone of Jupiter on the equator and the dark belts near 12°', () => {
    expect(zone('jupiter', 0)).toBeGreaterThan(0.9)
    expect(zone('jupiter', -12)).toBeLessThan(-0.4)
  })

  it('puts the turning storms where the painted maps have them', () => {
    for (const storm of [RED_SPOT, DARK_SPOT]) {
      const dir = dirOnMap(storm.latitude, storm.longitude)
      expect(mapLongitude(dir)).toBeCloseTo(storm.longitude, 6)
      expect(THREE.MathUtils.radToDeg(Math.asin(dir.y))).toBeCloseTo(storm.latitude, 6)
      expect(inStorm(dir, storm)).toBe(true)
    }
  })

  it('gives each slot of a flash or a spark the same number each time, from 0 to 1', () => {
    for (let slot = 0; slot < 200; slot++) {
      const value = slotRandom(slot, 7)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      expect(slotRandom(slot, 7)).toBe(value)
    }
    const values = Array.from({ length: 400 }, (_, slot) => slotRandom(slot, 3))
    expect(values.filter(value => value < 0.5).length).toBeGreaterThan(150)
    expect(values.filter(value => value < 0.5).length).toBeLessThan(250)
  })

  it('places points evenly on the sphere', () => {
    const places = spherePlaces(500, 1)
    expect(places.every(place => Math.abs(place.length() - 1) < 1e-9)).toBe(true)
    expect(places.filter(place => place.y > 0).length).toBeGreaterThan(230)
  })

  it('gives Neptune the pale blue of the new pictures in the paint, the sky and the sticker', () => {
    const neptune = WORLD_DATA.find(row => row[1] === 'neptune')!
    expect(neptune[5]).toBe(0x7fb0dc)
    expect(STICKERS.find(sticker => sticker.id === 'neptune')!.color).toBe(0x7fb0dc)
    expect(PLANET_LOOKS.neptune.sky).toBe(0x9cc4ec)
    // Still bluer than Uranus.
    const blue = (hex: number) => new THREE.Color(hex).b - new THREE.Color(hex).g
    expect(blue(PLANET_LOOKS.neptune.sky)).toBeGreaterThan(blue(PLANET_LOOKS.uranus.sky))
  })
})
