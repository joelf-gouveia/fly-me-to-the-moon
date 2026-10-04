import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { seededRandom } from './terrain'
import type { TerrainSample } from './terrain'
import { declination, LOOK_LAG, lookPhase, seasonStrength, SNOW_LAPSE, warmth } from './seasons'

/**
 * The weather of Earth, from the weather study (docs/weather-study.md).
 *
 * Four things make the weather of a place:
 * 1. The place: its latitude, its height and the moisture field of the plants (src/foliage/zones.ts).
 * 2. The season: `year` of src/seasons.ts. Year 0 is the March equinox.
 * 3. The hour: the local hour of the Sun, from 0 to 24. Noon is 12.
 * 4. The fronts: fields of cloud that move around the planet. `time` is in seconds of the game.
 *
 * The weather map is one small texture with the cloud, the rain, the snow and the wet ground of each
 * place. The clouds, the ground, the water and the plants read it in their shaders.
 *
 * Latitudes are in degrees. North is positive.
 */
const RAD = Math.PI / 180, TAU = Math.PI * 2
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
const smooth = (value: number, low: number, high: number) => { const t = clamp((value - low) / (high - low)); return t * t * (3 - 2 * t) }
const mix = (from: number, to: number, t: number) => from + (to - from) * t
const frac = (value: number) => value - Math.floor(value)
/** A value for each season, with a smooth change between them. `phase` 0 is the middle of spring. */
const ramp = (phase: number, values: readonly [number, number, number, number]) => {
  const x = frac(phase) * 4, index = Math.floor(x) % 4
  return mix(values[index], values[(index + 1) % 4], smooth(x - Math.floor(x), 0, 1))
}

/** The numbers of the weather. */
export const WEATHER = {
  /** The tropical rain belt follows the Sun to this part of the Sun latitude: 14° with a tilt of 23.4°. */
  beltReach: 0.6,
  /** The half width of the rain belt, in degrees. */
  beltWidth: 11,
  /**
   * The size of a front: a larger number gives smaller fronts. The planet is small, so it has only
   * one or two fronts at a time: a front is about 250 m across, and a lap of the planet is 1,700 m.
   */
  frontSize: 0.5,
  /** The fine part of a front. A small number gives a front one smooth edge, with no small showers around it. */
  frontDetail: 0.07,
  /** How much the wet air of a place adds to its weather. */
  wetPull: 0.3,
  /** Fair weather has small heap clouds in groups: the size of a group, and the most cover that they give. */
  fairSize: 2.4, fairCover: 0.22,
  /** A front goes around the planet in this time: 40 minutes. A shower passes a place in about 3 minutes. */
  frontRound: 2400,
  /** The shape of a front changes in this time: 15 minutes. */
  frontChange: 900,
  /**
   * Cloud starts at `low` and the sky is full at `high`. Rain and thunder the same. The limits are
   * high: most of the planet has Sun, and a grey sky or rain is rare.
   */
  cloud: { low: 0.62, high: 0.9 }, rain: { low: 0.84, high: 0.96 }, storm: { low: 0.94, high: 1 },
  /**
   * Snow falls where the warmth of src/seasons.ts is below `high`. The snow on the ground of the game
   * is full below 0.58 and ends at 0.66, so snow falls a short distance in front of the snow line.
   */
  snowFall: { low: 0.66, high: 0.74 },
  /** The hour of the heat showers of a warm afternoon. */
  heatHour: 15.5,
  /** The hour of the morning mist, and its span in hours. The mist is gone at 08:00, the hour of the start of a flight. */
  mistHour: 6, mistSpan: 1.2,
  /** The ground is wet after this time in the rain, in seconds. It is dry again after `dry`. Snow melts after `melt`. */
  soak: 14, dry: 70, melt: 200,
  /** A rainbow is a circle of 42° around the point opposite to the Sun. */
  rainbowAngle: 42,
} as const

