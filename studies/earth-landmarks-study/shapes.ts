import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'
import { seededRandom } from '../../src/terrain'
import type { LandmarkId } from './model'

/**
 * The ground of each landmark: a height and a colour for each place of its patch.
 * `u` is metres east and `v` is metres north of the centre of the landmark. A height is in
 * metres above the sea of Earth, as the heights of src/terrain.ts. Ground below 0 is under
 * the water of the game.
 */
export type Shape = {
  /** The ground height. The flight and the camera use it. */
  height(u: number, v: number): number
  /** The height of the patch mesh, when it is below the flight height (L9: the columns stand on it). */
  visual?(u: number, v: number): number
  color(u: number, v: number, h: number, out: THREE.Color): void
}

const noise = createNoise2D(seededRandom(0x1a4d))
const n = (x: number, y: number) => noise(x, y)
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const sm = (x: number, a: number, b: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t) }
/** Noise around a circle: the same value at the angle 0 and at 2π. */
const ring = (angle: number, turns: number, offset = 0) => n(Math.cos(angle) * turns + offset, Math.sin(angle) * turns)
const c = (hex: number) => new THREE.Color(hex)
const scratch = new THREE.Color()

// ---- L1 · Grand Canyon: a river cuts a plateau in steps of red rock --------------------------------
const CANYON_STEP = 2.8, CANYON_RIM = 15.5
export const canyonPath = (v: number) => 15 * Math.sin(v / 19) + 6 * Math.sin(v / 7.7 + 1.3)
function canyonCut(u: number, v: number) {
  const d = Math.max(0, Math.abs(u - canyonPath(v)) + n(u / 16, v / 16) * 6 + n(u / 5 + 3, v / 5) * 1.4)
  const raw = Math.pow(clamp((d - 2.6) / 30), 0.75) * 17
  const q = Math.floor(raw / CANYON_STEP), f = raw / CANYON_STEP - q
  return { cut: -1.3 + (q + sm(f, 0.4, 0.95)) * CANYON_STEP }
}
const CANYON_BANDS = [0x6e3a31, 0x9a452f, 0xc0633a, 0xdba066, 0xb24f36, 0xd9ab74, 0xe4c894].map(c)
const CANYON_TOP = c(0xb7a26c), CANYON_SAGE = c(0x8f9a5c)
const canyon: Shape = {
  height(u, v) {
    const { cut } = canyonCut(u, v)
    const rim = CANYON_RIM + n(u / 30, v / 30) * 0.6
    // The cut closes at each end, so the canyon stays inside the patch.
    return rim + (Math.min(cut, rim) - rim) * (1 - sm(Math.abs(v), 40, 57))
  },
  color(u, v, h, out) {
    if (h > CANYON_RIM - 0.5) { out.copy(CANYON_TOP).lerp(CANYON_SAGE, sm(n(u / 7, v / 7), 0.1, 0.5)); return }
    const layer = clamp((h + 1.3 + n(u / 9, v / 9) * 0.5) / CANYON_STEP, 0, CANYON_BANDS.length - 1), band = Math.floor(layer)
    out.copy(CANYON_BANDS[band]).lerp(CANYON_BANDS[Math.min(band + 1, CANYON_BANDS.length - 1)], sm(layer - band, 0.7, 1))
  },
}

