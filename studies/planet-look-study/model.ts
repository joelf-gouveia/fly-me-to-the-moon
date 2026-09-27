import { PROPORTIONS } from '../../src/proportions'
import { BAKE_SIZE, ROCKY_RELIEF as GAME_RELIEF } from '../../src/planet-look'

// The look that the game uses now (option B) is in src/planet-look.ts and src/planet-paint.ts.
export { BAKE_SIZE, gameRingRadius, RING_SPAN, RING_ZONES, ringOpacity, SPACE_LIGHT, spaceLightAt } from '../../src/planet-look'
/** The relief scale of Mercury and Mars in the game. */
export const ROCKY_RELIEF = GAME_RELIEF.mercury!

/**
 * Planet look study: pure data and numbers. No DOM and no WebGL, so the tests can run in Node.
 * Game values are copies of `data` in src/worlds.ts (base units) and of the lights in src/main.ts.
 * The game multiplies the base units by PROPORTIONS (src/proportions.ts); `inGame()` does the same.
 */

export type PlanetId = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
export type LookOption = 'today' | 'retune' | 'paint' | 'photo'
export type View = 'portrait' | 'approach' | 'flight'

export const PLANET_IDS: PlanetId[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
export const GAS_GIANTS: PlanetId[] = ['jupiter', 'saturn', 'uranus', 'neptune']

/** The game lights in space (src/main.ts): the Sun as a point light, and the hemisphere light outside air. */
export const SUN_LIGHT = 2.4
export const HEMISPHERE_IN_SPACE = 1.1
/** Saturn's rings today: five rings at 1.3 to 2.02 radii, turned by π / 2.3 about X in the spinning group. */
export const TODAY_RING_TURN = Math.PI / 2.3
/** src/relocation.ts keeps Blossom Haven out of 2.1 Saturn radii. */
export const RELOCATION_RING_LIMIT = 2.1

export type Palette = {
  /** Gas giants: the bright zones. Rocky worlds: the ground. */
  zone: number
  /** Gas giants: the dark belts. Rocky worlds: the dark regions. */
  belt: number
  /** Day sky and the colour of the air around the planet. */
  sky: number
  /** Cloud puffs of the cloud layer. */
  cloud: number
}

export type Planet = {
  id: PlanetId
  name: string
  /** Game values from `data` in src/worlds.ts. */
  radius: number; orbit: number; angle: number; color: number; atmosphere: number; cloudHeight: number
  gas: boolean
  /** Real axial tilt in degrees. Venus turns backward: 177.4° shows as 2.6°. */
  obliquity: number
  /** Axial turn in seconds, from `axialSpinPeriods` in src/main.ts. */
  spin: number
  /** The equirectangular reference map in public/planets/ssc/. */
  map: string
  /** Mean sRGB colour of the map, and of 10° latitude bands from +90° to −80°. Measured in the browser. */
  reference: { mean: number; bands: number[] }
  /** Option A: new colours for the code of today. */
  retune: Palette & { bands?: number; warp?: number; contrast: number }
  /** What a picture of the real planet shows. */
  features: string[]
  /** What the game shows today. */
  today: string
}

const hex = (value: string) => Number.parseInt(value.slice(1), 16)
const bands = (text: string) => text.split(' ').map(item => hex(item.split(':')[1]))

export const PLANETS: Record<PlanetId, Planet> = {
  mercury: {
    id: 'mercury', name: 'Mercury', radius: 95, orbit: 1400, angle: 0.28, color: 0xb7a58d, atmosphere: 0, cloudHeight: 0, gas: false,
    obliquity: 0.03, spin: 250, map: '2k_mercury.jpg',
    reference: { mean: 0x848484, bands: bands('90:#9d9c9b 80:#949291 70:#929090 60:#8a8888 50:#888787 40:#8c8b8c 30:#878686 20:#888788 10:#878787 0:#848484 -10:#808080 -20:#7d7c7c -30:#787878 -40:#727171 -50:#727272 -60:#777676 -70:#7e7d7d -80:#898887') },
    retune: { zone: 0x98948f, belt: 0x6f7178, sky: 0x02030f, cloud: 0xffffff, contrast: 0.34 },
    features: ['Grey, with a hint of brown', 'Bright young craters with long white rays', 'Dark blue-grey plains', 'Many craters, as on the Moon'],
    today: 'One warm grey. Craters show only in the shading.',
  },
  venus: {
    id: 'venus', name: 'Venus', radius: 170, orbit: 2250, angle: 1.18, color: 0xd5a36d, atmosphere: 95, cloudHeight: 48, gas: false,
    obliquity: 2.6, spin: 300, map: '2k_venus_atmosphere.jpg',
    reference: { mean: 0xe5be80, bands: bands('90:#c7a065 80:#ddb678 70:#e8c182 60:#ecc587 50:#e7bf81 40:#e8c083 30:#e7bf82 20:#e2ba7d 10:#dab275 0:#ddb678 -10:#e5be81 -20:#edc688 -30:#e9c183 -40:#e3bc7e -50:#edc587 -60:#efc98b -70:#edc587 -80:#ecc586') },
    retune: { zone: 0xecc98f, belt: 0xa28153, sky: 0xe8c283, cloud: 0xf0d29a, contrast: 0.2 },
    features: ['A closed deck of cream-gold cloud', 'Soft dark swirls in a sideways Y', 'No ground in sight from space'],
    today: 'Brown ground with loose clumps of ochre cloud. The ground shows between the clumps.',
  },
  mars: {
    id: 'mars', name: 'Mars', radius: 145, orbit: 4500, angle: 2.12, color: 0xd7a087, atmosphere: 42, cloudHeight: 23, gas: false,
    obliquity: 25.2, spin: 260, map: '2k_mars.jpg',
    reference: { mean: 0xb76348, bands: bands('90:#e8deda 80:#a05d4a 70:#a35038 60:#a4523b 50:#a85238 40:#ae5439 30:#b25639 20:#b2573a 10:#b2573a 0:#ac583d -10:#ad5b41 -20:#b05d43 -30:#ae593f -40:#b0573b -50:#c25d3c -60:#cc5f3b -70:#d86942 -80:#de8667') },
    retune: { zone: 0xc2603a, belt: 0x6e3b2c, sky: 0xdca27e, cloud: 0xf3e2d4, contrast: 0.3 },
    features: ['Rust-orange ground', 'Large dark regions of basalt', 'White ice caps at both poles', 'A long canyon near the equator', 'Butterscotch sky'],
    today: 'One pink-brown. No dark regions, no ice caps.',
  },
  jupiter: {
    id: 'jupiter', name: 'Jupiter', radius: 470, orbit: 6300, angle: 4.2, color: 0xd7bb9c, atmosphere: 145, cloudHeight: 38, gas: true,
    obliquity: 3.1, spin: 180, map: '2k_jupiter.jpg',
    reference: { mean: 0xa7a196, bands: bands('90:#818d8a 80:#878b85 70:#86847c 60:#94897c 50:#ae9b86 40:#bca790 30:#bcbdbb 20:#b2977c 10:#c4b7aa 0:#cbcbc9 -10:#b7a594 -20:#c7cbcd -30:#baad9f -40:#aa9a88 -50:#998b7b -60:#8e8f88 -70:#979e9b -80:#949f9b') },
    retune: { zone: 0xeee6d8, belt: 0xc4834f, sky: 0xe6d3bb, cloud: 0xf4ece0, bands: 22, warp: 0.35, contrast: 1 },
    features: ['White zones and orange-brown belts', 'The Great Red Spot', 'Swirls and white ovals at the belt edges', 'Grey-blue poles'],
    today: '30 thin stripes of one tan colour, 35% darker than the planet colour.',
  },
  saturn: {
    id: 'saturn', name: 'Saturn', radius: 390, orbit: 8500, angle: 5.18, color: 0xe1cb9e, atmosphere: 130, cloudHeight: 35, gas: true,
    obliquity: 26.7, spin: 200, map: '2k_saturn.jpg',
    reference: { mean: 0xd0c1a3, bands: bands('90:#959e94 80:#a6a38a 70:#b0a686 60:#bdab89 50:#c9b58d 40:#d4bd92 30:#d7bd93 20:#eed3a9 10:#fce5c3 0:#feeacb -10:#f6dfb8 -20:#e7d19f -30:#e6d4a8 -40:#decdaa -50:#d0c3ac -60:#c8bfb4 -70:#bfb7b0 -80:#a2a3a4') },
    retune: { zone: 0xfbe7c4, belt: 0xd2b27f, sky: 0xeedcb4, cloud: 0xfcf0d8, bands: 26, warp: 0.25, contrast: 0.6 },
    features: ['Soft butterscotch bands, pale at the equator', 'A blue-grey hexagon at the north pole', 'Wide bright rings with the dark Cassini gap', 'The shadow of the planet on the rings'],
    today: '30 thin tan stripes. Five flat rings that the Sun does not light, 12° off the equator.',
  },
  uranus: {
    id: 'uranus', name: 'Uranus', radius: 285, orbit: 10900, angle: 3.05, color: 0x96d9df, atmosphere: 100, cloudHeight: 28, gas: true,
    obliquity: 97.8, spin: 220, map: '2k_uranus.jpg',
    reference: { mean: 0x9bcbd2, bands: bands('90:#aadce4 80:#aadce4 70:#acdfe6 60:#afe4ea 50:#b0e4ea 40:#ade0e6 30:#a9dbe2 20:#a6d8df 10:#a5d6dd 0:#a2d2d9 -10:#9ccbd3 -20:#93c1c8 -30:#8bb7be -40:#87b3b9 -50:#86b1b8 -60:#82adb4 -70:#80aab1 -80:#7faab1') },
    retune: { zone: 0xb2e6ec, belt: 0x8fc0c8, sky: 0xb6e7ee, cloud: 0xe9fbff, bands: 6, warp: 0.3, contrast: 0.35 },
    features: ['Smooth pale cyan', 'A bright cap on the sunlit pole', 'Thin dark rings', 'It lies on its side: tilt 98°'],
    today: '30 dark stripes on a planet that shows almost none.',
  },
  neptune: {
    id: 'neptune', name: 'Neptune', radius: 275, orbit: 13600, angle: 5.82, color: 0x638ecb, atmosphere: 105, cloudHeight: 32, gas: true,
    obliquity: 28.3, spin: 240, map: '2k_neptune.jpg',
    reference: { mean: 0x364fa8, bands: bands('90:#2e3587 80:#303688 70:#2e3584 60:#323f98 50:#3d56b9 40:#405dc1 30:#3b5abc 20:#3b66c5 10:#3e76ce 0:#417dd2 -10:#3f77d0 -20:#3967c2 -30:#3552ae -40:#30429a -50:#2d3889 -60:#31388e -70:#343b93 -80:#2f3587') },
    retune: { zone: 0x3f7fd6, belt: 0x2c3a94, sky: 0x6f9cf0, cloud: 0xeef4ff, bands: 9, warp: 0.35, contrast: 0.8 },
    features: ['Deep azure blue, darker at the poles', 'The Great Dark Spot with white clouds beside it', 'Bright white streaks of high cloud'],
    today: '30 stripes of a grey-blue, 35% darker than the planet colour.',
  },
}

export type Proportions = { size: number; spacing: number }
/** The proportions before the proportions study: the base units of `data` in src/worlds.ts. */
export const BASE_PROPORTIONS: Proportions = { size: 1, spacing: 1 }

/** Sizes and distances of a planet as the game uses them now. Terrain heights stay in metres. */
export function inGame(id: PlanetId, proportions: Proportions = PROPORTIONS) {
  const planet = PLANETS[id]
  return {
    radius: planet.radius * proportions.size, atmosphere: planet.atmosphere * proportions.size,
    cloudHeight: planet.cloudHeight * proportions.size, orbit: planet.orbit * proportions.spacing,
  }
}

export type Option = { letter: string; name: string; line: string }
export const OPTIONS: Record<LookOption, Option> = {
  today: { letter: '·', name: 'Before', line: 'The planets before this study, made again from a copy of the old code (legacy.ts).' },
  retune: { letter: 'A', name: 'Retune', line: 'The same code with new numbers: colours from the pictures, darker night sides, real tilts, rings on the equator.' },
  paint: { letter: 'B', name: 'Storybook paint', line: 'A, plus hand-made maps for each planet, painted on the graphics card from the pictures. The game uses this option now.' },
  photo: { letter: 'C', name: 'Photo maps', line: 'A, plus the spacecraft maps of Solar System Scope on each planet.' },
}
export const LOOK_OPTIONS = Object.keys(OPTIONS) as LookOption[]

// ---- Colour -----------------------------------------------------------------------------------

export const srgbToLinear = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
export const linearToSrgb = (c: number) => c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
export const channels = (color: number) => [(color >> 16) & 255, (color >> 8) & 255, color & 255].map(value => value / 255)

/** OKLCH lightness (0 to 1) and chroma of an sRGB colour: https://bottosson.github.io/posts/oklab/ */
export function oklch(color: number) {
  const [r, g, b] = channels(color).map(srgbToLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817104838 * g + 0.6299787656 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675778 * s
  return { lightness: L, chroma: Math.hypot(A, B), hue: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 }
}

/** An sRGB colour times a factor in linear light, as `color.multiplyScalar()` does in the game. */
export function scaleLinear(color: number, factor: number) {
  const [r, g, b] = channels(color).map(value => Math.round(Math.min(1, linearToSrgb(srgbToLinear(value) * factor)) * 255))
  return (r << 16) | (g << 8) | b
}

/** The ground or deck colour of today, before buildGasDeck() or buildGround() changes it. */
export function todayBase(id: PlanetId) {
  const planet = PLANETS[id]
  return planet.gas ? planet.color : id === 'mars' ? 0xb87651 : id === 'venus' ? 0xa28153 : 0x918c85
}

/**
 * The darkest and the lightest colour of the planet today. Gas giants: buildGasDeck() multiplies the planet
 * colour by 0.65 ± 0.15 for the bands. Rocky worlds: buildGround() multiplies the ground colour by 0.9 to 1.1.
 * The Venus value is its ground: from far away its brown ground shows between the cloud puffs.
 */
export function todayRange(id: PlanetId): [number, number] {
  const [low, high] = PLANETS[id].gas ? [0.5, 0.8] : [0.9, 1.1]
  return [scaleLinear(todayBase(id), low), scaleLinear(todayBase(id), high)]
}

/** The darkest and the lightest colour of option A: the belt and the zone, or the ground with its new contrast. */
export function retuneRange(id: PlanetId): [number, number] {
  const palette = PLANETS[id].retune
  if (PLANETS[id].gas) return [palette.belt, palette.zone]
  if (id === 'venus') return [scaleLinear(palette.cloud, 0.92), palette.cloud]
  return [scaleLinear(palette.zone, 1 - palette.contrast / 2), scaleLinear(palette.zone, 1 + palette.contrast / 2)]
}

/**
 * Two measures of a set of colours: the lightness range (the contrast of the bands) and the strongest chroma.
 * A mean colour hides both: the orange belts and the white zones of Jupiter average to a grey.
 */
export function colourMeasure(colors: number[]) {
  const values = colors.map(oklch)
  const lightness = values.map(value => value.lightness)
  return { range: Math.max(...lightness) - Math.min(...lightness), chroma: Math.max(...values.map(value => value.chroma)) }
}
export const referenceMeasure = (id: PlanetId) => colourMeasure(PLANETS[id].reference.bands)
export const todayMeasure = (id: PlanetId) => colourMeasure(todayRange(id))
export const retuneMeasure = (id: PlanetId) => colourMeasure(retuneRange(id))

// ---- Light --------------------------------------------------------------------------------------

/** Light on the day side over light on the night side, for a planet in space. Same rule as the Moon study. */
export function dayNightContrast(spaceLight = 1, hemisphere = HEMISPHERE_IN_SPACE) {
  return (SUN_LIGHT + hemisphere * spaceLight) / (hemisphere * spaceLight)
}


// ---- Planet shadows --------------------------------------------------------------------------

/**
 * Worlds that do not move against each other: all orbit the Sun in the same 3,600 s. Base units from
 * `data` in src/worlds.ts and from src/belt.ts. The Moon and Blossom Haven move, so they are not here.
 */
export const FIXED_WORLDS = [
  ...PLANET_IDS.map(id => ({ id: id as string, radius: PLANETS[id].radius, orbit: PLANETS[id].orbit, angle: PLANETS[id].angle })),
  { id: 'earth', radius: 220, orbit: 3300, angle: 0.08 },
  { id: 'ceres', radius: 26, orbit: 4850 + (2.77 - 2.1) / 1.2 * 700, angle: 2.62 },
  { id: 'vesta', radius: 18, orbit: 4850 + (2.36 - 2.1) / 1.2 * 700, angle: 1.55 },
]
type Flat = { x: number; z: number }
const at = (world: { orbit: number; angle: number }): Flat => ({ x: Math.cos(world.angle) * world.orbit, z: Math.sin(world.angle) * world.orbit })

/** True when an occluder is further along the line to the Sun than the Sun itself: it cannot shadow the point. */
export function beyondSun(point: Flat, occluder: Flat, sun: Flat = { x: 0, z: 0 }) {
  const toSun = { x: sun.x - point.x, z: sun.z - point.z }
  const length = Math.hypot(toSun.x, toSun.z)
  return ((occluder.x - point.x) * toSun.x + (occluder.z - point.z) * toSun.z) / length > length
}

/**
 * Pairs where sunShadow() in src/sun-shading.ts darkens a planet with a world on the far side of the Sun.
 * The shader tests the line to the Sun but not its length. The Sun is a point, so the lines from the lit
 * side cross at the Sun and open again behind it.
 */
export function farSideShadows(proportions: Proportions = PROPORTIONS) {
  const pairs: Array<{ target: string; occluder: string }> = []
  const worlds = FIXED_WORLDS.map(world => ({ ...world, radius: world.radius * proportions.size, orbit: world.orbit * proportions.spacing }))
  for (const target of worlds) for (const occluder of worlds) {
    if (target === occluder) continue
    const p = at(target), q = at(occluder)
    if (!beyondSun(p, q)) continue
    const length = Math.hypot(p.x, p.z), ux = -p.x / length, uz = -p.z / length
    const along = (q.x - p.x) * ux + (q.z - p.z) * uz
    const across = Math.abs((q.x - p.x) * uz - (q.z - p.z) * ux)
    if (across < occluder.radius + target.radius * (along - length) / length) pairs.push({ target: target.id, occluder: occluder.id })
  }
  return pairs
}

// ---- Saturn's rings -----------------------------------------------------------------------------

/** Angle between the ring plane and Saturn's equator today, in degrees: 90° − 180° / 2.3. */
export const todayRingTilt = () => 90 - TODAY_RING_TURN * 180 / Math.PI


// ---- Cost ---------------------------------------------------------------------------------------

/** GPU memory of an RGBA8 texture with mipmaps. */
export const textureBytes = (width: number, height: number) => Math.round(width * height * 4 * 4 / 3)
/** File sizes in bytes of the maps in public/planets/ssc/. */
export const MAP_BYTES: Record<string, number> = {
  '2k_mercury.jpg': 872555, '2k_venus_atmosphere.jpg': 229696, '2k_mars.jpg': 750547, '2k_jupiter.jpg': 498976,
  '2k_saturn.jpg': 199916, '2k_saturn_ring_alpha.png': 12119, '2k_uranus.jpg': 77751, '2k_neptune.jpg': 241580,
}

/** Which planets use a texture in each option. Rocky worlds keep vertex colours in A and B. */
export function texturedPlanets(option: LookOption) {
  if (option === 'today' || option === 'retune') return GAS_GIANTS
  if (option === 'paint') return [...GAS_GIANTS, 'venus'] as PlanetId[]
  return PLANET_IDS
}

/** Texture memory and download of an option for the seven planets. */
export function budget(option: LookOption, phone = false) {
  const planets = texturedPlanets(option)
  const [width, height] = option === 'paint' ? BAKE_SIZE[phone ? 'phone' : 'desktop'] : option === 'photo' ? [2048, 1024] : [512, 256]
  let memory = planets.length * textureBytes(width, height)
  let download = 0
  if (option === 'photo') {
    download = planets.reduce((sum, id) => sum + MAP_BYTES[PLANETS[id].map], MAP_BYTES['2k_saturn_ring_alpha.png'])
    memory += textureBytes(2048, 125)
  }
  if (option === 'paint') memory += textureBytes(1024, 1) * 2
  // Saturn: five ring meshes today and in A, one ring mesh with a texture in B and C. Uranus gets thin rings in B and C.
  const ringCalls = option === 'today' || option === 'retune' ? 5 : 2
  return { planets: planets.length, width, height, memory, download, ringCalls, cpuPixels: option === 'today' || option === 'retune' ? planets.length * 512 * 256 : 0 }
}

export const megabytes = (bytes: number) => bytes / (1024 * 1024)