/** A place of Earth: a direction in the frame of the planet, with the terrain and the moisture there. */
export type Place = {
  x: number; y: number; z: number
  /** Metres above the sea. */
  height: number
  /** The moisture field of the game, from -1 to 1: desert below -0.22, jungle above 0.08. */
  moist: number
  /** 1 in a river, 0 away from it. */
  river: number
}
export type Moment = { year: number; hour: number; time: number }
export type WeatherKind = 'clear' | 'fair' | 'cloudy' | 'shower' | 'rain' | 'storm' | 'snow' | 'mist'
export type Weather = {
  /** The part of the sky with cloud, from 0 to 1. */
  cover: number
  /** Rain or snow, from 0 to 1. */
  rain: number
  /** The part of the rain that falls as snow, from 0 to 1. */
  snow: number
  /** Thunder far away, from 0 to 1. */
  storm: number
  /** Mist on low ground, from 0 to 1. */
  mist: number
  /** The strength of the wind in the plants. The game of today has 1. */
  wind: number
  /** The warmth of the place: warmth() of src/seasons.ts, less the cold of its height. */
  warm: number
  kind: WeatherKind
}
export const latitudeOf = (place: { y: number }) => Math.asin(clamp(place.y, -1, 1)) / RAD
export const placeAt = (latitude: number, longitude = 0, moist = 0, height = 2, river = 0): Place => ({
  x: Math.cos(latitude * RAD) * Math.cos(longitude * RAD), y: Math.sin(latitude * RAD), z: Math.cos(latitude * RAD) * Math.sin(longitude * RAD), height, moist, river,
})

// ---- The climate: the place and the season --------------------------------------------------------

/** The latitude of the middle of the tropical rain belt. It follows the Sun, one eighth of a year late. */
export function rainBelt(year: number) { return declination(year - LOOK_LAG) * WEATHER.beltReach }
/** 1 in the tropics of the game (below 15°), 0 from 20°. The same limits as the grass colours of src/foliage/zones.ts. */
export function tropic(latitude: number) { return 1 - smooth(Math.abs(Math.sin(latitude * RAD)), 0.25, 0.35) }

/**
 * How wet the air of a place is on a day, from 0 to 1. A jungle is wet all year. A savanna has a
 * wet season when the rain belt is over it. A desert stays dry. The middle latitudes have rain in
 * each season, most in autumn. The cold air of the poles holds little water.
 */
export function wetness(latitude: number, moist: number, year: number) {
  const land = 0.08 + 0.72 * smooth(moist, -0.3, 0.2), jungle = smooth(moist, 0, 0.2)
  const belt = Math.exp(-(((latitude - rainBelt(year)) / WEATHER.beltWidth) ** 2))
  const tropical = clamp(land * mix(0.45 + 0.75 * belt, 1, jungle))
  const seasonal = mix(0.5, ramp(lookPhase(latitude, year), [0.54, 0.42, 0.6, 0.5]), seasonStrength(latitude))
  const polar = smooth(Math.abs(Math.sin(latitude * RAD)), 0.74, 0.92)
  return mix(seasonal * (1 - 0.4 * polar), tropical, tropic(latitude))
}
/** The warmth of a place on a day: the warmth of src/seasons.ts, less the cold of its height. */
export function warmthAt(latitude: number, year: number, height = 0) {
  return warmth(latitude, declination(year - LOOK_LAG)) - Math.max(0, height) * SNOW_LAPSE
}
/** The part of the rain that falls as snow. */
export function snowShare(warm: number) { return 1 - smooth(warm, WEATHER.snowFall.low, WEATHER.snowFall.high) }

// ---- The fronts -----------------------------------------------------------------------------------

