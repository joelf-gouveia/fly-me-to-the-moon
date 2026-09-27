import { createNoise3D } from 'simplex-noise'

export type PlanetKind = 'mercury' | 'venus' | 'earth' | 'moon' | 'mars' | 'ceres' | 'vesta' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'fairy'
export const isGasWorld = (kind: PlanetKind) => ['jupiter', 'saturn', 'uranus', 'neptune'].includes(kind)
export const HOME_SEED = 0xB10550
export const HOME_CLEARING_HEIGHT = 3

export function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `mare` is the Moon only: 1 on a dark lava plain, 0 on the highlands. */
export type TerrainSample = { height: number; land: number; river: number; detail: number; mare?: number }

// The same spherical field drives the mesh, vegetation and collision height.
// Sampling a 3D direction also avoids a seam at the longitude wrap.
export function createTerrain(kind: PlanetKind, seed: number) {
  const noise = createNoise3D(seededRandom(seed))
  const plains = kind === 'moon' ? createNoise3D(seededRandom(seed + 1)) : null
  return (x: number, y: number, z: number): TerrainSample => {
    const broad = noise(x * 2.2, y * 2.2, z * 2.2)
    const hills = noise(x * 7.5 + 13, y * 7.5, z * 7.5)
    const detail = noise(x * 32, y * 32, z * 32)
    const land = broad * 12 + hills * 2.3 + 1.2
    if (kind === 'earth' || kind === 'fairy') {
      // Continuous meandering channels connect lowlands to the sea. Their beds
      // sit below sea level, so the water mesh fills rivers and oceans alike.
      const channel = Math.abs(noise(x * 3.8 + 60, y * 3.8, z * 3.8))
      const width = 0.034 + Math.max(0, 3 - land) * 0.005
      let river = 1 - Math.min(1, Math.max(0, (channel - width) / 0.06))
      const ridge = Math.max(0, noise(x * 5 + 31, y * 5, z * 5) - 0.12)
      const elevation = land + ridge * ridge * 22 + detail * 0.35
      let height = elevation + (-1.3 - elevation) * river
      if (kind === 'fairy') {
        height = 8 * Math.tanh(height * 0.55 / 8)
        // The cottage is fixed at the south pole. Blend its dry clearing
        // into the same field used by both visible ground and flight collision.
        const edge = Math.min(1, Math.max(0, (Math.hypot(x, z) - 0.11) / 0.12))
        const clearing = y < 0 ? 1 - edge * edge * (3 - 2 * edge) : 0
        height += (HOME_CLEARING_HEIGHT - height) * clearing
        river *= 1 - clearing
      }
      return { height, land, river, detail }
    }
    if (isGasWorld(kind)) return { height: -12, land: 0, river: 0, detail }
    const craters = Math.abs(noise(x * 11 + 91, y * 11, z * 11))
    const cratered = kind === 'mercury' || kind === 'moon' || kind === 'ceres' || kind === 'vesta'
    const crater = cratered ? -Math.pow(Math.max(0, 1 - craters / 0.2), 2) * 3 : 0
    let height = broad * 5 + hills * 3 + detail * 0.45 + crater
    // Dwarf worlds are small: gentle relief keeps Ceres round. Vesta is lumpier,
    // with its giant Rheasilvia basin at the south pole.
    if (kind === 'ceres') height *= 0.13
    if (kind === 'vesta') height = height * 0.26 - Math.max(0, -y - 0.6) * 9
    if (plains) {
      // Maria: low, flat lava plains, most of them on the near side (+X faces Earth).
      const t = Math.min(1, Math.max(0, (plains(x * 1.7, y * 1.7, z * 1.7) * 0.6 + x * 0.3 - 0.36) / 0.1))
      const mare = t * t * (3 - 2 * t)
      height = height * 0.3 + (-1.1 + detail * 0.1 - height * 0.3) * mare * 0.85
      return { height, land, river: 0, detail, mare }
    }
    return { height, land, river: 0, detail }
  }
}

export function groundHeight(kind: PlanetKind, sample: TerrainSample) {
  return kind === 'earth' || kind === 'fairy' ? Math.max(0, sample.height) : sample.height
}

// Exit and entry have separate boundaries so cloud crossings cannot reroll a
// world repeatedly. Regeneration happens safely above its highest terrain.
export function visitTransition(armed: boolean, altitude: number, atmosphere: number) {
  const entry = Math.max(30, atmosphere * 0.82)
  const exit = Math.max(70, atmosphere * 1.5)
  return { regenerate: armed && altitude < entry, armed: altitude > exit || (armed && altitude >= entry) }
}
