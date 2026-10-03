import { describe, expect, it } from 'vitest'
import { EARTH_TILT, snowCover } from '../src/seasons'
import {
  climate, createWeatherMap, createWeatherModel, groundAfter, kindOf, placeAt, rainbow, rainBelt, snowShare, tropic, warmthAt, WEATHER, WEATHER_MAP, wetness,
} from '../src/weather'
import { createTerrain } from '../src/terrain'
import { createFields } from '../src/foliage/zones'

/** The middle of each season in the north: the look comes one eighth of a year after the Sun. */
const SEASON_YEARS = { spring: 0.125, summer: 0.375, autumn: 0.625, winter: 0.875 }

const model = createWeatherModel(21)
const JUNGLE = 0.3, SAVANNA = -0.08, DESERT = -0.4

describe('the place changes the weather', () => {
  it('has a wet jungle, a savanna between the two, and a dry desert', () => {
    for (const year of [0, 0.25, 0.5, 0.75]) {
      expect(wetness(6, JUNGLE, year)).toBeGreaterThan(wetness(6, SAVANNA, year))
      expect(wetness(6, SAVANNA, year)).toBeGreaterThan(wetness(6, DESERT, year))
      expect(wetness(6, DESERT, year)).toBeLessThan(0.15)
    }
  })

  it('gives the jungle rain at more places than the desert', () => {
    const jungle = climate(model, 4, JUNGLE, 0.375, 400), desert = climate(model, 9, DESERT, 0.375, 400)
    expect(jungle.rain).toBeGreaterThan(0.1)
    expect(desert.rain).toBeLessThan(0.03)
    expect(jungle.cover).toBeGreaterThan(desert.cover * 3)
  })

  it('reads the moisture field of the game only in the tropics', () => {
    expect(tropic(0)).toBe(1)
    expect(tropic(12)).toBe(1)
    expect(tropic(24)).toBe(0)
    expect(wetness(32, JUNGLE, 0.3)).toBeCloseTo(wetness(32, DESERT, 0.3))
  })

  it('has dry air near the poles', () => {
    expect(wetness(80, 0, 0.3)).toBeLessThan(wetness(40, 0, 0.3))
  })
})

describe('the season changes the weather', () => {
  it('moves the rain belt of the tropics with the Sun, one eighth of a year late', () => {
    expect(rainBelt(SEASON_YEARS.summer)).toBeCloseTo(EARTH_TILT * WEATHER.beltReach)
    expect(rainBelt(SEASON_YEARS.winter)).toBeCloseTo(-EARTH_TILT * WEATHER.beltReach)
    expect(rainBelt(SEASON_YEARS.spring)).toBeCloseTo(0)
  })

  it('gives the savanna a wet season and a dry season', () => {
    expect(wetness(11, SAVANNA, SEASON_YEARS.summer)).toBeGreaterThan(wetness(11, SAVANNA, SEASON_YEARS.winter) * 1.8)
    // The south has its wet season half a year later.
    expect(wetness(-11, SAVANNA, SEASON_YEARS.winter)).toBeCloseTo(wetness(11, SAVANNA, SEASON_YEARS.summer))
  })

  it('has the most rain in autumn and the least in summer in the leaf forest', () => {
    const at = (year: number) => wetness(30, 0, year)
    expect(at(SEASON_YEARS.autumn)).toBeGreaterThan(at(SEASON_YEARS.spring))
    expect(at(SEASON_YEARS.spring)).toBeGreaterThan(at(SEASON_YEARS.summer))
    expect(wetness(-30, 0, SEASON_YEARS.spring)).toBeCloseTo(at(SEASON_YEARS.autumn))
  })

  it('gives snow in the cold and rain in the warmth', () => {
    expect(snowShare(WEATHER.snowFall.low)).toBe(1)
    expect(snowShare(WEATHER.snowFall.high)).toBe(0)
    const winter = climate(model, 41, 0, SEASON_YEARS.winter, 400), summer = climate(model, 41, 0, SEASON_YEARS.summer, 400)
    expect(winter.snow).toBeGreaterThan(0.03)
    expect(winter.rain).toBe(0)
    expect(summer.snow).toBe(0)
    expect(summer.rain).toBeGreaterThan(0.03)
    expect(climate(model, 0, JUNGLE, SEASON_YEARS.winter, 200).snow).toBe(0)
  })

  it('lets snow fall in front of the snow line of the seasons', () => {
    // A place with the warmth 0.68: the ground has no snow of the season, and most of the rain is snow.
    const year = 0.7, latitude = 36
    const warm = warmthAt(latitude, year)
    expect(warm).toBeGreaterThan(0.66)
    expect(snowCover(latitude, year)).toBe(0)
    expect(snowShare(warm)).toBeGreaterThan(0.4)
  })

  it('is colder on a mountain', () => {
    expect(warmthAt(30, 0.75, 12)).toBeLessThan(warmthAt(30, 0.75, 0))
    expect(snowShare(warmthAt(30, 0.75, 12))).toBeGreaterThan(snowShare(warmthAt(30, 0.75, 0)))
  })

  it('has more wind in autumn than in summer', () => {
    const at = (year: number) => model.at(placeAt(32, 40), { year, hour: 12, time: 0 })
    const autumn = at(SEASON_YEARS.autumn), summer = at(SEASON_YEARS.summer)
    expect(autumn.wind - autumn.cover * 0.45 - autumn.rain * 0.9 - autumn.storm * 0.5).toBeGreaterThan(summer.wind - summer.cover * 0.45 - summer.rain * 0.9 - summer.storm * 0.5)
  })
})