// ---- L2 · Mount Fuji: one snow cone over a lake -----------------------------------------------------
export const FUJI_LAKE = { u: 10, v: 47, a: 17, b: 8 }
const fujiLake = (u: number, v: number) => Math.hypot((u - FUJI_LAKE.u) / FUJI_LAKE.a, (v - FUJI_LAKE.v) / FUJI_LAKE.b)
const SNOW = c(0xf2f6f8), FUJI_ROCK = c(0x5d6c8c), FUJI_FOREST = c(0x2f5f3c), GRASS = c(0x679a43), SAND = c(0xd5c395)
const fuji: Shape = {
  height(u, v) {
    const r = Math.hypot(u, v), angle = Math.atan2(v, u)
    const cone = Math.min(44, 50 * Math.exp(-Math.pow(r / 26, 1.25)))
    const crater = 2 * Math.max(0, 1 - r / 3.4)
    const gully = Math.max(0, ring(angle, 4)) * 1.6 * sm(r, 7, 26) * (1 - sm(r, 38, 60))
    const ground = 2.2 + cone - crater - gully + n(u / 9, v / 9) * 0.25
    return ground + (-1.3 - ground) * (1 - sm(fujiLake(u, v), 0.8, 1.15))
  },
  color(u, v, h, out) {
    const angle = Math.atan2(v, u)
    // The snow comes lower in the gullies, as on the real mountain.
    const snowLine = 27 + ring(angle, 6, 4) * 4 + ring(angle, 17, 9) * 2.5
    if (h > snowLine) out.copy(SNOW)
    else if (h > 15) out.copy(FUJI_FOREST).lerp(FUJI_ROCK, sm(h, 15, 21)).lerp(SNOW, sm(h, snowLine - 2.5, snowLine) * 0.6)
    else out.copy(h < 0.8 ? SAND : GRASS).lerp(FUJI_FOREST, sm(h, 4, 9))
    out.multiplyScalar(0.92 + n(u / 3, v / 3) * 0.08)
  },
}

// ---- L3 · Erg Chebbi: sand dunes with sharp crests, and one oasis ----------------------------------
export const OASIS = { u: -16, v: -20, pond: 4.5, green: 11 }
function dune(u: number, v: number) {
  const x = u * 0.94 + v * 0.34 + n(u / 40, v / 40) * 14
  const s = ((x / 26) % 1 + 1) % 1
  // A gentle side toward the wind, then the steep slip face.
  const profile = s < 0.72 ? Math.pow(s / 0.72, 1.4) : Math.pow((1 - s) / 0.28, 0.9)
  return { x, s, profile }
}
const DUNE_LIGHT = c(0xecc582), DUNE_DARK = c(0xc88442), OASIS_GREEN = c(0x7fae4c)
const dunes: Shape = {
  height(u, v) {
    const { x, profile } = dune(u, v)
    const amplitude = 9 * (0.55 + 0.45 * n(u / 55 + 9, v / 55))
    const star = 5 * Math.exp(-Math.pow(Math.hypot(u - 14, v - 12) / 20, 2))
    const sand = 2 + amplitude * profile + star + n(u / 6, v / 6) * 0.25 + Math.sin(x * 2.2) * 0.05
    const d = Math.hypot(u - OASIS.u, v - OASIS.v)
    const flat = sand + (1.1 - sand) * (1 - sm(d, OASIS.green * 0.7, OASIS.green * 1.5))
    return flat + (-1.1 - flat) * (1 - sm(d, OASIS.pond * 0.6, OASIS.pond * 1.3))
  },
  color(u, v, _h, out) {
    const { s } = dune(u, v)
    out.copy(DUNE_LIGHT).lerp(DUNE_DARK, sm(s, 0.7, 0.76) * (1 - sm(s, 0.95, 1)) * 0.85 + 0.15 * (1 - s))
    const d = Math.hypot(u - OASIS.u, v - OASIS.v)
    out.lerp(OASIS_GREEN, (1 - sm(d, OASIS.green * 0.75, OASIS.green * 1.1)) * 0.9)
    if (d < OASIS.pond * 1.25) out.copy(SAND)
  },
}

