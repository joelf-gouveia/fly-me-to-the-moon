import { PROPORTIONS } from '../proportions'
import { channels, linearToSrgb, srgbToLinear } from '../planet-look-study/model'
import { CORE, GEOMETRY, GLARE, limbDarkening, MU_FLOOR, muAt, PROMINENCES, REAL, SHELL_RADII, STRANDS } from '../sun-look'

// The look that the game uses now (option B) is in src/sun-look.ts and src/sun-paint.ts.
export {
  CHANNEL_NM, coolerRatio, CORE, GEOMETRY, GLARE, GRANULE_LIFE, GRANULE_PART, LIMB_ALPHA, limbDarkening, limbExponent, LOW_SUN_DIM, MU_FLOOR, muAt,
  PROMINENCES, REAL, relativeRate, rotationRate, SHELL_RADII, SPOTS, STRANDS, SUN_SPIN,
} from '../sun-look'

/**
 * Sun study: pure data and numbers. No DOM and no WebGL, so the tests can run in Node.
 * The Sun before this study is a copy of the old code in src/sun-study/legacy.ts. The lights and the renderer are
 * copies of src/main.ts. Real values have their source in docs/sun-study.md.
 */

export type SunOption = 'today' | 'retune' | 'living' | 'camera'
export type View = 'space' | 'limb' | 'surface' | 'meadow'
export type SunHeight = 'high' | 'morning' | 'low'

// ---- The Sun before this study, and the game ---------------------------------------------------------------------------

/** Before: `600 * PROPORTIONS.sun`, a `MeshBasicMaterial` of one colour on a 64 × 40 sphere (legacy.ts). */
export const SUN_BASE_RADIUS = 600
export const SUN_RADIUS = SUN_BASE_RADIUS * PROPORTIONS.sun
export const SUN_COLOR = 0xffd78d
export const SUN_SEGMENTS = [64, 40] as const
/** Before: the glow sprite (legacy.ts). Its canvas gradient keeps the colour to 0.18 of its radius, then fades to 0 at the edge. */
export const GLOW = { baseScale: 2450, color: 0xffbf70, gradient: 0xffb95a, opacity: 0.4, solid: 0.18 } as const
export const GLOW_RADIUS = GLOW.baseScale * PROPORTIONS.sun / 2
/** src/main.ts: the renderer and the lights. */
export const TONE_EXPOSURE = 1.15
export const SUN_LIGHT = { color: 0xffebcc, intensity: 2.4 } as const
export const LOW_SUN_COLOR = 0xffa267
/** src/main.ts: the hemisphere light at the ground by day, and its sky colour. */
export const HEMISPHERE_DAY = { intensity: 2.1, sky: 0xd9efff } as const
export const CLOUD_WHITE = 0xf0f3ed
/** src/main.ts: the fog on Earth at the ground, 0.0018 in base units, ÷ PROPORTIONS.size. */
export const EARTH_FOG = 0.0018 / PROPORTIONS.size
/** src/worlds.ts: Earth in base units. */
export const EARTH = { radius: 220 * PROPORTIONS.size, orbit: 3300 * PROPORTIONS.spacing, atmosphere: 78 * PROPORTIONS.size }
/** src/flight.ts: the fairy flies down to 2.3 m above a world that is not a giant. */
export const FLIGHT_FLOOR = 2.3
/** src/worlds.ts, addAtmosphere(): the air shell has alpha × 0.96 at most. */
export const AIR_ALPHA = 0.96

// ---- The real Sun ----------------------------------------------------------------------------

/** A real length in km at the scale of the game Sun, in game metres. */
export const toGame = (km: number) => km / REAL.radiusKm * SUN_RADIUS

/** Width of the Sun in degrees, seen from a distance to its centre. */
export const apparentWidth = (distance: number, radius = SUN_RADIUS) => 2 * Math.asin(Math.min(1, radius / distance)) * 180 / Math.PI

// ---- The proposal -----------------------------------------------------------------------------