export type WeatherModel = ReturnType<typeof createWeatherModel>
/** The weather of one Earth. `seed` is the seed of the landscape, so each new Earth has new weather. */
export function createWeatherModel(seed: number) {
  const west = createNoise3D(seededRandom(seed + 9100)), east = createNoise3D(seededRandom(seed + 9101)), fairField = createNoise3D(seededRandom(seed + 9102))
  const size = WEATHER.frontSize
  const field = (noise: typeof west, x: number, y: number, z: number, turn: number, lift: number) => {
    const c = Math.cos(turn), s = Math.sin(turn), px = x * c - z * s, pz = x * s + z * c
    return noise(px * size, y * size + lift, pz * size) * (1 - WEATHER.frontDetail) + noise(px * size * 2.3 + 11, y * size * 2.3 - lift, pz * size * 2.3) * WEATHER.frontDetail
  }
  /**
   * The fronts at a place, from 0 to 1. In the middle latitudes the weather goes from the west to
   * the east, as on the real Earth. In the tropics it goes from the east to the west.
   */
  function front(x: number, y: number, z: number, time: number) {
    const turn = time / WEATHER.frontRound * TAU, lift = time / WEATHER.frontChange
    const tropical = tropic(Math.asin(clamp(y, -1, 1)) / RAD)
    // East is the direction of the spin of Earth: the longitude atan2(z, x) gets smaller.
    const toEast = tropical < 1 ? field(east, x, y, z, turn, lift) : 0
    const toWest = tropical > 0 ? field(west, x, y, z, -turn * 0.6, lift) : 0
    return clamp(0.5 + mix(toEast, toWest, tropical) * 0.62)
  }
  /** The weather of a place at a moment. */
  function at(place: Place, moment: Moment): Weather {
    const latitude = latitudeOf(place)
    const wet = wetness(latitude, place.moist, moment.year), warm = warmthAt(latitude, moment.year, place.height)
    // A warm, wet afternoon makes heat showers.
    const hot = smooth(warm, 0.72, 0.9), heat = Math.exp(-(((moment.hour - WEATHER.heatHour) / 3) ** 2)) * hot * wet * 0.18
    const value = front(place.x, place.y, place.z, moment.time) + (wet - 0.5) * WEATHER.wetPull + heat
    const rain = smooth(value, WEATHER.rain.low, WEATHER.rain.high)
    // Fair weather has groups of small clouds where the air is not dry. They move with the fronts.
    const turn = moment.time / WEATHER.frontRound * TAU, c = Math.cos(turn), s = Math.sin(turn), fairSize = WEATHER.fairSize
    const fair = smooth(0.5 + fairField((place.x * c - place.z * s) * fairSize + 50, place.y * fairSize, (place.x * s + place.z * c) * fairSize) * 0.5, 0.45, 0.75)
    const cover = Math.max(smooth(value, WEATHER.cloud.low, WEATHER.cloud.high), fair * WEATHER.fairCover * smooth(wet, 0.1, 0.4))
    const storm = smooth(value, WEATHER.storm.low, WEATHER.storm.high) * hot
    const snow = snowShare(warm)
    const phase = lookPhase(latitude, moment.year), strength = seasonStrength(latitude)
    const wind = 0.75 + cover * 0.45 + rain * 0.9 + storm * 0.5 + ramp(phase, [0.1, 0, 0.35, 0.3]) * strength + Math.min(0.4, Math.max(0, place.height) * 0.03)
    // Mist comes at dawn on low, wet ground under a calm, clear sky. Autumn has the most.
    const dawn = Math.exp(-(((moment.hour - WEATHER.mistHour) / WEATHER.mistSpan) ** 2))
    const low = Math.max(1 - smooth(place.height, 1.5, 4), smooth(place.river, 0.1, 0.4))
    const mist = dawn * low * (1 - smooth(cover, 0.3, 0.8)) * smooth(wet, 0.25, 0.5) * mix(0.7, ramp(phase, [0.7, 0.45, 1, 0.8]), strength)
    return { cover, rain, snow, storm, mist, wind, warm, kind: kindOf({ cover, rain, snow, storm, mist }) }
  }
  return { seed, front, at }
}
/** The name of a weather, for the flight panel and for the note of a clip. */
export function kindOf(weather: Pick<Weather, 'cover' | 'rain' | 'snow' | 'storm' | 'mist'>): WeatherKind {
  if (weather.rain > 0.12 && weather.snow > 0.5) return 'snow'
  if (weather.storm > 0.3) return 'storm'
  if (weather.rain > 0.55) return 'rain'
  if (weather.rain > 0.12) return 'shower'
  if (weather.mist > 0.35) return 'mist'
  return weather.cover > 0.7 ? 'cloudy' : weather.cover > 0.25 ? 'fair' : 'clear'
}

/** The average weather of a latitude on a day, at noon: the part of the places with rain, with snow, and the cloud. */
export function climate(model: WeatherModel, latitude: number, moist: number, year: number, samples = 96) {
  let rain = 0, snow = 0, cover = 0
  for (let i = 0; i < samples; i++) {
    const weather = model.at(placeAt(latitude, i * 137.5, moist), { year, hour: 12, time: i * 211 })
    if (weather.rain > 0.12) { if (weather.snow > 0.5) snow++; else rain++ }
    cover += weather.cover
  }
  return { rain: rain / samples, snow: snow / samples, cover: cover / samples }
}

// ---- The ground and the rainbow -------------------------------------------------------------------

/**
 * The water or the fresh snow on the ground after `delta` seconds, from 0 to 1. Rain makes the
 * ground wet in a short time. Wet ground dries slowly. Fresh snow stays in the cold.
 */