// ---- L4 · Ha Long Bay: limestone towers in the sea ---------------------------------------------------
type Tower = { u: number; v: number; a: number; b: number; turn: number; height: number }
export const TOWERS: Tower[] = (() => {
  const random = seededRandom(0x4a10), towers: Tower[] = []
  for (let tries = 0; tries < 900 && towers.length < 22; tries++) {
    const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * 50
    const size = 3.6 + random() * random() * 8
    const tower = { u: Math.cos(angle) * r, v: Math.sin(angle) * r, a: size * (0.8 + random() * 0.5), b: size, turn: random() * Math.PI, height: 7 + size * 1.5 + random() * 8 }
    if (towers.every(other => Math.hypot(other.u - tower.u, other.v - tower.v) > (other.b + tower.b) * 1.15)) towers.push(tower)
  }
  return towers
})()
function towerAt(u: number, v: number) {
  let best = -4, top = 0
  for (const tower of TOWERS) {
    const du = u - tower.u, dv = v - tower.v
    if (Math.abs(du) > 22 || Math.abs(dv) > 22) continue
    const cos = Math.cos(tower.turn), sin = Math.sin(tower.turn)
    const d = Math.hypot((du * cos + dv * sin) / tower.a, (dv * cos - du * sin) / tower.b) * (1 + 0.18 * n(u / 4 + tower.height, v / 4))
    if (d > 1.1) continue
    const height = -4 + (tower.height * (1 - 0.38 * d * d) + 4) * (1 - sm(d, 0.6, 1))
    if (height > best) { best = height; top = 1 - sm(d, 0.3, 0.68) }
  }
  return { height: best, top }
}
const KARST = c(0x8f9892), KARST_PALE = c(0xc6c9c0), KARST_WET = c(0x4a504c), JUNGLE = c(0x3f7c3e), JUNGLE_DARK = c(0x2c6638)
const karst: Shape = {
  height: (u, v) => towerAt(u, v).height + (towerAt(u, v).height > 0 ? n(u / 2.2, v / 2.2) * 0.5 : 0),
  color(u, v, h, out) {
    const { top } = towerAt(u, v)
    out.copy(KARST).lerp(KARST_PALE, sm(n(u / 1.7, v / 5), 0.1, 0.6)).lerp(KARST_WET, 1 - sm(h, 0.3, 1.2))
    // Jungle on the top and on each ledge.
    scratch.copy(JUNGLE).lerp(JUNGLE_DARK, sm(n(u / 2.5, v / 2.5), -0.2, 0.4))
    out.lerp(scratch, Math.max(top, sm(n(u / 4 + 20, v / 4), 0.25, 0.5) * sm(h, 2, 5)))
  },
}

// ---- L5 · A coral atoll of the Maldives: a ring of sand around a shallow lagoon ---------------------
export const atollRing = (angle: number) => 30 + 4 * ring(angle, 1.2)
const ATOLL_SAND = c(0xf6ecd2), ATOLL_GREEN = c(0x4f9a4a), REEF = c(0xe2f1dc)
const SEA = c(0x208dad)
const CORALS = [0xf08aa0, 0xf5a05a, 0xa98ad8, 0xf2d15c].map(c)
const atoll: Shape = {
  height(u, v) {
    const r = Math.hypot(u, v), angle = Math.atan2(v, u), x = r - atollRing(angle)
    const lagoon = -1 - 1.3 * (1 - sm(r, 4, 20)) + n(u / 5, v / 5) * 0.25
    const outside = -0.35 - 6.6 * sm(x, 3, 8)
    const floor = x < 0 ? lagoon + (-0.35 - lagoon) * sm(x, -9, -4) : outside
    const island = sm(ring(angle, 2.3, 5), -0.05, 0.25)
    return floor + (1.9 - floor) * Math.exp(-Math.pow(x / 3.4, 2)) * island
  },
  color(u, v, h, out) {
    if (h > 0.15) { out.copy(ATOLL_SAND).lerp(ATOLL_GREEN, sm(h, 1.05, 1.45)); return }
    out.copy(REEF)
    const patch = n(u / 2.4, v / 2.4)
    if (patch > 0.42 && h > -2) out.copy(CORALS[Math.floor((n(u / 9, v / 9) + 1) * 2) % CORALS.length])
    out.multiplyScalar(0.85 + sm(h, -2.4, -0.3) * 0.15).lerp(SEA, sm(-h, 2.4, 5))
  },
}

