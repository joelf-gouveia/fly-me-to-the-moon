import { BELTS, GARDENS, HOME_RING, zoneAt } from '../foliage/zones'
import type { Fields } from '../foliage/zones'
import { GAME_LOOK } from '../foliage/build'
import { magicAt } from '../magic-seasons'
import type { MagicId } from '../magic-seasons'
import { seasonAt } from '../seasons'
import type { SeasonName } from '../seasons'
import type { TerrainSample } from '../terrain'

/**
 * The place rules of the animals (docs/animals-study.md). A place is what the game knows about a
 * point of a world: its zone (a climate belt of Earth or a garden of Blossom Haven, from zoneAt() of
 * src/foliage/zones.ts with the look of the game), its surface (land, shore, river, sea, deep sea),
 * its height and its half of the planet. A rule reads only these values, so it is true on each new
 * Earth: no rule names a fixed place.
 */
export type EarthZone = keyof typeof BELTS | 'polar'
export type HavenZone = keyof typeof GARDENS
export type Zone = EarthZone | HavenZone
export type Surface = 'land' | 'shore' | 'river' | 'sea' | 'deep'
export type Place = { zone: Zone; surface: Surface; height: number; south: boolean; home: boolean }

/** The zone ids of the game. */
export const EARTH_ZONES = [...Object.keys(BELTS), 'polar'] as EarthZone[]
export const HAVEN_ZONES = Object.keys(GARDENS) as HavenZone[]
export const SURFACES: Surface[] = ['land', 'shore', 'river', 'sea', 'deep']

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

/** A rule of a kind. Each list is a list of ids of the code; an empty or missing list allows each value. */
export type Rule = {
  world: 'earth' | 'fairy'
  zones: Zone[]
  surfaces: Surface[]
  /** Only in the south (the penguins), or only in the north. */
  hemisphere?: 'south' | 'north'
  /** Earth: the seasons of the place when the kind is there (src/seasons.ts). Missing: all year. */
  seasons?: SeasonName[]
  /**
   * Earth: the seasons for one zone, in place of `seasons`. A kind that travels (the stork) has its
   * summer home in one zone and its winter home in another. Such a zone near the equator, which has
   * no season, follows the season of its half of the planet at 30°.
   */
  seasonsIn?: Partial<Record<Zone, SeasonName[]>>
  /** Earth: only at night (the fireflies). */
  night?: boolean
  /** Blossom Haven: the magic seasons of the place when the kind is there (src/magic-seasons.ts). */
  magic?: MagicId[]
  /** Blossom Haven: only near the cottage (the ring of HOME_RING). */
  home?: boolean
  /** Fliers: the height of the flight over the ground or the water, in metres. */
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

/** The seasons of a rule in a zone: the seasons of the zone, or the seasons of the rule. */
export const seasonsOf = (rule: Rule, zone: Zone) => rule.seasonsIn?.[zone] ?? rule.seasons

/**
 * True when a place passes a rule, in a season. A season of `null` or `undefined` is the look with no
 * season: each kind is there. The placement of the herds uses no season; the seasons only show and hide herds.
 */
export function fits(rule: Rule, place: Place, season: { earth?: SeasonName | null; magic?: MagicId | null } = {}) {
  if (rule.zones.length && !rule.zones.includes(place.zone)) return false
  if (rule.surfaces.length && !rule.surfaces.includes(place.surface)) return false
  if (rule.hemisphere === 'south' && !place.south) return false
  if (rule.hemisphere === 'north' && place.south) return false
  if (rule.home !== undefined && rule.home !== place.home) return false
  const seasons = seasonsOf(rule, place.zone)
  if (seasons && season.earth && !seasons.includes(season.earth)) return false
  if (rule.magic && season.magic && !rule.magic.includes(season.magic)) return false
  return true
}

/**
 * The season of a place of Earth for a rule. `latitude` is in degrees, `year` from 0 to 1. A place
 * near the equator has no season (null), except for a zone of `seasonsIn`: a stork in the savanna
 * follows the season of its half of the planet at 30°, so it comes in the winter of the north.
 */
export function seasonFor(rule: Rule, zone: Zone, latitude: number, year: number): SeasonName | null {
  const own = seasonAt(latitude, year)
  if (own || !rule.seasonsIn?.[zone]) return own
  return seasonAt(latitude < 0 ? -30 : 30, year)
}

/** True when a kind of Blossom Haven is out at a height `y` of the local direction in a magic year. */
export function magicFits(rule: Rule, y: number, year: number) {
  return !rule.magic || rule.magic.includes(magicAt(y, year).season.id)
}
