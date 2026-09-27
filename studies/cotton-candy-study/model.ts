import { Vector3 } from 'three'
import { CANDY_MIST, CANDY_PALETTE, candyTufts, CLEAR_ANGLE, PUFF_SEGMENTS, PUFFS_PER_TUFT } from '../../src/cotton-candy'
import { HOME_SEED, seededRandom } from '../../src/terrain'

// Option B is now in the game: src/cotton-candy.ts. The study uses the same tufts and material.
export { CLEAR_ANGLE, PUFF_SEGMENTS, PUFFS_PER_TUFT, tangentBasis } from '../../src/cotton-candy'

export type CloudOption = 'today' | 'tint' | 'puffs' | 'cones'
export type Device = 'desktop' | 'phone'

// Game values for Blossom Haven from createWorlds() in src/worlds.ts.
export const HOME = { radius: 110, atmosphere: 52, cloudHeight: 24 } as const
/** The fairy terrain is capped by tanh at 8 m (src/terrain.ts). */
export const MAX_TERRAIN = 8
/** Cloud material and mist of Blossom Haven before option B: buildClouds() in src/worlds.ts and cloudWhite in src/main.ts. */
export const TODAY = { puffs: 300, color: 0xffe4f4, opacity: 0.65, triangles: 80 } as const
/** Mist in the cloud layer: white before option B, candy pink now. */
export const MIST = { today: 0xf0f3ed, candy: CANDY_MIST } as const
/** Flight speed at cloud height: stepFlight() gives about 15 m/s at 26 m clearance. */
export const CLOUD_SPEED = 15

/** Cotton candy colors. Instance colors multiply a white material. */
export const PALETTE = CANDY_PALETTE

/** homeCottageNormal() in src/worlds.ts. B and C keep CLEAR_ANGLE around it free of puffs. */
export const COTTAGE = new Vector3(0, -1, 0)

export const OPTIONS: Record<CloudOption, { letter: string; name: string; line: string }> = {
  today: { letter: '—', name: 'Before', line: 'The game before option B: 300 pale pink ellipsoids, 65% opaque, in clusters of seven.' },
  tint: { letter: 'A', name: 'Candy tint', line: 'The same clouds in cotton candy pink, blue and lilac. Only the colors change.' },
  puffs: { letter: 'B', name: 'Spun-sugar puffs', line: 'Round tufts of lumpy puffs with spun-sugar strands, a pink-to-blue blush and a soft bright edge.' },
  cones: { letter: 'C', name: 'Floss on a cone', line: 'The tufts of B. One tuft in five sits on a striped paper cone, and sugar sparkles twinkle around the tufts.' },
}

/** SphereGeometry makes 2·w·(h − 1) triangles. */
export const CONE_SEGMENTS = [24, 10] as const
const puffTriangles = (device: Device) => 2 * PUFF_SEGMENTS[device][0] * (PUFF_SEGMENTS[device][1] - 1)
const CONE_TRIANGLES = 2 * CONE_SEGMENTS[0] * CONE_SEGMENTS[1]
export const SPARKLES_PER_TUFT = 12, CONE_EVERY = 5

export type Puff = { position: Vector3; up: Vector3; scale: Vector3; spin: number; color: number; tuft: number }
export type Cone = { position: Vector3; up: Vector3; radius: number; length: number }
export type Layout = { puffs: Puff[]; cones: Cone[]; sparkles: Vector3[]; tufts: Vector3[] }

const puffCount = (device: Device) => Math.round(TODAY.puffs * (device === 'phone' ? 0.5 : 1))