// ---- L6 · The ice of Antarctica: an ice shelf, and icebergs in the sea -------------------------------
type Berg = { u: number; v: number; size: number; height: number; sides: number; turn: number; peak: boolean }
export const iceFront = (u: number) => 10 + 9 * n(u / 25, 3) + 3 * n(u / 7, 8)
export const BERGS: Berg[] = (() => {
  const random = seededRandom(0x1ce), bergs: Berg[] = []
  for (let tries = 0; tries < 600 && bergs.length < 15; tries++) {
    const u = (random() * 2 - 1) * 46, v = -6 - random() * 42
    const peak = random() > 0.6, size = peak ? 2.5 + random() * 3 : 4 + random() * 7
    const berg = { u, v, size, height: peak ? 5 + random() * 6 : 3 + random() * 4.5, sides: 5 + Math.floor(random() * 3), turn: random() * Math.PI, peak }
    if (Math.hypot(u, v) < 50 && v < iceFront(u) - size - 5 && bergs.every(other => Math.hypot(other.u - u, other.v - v) > (other.size + size) * 1.3)) bergs.push(berg)
  }
  return bergs
})()
function iceAt(u: number, v: number) {
  const shelf = sm(v - iceFront(u), 0, 1.3)
  let height = -5 + (13.2 + n(u / 20, v / 20) * 1.1) * shelf, face = shelf > 0.04 && shelf < 0.96 ? 1 : 0
  for (const berg of BERGS) {
    const du = u - berg.u, dv = v - berg.v
    if (Math.abs(du) > 13 || Math.abs(dv) > 13) continue
    // A polygon: the largest distance along the direction of each side.
    let d = 0
    for (let side = 0; side < berg.sides; side++) {
      const angle = berg.turn + side / berg.sides * Math.PI * 2
      d = Math.max(d, (du * Math.cos(angle) + dv * Math.sin(angle)) / berg.size)
    }
    if (d > 1) continue
    const edge = 1 - sm(d, 0.8, 1)
    const top = berg.peak ? berg.height * (1 - d * 0.75) : berg.height + n(u / 6, v / 6) * 0.3
    const h = -5 + (top + 5) * edge
    if (h > height) { height = h; face = edge < 0.96 ? 1 : 0 }
  }
  return { height, face }
}
const ICE_TOP = c(0xf4f8fb), ICE_FACE = c(0x8fd3f0), ICE_DEEP = c(0x4bb2dc)
const ice: Shape = {
  height: (u, v) => iceAt(u, v).height,
  color(u, v, h, out) {
    const { face } = iceAt(u, v)
    if (face) out.copy(ICE_DEEP).lerp(ICE_FACE, sm(h, 0, 5))
    else out.copy(ICE_TOP).lerp(ICE_FACE, sm(Math.abs(n(u / 8, v / 8)), 0.12, 0) * 0.5)
  },
}

