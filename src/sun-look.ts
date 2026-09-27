/**
 * The look of the Sun: option B, Living Sun, of the Sun study (docs/sun-study.md). Pure numbers, so the tests
 * run in Node. src/sun-paint.ts builds the Sun from them.
 */

export const REAL = {
  /** NASA Sun fact sheet. */
  radiusKm: 695700, temperature: 5772, auKm: 149.6e6, chromosphereKm: 2500,
  /** Degrees per day: 14.37 − 2.33 sin² L − 1.56 sin⁴ L (NASA Sun fact sheet). */
  rotation: [14.37, 2.33, 1.56] as const,
  /** Granules about 1,000 km, for several minutes; supergranules up to 30,000 km. */
  granuleKm: 1000, supergranuleKm: 30000,
  /** Sunspots: umbra about 4,300 K, penumbra about 5,000 K. */
  umbra: 4300, penumbra: 5000,
  /** Typical prominence heights 40,000 to 50,000 km. */
  prominenceKm: [40000, 50000] as const,
  /** The corona is about a million times fainter than the photosphere. */
  coronaRatio: 1e-6,
} as const

/** Wavelengths in nm for the red, green and blue channels. */
export const CHANNEL_NM = [612, 549, 465] as const

/**
 * Exponent α of the limb darkening I(μ) / I(1) = μ^α. Hestroffer and Magnan (1998), equation 5,
 * from the data of Pierce and Slaughter (1977) and Neckel and Labs (1994). Valid for λ above about 417 nm.
 */
export const limbExponent = (nm: number) => -0.023 + 0.292 / (nm / 1000)
export const LIMB_ALPHA = CHANNEL_NM.map(limbExponent) as [number, number, number]

/** Brightness of the disc against its centre, per channel, at μ = cos of the angle between the normal and the view. */
export const limbDarkening = (mu: number) => LIMB_ALPHA.map(alpha => Math.max(mu, 0) ** alpha) as [number, number, number]
/** μ at a distance r from the disc centre, in disc radii. */
export const muAt = (r: number) => Math.sqrt(Math.max(0, 1 - r * r))

/** Planck radiance at a wavelength in nm, without the constant factors. */
const planck = (nm: number, kelvin: number) => 1 / ((nm * 1e-9) ** 5 * (Math.exp(0.014388 / (nm * 1e-9 * kelvin)) - 1))
/** Brightness of a cooler region against the photosphere, per channel. */
export const coolerRatio = (kelvin: number) => CHANNEL_NM.map(nm => planck(nm, kelvin) / planck(nm, REAL.temperature)) as [number, number, number]

/** Solar rotation in degrees per day at a latitude in degrees. */
export function rotationRate(latitude: number) {
  const s = Math.sin(latitude * Math.PI / 180) ** 2
  return REAL.rotation[0] - REAL.rotation[1] * s - REAL.rotation[2] * s * s
}
/** Rate at a latitude against the equator: 1 at the equator, 0.73 at the poles. */
export const relativeRate = (latitude: number) => rotationRate(latitude) / rotationRate(0)

/** One turn of the Sun's equator in game seconds. The poles take 1 / relativeRate(90) as long. */
export const SUN_SPIN = 720
/** Storybook scale: the granule cells are about this part of the radius. The real part is REAL.granuleKm / REAL.radiusKm. */
export const GRANULE_PART = 1 / 48
/** A granule forms and fades in about this many seconds. */
export const GRANULE_LIFE = 8
/**
 * The disc centre in linear light, before tone mapping. It is brighter than a white cloud in full sunlight,
 * and after tone mapping it is cream in the centre and gold at the edge.
 */
export const CORE: [number, number, number] = [2.8, 1.45, 0.35]
/** The limb darkening stops at this μ (r = 0.995), so the last pixels of the polygon edge do not go black. */
export const MU_FLOOR = 0.1
/** The glare: a tight halo just outside the limb, fainter than the limb, and a wide power law. */
export const GLARE = { halo: 0.3, wide: 0.14 } as const
/** The glare and the corona reach this many radii. */
export const SHELL_RADII = 4.2
/** A low Sun seen through the air has this part of its brightness. */
export const LOW_SUN_DIM = 0.55

export type Spot = { latitude: number; longitude: number; size: number }
/** Sunspots in the two belts of activity, 8° to 30° from the equator. Size in radii of the Sun. */
export const SPOTS: Spot[] = [
  { latitude: 14, longitude: 20, size: 0.05 }, { latitude: 17, longitude: 31, size: 0.028 }, { latitude: 12, longitude: 27, size: 0.02 },
  { latitude: -22, longitude: 118, size: 0.042 }, { latitude: -19, longitude: 128, size: 0.024 },
  { latitude: 9, longitude: 205, size: 0.035 }, { latitude: -11, longitude: 290, size: 0.03 }, { latitude: 26, longitude: 250, size: 0.022 },
]

export type Prominence = { latitude: number; longitude: number; height: number; width: number; tilt: number }
/** Prominences. Height and foot distance in radii of the Sun; tilt of the loop plane in degrees. */
export const PROMINENCES: Prominence[] = [
  { latitude: 12, longitude: 0, height: 0.12, width: 0.16, tilt: 8 },
  { latitude: -18, longitude: 96, height: 0.09, width: 0.12, tilt: -14 },
  { latitude: 30, longitude: 170, height: 0.15, width: 0.22, tilt: 20 },
  { latitude: -6, longitude: 262, height: 0.07, width: 0.1, tilt: 0 },
  { latitude: 40, longitude: 300, height: 0.1, width: 0.14, tilt: -25 },
]

/** Segments of the disc and the glare shell, and of each strand of a prominence (tubular × radial). */
export const GEOMETRY = {
  disc: [96, 64] as const, shell: [48, 32] as const,
  tube: [64, 8] as const,
}
/** Strands in each prominence. */
export const STRANDS = 3