describe('the hour changes the weather', () => {
  it('makes more cloud on a warm, wet afternoon', () => {
    let afternoon = 0, morning = 0
    for (let i = 0; i < 200; i++) {
      const place = placeAt(4, i * 137.5, JUNGLE)
      afternoon += model.at(place, { year: 0.3, hour: WEATHER.heatHour, time: i * 97 }).cover
      morning += model.at(place, { year: 0.3, hour: 7, time: i * 97 }).cover
    }
    expect(afternoon).toBeGreaterThan(morning * 1.1)
  })

  it('has mist at dawn on low ground, and no mist at noon or on a hill', () => {
    // A place and a time with a clear sky.
    let found = null
    for (let i = 0; i < 400 && !found; i++) {
      const place = placeAt(30, i * 3, 0, 1), dawn = model.at(place, { year: SEASON_YEARS.autumn, hour: WEATHER.mistHour, time: 0 })
      if (dawn.cover < 0.05) found = { place, dawn }
    }
    expect(found).not.toBeNull()
    const { place, dawn } = found!
    expect(dawn.mist).toBeGreaterThan(0.6)
    expect(dawn.kind).toBe('mist')
    expect(model.at(place, { year: SEASON_YEARS.autumn, hour: 13, time: 0 }).mist).toBeLessThan(0.01)
    expect(model.at({ ...place, height: 6 }, { year: SEASON_YEARS.autumn, hour: WEATHER.mistHour, time: 0 }).mist).toBe(0)
    // A river brings the mist to a higher place.
    expect(model.at({ ...place, height: 6, river: 1 }, { year: SEASON_YEARS.autumn, hour: WEATHER.mistHour, time: 0 }).mist).toBeGreaterThan(0.6)
  })

  it('makes a rainbow only with rain, sunshine and a Sun lower than 42°', () => {
    expect(rainbow(20, 0.8, 1)).toBeGreaterThan(0.9)
    expect(rainbow(50, 0.8, 1)).toBe(0)
    expect(rainbow(-5, 0.8, 1)).toBe(0)
    expect(rainbow(20, 0, 1)).toBe(0)
    expect(rainbow(20, 0.8, 0)).toBe(0)
    expect(rainbow(40, 0.8, 1)).toBeLessThan(rainbow(30, 0.8, 1))
  })
})

describe('the fronts', () => {
  const ring = (latitude: number, time: number, shift = 0) => Array.from({ length: 180 }, (_, i) => {
    const place = placeAt(latitude, i * 2 + shift)
    return model.front(place.x, place.y, place.z, time)
  })
  const match = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum - Math.abs(value - b[i]), 0)

  it('stay between 0 and 1', () => {
    for (const value of [...ring(45, 0), ...ring(0, 500), ...ring(-70, 9000)]) { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1) }
  })

  it('go to the east in the middle latitudes and to the west in the tropics', () => {
    const seconds = 60, degrees = seconds / WEATHER.frontRound * 360
    // East is the direction of the spin: the longitude gets smaller.
    const before = ring(45, 1000)
    expect(match(before, ring(45, 1000 + seconds, -degrees))).toBeGreaterThan(match(before, ring(45, 1000 + seconds, degrees)))
    const tropics = ring(0, 1000)
    expect(match(tropics, ring(0, 1000 + seconds, degrees * 0.6))).toBeGreaterThan(match(tropics, ring(0, 1000 + seconds, -degrees * 0.6)))
  })

  it('are the same for one Earth and new for a new Earth', () => {
    const again = createWeatherModel(21), other = createWeatherModel(22)
    const place = placeAt(40, 70)
    expect(again.front(place.x, place.y, place.z, 300)).toBe(model.front(place.x, place.y, place.z, 300))
    expect(match(ring(45, 0), Array.from({ length: 180 }, (_, i) => { const at = placeAt(45, i * 2); return other.front(at.x, at.y, at.z, 0) }))).toBeLessThan(-5)
  })

  it('give a place cloud for a part of the time only', () => {
    const place = placeAt(32, 10)
    const covers = Array.from({ length: 300 }, (_, i) => model.at(place, { year: 0.1, hour: 12, time: i * 120 }).cover)
    expect(Math.min(...covers)).toBeLessThan(0.05)
    expect(Math.max(...covers)).toBeGreaterThan(0.5)
  })
})