// ---- L7 · Angel Falls: a table mountain with a waterfall from its edge -------------------------------
export const TEPUI = { top: 28, base: 2.2, fallAngle: -Math.PI / 2 }
export function tepuiEdge(angle: number) {
  const turn = Math.atan2(Math.sin(angle - TEPUI.fallAngle), Math.cos(angle - TEPUI.fallAngle))
  // An amphitheatre in the cliff, where the waterfall drops.
  return 27 + 5 * ring(angle, 1.5, 2) + 1.5 * ring(angle, 5) - 7 * Math.exp(-Math.pow(turn / 0.35, 2))
}
export const TEPUI_POOL = { u: 0, v: -(tepuiEdge(TEPUI.fallAngle) + 6.5), radius: 5.5 }
const riverPath = (v: number) => 4 * Math.sin(v / 9)
const TEPUI_ROCK = c(0xc98a6a), TEPUI_ROCK_DARK = c(0x9c5f4c), TEPUI_STAIN = c(0x5a4a44), TEPUI_TOP = c(0x3d7f3f), TEPUI_TOP_PALE = c(0x77a657)
const tepui: Shape = {
  height(u, v) {
    const r = Math.hypot(u, v), x = r - tepuiEdge(Math.atan2(v, u))
    const talus = 10 * Math.pow(1 - sm(x, 0, 24), 1.5)
    let h = TEPUI.base + talus + (TEPUI.top + n(u / 14, v / 14) * 1.2 - TEPUI.base - 10) * (1 - sm(x, 0, 2.2))
    // The stream on the top, the pool under the fall, and the river away from it.
    if (x < 0 && v < 4) h -= 0.7 * (1 - sm(Math.abs(u), 0.8, 2.2))
    const pool = Math.hypot(u - TEPUI_POOL.u, v - TEPUI_POOL.v)
    h += (-1.3 - h) * (1 - sm(pool, TEPUI_POOL.radius * 0.7, TEPUI_POOL.radius * 1.4))
    if (v < TEPUI_POOL.v) h += (-1.3 - h) * (1 - sm(Math.abs(u - riverPath(v - TEPUI_POOL.v)), 1.8, 4.5))
    return h
  },
  color(u, v, h, out) {
    const r = Math.hypot(u, v), angle = Math.atan2(v, u), x = r - tepuiEdge(angle)
    if (x < -0.4) out.copy(TEPUI_TOP).lerp(TEPUI_TOP_PALE, sm(n(u / 6, v / 6), 0, 0.6))
    else if (x < 2.4) {
      // Vertical streaks and dark stains, as on wet sandstone.
      out.copy(TEPUI_ROCK).lerp(TEPUI_ROCK_DARK, sm(n(angle * 40, h / 14), -0.3, 0.5)).lerp(TEPUI_STAIN, sm(n(angle * 22 + 9, h / 30), 0.35, 0.7))
      out.multiplyScalar(0.9 + 0.1 * Math.sin(h * 1.3))
    } else out.copy(h < 0.8 ? SAND : JUNGLE_DARK).lerp(GRASS, sm(x, 14, 26))
  },
}

// ---- L8 · Monument Valley: red buttes on a flat red desert -------------------------------------------
type Butte = { u: number; v: number; a: number; b: number; height: number }
export const BUTTES: Butte[] = [
  { u: -27, v: 5, a: 8.5, b: 7.5, height: 25 }, { u: -16.2, v: 3.5, a: 1.8, b: 1.8, height: 19 },   // West Mitten and its thumb
  { u: 4, v: 17, a: 8, b: 7, height: 24 }, { u: -6.2, v: 15, a: 1.7, b: 1.7, height: 18 },             // East Mitten and its thumb
  { u: 31, v: -4, a: 11, b: 8.5, height: 22 },                                                         // Merrick Butte
  { u: -7, v: -29, a: 2, b: 2, height: 17 }, { u: -2.5, v: -31, a: 1.4, b: 1.4, height: 12 },          // Two spires
  { u: 26, v: 35, a: 14, b: 7, height: 18 },                                                           // A far mesa
]
function butteAt(u: number, v: number) {
  let lift = 0, wall = 0
  for (const butte of BUTTES) {
    const du = Math.abs(u - butte.u) / butte.a, dv = Math.abs(v - butte.v) / butte.b
    if (du > 2.6 || dv > 2.6) continue
    const d = Math.cbrt(du ** 3 + dv ** 3) * (1 + 0.1 * n(u / 3.3 + butte.height, v / 3.3))
    const cap = 1 - sm(d, 0.9, 1)
    const height = butte.height * (0.36 * Math.pow(1 - sm(d, 1, 2.5), 1.3) + 0.64 * cap)
    if (height > lift) { lift = height; wall = cap }
  }
  return { lift, wall }
}
const VALLEY_FLOOR = c(0xc96f3e), VALLEY_SAGE = c(0x8b8f5a), VALLEY_TALUS = c(0xb85b35), VALLEY_WALL = c(0xa5442a), VALLEY_WALL_DARK = c(0x7f3323)
const valley: Shape = {
  height(u, v) {
    const { lift, wall } = butteAt(u, v)
    return 2.6 + n(u / 30, v / 30) * 0.5 + lift + wall * n(u / 2.5, v / 2.5) * 0.5
  },
  color(u, v, h, out) {
    const { lift, wall } = butteAt(u, v)
    if (lift < 0.3) out.copy(VALLEY_FLOOR).lerp(VALLEY_SAGE, sm(n(u / 1.1, v / 1.1), 0.5, 0.7) * 0.8)
    else if (wall < 0.02) out.copy(VALLEY_TALUS).multiplyScalar(0.92 + 0.08 * Math.sin(h * 2.4))
    else out.copy(VALLEY_WALL).lerp(VALLEY_WALL_DARK, sm(Math.sin(h * 1.5 + n(u / 6, v / 6)), 0.2, 0.7) * 0.7 + sm(n(u * 1.4, v * 1.4), 0.2, 0.7) * 0.3)
  },
}

