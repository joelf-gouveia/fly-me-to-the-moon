import { BELTS, GARDENS, HOME_RING, zoneAt } from '../../src/foliage/zones'
import type { Fields } from '../../src/foliage/zones'
import { GAME_LOOK } from '../../src/foliage/build'
import { MAGIC_SEASONS } from '../../src/magic-seasons'
import type { MagicId } from '../../src/magic-seasons'
import type { SeasonName } from '../../src/seasons'
import type { TerrainSample } from '../../src/terrain'

/**
 * The place rules of the animals study. A place is what the game knows about a point of a world:
 * its zone (a climate belt of Earth or a garden of Blossom Haven, from zoneAt() of
 * src/foliage/zones.ts with the look of the game), its surface (land, shore, river, sea, deep sea),
 * its height and its hemisphere. A rule of a species reads only these values, so it is true on each
 * new Earth: no rule names a fixed place.
 */
export type EarthZone = keyof typeof BELTS | 'polar'
export type HavenZone = keyof typeof GARDENS
export type Zone = EarthZone | HavenZone
export type Surface = 'land' | 'shore' | 'river' | 'sea' | 'deep'
export type Place = { zone: Zone; surface: Surface; height: number; south: boolean; home: boolean }

/** The zone ids of the game, for the tests and the page. */
export const EARTH_ZONES = [...Object.keys(BELTS), 'polar'] as EarthZone[]
export const HAVEN_ZONES = Object.keys(GARDENS) as HavenZone[]
export const MAGIC_IDS = MAGIC_SEASONS.map(season => season.id) as MagicId[]
export const ZONE_NAMES: Record<Zone, string> = {
  ...Object.fromEntries(Object.entries(BELTS).map(([id, zone]) => [id, zone.name])),
  ...Object.fromEntries(Object.entries(GARDENS).map(([id, zone]) => [id, zone.name])),
  polar: 'Polar snow',
} as Record<Zone, string>

/** The heights of the surfaces, in metres from the sea. The land values are those of SphericalHabitat.safeSegment(). */
export const SURFACE = {
  /** Land: above this height. Below it the ground is the shore or the sand. */
  land: 0.65,
  /** Water: below this height. A river has `river` > 0.5 in the terrain sample. */
  water: -0.5,
  /** Deep sea: below this height, far from the shore. */
  deep: -4,
  /** A shore is land below this height with water nearer than `shoreReach` metres. */
  shore: 1.6, shoreReach: 3,
  /** The steepest change of height under one animal, as the game. */
  slope: 1.35,
} as const

/** A rule of a species. Each list is a list of ids of the code; an empty or missing list allows each value. */
export type Rule = {
  world: 'earth' | 'fairy'
  zones: Zone[]
  surfaces: Surface[]
  /** Only in the south (the penguins), or only in the north. */
  hemisphere?: 'south' | 'north'
  /** Earth: the seasons of the place when the species is there (src/seasons.ts). Missing: all year. */
  seasons?: SeasonName[]
  /** Blossom Haven: the magic seasons of the place when the species is there (src/magic-seasons.ts). */
  magic?: MagicId[]
  /** Blossom Haven: only near the cottage (the ring of HOME_RING). */
  home?: boolean
  /** Fliers and swimmers: the height of the flight over the ground or the water, in metres. */
  air?: [number, number]
}

/** The place of a direction on the unit sphere. `sample` is the terrain of the world; `fields` its zone noise. */
export function placeAt(world: 'earth' | 'fairy', x: number, y: number, z: number, sample: (x: number, y: number, z: number) => TerrainSample, fields: Fields, radius: number): Place {
  const here = sample(x, y, z)
  const zone = (zoneAt(GAME_LOOK[world], x, y, z, here, fields)?.id ?? (world === 'earth' ? 'polar' : 'grove')) as Zone
  const home = world === 'fairy' && y < 0 && Math.hypot(x, z) < HOME_RING
  let surface: Surface
  if (here.height < SURFACE.water) surface = here.river > 0.5 ? 'river' : here.height < SURFACE.deep && !nearHeight(x, y, z, sample, radius, 12, h => h > 0) ? 'deep' : 'sea'
  else if (here.height < SURFACE.shore && nearHeight(x, y, z, sample, radius, SURFACE.shoreReach, h => h < SURFACE.water)) surface = 'shore'
  else surface = here.height > SURFACE.land ? 'land' : 'shore'
  return { zone, surface, height: here.height, south: y < 0, home }
}

/** True when a point at `reach` metres around the direction has a height that passes `test`. Eight points on a ring. */
function nearHeight(x: number, y: number, z: number, sample: (x: number, y: number, z: number) => TerrainSample, radius: number, reach: number, test: (height: number) => boolean) {
  const ex = Math.abs(y) < 0.95 ? [z, 0, -x] : [0, -z, y]
  const el = Math.hypot(ex[0], ex[1], ex[2]) || 1
  const e = ex.map(v => v / el)
  const n = [y * e[2] - z * e[1], z * e[0] - x * e[2], x * e[1] - y * e[0]]
  const angle = reach / radius
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, c = Math.cos(a) * Math.sin(angle), s = Math.sin(a) * Math.sin(angle), k = Math.cos(angle)
    const px = x * k + e[0] * c + n[0] * s, py = y * k + e[1] * c + n[1] * s, pz = z * k + e[2] * c + n[2] * s
    if (test(sample(px, py, pz).height)) return true
  }
  return false
}

/** True when a place passes a rule, in a season. A season of `null` is the look with no season: each species is there. */
export function fits(rule: Rule, place: Place, season: { earth?: SeasonName | null; magic?: MagicId | null } = {}) {
  if (rule.zones.length && !rule.zones.includes(place.zone)) return false
  if (rule.surfaces.length && !rule.surfaces.includes(place.surface)) return false
  if (rule.hemisphere === 'south' && !place.south) return false
  if (rule.hemisphere === 'north' && place.south) return false
  if (rule.home !== undefined && rule.home !== place.home) return false
  if (rule.seasons && season.earth && !rule.seasons.includes(season.earth)) return false
  if (rule.magic && season.magic && !rule.magic.includes(season.magic)) return false
  return true
}

/** The rule in words, with the values of the code, for the page. */
export function ruleText(rule: Rule) {
  const zones = rule.zones.map(zone => ZONE_NAMES[zone]).join(', ') || 'any zone'
  const surfaces = rule.surfaces.map(surface => SURFACE_WORDS[surface]).join(' or ')
  const parts = [`${zones} · ${surfaces}`]
  if (rule.hemisphere) parts.push(`${rule.hemisphere} half only`)
  if (rule.home) parts.push('near the cottage')
  if (rule.air) parts.push(`flies ${rule.air[0]} to ${rule.air[1]} m up`)
  if (rule.seasons) parts.push(`in ${rule.seasons.join(' and ')}`)
  if (rule.magic) parts.push(`in ${rule.magic.map(id => MAGIC_SEASONS.find(season => season.id === id)!.name).join(' and ')}`)
  return parts.join(' · ')
}

export const SURFACE_WORDS: Record<Surface, string> = {
  land: `land (height > ${SURFACE.land} m, slope < ${SURFACE.slope} m)`,
  shore: `shore (land below ${SURFACE.shore} m, water within ${SURFACE.shoreReach} m)`,
  river: `river (water, river > 0.5)`,
  sea: `sea (below ${SURFACE.water} m)`,
  deep: `deep sea (below ${SURFACE.deep} m, land > 12 m away)`,
}