/** Option C: the disc is this much brighter, so the bloom finds it. */
export const CAMERA_BOOST = 2.2
/** Option C: only pixels above this linear luminance bloom. A sunlit white cloud has about 1.1; the disc of C has about 3.7. */
export const BLOOM = { threshold: 3, strength: 0.55, radius: 0.35 } as const
export type Option = { letter: string; name: string; line: string }
export const OPTIONS: Record<SunOption, Option> = {
  today: { letter: '·', name: 'Before', line: 'The Sun before this study, made again from a copy of the old code (legacy.ts): one colour on a sphere, and one glow sprite.' },
  retune: { letter: 'A', name: 'Retune', line: 'The same parts with real light: a darker, redder edge, a brighter centre, a glare with no edge, and a Sun that shows from Earth.' },
  living: { letter: 'B', name: 'Living Sun', line: 'A, plus a surface that moves: granules, sunspots, faculae, a turning Sun, the corona, the red rim of the chromosphere and prominences. The game uses this option now.' },
  camera: { letter: 'C', name: 'Camera light', line: 'B, plus two screen effects of a camera: bloom and lens flare. Every frame goes through extra passes.' },
}
export const SUN_OPTIONS = Object.keys(OPTIONS) as SunOption[]

// ---- Light and colour ---------------------------------------------------------------------------

export const linear = (color: number) => channels(color).map(srgbToLinear) as [number, number, number]
export const luminance = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
export const toHex = (rgb: number[]) => '#' + rgb.map(value => Math.round(linearToSrgb(Math.min(1, Math.max(0, value))) * 255).toString(16).padStart(2, '0')).join('')

/** ACESFilmicToneMapping of three.js 0.186, with the exposure of the game. Linear in, linear out. */
export function acesFilmic([r, g, b]: number[], exposure = TONE_EXPOSURE) {
  const k = exposure / 0.6
  r *= k; g *= k; b *= k
  const input = [0.59719 * r + 0.35458 * g + 0.04823 * b, 0.076 * r + 0.90834 * g + 0.01566 * b, 0.0284 * r + 0.13383 * g + 0.83777 * b]
  const [x, y, z] = input.map(v => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081))
  return [1.60475 * x - 0.53108 * y - 0.07367 * z, -0.10208 * x + 1.10813 * y - 0.00605 * z, -0.00327 * x - 0.07276 * y + 1.07602 * z]
    .map(v => Math.min(1, Math.max(0, v))) as [number, number, number]
}
/** The colour on the screen of a linear colour, after tone mapping. */
export const onScreen = (rgb: number[]) => toHex(acesFilmic(rgb))

/**
 * A white cloud (the cloud colour of Earth) that faces the Sun at noon: the sunlight and the full sky light of the
 * hemisphere light, each in its colour. Lambert divides by π in three.js.
 */
export function sunlitCloud() {
  const albedo = linear(CLOUD_WHITE), sun = linear(SUN_LIGHT.color), sky = linear(HEMISPHERE_DAY.sky)
  return albedo.map((value, i) => value * (sun[i] * SUN_LIGHT.intensity + sky[i] * HEMISPHERE_DAY.intensity) / Math.PI)
}

/** Linear colour of the disc at a distance r from its centre, in disc radii. */
export function discAt(option: SunOption, r: number) {
  if (option === 'today') return linear(SUN_COLOR)
  const limb = limbDarkening(Math.max(muAt(r), MU_FLOOR))
  return CORE.map((core, i) => core * limb[i] * (option === 'camera' ? CAMERA_BOOST : 1))
}

/** The glow of today at a distance r from the centre, in disc radii: the sprite adds this linear colour. */
export function glowToday(r: number) {
  const u = r * SUN_RADIUS / GLOW_RADIUS
  const alpha = u >= 1 ? 0 : u <= GLOW.solid ? 1 : 1 - (u - GLOW.solid) / (1 - GLOW.solid)
  const tint = linear(GLOW.color), map = linear(GLOW.gradient)
  return tint.map((value, i) => value * map[i] * alpha * GLOW.opacity)
}

/** The glare of the proposal at an impact distance b from the centre, in radii: a tight halo and a wide power law. */
export function glare(b: number) {
  const h = Math.max(0, b - 1)
  const fade = 1 - smooth(SHELL_RADII * 0.68, SHELL_RADII * 0.98, b)
  return (GLARE.halo * Math.exp(-h / 0.045) + GLARE.wide * Math.max(b, 1) ** -2.6) * fade
}
const smooth = (edge0: number, edge1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t) }