// ---- L9 · Giant's Causeway: stone columns with six sides, down to the sea -----------------------------
/** 1 inside the tongue of columns, 0 outside. */
export function causewayMask(u: number, v: number) {
  const half = 4 + 10 * sm(v, -30, 2)
  return (1 - sm(Math.abs(u - 5 * Math.sin(v / 9)), half * 0.75, half)) * sm(v, -31, -26) * (1 - sm(v, 9, 13))
}
/** The height of the column tops, before the step of each column. */
export const causewayTop = (u: number, v: number) => 0.3 + 3.4 * sm(v, -29, 7) + 2.8 * Math.exp(-(((u - 5) / 5.5) ** 2 + ((v + 2) / 7) ** 2))
const headland = (u: number, v: number) => -2.6 + (4.6 + 12 * sm(v, 12, 30) + n(u / 9, v / 9) * 0.6) * sm(v, 5, 11)
const BASALT = c(0x3f3d3b), CLIFF = c(0x5a554e), SHORE = c(0x6b6a60)
const causeway: Shape = {
  height(u, v) {
    const mask = causewayMask(u, v), land = headland(u, v)
    return land + (Math.max(land, causewayTop(u, v)) - land) * sm(mask, 0.2, 0.6)
  },
  visual(u, v) {
    // The ground under the columns is 1.3 m below their tops.
    const mask = causewayMask(u, v), land = headland(u, v)
    return land + (Math.max(land, causewayTop(u, v) - 1.3) - land) * sm(mask, 0.2, 0.6)
  },
  color(u, v, h, out) {
    if (causewayMask(u, v) > 0.2) out.copy(BASALT)
    else if (v > 11) out.copy(CLIFF).lerp(GRASS, sm(v + n(u / 5, v / 5) * 2, 14, 18)).multiplyScalar(0.92 + n(u / 2, v / 2) * 0.08)
    else out.copy(h < 0.6 ? KARST_WET : SHORE)
  },
}

// ---- L10 · Geirangerfjord: a narrow arm of the sea between high walls ---------------------------------
export const FJORD_HEAD = 46
export const fjordPath = (v: number) => 16 * Math.sin((Math.min(v, FJORD_HEAD) + 10) / 26)
export const fjordWidth = (v: number) => 6.5 + 2.5 * sm(-v, 20, 60)
export const fjordMassif = (u: number, v: number) => 30 + 9 * n(u / 28, v / 28) + 4 * n(u / 11, v / 11)
/** The distance to the centre line of the water. */
export const fjordDistance = (u: number, v: number) => v < FJORD_HEAD ? Math.abs(u - fjordPath(v)) : Math.hypot(u - fjordPath(FJORD_HEAD), v - FJORD_HEAD)
const FJORD_ROCK = c(0x5c625f), FJORD_GREEN = c(0x4d7d45), FJORD_ALP = c(0x7f9a5e)
const fjord: Shape = {
  height(u, v) {
    const t = sm(fjordDistance(u, v), fjordWidth(v), fjordWidth(v) + 13)
    return -5 + (fjordMassif(u, v) + 5) * Math.pow(t, 0.8)
  },
  color(u, v, h, out) {
    const t = sm(fjordDistance(u, v), fjordWidth(v), fjordWidth(v) + 13)
    const wall = t > 0.03 && t < 0.9 ? 1 : 0
    out.copy(FJORD_GREEN).lerp(FJORD_ALP, sm(h, 18, 28))
    if (wall) out.lerp(FJORD_ROCK, sm(n(u / 2.2, h / 5), -0.45, 0.2))
    out.lerp(SNOW, sm(h + n(u / 5, v / 5) * 2, 31, 34))
    if (h < 0.6) out.copy(KARST_WET)
  },
}