export function groundAfter(wet: number, rain: number, snow: number, delta: number) {
  const fall = rain > wet ? (rain - wet) * (1 - Math.exp(-delta / WEATHER.soak * 3)) : 0
  const loss = wet * (1 - Math.exp(-delta / mix(WEATHER.dry, WEATHER.melt * 6, snow))) * (1 - rain)
  return clamp(wet + fall - loss)
}
/**
 * The strength of a rainbow, from 0 to 1. A rainbow needs rain in front of the eye and the Sun
 * behind it, lower than 42°. `sunshine` is the part of the Sun that the clouds let through.
 */
export function rainbow(sunElevation: number, rain: number, sunshine: number) {
  if (sunElevation <= 0 || sunElevation >= WEATHER.rainbowAngle) return 0
  return clamp(smooth(rain, 0.05, 0.4) * sunshine * smooth(WEATHER.rainbowAngle - sunElevation, 0, 8) * smooth(sunElevation, 0, 4))
}

// ---- The weather map ------------------------------------------------------------------------------

/** The size of the map, and the number of frames for one full calculation of it. */
export const WEATHER_MAP = { width: 128, height: 64, slices: 16 } as const
export type WeatherUniforms = { weatherMap: THREE.IUniform<THREE.DataTexture>; weatherOn: THREE.IUniform<number> }
export type WeatherMap = ReturnType<typeof createWeatherMap>

/**
 * The weather map of one Earth. `sample` is the terrain of the world and `moist` is the moisture
 * field of its plants. The channels: R cloud, G rain, B the part of the rain that is snow, A the
 * water or the fresh snow on the ground.
 */
export function createWeatherMap(seed: number, sample: (x: number, y: number, z: number) => TerrainSample, moist: (x: number, y: number, z: number) => number, size: { width: number; height: number } = WEATHER_MAP) {
  const model = createWeatherModel(seed)
  const count = size.width * size.height
  const places: Place[] = [], longitudes = new Float32Array(count)
  for (let row = 0; row < size.height; row++) for (let column = 0; column < size.width; column++) {
    const longitude = ((column + 0.5) / size.width - 0.5) * TAU, latitude = ((row + 0.5) / size.height - 0.5) * Math.PI
    const x = Math.cos(latitude) * Math.cos(longitude), y = Math.sin(latitude), z = Math.cos(latitude) * Math.sin(longitude)
    const terrain = sample(x, y, z)
    longitudes[places.length] = longitude
    places.push({ x, y, z, height: terrain.height, moist: moist(x, y, z), river: terrain.river })
  }
  const data = new Uint8Array(count * 4), ground = new Float32Array(count)
  const texture = new THREE.DataTexture(data, size.width, size.height, THREE.RGBAFormat)
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.wrapS = THREE.RepeatWrapping
  const uniforms: WeatherUniforms = { weatherMap: { value: texture }, weatherOn: { value: 1 } }
  let slice = 0, sunLongitude = 0, year = 0, time = 0
  /** A browser check can give the whole planet one weather. The warmth of each place stays. */
  let forced: Partial<Pick<Weather, 'cover' | 'rain' | 'storm' | 'mist'>> | null = null
  const weatherOf = (place: Place, hour: number): Weather => {
    const weather = model.at(place, { year, hour, time })
    if (!forced) return weather
    const mixed = { ...weather, ...forced }
    return { ...mixed, wind: weather.wind + (mixed.cover - weather.cover) * 0.45 + (mixed.rain - weather.rain) * 0.9, kind: kindOf(mixed) }
  }
  /** The local hour of a longitude: noon is where the Sun is. */
  const hourAt = (longitude: number) => ((12 + (sunLongitude - longitude) / TAU * 24) % 24 + 24) % 24
  const map = {
    model, texture, uniforms, data,
    /**
     * Calculates one part of the map; the parts take turns. `sunLocal` is the direction of the Sun in
     * the frame of the planet, and `delta` is the time from the last call, in seconds of the game.
     * `slices` 1 calculates the whole map.
     */
    update(nextYear: number, sunLocal: { x: number; z: number }, nextTime: number, delta: number, slices: number = WEATHER_MAP.slices) {
      year = nextYear; time = nextTime
      sunLongitude = Math.atan2(sunLocal.z, sunLocal.x)
      slice = (slice + 1) % slices
      for (let i = slice; i < count; i += slices) {
        const weather = weatherOf(places[i], hourAt(longitudes[i]))
        ground[i] = groundAfter(ground[i], weather.rain, weather.snow, delta * slices)
        data[i * 4] = weather.cover * 255; data[i * 4 + 1] = weather.rain * 255; data[i * 4 + 2] = weather.snow * 255; data[i * 4 + 3] = ground[i] * 255
      }
      texture.needsUpdate = true
    },
    /** The weather of a direction in the frame of the planet, at the moment of the last update. */
    weatherAt(direction: { x: number; y: number; z: number }): Weather {
      const terrain = sample(direction.x, direction.y, direction.z)
      return weatherOf({ x: direction.x, y: direction.y, z: direction.z, height: terrain.height, moist: moist(direction.x, direction.y, direction.z), river: terrain.river },
        hourAt(Math.atan2(direction.z, direction.x)))
    },
    /** Gives the whole planet one weather, or the weather of the model again with null. */
    force(weather: typeof forced) { forced = weather },
    dispose() { texture.dispose() },
  }
  // The first weather of the planet, so the first frame has its clouds.
  map.update(0, { x: 1, z: 0 }, 0, 0, 1)
  return map
}

