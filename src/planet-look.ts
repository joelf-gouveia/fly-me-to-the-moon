/**
 * The look of the seven planets: option B of the planet look study (docs/planet-look-study.md).
 * Pure data and numbers, so the tests can run without WebGL. The painting is in src/planet-paint.ts.
 * Earth, the Moon, the dwarf worlds and Blossom Haven are not here: their look does not change.
 */

export type LookedPlanet = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'

export type PlanetLook = {
  /** Real axial tilt in degrees. Venus turns backward: 177.4° shows as 2.6°. */
  obliquity: number
  /** Day sky and the colour of the air rim. */
  sky: number
  /** Colour of the cloud puffs. */
  cloud: number
}

export const PLANET_LOOKS: Record<LookedPlanet, PlanetLook> = {
  mercury: { obliquity: 0.03, sky: 0x02030f, cloud: 0xffffff },
  venus: { obliquity: 2.6, sky: 0xe8c283, cloud: 0xf0d29a },
  mars: { obliquity: 25.2, sky: 0xdca27e, cloud: 0xf3e2d4 },
  jupiter: { obliquity: 3.1, sky: 0xe6d3bb, cloud: 0xf4ece0 },
  saturn: { obliquity: 26.7, sky: 0xeedcb4, cloud: 0xfcf0d8 },
  uranus: { obliquity: 97.8, sky: 0xb6e7ee, cloud: 0xe9fbff },
  neptune: { obliquity: 28.3, sky: 0x6f9cf0, cloud: 0xeef4ff },
}

export const isLookedPlanet = (kind: string): kind is LookedPlanet => kind in PLANET_LOOKS

/** Size of a painted map: equirectangular, with mipmaps. A phone gets a quarter of the pixels. */
export const BAKE_SIZE = { desktop: [2048, 1024], phone: [1024, 512] } as const

/**
 * Relief of Mercury and Mars. The terrain gives them 16 m of relief, 13% and 8% of their radius, so from
 * space the outline was lumpy. Real planets have relief below 1% of the radius. The flight ground uses
 * the same scale, so the outline and the collision agree.
 */
export const ROCKY_RELIEF: Partial<Record<LookedPlanet, number>> = { mercury: 0.5, mars: 0.5 }

/** Part of the hemisphere light that a planet gets from far away, as the Moon's earthshine. */
export const SPACE_LIGHT = 0.18
/** Part of the air depth that shows from far away: a thin rim, not a thick halo. */
export const HALO_THIN = 0.12

const smooth = (edge0: number, edge1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t) }

/** Hemisphere light on a planet: all of it close by and in the air, SPACE_LIGHT from far away. */
export function spaceLightAt(altitude: number, planet: { atmosphere: number; radius: number }) {
  const near = Math.max(planet.atmosphere, 40), far = near + planet.radius * 0.8
  return SPACE_LIGHT + (1 - SPACE_LIGHT) * (1 - smooth(near, far, altitude))
}

/** 0 inside the air, 1 far away: how much of HALO_THIN the air shader uses. */
export const haloFarAt = (altitude: number, atmosphere: number) => smooth(atmosphere * 1.1, atmosphere * 2.2, altitude)

/** Cloud puffs show only inside the air. From space they were flakes on the disc. */
export const puffsVisibleAt = (altitude: number, atmosphere: number) => altitude < atmosphere * 1.2

/**
 * Real ring edges in Saturn radii (NASA Saturn fact sheet): the C ring, the B ring, the Cassini division,
 * the A ring with the Encke gap. `opacity` is a stylized part of light that the ring stops.
 */
export const RING_ZONES = [
  { name: 'C ring', from: 1.239, to: 1.527, opacity: 0.18 },
  { name: 'B ring', from: 1.527, to: 1.951, opacity: 0.92 },
  { name: 'Cassini division', from: 1.951, to: 2.027, opacity: 0.08 },
  { name: 'A ring', from: 2.027, to: 2.214, opacity: 0.66 },
  { name: 'Encke gap', from: 2.214, to: 2.229, opacity: 0.02 },
  { name: 'A ring', from: 2.229, to: 2.269, opacity: 0.6 },
] as const
/** The real rings reach 2.27 radii. The game scales them into the 2.1 radii that relocation keeps clear. */
export const RING_SPAN = { inner: 1.26, outer: 2.06 } as const
/** Uranus: nine narrow rings from 1.64 to 2.0 radii. */
export const URANUS_RING_SPAN = { inner: 1.64, outer: 2.0 } as const

/** Real ring radius (Saturn radii) to the game ring radius. */
export const gameRingRadius = (real: number) => RING_SPAN.inner + (real - RING_ZONES[0].from) / (RING_ZONES.at(-1)!.to - RING_ZONES[0].from) * (RING_SPAN.outer - RING_SPAN.inner)

/** Stylized opacity of Saturn's rings at a game radius in Saturn radii. Soft edges of 0.004. */
export function ringOpacity(radius: number) {
  let opacity = 0
  for (const zone of RING_ZONES) {
    const from = gameRingRadius(zone.from), to = gameRingRadius(zone.to)
    const inside = smooth(from - 0.004, from + 0.004, radius) * (1 - smooth(to - 0.004, to + 0.004, radius))
    let value: number = zone.opacity
    // The B ring is densest in its outer half, as in the pictures.
    if (zone.name === 'B ring') value *= 0.8 + 0.2 * smooth(from, to, radius)
    opacity = Math.max(opacity, value * inside)
  }
  return opacity
}
