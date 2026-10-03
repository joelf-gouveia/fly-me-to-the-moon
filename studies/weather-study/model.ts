import { createNoise3D } from 'simplex-noise'
import { seededRandom } from '../../src/terrain'
import { declination, LOOK_LAG, lookPhase, seasonAt, seasonStrength, SNOW_LAPSE, warmth } from '../../src/seasons'
import type { SeasonName } from '../../src/seasons'

/**
 * The weather of Earth for the weather study (docs/weather-study.md): what makes the weather of a
 * place, the clips, the findings and the decisions. It has no 3D code: the prototype (weather.ts)
 * and the page (main.ts) read it.
 *
 * Four things make the weather of a place:
 * 1. The place: its latitude, its height and the moisture field of the game (src/foliage/zones.ts).
 * 2. The season: `year` of src/seasons.ts. Year 0 is the March equinox.
 * 3. The hour: the local hour of the Sun, from 0 to 24. Noon is 12.
 * 4. The fronts: fields of cloud that move around the planet. `time` is in seconds of the game.
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
  /** The size of a front: a larger number gives smaller fronts. A front is about 80 m across. */
  frontSize: 3.2,
  /** A front goes around the planet in this time: 40 minutes. A shower passes a place in about 1 minute. */
  frontRound: 2400,
  /** The shape of a front changes in this time: 15 minutes. */
  frontChange: 900,
  /** Cloud starts at `low` and the sky is full at `high`. Rain and thunder the same. */
  cloud: { low: 0.5, high: 0.8 }, rain: { low: 0.68, high: 0.88 }, storm: { low: 0.84, high: 0.98 },
  /**
   * Snow falls where the warmth of src/seasons.ts is below `high`. The snow on the ground of the game
   * is full below 0.58 and ends at 0.66, so snow falls a short distance in front of the snow line.
   */
  snowFall: { low: 0.66, high: 0.74 },
  /** The hour of the heat showers of a warm afternoon. */
  heatHour: 15.5,
  /** The hour of the morning mist. */
  mistHour: 6.5,
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
/** The words of the flight panel. */
export const KIND_NAMES: Record<WeatherKind, string> = {
  clear: 'Clear sky', fair: 'A few clouds', cloudy: 'Grey sky', shower: 'Light rain', rain: 'Rain', storm: 'Thunder far away', snow: 'Snow', mist: 'Morning mist',
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
  const west = createNoise3D(seededRandom(seed + 9100)), east = createNoise3D(seededRandom(seed + 9101))
  const size = WEATHER.frontSize
  const field = (noise: typeof west, x: number, y: number, z: number, turn: number, lift: number) => {
    const c = Math.cos(turn), s = Math.sin(turn), px = x * c - z * s, pz = x * s + z * c
    return noise(px * size, y * size + lift, pz * size) * 0.68 + noise(px * size * 2.3 + 11, y * size * 2.3 - lift, pz * size * 2.3) * 0.32
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
    const hot = smooth(warm, 0.72, 0.9), heat = Math.exp(-(((moment.hour - WEATHER.heatHour) / 3) ** 2)) * hot * wet * 0.28
    const value = front(place.x, place.y, place.z, moment.time) + (wet - 0.5) * 0.62 + heat
    const cover = smooth(value, WEATHER.cloud.low, WEATHER.cloud.high), rain = smooth(value, WEATHER.rain.low, WEATHER.rain.high)
    const storm = smooth(value, WEATHER.storm.low, WEATHER.storm.high) * hot
    const snow = snowShare(warm)
    const phase = lookPhase(latitude, moment.year), strength = seasonStrength(latitude)
    const wind = 0.75 + cover * 0.45 + rain * 0.9 + storm * 0.5 + ramp(phase, [0.1, 0, 0.35, 0.3]) * strength + Math.min(0.4, Math.max(0, place.height) * 0.03)
    // Mist comes at dawn on low, wet ground under a calm, clear sky. Autumn has the most.
    const dawn = Math.exp(-(((moment.hour - WEATHER.mistHour) / 2.2) ** 2))
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

// ---- The page -------------------------------------------------------------------------------------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** The month of a year value. Year 0 is 20 March. */
export function monthAt(year: number) { return MONTHS[new Date(Date.UTC(2026, 2, 20) + frac(year) * 365.25 * 86400000).getUTCMonth()] }
export const latitudeLabel = (latitude: number) => Math.round(latitude) === 0 ? 'Equator' : `${Math.abs(Math.round(latitude))}° ${latitude > 0 ? 'N' : 'S'}`
export const hourLabel = (hour: number) => `${String(Math.floor(frac(hour / 24) * 24)).padStart(2, '0')}:${String(Math.floor(frac(hour) * 60)).padStart(2, '0')}`
export const title = (text: string) => text[0].toUpperCase() + text.slice(1)
/** The season of a place in words: "Summer", or "No season" near the equator. */
export function seasonWord(latitude: number, year: number) { const name = seasonAt(latitude, year); return name ? title(name) : 'No season' }

/** The places of the climate table of the page. `moist` is the moisture field of the game there. */
export const BELT_ROWS: { name: string; latitude: number; moist: number }[] = [
  { name: 'Jungle', latitude: 4, moist: 0.3 },
  { name: 'Savanna', latitude: 11, moist: -0.08 },
  { name: 'Desert', latitude: 9, moist: -0.4 },
  { name: 'Leaf forest', latitude: 30, moist: 0 },
  { name: 'Pine forest', latitude: 41, moist: 0 },
  { name: 'Snow line', latitude: 54, moist: 0 },
]
/** The middle of each season in the north, as a year value: the look comes one eighth of a year after the Sun. */
export const SEASON_YEARS: Record<SeasonName, number> = { spring: 0.125, summer: 0.375, autumn: 0.625, winter: 0.875 }
export const SEASON_WORDS: Record<SeasonName, string> = {
  spring: 'Showers and rainbows', summer: 'Clear mornings, heat showers in the afternoon', autumn: 'Wind, rain and morning mist', winter: 'Grey sky and snow',
}

export type ClipId = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7' | 'W8' | 'W9' | 'W10'
export type Clip = { id: ClipId; name: string; line: string; look: string; honest: string }
export const CLIPS: Clip[] = [
  { id: 'W1', name: 'Earth, one year of weather', line: 'The weather map from space, one year in 12 seconds.',
    look: 'The band of cloud at the equator goes north in June and south in December: it follows the Sun. The fronts of the middle latitudes go from the west to the east. The land under a thick cloud is darker.',
    honest: 'The clip shows one year of the seasons and 12 minutes of the fronts. Earth turns once in the clip. In the game it turns 16 times in a year.' },
  { id: 'W2', name: 'One leaf forest, four seasons', line: 'The weather of each season at 32° N.',
    look: 'A spring shower with a rainbow. A summer afternoon with a heat shower far away. Autumn wind, rain and leaves. A grey winter sky with snow.',
    honest: 'The study puts the weather of each season over the camera. In the game the weather map decides the moment.' },
  { id: 'W3', name: 'One moment, four places', line: 'The same hour in the jungle, the desert, the leaf forest and the far south.',
    look: 'Warm rain in the jungle. A clear, dry sky over the desert. A few clouds over the leaf forest. Snow near the pole. The place changes the weather.',
    honest: 'The study looks for a jungle and for a desert on the Earth of this visit. The game makes a new Earth at each visit, so the places differ.' },
  { id: 'W4', name: 'A shower passes', line: 'Sun, cloud, rain, Sun again, and a rainbow.',
    look: 'The sky goes grey and the light goes soft. The rain makes the ground dark and the water dull. Then the cloud goes away to the east, the Sun comes back, and a rainbow stands opposite to the Sun. The ground dries.',
    honest: 'The clip shows about 2 minutes of the game in 14 seconds. The rain has no sound in the study.' },
  { id: 'W5', name: 'Morning mist', line: 'Dawn in autumn, on low ground near the water.',
    look: 'Mist lies on the low ground before the Sun comes up. The Sun warms the air, and the mist goes away by the middle of the morning.',
    honest: 'The mist of the study is the fog of the game with a higher density, and soft discs near the ground. It does not flow.' },
  { id: 'W6', name: 'A flight into the rain', line: 'The fairy flies from the Sun into a shower and out again.',
    look: 'The weather is a place. The fairy sees the grey cloud from far away, flies under it into the rain, and comes out into the Sun on the other side.',
    honest: 'The rain is in a box around the camera, so rain far away shows only as a grey cloud and a dark ground.' },
  { id: 'W7', name: 'The first snow', line: 'Snow falls at the edge of the snow line and stays on the ground.',
    look: 'The snow of the seasons is on the hills from the temperature. The snow of the weather falls from a cloud and makes the ground white in a few seconds. It stays while the air is cold.',
    honest: 'The clip shows about 1 minute of the game in 10 seconds.' },
  { id: 'W8', name: 'Thunder far away', line: 'A warm night: stars above, and a storm on the horizon.',
    look: 'The cloud far away glows for a moment, with no bolt and no bang. The stars show only where the sky is clear.',
    honest: 'The study has no sound. The proposal is a soft, low rumble, or no sound.' },
  { id: 'W9', name: 'The clouds, before and after', line: 'The puffs of the game, then the new clouds in three kinds of weather.',
    look: 'The puffs of today are clear, grey-green balls, and each place has the same ones. The new heap clouds are solid and white, with a flat base. They are small in fair weather, tall and grey under a front, and warm in the light of a low Sun. High wisps are above them.',
    honest: 'The first scene is the game of today, with no weather. The other three scenes have the weather of the study over the camera.' },
  { id: 'W10', name: 'Rain far away, and above the clouds', line: 'A rain curtain under a cloud, the tops of the clouds, and the low Sun.',
    look: 'A soft curtain goes from a rain cloud to the ground, so the fairy sees the rain before she gets there. From above, the heap clouds stand out of the grey layer. At dusk the clouds take the colours of the low Sun.',
    honest: 'A rain curtain is a soft column with no drops. It goes clear near the camera, where the rain lines take its place.' },
]
export const clipById = (id: ClipId) => CLIPS.find(clip => clip.id === id)!

/** A finding in the game of today, with its evidence in the code. */
export const FINDINGS: [string, string][] = [
  ['The clouds do not know the place', '<code>buildClouds()</code> puts 1,050 puffs on Earth in random groups of seven (<code>src/worlds.ts:206</code>). The loop turns them slowly: <code>world.clouds.rotation.y += delta * 0.001</code> (<code>src/main.ts:1010</code>). A desert and a jungle have the same sky.'],
  ['Snow falls all the time in the cold', '<code>fallAt()</code> gives snow where the snow cover of the season is more than 0.35 (<code>src/seasons.ts:77</code>). The snow does not need a cloud. The game has no rain.'],
  ['A puff is a clear ball', 'Each puff is a ball of 80 triangles with an opacity of 0.65 and no depth write (<code>src/worlds.ts:216</code>). The puffs of a group show through each other. From below, a puff has only the ground light of the game, so it is grey-green. The sky has one kind of cloud.'],
  ['The fog and the light know the Sun only', '<code>updateEnvironment()</code> sets the fog, the sky and the light from the height of the camera and the height of the Sun (<code>src/main.ts:879</code>). A weather term has a clear place there.'],
  ['The game has a moisture field', '<code>fields.moist</code> of <code>src/foliage/zones.ts:36</code> decides where the jungle, the savanna and the desert are. The weather can read the same field: rain where the jungle is.'],
  ['The seasons give a temperature', '<code>warmth()</code> and <code>snowCover()</code> of <code>src/seasons.ts</code> give each place a warmth for the day of the year. The same number decides rain or snow.'],
  ['Earth is new at each visit', '<code>regenerateWorld()</code> makes a new landscape and new clouds from a new seed (<code>src/worlds.ts:427</code>). So the weather must come from rules and from the seed, not from fixed places.'],
  ['The stars read one number', '<code>skyVisibility</code> fades the stars, the asteroid belt and the comet in the air and in daylight (<code>src/main.ts:897</code>). The cloud cover can go into the same number.'],
]

/** The kinds of the new clouds: where each one shows, and its look. */
export const CLOUD_KINDS: { name: string; where: string; look: string }[] = [
  { name: 'Heap clouds', where: 'Where the map has cloud. Each cloud has its own limit, so the sky fills cloud by cloud.', look: 'Solid and white, with a flat, light grey base. No cloud shows through a different cloud.' },
  { name: 'Rain clouds', where: 'Where the map has rain.', look: 'The same heap clouds, to 2 times as tall and with a darker base.' },
  { name: 'The grey layer', where: 'Under a front, where more than half of the sky has cloud.', look: 'It closes the sky between the heap clouds, and it hides the Sun and the stars.' },
  { name: 'High wisps', where: 'In groups above the heap clouds, and not above a front.', look: 'Thin streaks from the west to the east. They go pink at dusk.' },
  { name: 'Rain curtains', where: 'Under a rain cloud.', look: 'A soft grey column to the ground, and a white one for snow. The fairy sees the rain from far away.' },
]
/** The faults of the puffs of the game, for the page. */
export const PUFF_FAULTS: string[] = [
  'Each place has the same puffs: a desert and a jungle have the same sky.',
  'A puff is clear, so the puffs of a group show through each other.',
  'From below, a puff is grey-green: it has only the ground light of the game.',
  'The sky has one kind of cloud, at each height of the Sun and in each weather.',
]

export type Option = { id: 'A' | 'B'; name: string; line: string; good: string[]; bad: string[] }
export const OPTIONS: Option[] = [
  { id: 'A', name: 'A weather map', line: 'One small map of the planet holds the cloud, the rain and the wet ground of each place. Each system reads it.',
    good: ['The place changes the weather: rain in the jungle, a clear sky over the desert, snow near the pole.', 'The fairy sees a shower from far away and can fly into it and out of it.', 'The weather shows from space.', 'The season, the hour and the landscape of the visit all go into one model.'],
    bad: ['A new texture of 128 × 64, and a part of it to calculate on each frame.', 'A shader change in the ground, the water, the plants and the clouds.'] },
  { id: 'B', name: 'One sky', line: 'The whole planet has one weather at a time. A clock changes it.',
    good: ['It is the smaller change: no map and no shader change in the ground.', 'It is easy to control: for example, the start is always fair.'],
    bad: ['The place does not change the weather: it rains in the desert too.', 'From space the planet is all cloud or all clear.', 'The fairy cannot fly out of the rain.'] },
]

/** A system of the game that the weather and the season can change. */
export type SystemRow = { name: string; weather: string; season: string; shown: string; when: 'First' | 'Later' | 'Open' }
export const SYSTEMS: SystemRow[] = [
  { name: 'Clouds', weather: 'New clouds take the place of the puffs: heap clouds, high wisps, a grey layer under a front and rain curtains. Each one shows only where the map has its weather.', season: 'The rain belt of the tropics follows the Sun. The middle latitudes have more cloud in autumn.', shown: 'W1, W4, W9, W10', when: 'First' },
  { name: 'Rain and snow in the air', weather: 'Rain falls under a rain cloud. Snow falls where the air is cold.', season: 'The season decides rain or snow. Today snow falls all the time in the cold.', shown: 'W2, W3, W7', when: 'First' },
  { name: 'Sky, fog and light', weather: 'A grey sky, a soft light and a shorter view in the rain. Mist at dawn.', season: 'Mist comes most in autumn.', shown: 'W4, W5', when: 'First' },
  { name: 'Ground', weather: 'A cloud makes a shadow. Rain makes the ground dark and wet, then it dries. Fresh snow stays in the cold.', season: 'The snow line of the seasons moves forward with each snow.', shown: 'W4, W7', when: 'First' },
  { name: 'Water', weather: 'Rain makes the sea and the rivers dull.', season: 'The sea ice of the seasons stays.', shown: 'W4', when: 'First' },
  { name: 'Plants', weather: 'The wind of the plants is one number today. Its strength comes from the weather: calm under a clear sky, strong in a front.', season: 'Autumn and winter have more wind. Leaves fall faster in the wind.', shown: 'W2', when: 'First' },
  { name: 'Rainbow', weather: 'After rain, opposite to a Sun that is lower than 42°.', season: 'Spring showers give the most rainbows.', shown: 'W2, W4', when: 'First' },
  { name: 'Stars and shooting stars', weather: 'They show only where the night sky is clear.', season: 'No change.', shown: 'W8', when: 'First' },
  { name: 'Flight panel', weather: 'A second line gives the weather: "Light rain", "Morning mist".', season: 'A line can give the season: "Autumn".', shown: 'Notes of each clip', when: 'First' },
  { name: 'Sound', weather: 'A soft rain sound, the wind, and a low rumble far away. No bang.', season: 'Birds in spring, crickets on a summer night.', shown: 'Not in the study', when: 'Later' },
  { name: 'Creatures', weather: 'Land animals go under the trees in the rain. Ducks stay out. Fireflies come on dry nights only.', season: 'Some animals come in summer only. Some sleep in winter.', shown: 'Not in the study', when: 'Later' },
  { name: 'Sticker book and postcard', weather: 'New tasks: "Fly through a rainbow", "Find the snow". A rainbow on a postcard.', season: 'A sticker for each season.', shown: 'Not in the study', when: 'Later' },
  { name: 'Rivers', weather: 'No change in the proposal: a river that grows needs new terrain.', season: 'A full river in spring is possible later.', shown: 'Not in the study', when: 'Open' },
  { name: 'The flight', weather: 'The proposal: the wind does not push the fairy. The game stays calm, with no fail.', season: 'No change.', shown: 'Not in the study', when: 'Open' },
]

export type Decision = { id: string; title: string; why: string; options: string[]; multi?: boolean }
export const DECISIONS: Decision[] = [
  { id: 'model', title: '1 · How does the game make the weather?',
    why: 'Section 08 compares the two options. The live view has a switch for them.',
    options: ['A — A weather map: the place, the season and the hour change the weather (recommended)', 'B — One sky: the whole planet has one weather at a time', 'No weather: keep the game of today'] },
  { id: 'kinds', title: '2 · Which weather does Earth get?', multi: true,
    why: 'Each kind has a clip. Thunder is a glow far away, with no bolt.',
    options: ['Rain', 'Snow that falls from a cloud and stays on the ground', 'Wind in the plants', 'Morning mist', 'A rainbow after rain', 'Thunder far away'] },
  { id: 'pace', title: '3 · How fast does the weather change?',
    why: 'A day of the game is 225 seconds, and a year is 60 minutes.',
    options: ['A shower passes a place in about 1 minute (recommended)', 'Slower: one weather for a day of the game', 'It follows World speed in Settings, as the year does'] },
  { id: 'start', title: '4 · Which sky does a visit to Earth start with?',
    why: 'Earth is new at each visit. The first view sets the mood.',
    options: ['A fair sky at the place of arrival, and weather on the horizon (recommended)', 'The weather of the map, with no change', 'The same as the real season: more rain in autumn, more Sun in summer'] },
  { id: 'dark', title: '5 · How dark is the rain?',
    why: 'The game is calm. Clip W4 shows the look of the study.',
    options: ['As in the study: a soft grey sky, the ground stays clear to see (recommended)', 'Lighter: a bright sky with rain', 'Darker: a real storm sky'] },
  { id: 'thunder', title: '6 · What does the thunder do?',
    why: 'Clip W8. A small child can fear thunder.',
    options: ['A glow in a cloud far away, with a soft, low rumble (recommended)', 'A glow with no sound', 'No thunder in the game'] },
  { id: 'systems', title: '7 · Which other systems follow the weather and the season?', multi: true,
    why: 'Section 06 gives each system. The first four are in the clips.',
    options: ['The ground: cloud shadow, wet ground, fresh snow', 'The water: dull in the rain', 'The plants: the wind from the weather', 'The stars: only in a clear sky', 'The flight panel: the name of the weather', 'The sound: rain, wind, birds, crickets', 'The creatures: shelter in the rain, animals of each season', 'The sticker book: weather tasks', 'The flight: a gentle wind that carries the fairy'] },
  { id: 'clouds', title: '8 · Which clouds does Earth get?',
    why: 'Section 03, and clips W9 and W10. The live view has a switch between the new clouds and the puffs.',
    options: ['The new clouds: heap clouds, high wisps, the grey layer and rain curtains (recommended)', 'The new heap clouds and the grey layer only', 'The puffs of today, with a size from the weather map'] },
  { id: 'next', title: '9 · What comes next?',
    why: 'The study code is a prototype. The game needs its own code and tests.',
    options: ['Build the weather of Earth in the game, in the five steps of section 09 (recommended)', 'Build the map, the clouds, the rain and the snow only', 'A study of the candy weather of Blossom Haven first', 'More study of Earth first'] },
]
