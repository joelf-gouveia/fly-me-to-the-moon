import { STAR_ROW, designations, starRows } from './star-catalog'
import { starPictures, webbImages } from './star-data'
import type { StarFigure, WebbImage } from './star-data'

/** Pure sky geometry and data shared by the game sky and the star map study. */
export type Vec3 = readonly [number, number, number]
export type SkyStar = { hr: number; ra: number; dec: number; magnitude: number; bv: number }
export type ResolvedPicture = StarFigure & { hrPaths: number[][]; segments: [number, number][]; centre: Vec3 }

const RAD = Math.PI / 180

/** Same axes as starDirection() in src/stars.ts: RA 0 is +X, celestial north is +Y. */
export function unitVector(ra: number, dec: number): Vec3 {
  const r = ra * RAD, d = dec * RAD
  return [Math.cos(d) * Math.cos(r), Math.sin(d), -Math.cos(d) * Math.sin(r)]
}

export function raDec(v: Vec3) {
  const ra = Math.atan2(-v[2], v[0]) / RAD
  return { ra: (ra + 360) % 360, dec: Math.asin(v[1] / Math.hypot(...v)) / RAD }
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const normalize = (v: Vec3): Vec3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l] }

export const angleBetween = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, Math.max(-1, dot(a, b)))) / RAD

/** Angular distance, in degrees, from p to the short great-circle arc a–b. */
export function distanceToArc(p: Vec3, a: Vec3, b: Vec3) {
  const n = normalize(cross(a, b))
  const offPlane = dot(p, n)
  const projected = normalize([p[0] - offPlane * n[0], p[1] - offPlane * n[1], p[2] - offPlane * n[2]])
  const inside = dot(cross(a, projected), n) >= 0 && dot(cross(projected, b), n) >= 0
  return inside ? Math.asin(Math.min(1, Math.abs(offPlane))) / RAD : Math.min(angleBetween(p, a), angleBetween(p, b))
}

/** Destination on the sphere from (ra, dec) after `distance` degrees on `bearing` (0 = north, 90 = east). */
export function offset(ra: number, dec: number, distance: number, bearing: number): Vec3 {
  const d = distance * RAD, b = bearing * RAD, lat = dec * RAD
  const lat2 = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(b))
  const lon2 = ra * RAD + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(lat2))
  return unitVector(lon2 / RAD, lat2 / RAD)
}

export const skyStars: readonly SkyStar[] = Array.from({ length: starRows.length / STAR_ROW }, (_, i) => {
  const [hr, ra, dec, magnitude, bv] = starRows.slice(i * STAR_ROW, i * STAR_ROW + STAR_ROW)
  return { hr, ra, dec, magnitude, bv }
})
export const byHr = new Map(skyStars.map(star => [star.hr, star]))
export const starDirectionOf = (star: SkyStar) => unitVector(star.ra, star.dec)

export function findStar(designation: string) {
  const hr = designations[designation]
  return hr === undefined ? undefined : byHr.get(hr)
}

export function resolvePicture(picture: StarFigure): ResolvedPicture {
  const hrPaths = picture.paths.map(path => path.map(key => {
    const star = findStar(key)
    if (!star) throw new Error(`${picture.id}: ${key} is not in the catalog`)
    return star.hr
  }))
  const segments: [number, number][] = []
  for (const path of hrPaths) for (let i = 1; i < path.length; i++) segments.push([path[i - 1], path[i]])
  const sum = [...new Set(hrPaths.flat())].reduce<[number, number, number]>((total, hr) => {
    const v = starDirectionOf(byHr.get(hr)!)
    return [total[0] + v[0], total[1] + v[1], total[2] + v[2]]
  }, [0, 0, 0])
  return { ...picture, hrPaths, segments, centre: normalize(sum) }
}

export const resolvedPictures: readonly ResolvedPicture[] = starPictures.map(resolvePicture)

/** Stylized: the brightest stars are about 14 px, magnitude 5.5 about 2.4 px (CSS pixels). */
export function starPointSize(magnitude: number) {
  const t = (5.5 - Math.min(5.5, Math.max(-1.5, magnitude))) / 7
  return 2.4 + 11.6 * Math.pow(t, 1.6)
}

/** B-V colour index to a soft display colour (blue-white to orange), in sRGB. */
export function bvColor(bv: number): Vec3 {
  const stops: [number, Vec3][] = [
    [-0.3, [0.66, 0.78, 1]], [0, [0.84, 0.9, 1]], [0.4, [1, 0.98, 0.94]],
    [0.8, [1, 0.9, 0.72]], [1.4, [1, 0.78, 0.55]], [2, [1, 0.68, 0.46]],
  ]
  const x = Math.min(2, Math.max(-0.3, bv))
  for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) {
    const [x0, a] = stops[i - 1], [x1, b] = stops[i], t = (x - x0) / (x1 - x0)
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  }
  return stops[stops.length - 1][1]
}

export const starsBrighterThan = (limit: number) => skyStars.filter(star => star.magnitude <= limit).length

/** J2000 galactic north pole and galactic centre, for the Milky Way glow. */
export const GALACTIC_NORTH = unitVector(192.85948, 27.12825)
export const GALACTIC_CENTRE = unitVector(266.40499, -28.93617)

/** Default angular width of an enlarged Webb picture in the sky. */
export const WEBB_PICTURE_DEGREES = 6

export type Placement = { image: WebbImage; anchor: Vec3; centre: Vec3; moved: boolean }

/** Keeps each enlarged Webb picture clear of picture lines, very bright stars
 * and the other Webb pictures. Tries the true position first, then rings of
 * offsets around it. `true` mode keeps every picture at its true position. */
export function placeWebbPictures(sizeDegrees = WEBB_PICTURE_DEGREES, mode: 'beside' | 'true' = 'beside', shown: readonly ResolvedPicture[] = resolvedPictures): Placement[] {
  const radius = sizeDegrees / 2, margin = 1.2
  const arcs = shown.flatMap(picture => picture.segments.map(([a, b]) => [starDirectionOf(byHr.get(a)!), starDirectionOf(byHr.get(b)!)] as const))
  const brightStars = skyStars.filter(star => star.magnitude < 1.5).map(starDirectionOf)
  const placed: Vec3[] = []
  const clear = (centre: Vec3) =>
    arcs.every(([a, b]) => distanceToArc(centre, a, b) > radius + margin) &&
    brightStars.every(star => angleBetween(centre, star) > radius + margin) &&
    placed.every(other => angleBetween(centre, other) > sizeDegrees + margin)
  return webbImages.map(image => {
    const anchor = unitVector(image.ra, image.dec)
    let centre = anchor
    if (mode === 'beside' && !clear(anchor)) {
      search: for (const distance of [1, 1.5, 2, 2.6, 3.4].map(step => step * sizeDegrees)) {
        for (let turn = 0; turn < 12; turn++) {
          const candidate = offset(image.ra, image.dec, distance, turn * 30)
          if (clear(candidate)) { centre = candidate; break search }
        }
      }
    }
    placed.push(centre)
    return { image, anchor, centre, moved: centre !== anchor }
  })
}