/** Colour strips from the disc centre (0) to 3 radii, for the page. */
export function profile(option: SunOption | 'real', steps = 16) {
  return Array.from({ length: steps }, (_, index) => {
    const r = index / (steps - 1) * 3
    if (option === 'real') {
      // A photograph with a solar filter: the disc as a white centre with the real limb darkening, a black sky.
      if (r > 1) return '#000000'
      return toHex(limbDarkening(muAt(Math.min(r, 0.999))).map(value => value * 0.92))
    }
    if (r <= 1) return onScreen(discAt(option, Math.min(r, 0.999)))
    if (option === 'today') return onScreen(glowToday(r))
    return onScreen(linear(SUN_LIGHT.color).map(value => value * glare(r) * (option === 'camera' ? 1.6 : 1)))
  })
}

// ---- Findings ---------------------------------------------------------------------------------

/** Edge (r = 0.99) against centre, as luminance on the screen. */
export function edgeContrast(option: SunOption) {
  const centre = luminance(acesFilmic(discAt(option, 0))), edge = luminance(acesFilmic(discAt(option, 0.99)))
  return edge / centre
}

/** Part of the Sun colour that the fog of Earth replaces, seen from the meadow. */
export function fogOnSun(distance = EARTH.orbit - EARTH.radius - SUN_RADIUS, density = EARTH_FOG) {
  return 1 - Math.exp(-((density * distance) ** 2))
}

/** Where the glow of today stops, in radii of the Sun. */
export const glowEdge = () => GLOW_RADIUS / SUN_RADIUS

// ---- Cost -------------------------------------------------------------------------------------

const sphereTriangles = (width: number, height: number) => width * (height - 1) * 2
export type Budget = {
  /** Draw calls of the Sun in the scene, without the screen passes. */
  calls: number
  triangles: number
  /** Screen passes after the scene: bloom and the output pass. */
  passes: number
  /** Noise cells or samples per pixel of the disc surface. */
  noise: number
  /** Render targets of the screen passes, in bytes, for a canvas of this size. */
  targets: number
  textures: number
}

/** The cost of an option, for a canvas of width × height device pixels. */
export function budget(option: SunOption, width = 1920, height = 1080, phone = false): Budget {
  const disc = option === 'today' ? sphereTriangles(...SUN_SEGMENTS) : sphereTriangles(...GEOMETRY.disc)
  const glow = option === 'today' ? 2 : sphereTriangles(...GEOMETRY.shell)
  const tubes = option === 'living' || option === 'camera' ? PROMINENCES.length * STRANDS * GEOMETRY.tube[0] * GEOMETRY.tube[1] * 2 : 0
  const flares = option === 'camera' ? LENS_FLARE.length * 2 : 0
  // Worley cells: 27 for a 3 × 3 × 3 search on a computer, 8 for 2 × 2 × 2 on a phone; two layers on a computer; three simplex samples.
  const noise = option === 'living' || option === 'camera' ? (phone ? 8 + 3 : 27 * 2 + 3) : 0
  const pixels = width * height
  // EffectComposer: two half-float targets (8 bytes a pixel) and a depth buffer (4 bytes).
  // UnrealBloomPass: a bright target at half size and two targets for each of 5 mips, all half-float.
  const mips = Array.from({ length: 5 }, (_, i) => 4 ** -(i + 1)).reduce((sum, part) => sum + part, 0)
  const targets = option === 'camera' ? pixels * (2 * 8 + 4) + pixels * (0.25 + 2 * mips) * 8 : 0
  return {
    calls: option === 'today' ? 2 : option === 'retune' ? 2 : option === 'living' ? 3 : 3 + LENS_FLARE.length,
    triangles: disc + glow + tubes + flares,
    // Bright pass, 5 × 2 blur passes, composite, blend onto the frame, output (tone mapping and sRGB).
    passes: option === 'camera' ? 1 + 10 + 1 + 1 + 1 : 0,
    noise, targets, textures: option === 'camera' ? 2 : option === 'today' ? 1 : 0,
  }
}

/** Option C: the ghosts of the lens flare, as (size in px, place on the line from the Sun through the centre). */
export const LENS_FLARE = [[70, 0.55], [110, 0.72], [60, 0.86], [150, 1.0]] as const

export const megabytes = (bytes: number) => bytes / (1024 * 1024)