/** A copy of buildClouds() in src/worlds.ts for Blossom Haven before option B. The random sequence is the same. */
export function todayLayout(device: Device, seed = HOME_SEED): Layout {
  const random = seededRandom(seed + 914), count = puffCount(device)
  const puffs: Puff[] = [], tufts: Vector3[] = []
  const cluster = new Vector3(0, 1, 0)
  for (let i = 0; i < count; i++) {
    if (i % 7 === 0) {
      const y = random() * 2 - 1, angle = random() * Math.PI * 2
      cluster.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
      tufts.push(cluster.clone())
    }
    const up = cluster.clone().add(new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.1)).normalize()
    const position = up.clone().multiplyScalar(HOME.radius + HOME.cloudHeight + random() * 8)
    const scale = new Vector3(5 + random() * 9, 1.2 + random() * 2, 4 + random() * 7)
    puffs.push({ position, up, scale, spin: 0, color: TODAY.color, tuft: tufts.length - 1 })
  }
  return { puffs, cones: [], sparkles: [], tufts }
}

const mixHex = (a: number, b: number, t: number) => {
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t)
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

/** Option A: the positions of today; each cluster gets one cotton candy color. */
export function tintLayout(device: Device, seed = HOME_SEED): Layout {
  const layout = todayLayout(device, seed), random = seededRandom(seed + 2914)
  const bases = layout.tufts.map(() => { const r = random(); return r < 0.55 ? PALETTE.pink : r < 0.82 ? PALETTE.blue : PALETTE.lilac })
  for (const puff of layout.puffs) puff.color = mixHex(bases[puff.tuft], PALETTE.cream, random() * 0.35)
  return layout
}

/** Options B and C: the tufts of the game (candyTufts() in src/cotton-candy.ts). C adds cones and sparkles. */
export function tuftLayout(device: Device, cones: boolean, seed = HOME_SEED): Layout {
  const tufts = candyTufts(HOME.radius, HOME.cloudHeight, puffCount(device) / PUFFS_PER_TUFT, seed, COTTAGE)
  const layout: Layout = { puffs: [], cones: [], sparkles: [], tufts: tufts.map(tuft => tuft.normal) }
  // A separate random sequence, so the tufts of C are the tufts of B.
  const random = seededRandom(seed + 3914)
  tufts.forEach(({ at, size, puffs }, t) => {
    layout.puffs.push(...puffs.map(puff => ({ ...puff, tuft: t })))
    if (!cones) return
    if (t % CONE_EVERY === 2) layout.cones.push({ position: at(0, -2.2 * size, 0), up: tufts[t].normal.clone(), radius: 2.3 * size, length: 9 * size })
    for (let s = 0; s < SPARKLES_PER_TUFT; s++) {
      const angle = random() * Math.PI * 2, reach = 7 + random() * 7
      layout.sparkles.push(at(Math.cos(angle) * reach * size, (random() - 0.3) * 8 * size, Math.sin(angle) * reach * size))
    }
  })
  return layout
}

export function cloudLayout(option: CloudOption, device: Device, seed = HOME_SEED) {
  return option === 'today' ? todayLayout(device, seed) : option === 'tint' ? tintLayout(device, seed)
    : tuftLayout(device, option === 'cones', seed)
}

/** Puffs whose edge comes into the column above the cottage. */
export function puffsOverCottage(layout: Layout) {
  return layout.puffs.filter(puff => puff.up.angleTo(COTTAGE) - Math.max(puff.scale.x, puff.scale.z) / puff.position.length() < CLEAR_ANGLE).length
}

/** Rough game cost of an option, for the budget panel and the tests. */
export function budget(option: CloudOption, device: Device) {
  const layout = cloudLayout(option, device)
  const puffs = layout.puffs.length, cones = layout.cones.length, sparkles = layout.sparkles.length
  const floss = option === 'puffs' || option === 'cones'
  return {
    puffs, tufts: layout.tufts.length, cones, sparkles,
    drawCalls: 1 + (cones ? 1 : 0) + (sparkles ? 1 : 0),
    triangles: puffs * (floss ? puffTriangles(device) : TODAY.triangles) + cones * CONE_TRIANGLES,
    transparent: !floss,
    // One 4×4 matrix per instance, a color for tinted puffs, a position for each sparkle.
    instanceKb: +((puffs * (16 + (option === 'today' ? 0 : 3)) + cones * 19 + sparkles * 3) * 4 / 1024).toFixed(1),
    perFrame: floss ? 'One time value' : 'None',
    overCottage: puffsOverCottage(layout),
  }
}