// ---- L11 · Grand Prismatic Spring: a hot spring with rings of colour ---------------------------------
export const springEdge = (angle: number) => 15 + 1.8 * ring(angle, 2)
export const GEYSER = { u: -29, v: 12 }
const SPRING = [[0, 0x1b5fcf], [0.42, 0x1e8fd6], [0.6, 0x2fc0c2], [0.72, 0x58c66a], [0.82, 0xf0d93a], [0.92, 0xf28a22], [1.04, 0xb4432a], [1.2, 0x8a4a30]].map(([at, hex]) => ({ at, color: c(hex) }))
const SINTER = c(0xddd6c8), RUNOFF = c(0xc9793f)
const spring: Shape = {
  height(u, v) {
    const r = Math.hypot(u, v), x = r / springEdge(Math.atan2(v, u))
    const mound = 1.3 * Math.exp(-Math.pow(Math.hypot(u - GEYSER.u, v - GEYSER.v) / 2.6, 2))
    return 3 + n(u / 12, v / 12) * 0.2 - 1.2 * (1 - sm(x, 0.5, 1)) + mound
  },
  color(u, v, _h, out) {
    const r = Math.hypot(u, v), angle = Math.atan2(v, u)
    // The mats of the edge reach out in thin arms.
    const x = r / springEdge(angle) - Math.max(0, ring(angle, 5, 3)) * 0.11 * sm(r, 12, 17)
    if (x >= 1.2) {
      out.copy(SINTER).lerp(RUNOFF, sm(ring(angle, 14, 6), 0.25, 0.6) * (1 - sm(x, 1.2, 2.1)) * 0.75)
      out.multiplyScalar(0.94 + n(u / 2, v / 2) * 0.06)
      return
    }
    const next = SPRING.findIndex(stop => stop.at > x), from = SPRING[Math.max(0, next - 1)], to = SPRING[Math.max(0, next)]
    out.copy(from.color).lerp(to.color, sm(x, from.at, to.at))
  },
}

// ---- L12 · The rainbow mountains of Zhangye Danxia: hills with stripes of colour ----------------------
const RAINBOW = [0xb8452a, 0xe9d2a6, 0xd9793a, 0xe0b050, 0x8c3a30, 0xd9d4c8, 0x6fb3a8, 0xc85a34].map(c)
const rainbow: Shape = {
  height(u, v) {
    // A round crest: a sharp crest makes a saw edge on the mesh.
    const ridge = Math.pow(1 - Math.sqrt(n(u / 34, v / 34) ** 2 + 0.015), 2.2) * (0.6 + 0.4 * n(u / 60 + 7, v / 60))
    return 3 + 13 * ridge - 0.6 * Math.abs(n(u / 7, v / 7)) * sm(ridge, 0.1, 0.5)
  },
  color(u, v, h, out) {
    // Tilted layers: the stripe changes with the height and along one direction.
    const layer = h * 0.5 + (u * 0.5 + v * 0.25) / 9 + n(u / 20, v / 20) * 0.8 + 40
    const index = Math.floor(layer), f = layer - index
    out.copy(RAINBOW[index % RAINBOW.length]).lerp(RAINBOW[(index + 1) % RAINBOW.length], sm(f, 0.8, 1))
    out.multiplyScalar(0.9 + n(u / 1.6, v / 5) * 0.1)
  },
}

export const SHAPES: Record<LandmarkId, Shape> = {
  L1: canyon, L2: fuji, L3: dunes, L4: karst, L5: atoll, L6: ice, L7: tepui, L8: valley, L9: causeway, L10: fjord, L11: spring, L12: rainbow,
}