describe('the ground', () => {
  it('gets wet in the rain and dries after it', () => {
    let wet = 0
    for (let second = 0; second < WEATHER.soak; second++) wet = groundAfter(wet, 1, 0, 1)
    expect(wet).toBeGreaterThan(0.9)
    for (let second = 0; second < WEATHER.dry * 3; second++) wet = groundAfter(wet, 0, 0, 1)
    expect(wet).toBeLessThan(0.1)
  })

  it('keeps fresh snow longer than water', () => {
    let water = 1, snow = 1
    for (let second = 0; second < WEATHER.dry; second++) { water = groundAfter(water, 0, 0, 1); snow = groundAfter(snow, 0, 1, 1) }
    expect(snow).toBeGreaterThan(0.9)
    expect(water).toBeLessThan(0.5)
  })
})

describe('the names', () => {
  it('names each weather', () => {
    const none = { cover: 0, rain: 0, snow: 0, storm: 0, mist: 0 }
    expect(kindOf(none)).toBe('clear')
    expect(kindOf({ ...none, cover: 0.5 })).toBe('fair')
    expect(kindOf({ ...none, cover: 1 })).toBe('cloudy')
    expect(kindOf({ ...none, cover: 1, rain: 0.3 })).toBe('shower')
    expect(kindOf({ ...none, cover: 1, rain: 0.9 })).toBe('rain')
    expect(kindOf({ ...none, cover: 1, rain: 0.9, storm: 0.8 })).toBe('storm')
    expect(kindOf({ ...none, cover: 1, rain: 0.9, snow: 1 })).toBe('snow')
    expect(kindOf({ ...none, mist: 0.8 })).toBe('mist')
  })
})

describe('the weather map', () => {
  const seed = 21, terrain = createTerrain('earth', seed), fields = createFields(seed)
  const sunLocal = { x: 1, z: 0 }

  it('has four numbers for each of 8,192 places', () => {
    const map = createWeatherMap(seed, terrain, fields.moist)
    expect(map.texture.image.width).toBe(WEATHER_MAP.width)
    expect(map.texture.image.height).toBe(WEATHER_MAP.height)
    expect(map.data).toHaveLength(8192 * 4)
  })

  it('calculates the whole map in 16 frames, one part on each frame', () => {
    const parts = createWeatherMap(seed, terrain, fields.moist), whole = createWeatherMap(seed, terrain, fields.moist)
    whole.update(0.3, sunLocal, 500, 0, 1)
    parts.update(0.3, sunLocal, 500, 0)
    expect([...parts.data]).not.toEqual([...whole.data])
    expect(parts.data.some(value => value > 0)).toBe(true)
    for (let frame = 1; frame < WEATHER_MAP.slices; frame++) parts.update(0.3, sunLocal, 500, 0)
    // The cloud, the rain and the snow agree. The ground has its own clock.
    for (let i = 0; i < whole.data.length; i += 4) for (let channel = 0; channel < 3; channel++) expect(parts.data[i + channel]).toBe(whole.data[i + channel])
  })

  it('agrees with the weather of a direction', () => {
    const map = createWeatherMap(seed, terrain, fields.moist)
    map.update(0.3, sunLocal, 500, 0, 1)
    // The middle of a point of the map: row 40, column 70.
    const longitude = ((70 + 0.5) / WEATHER_MAP.width - 0.5) * Math.PI * 2, latitude = ((40 + 0.5) / WEATHER_MAP.height - 0.5) * Math.PI
    const weather = map.weatherAt({ x: Math.cos(latitude) * Math.cos(longitude), y: Math.sin(latitude), z: Math.cos(latitude) * Math.sin(longitude) })
    const at = (40 * WEATHER_MAP.width + 70) * 4
    expect(map.data[at]).toBe(Math.floor(weather.cover * 255))
    expect(map.data[at + 1]).toBe(Math.floor(weather.rain * 255))
  })

  it('has clear places, cloud and rain on one planet, and wet ground under the rain', () => {
    const map = createWeatherMap(seed, terrain, fields.moist)
    for (let second = 0; second < 30; second++) map.update(0.3, sunLocal, 500, 1, 1)
    let clear = 0, cloud = 0, rain = 0, wet = 0
    for (let i = 0; i < map.data.length; i += 4) {
      if (map.data[i] < 13) clear++
      if (map.data[i] > 128) cloud++
      if (map.data[i + 1] > 128) { rain++; if (map.data[i + 3] > 128) wet++ }
    }
    expect(clear).toBeGreaterThan(8192 * 0.3)
    expect(cloud).toBeGreaterThan(8192 * 0.03)
    expect(rain).toBeGreaterThan(8192 * 0.005)
    expect(wet).toBeGreaterThan(rain * 0.9)
  })

  it('gives a new Earth new weather', () => {
    const one = createWeatherMap(21, terrain, fields.moist), two = createWeatherMap(22, terrain, fields.moist)
    one.update(0.3, sunLocal, 500, 0, 1); two.update(0.3, sunLocal, 500, 0, 1)
    let different = 0
    for (let i = 0; i < one.data.length; i += 4) if (Math.abs(one.data[i] - two.data[i]) > 64) different++
    expect(different).toBeGreaterThan(8192 * 0.05)
  })
})
