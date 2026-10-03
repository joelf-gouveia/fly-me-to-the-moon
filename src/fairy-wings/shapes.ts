/**
 * The outline of a wing panel, and the colour helpers of the study. No canvas and no WebGL,
 * so the tests can read each function.
 *
 * A panel is a closed lobe in polar form. Its root is the origin: the point where the wing
 * holds the back of the fairy. `u` goes from 0 to 1 across the angles of the panel, and
 * `rho` goes from 0 at the root to 1 at the outline. Each pattern of the study is written
 * in (u, rho), so a vein or a band follows the shape of its panel.
 */
export type Panel = {
  /** True for a panel that moves with the lower wing of the game, which beats a moment later. */
  lower?: boolean
  /** The first and the last angle in degrees: 0 points out from the back, 90 points up. */
  from: number
  to: number
  /** The longest radius, in the units of the fairy rig (the fairy is about 1.4 units tall). */
  length: number
  /** The u of the longest radius. */
  peak: number
  /** Below 1 the lobe is broad and round. Above 1 it is slim. */
  round: number
  /** A point (or, below 0, a notch) at the peak, as a part of the length. */
  tip?: number
  /** Lobes along the edge: the count, the depth, and 'spike' for sharp points in place of round scallops. */
  scallop?: [count: number, depth: number, form?: 'spike']
  /** A tail: its u, its length as a part of the panel length, and its width in u. */
  tail?: [at: number, length: number, width: number]
  /** More room around the outline in the picture, for a part that is outside the outline. */
  pad?: number
}

const RAD = Math.PI / 180

/** The radius of the outline at `u`. It is 0 at the two ends, so each panel starts at the root. */
export function radius(panel: Panel, u: number) {
  if (u <= 0 || u >= 1) return 0
  const warped = Math.pow(u, Math.log(0.5) / Math.log(panel.peak))
  let r = Math.pow(Math.sin(Math.PI * warped), panel.round)
  if (panel.scallop) {
    const [count, depth, form] = panel.scallop, wave = Math.abs(Math.sin(Math.PI * count * u))
    r *= 1 - depth * (form === 'spike' ? wave : 1 - wave)
  }
  if (panel.tip) r += panel.tip * Math.exp(-(((u - panel.peak) / 0.06) ** 2))
  if (panel.tail) r += panel.tail[1] * Math.exp(-(((u - panel.tail[0]) / panel.tail[2]) ** 2))
  return Math.max(0, r) * panel.length
}

export const angleOf = (panel: Panel, u: number) => (panel.from + (panel.to - panel.from) * u) * RAD

/** The point at (u, rho) in the frame of the wing: x goes out from the back, y goes up. */
export function point(panel: Panel, u: number, rho = 1): [number, number] {
  const angle = angleOf(panel, u), r = radius(panel, u) * rho
  return [Math.cos(angle) * r, Math.sin(angle) * r]
}

/** The (u, rho) of a point. `rho` is above 1 outside the outline; `u` is outside 0 to 1 outside the angles of the panel. */
export function locate(panel: Panel, x: number, y: number) {
  const u = (Math.atan2(y, x) / RAD - panel.from) / (panel.to - panel.from)
  const r = radius(panel, u), distance = Math.hypot(x, y)
  return { u, r, distance, rho: r > 0 ? distance / r : Infinity }
}

export function outline(panel: Panel, steps = 160) {
  return Array.from({ length: steps + 1 }, (_, index) => point(panel, index / steps))
}

/** The square of the picture of a panel: it holds the outline and its pad. */
export function boxOf(panel: Panel) {
  const points = outline(panel, 240), pad = 0.05 + (panel.pad ?? 0)
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad
  const side = Math.max(maxX - minX, maxY - minY)
  return { x: (minX + maxX - side) / 2, y: (minY + maxY - side) / 2, side }
}

// ---- Colour ----------------------------------------------------------------------------------------
/** A colour in sRGB, each part from 0 to 1. */
export type RGB = [number, number, number]
export type RGBA = [number, number, number, number]

export const rgb = (hex: number): RGB => [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255]
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
export const smooth = (from: number, to: number, value: number) => { const t = clamp01((value - from) / (to - from)); return t * t * (3 - 2 * t) }
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

export function toHsl([r, g, b]: RGB): RGB {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
/** Hue in turns. */
export function hsl(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * clamp01(s), hue = ((h % 1) + 1) % 1 * 6, x = c * (1 - Math.abs(hue % 2 - 1)), m = l - c / 2
  const [r, g, b] = hue < 1 ? [c, x, 0] : hue < 2 ? [x, c, 0] : hue < 3 ? [0, c, x] : hue < 4 ? [0, x, c] : hue < 5 ? [x, 0, c] : [c, 0, x]
  return [r + m, g + m, b + m]
}
/** A shade of a colour: adds to its lightness, its saturation and its hue (in turns). */
export function tone(colour: RGB, lightness: number, saturation = 0, hue = 0): RGB {
  const [h, s, l] = toHsl(colour)
  return hsl(h + hue, clamp01(s + saturation), clamp01(l + lightness))
}
/** A colour from a list of stops `[at, colour]`, with `at` in rising order. */
export function ramp(stops: [number, RGB][], at: number): RGB {
  if (at <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    if (at <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (at - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]))
  }
  return stops[stops.length - 1][1]
}

/** A number from 0 to 1 for a cell of a grid. The same cell gives the same number. */
export function hash(x: number, y = 0) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return value - Math.floor(value)
}
/** Smooth noise from 0 to 1. */
export function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx
  return top + (bottom - top) * sy
}
/** A random number generator with a seed, so each picture is the same at each run. */
export function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = state + 0x6d2b79f5 >>> 0
    let t = state
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