// ---- The shader changes ---------------------------------------------------------------------------

/** The GLSL that reads the weather map from a direction in the frame of the planet. */
export const WEATHER_GLSL = /* glsl */`
uniform sampler2D weatherMap; uniform float weatherOn;
vec2 weatherUv(vec3 d) { return vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5); }`

type Change = { key: string; vertex: string; fragment: string; roughness?: string }
/** Adds a weather change to a built-in material. It keeps each shader change that the material has. */
function patch(material: THREE.Material, uniforms: WeatherUniforms, change: Change) {
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${WEATHER_GLSL}\nvarying vec3 vWeatherDir;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${change.vertex}`)
    // The change goes before the roughness, so it comes after the colours of the season.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${WEATHER_GLSL}\nvarying vec3 vWeatherDir;`)
      .replace('#include <roughnessmap_fragment>', `vec4 weather = texture2D(weatherMap, weatherUv(normalize(vWeatherDir)));\n${change.fragment}\n#include <roughnessmap_fragment>\n${change.roughness ?? ''}`)
  }
  material.customProgramCacheKey = () => `${previousKey}|weather-${change.key}`
  return material
}
/** The ground: a shadow under a cloud, dark and wet ground after rain, and fresh snow in the cold. */
export function weatherGround(material: THREE.Material, uniforms: WeatherUniforms) {
  return patch(material, uniforms, {
    key: 'ground',
    vertex: 'vWeatherDir = normalize(position);',
    fragment: /* glsl */`{
      float snowy = weather.b;
      diffuseColor.rgb *= 1.0 - weatherOn * weather.r * 0.34;
      diffuseColor.rgb *= 1.0 - weatherOn * weather.a * (1.0 - snowy) * 0.3;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.93) * (1.0 - weather.r * 0.2), weatherOn * smoothstep(0.15, 0.8, weather.a) * snowy * 0.92);
    }`,
    roughness: 'roughnessFactor = mix(roughnessFactor, 0.4, weatherOn * weather.a * (1.0 - weather.b) * 0.7);',
  })
}
/** The water: a shadow under a cloud. Rain breaks the mirror of the water. */
export function weatherWater(material: THREE.Material, uniforms: WeatherUniforms) {
  return patch(material, uniforms, {
    key: 'water',
    vertex: 'vWeatherDir = normalize(position);',
    fragment: 'diffuseColor.rgb *= 1.0 - weatherOn * weather.r * 0.3;',
    roughness: 'roughnessFactor = mix(roughnessFactor, 0.8, weatherOn * weather.g);',
  })
}
/** The plants: a shadow under a cloud, and a thin cover of fresh snow. */
export function weatherPlant(material: THREE.Material, uniforms: WeatherUniforms) {
  return patch(material, uniforms, {
    key: 'plant',
    vertex: /* glsl */`
      #ifdef USE_INSTANCING
        vWeatherDir = normalize(instanceMatrix[3].xyz);
      #else
        vWeatherDir = normalize(position);
      #endif`,
    fragment: /* glsl */`diffuseColor.rgb *= 1.0 - weatherOn * weather.r * 0.3;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.93), weatherOn * smoothstep(0.3, 0.9, weather.a) * weather.b * 0.45);`,
  })
}
