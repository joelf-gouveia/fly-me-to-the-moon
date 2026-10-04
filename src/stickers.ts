import { DWARF_WORLDS } from './belt'
import { MOON } from './moon'
import { URANUS_RING_SPAN } from './planet-look'
import { DARK_SPOT, inCanyon, inStorm, loopAt, RED_SPOT } from './search-places'
import type { Direction } from './search-places'
import { OCCATOR } from './terrain'
import type { PlanetKind, TerrainSample } from './terrain'

// The sticker book: one sticker for each world, the first time the fairy arrives.
// Design and options: docs/sticker-book-study.md. The game has the search stars of option B; the study adds a poster.
export type StickerId = PlanetKind | 'sun'
/** How the game can tell that a search task is done. */
export type SearchCheck = 'altitude' | 'place' | 'creature' | 'terrain' | 'through' | 'lap' | 'weather'
export type Group = 'star' | 'rocky' | 'moon' | 'dwarf' | 'giant' | 'pretend'

export type Sticker = {
  id: StickerId
  name: string
  /** English says "the Sun" and "the Moon", but "Mars". */
  the?: boolean
  group: Group
  color: number
  /** Game atmosphere height from `data` in src/worlds.ts. */
  atmosphere: number
  /** 0 is the Sun, 1 to 9 are the poster paths out from it, null wanders. The Moon shares Earth's path. */
  path: number | null
  /** One spoken fact. Short, with no numbers. */
  fact: string
  search: { task: string; found: string; check: SearchCheck; rule: string }
}

// Colours and atmospheres are the game values from src/worlds.ts, src/belt.ts and src/moon.ts.
const dwarf = (id: 'ceres' | 'vesta') => DWARF_WORLDS.find(world => world.id === id)!.color

export const STICKERS: Sticker[] = [
  { id: 'sun', name: 'Sun', the: true, group: 'star', color: 0xffcf86, atmosphere: 0, path: 0,
    fact: 'The Sun is a star. It gives us light and keeps us warm.',
    search: { task: 'Fly through a loop of fire.', found: 'You flew through a loop of fire!', check: 'through', rule: 'Under the arch of one of the five PROMINENCES, in the plane of the loop (loopAt() in src/search-places.ts)' } },
  { id: 'mercury', name: 'Mercury', group: 'rocky', color: 0xb7a58d, atmosphere: 0, path: 1,
    fact: 'Mercury is the closest planet to the Sun. It has no air and lots of craters.',
    search: { task: 'Find a crater with bright rays.', found: 'You found a crater with bright rays!', check: 'place', rule: 'Low over the bright middle of one of the four ray craters (rayCraters() in src/planet-paint.ts)' } },
  { id: 'venus', name: 'Venus', group: 'rocky', color: 0xd5a36d, atmosphere: 95, path: 2,
    fact: 'Venus is the hottest planet. Its thick clouds hold the heat in, like a blanket.',
    search: { task: 'Fly all the way around Venus.', found: 'You flew all the way around Venus!', check: 'lap', rule: 'One lap in the air of Venus: to the far side and back to the start (lapStep())' } },
  { id: 'earth', name: 'Earth', group: 'rocky', color: 0x83c5e8, atmosphere: 78, path: 3,
    fact: 'Earth is our home. It is the only world we know with plants and animals.',
    search: { task: 'Find a rainbow.', found: 'You found a rainbow!', check: 'weather', rule: 'The rainbow of the weather shows (bowShown of src/weather-air.ts above 0.25)' } },
  // The Moon goes around Earth, so it comes after Earth, as in Worlds.
  { id: 'moon', name: 'Moon', the: true, group: 'moon', color: MOON.color, atmosphere: 0, path: 3,
    fact: 'The Moon goes around Earth. People have walked on it!',
    search: { task: 'Find the dark seas on the Moon.', found: 'You found the dark seas!', check: 'terrain', rule: 'Low over ground where TerrainSample.mare is above 0.5' } },
  { id: 'mars', name: 'Mars', group: 'rocky', color: 0xd7a087, atmosphere: 42, path: 4,
    fact: 'Mars is red because its dust is rusty, like an old nail.',
    search: { task: 'Fly along the long canyon.', found: 'You flew along the long canyon!', check: 'place', rule: 'Low over the canyon on the equator (inCanyon() in src/search-places.ts)' } },
  { id: 'vesta', name: 'Vesta', group: 'dwarf', color: dwarf('vesta'), atmosphere: 0, path: 5,
    fact: 'Vesta has a giant hole at the bottom. A big rock hit it long ago.',
    search: { task: 'Find the giant hole at the bottom.', found: 'You found the giant hole!', check: 'place', rule: 'Over the south pole (local y below -0.8)' } },
  { id: 'ceres', name: 'Ceres', group: 'dwarf', color: dwarf('ceres'), atmosphere: 0, path: 5,
    fact: 'Ceres is the biggest ball of rock in the asteroid belt. Its bright spots are salt.',
    search: { task: 'Find the bright white spots.', found: 'You found the salt spots!', check: 'place', rule: 'Within 0.12 rad of the Occator direction in buildGround()' } },
  { id: 'jupiter', name: 'Jupiter', group: 'giant', color: 0xd7bb9c, atmosphere: 145, path: 6,
    fact: 'Jupiter is the biggest planet. All the other planets could fit inside it.',
    search: { task: 'Find the big red storm.', found: 'You found the big red storm!', check: 'place', rule: 'Below cloudHeight over the Great Red Spot (RED_SPOT in src/search-places.ts)' } },
  { id: 'saturn', name: 'Saturn', group: 'giant', color: 0xe1cb9e, atmosphere: 130, path: 7,
    fact: 'Saturn is very light for its size. It could float in a giant bath.',
    search: { task: 'Fly over the rings.', found: 'You flew over the rings!', check: 'place', rule: 'Near the ring plane, 1.3 to 2.02 radii from the centre' } },
  { id: 'uranus', name: 'Uranus', group: 'giant', color: 0x96d9df, atmosphere: 100, path: 8,
    fact: 'Uranus is the coldest planet of all, even colder than Neptune.',
    search: { task: 'Find the thin rings of the planet that lies on its side.', found: 'You found the thin rings!', check: 'place', rule: 'Near the ring plane, 1.64 to 2 radii from the centre (URANUS_RING_SPAN)' } },
  { id: 'neptune', name: 'Neptune', group: 'giant', color: 0x638ecb, atmosphere: 105, path: 9,
    fact: 'Neptune has the fastest winds of all the planets.',
    search: { task: 'Find the dark storm and its white cloud.', found: 'You found the dark storm!', check: 'place', rule: 'Below cloudHeight over the Great Dark Spot (DARK_SPOT in src/search-places.ts)' } },
  { id: 'fairy', name: 'Blossom Haven', group: 'pretend', color: 0xf3acd1, atmosphere: 52, path: null,
    fact: 'Blossom Haven is a pretend world. Unicorns live here, but only in stories.',
    search: { task: 'Pop a soda bubble.', found: 'You popped a soda bubble!', check: 'through', rule: 'Within 1.5 m of a soda bubble of src/candy.ts' } },
]

export const GROUP_NAMES: Record<Group, string> = { star: 'Star', rocky: 'Rocky planet', moon: 'Moon of Earth', dwarf: 'Dwarf planet', giant: 'Giant planet', pretend: 'Pretend world' }
export const stickerById = (id: StickerId) => STICKERS.find(sticker => sticker.id === id)!
const ids = new Set<string>(STICKERS.map(sticker => sticker.id))
export const isStickerId = (value: unknown): value is StickerId => typeof value === 'string' && ids.has(value)

/** Same test as the flight panel in updateNearestWorld() in src/main.ts: the world is "near". */
export const arrivalDistance = (sticker: Sticker) => Math.max(85, sticker.atmosphere * 1.5)

export type Book = { arrived: StickerId[]; found: StickerId[]; placed: StickerId[] }
export type Earned = { id: StickerId; kind: 'hello' | 'search' }
export const emptyBook = (): Book => ({ arrived: [], found: [], placed: [] })

/** The first arrival at a world earns its hello sticker. Later arrivals earn nothing. */
export function arrive(book: Book, id: StickerId): { book: Book; earned: Earned[] } {
  if (book.arrived.includes(id)) return { book, earned: [] }
  return { book: { ...book, arrived: [...book.arrived, id] }, earned: [{ id, kind: 'hello' }] }
}

/** A search star (option B of docs/sticker-book-study.md) counts once, and only after the hello sticker of the world. */
export function find(book: Book, id: StickerId): { book: Book; earned: Earned[] } {
  if (!searching(book, id)) return { book, earned: [] }
  return { book: { ...book, found: [...book.found, id] }, earned: [{ id, kind: 'search' }] }
}
/** The world has its hello sticker and waits for its search star. */
export const searching = (book: Book, id: StickerId) => book.arrived.includes(id) && !book.found.includes(id)

/**
 * What the flight loop measures at the place of the fairy for the search checks.
 * searchProbe() in src/search-stars.ts fills it from the nearest world.
 */
export type SearchProbe = {
  /** The flight panel says that the world is near (arrivalDistance()). */
  near: boolean
  /** Metres above the base radius of the world. It is below 0 in the deep clouds of a giant. */
  altitude: number
  /** Metres above the ground under the fairy. */
  clearance: number
  /** The radius and the cloud height of the world, in game metres. */
  radius: number
  cloudHeight: number
  /** The unit direction of the fairy from the centre, in the local frame of the world (without its spin and tilt). */
  up: Direction
  /** The terrain under the fairy. */
  ground: TerrainSample
  /** The distance in metres to the nearest creature of each kind that shows, for example `duck` or `unicorn`. */
  creatures: Partial<Record<string, number>>
  /** The Sun: the spin of the prominences, in radians. */
  turn?: number
  /** Mercury: the angle in radians to the middle of the nearest ray crater. */
  rays?: number
  /** Venus: the fairy completes a lap (lapStep()). */
  lap?: boolean
  /** Earth: how much the rainbow shows, from 0 to 1. */
  rainbow?: number
  /** Blossom Haven: the distance in metres to the nearest soda bubble. */
  bubble?: number
}

/** The numbers of the search checks. Each one comes from the `rule` text of its sticker. */
export const SEARCH = {
  /** A creature counts within 12 m. */
  creature: 12,
  /** Mercury, the Moon and Mars: "low" is less than 20 m above the ground. */
  low: 20,
  /** Mercury: within 0.16 rad of the middle of a ray crater, where the ground is bright. */
  rays: 0.16,
  /** A dark sea (`TerrainSample.mare`). */
  mare: 0.5,
  /** Earth: the rainbow shows clearly. */
  rainbow: 0.25,
  /** Blossom Haven: a soda bubble pops within 1.5 m. */
  bubble: 1.5,
  /** Venus: a lap goes further than 2.6 rad from its start, comes back to 0.5 rad, and is 6 rad long or more: almost a full circle. */
  lapFar: 2.6,
  lapClose: 0.5,
  lapPath: 6,
  /** A larger step than 0.5 rad is a jump, not a flight: the lap starts again. */
  lapJump: 0.5,
  /** Vesta: over the south pole, local y below -0.8. */
  pole: -0.8,
  /** Ceres: within 0.12 rad of the Occator direction. */
  occator: 0.12,
  /** Saturn: 1.3 to 2.02 radii from the centre, and less than 40 m from the ring plane. */
  ringFrom: 1.3,
  ringTo: 2.02,
  ringPlane: 40,
} as const

/**
 * The creature that the search of a living world asks for, for example `{ earth: 'duck' }`. Blossom Haven
 * names its creatures as fairytales. No task asks for a creature now; the gold star of such a task shows over the creature.
 */
export const SEARCH_CREATURE: Partial<Record<StickerId, string>> = {}

/** The lap of Venus: where it started, where the fairy was, if she was on the far side, and the length of her path in radians. */
export type Lap = { start: Direction | null; last: Direction | null; far: boolean; path: number }
export const newLap = (): Lap => ({ start: null, last: null, far: false, path: 0 })
const angleBetween = (a: Direction, b: Direction) => Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)))

/**
 * One step of a lap around a world, in any direction. It changes `lap`, and it is true when the lap is
 * complete. The lap starts where the fairy comes into the air, and starts again when she leaves it.
 */
export function lapStep(lap: Lap, up: Direction, inAir: boolean) {
  const step = lap.last ? angleBetween(lap.last, up) : 0
  if (!inAir || step > SEARCH.lapJump) Object.assign(lap, newLap())
  if (!inAir) return false
  if (!lap.start) { lap.start = lap.last = up; return false }
  lap.path += step
  lap.last = up
  const away = angleBetween(lap.start, up)
  if (away > SEARCH.lapFar) lap.far = true
  return lap.far && away < SEARCH.lapClose && lap.path >= SEARCH.lapPath
}

/** Near the ring plane of a world (local y is 0), between two distances from the centre in radii. */
function overRings(probe: SearchProbe, from: number, to: number) {
  const distance = probe.radius + probe.altitude
  const across = Math.hypot(probe.up.x, probe.up.z) * distance / probe.radius
  return Math.abs(probe.up.y * distance) < SEARCH.ringPlane && across >= from && across <= to
}

/** True when the fairy does the search task of the world (`search.rule` of its sticker). */
export function searchDone(id: StickerId, probe: SearchProbe) {
  const { up } = probe
  switch (id) {
    case 'sun': return loopAt(up, 1 + probe.altitude / probe.radius, probe.turn ?? 0) >= 0
    case 'venus': return probe.lap === true
    case 'earth': return probe.near && (probe.rainbow ?? 0) > SEARCH.rainbow
    case 'mars': return probe.clearance < SEARCH.low && inCanyon(up)
    case 'jupiter': return probe.altitude < probe.cloudHeight && inStorm(up, RED_SPOT)
    case 'neptune': return probe.altitude < probe.cloudHeight && inStorm(up, DARK_SPOT)
    case 'fairy': return (probe.bubble ?? Infinity) < SEARCH.bubble
    case 'vesta': return probe.near && up.y < SEARCH.pole
    case 'ceres': return probe.near && Math.acos(Math.min(1, up.x * OCCATOR[0] + up.y * OCCATOR[1] + up.z * OCCATOR[2])) < SEARCH.occator
    case 'saturn': return overRings(probe, SEARCH.ringFrom, SEARCH.ringTo)
    case 'uranus': return overRings(probe, URANUS_RING_SPAN.inner, URANUS_RING_SPAN.outer)
    case 'mercury': return probe.clearance < SEARCH.low && (probe.rays ?? Infinity) < SEARCH.rays
    case 'moon': return probe.clearance < SEARCH.low && (probe.ground.mare ?? 0) > SEARCH.mare
  }
}

/** A bigger celebration after every fourth sticker. */
export const MILESTONE = 4
export const reachesMilestone = (before: number, after: number) => Math.floor(after / MILESTONE) > Math.floor(before / MILESTONE)

/**
 * The empty space to suggest next: the nearest world on the poster that has no
 * hello sticker. Blossom Haven comes last, because it wanders.
 */
export function suggestNext(book: Book, from: StickerId = 'earth'): Sticker | null {
  const start = stickerById(from).path ?? 3
  const open = STICKERS.filter(sticker => !book.arrived.includes(sticker.id))
  if (!open.length) return null
  return open.toSorted((a, b) => (a.path === null ? 99 : Math.abs(a.path - start) * 2 + (a.path > start ? 1 : 0)) - (b.path === null ? 99 : Math.abs(b.path - start) * 2 + (b.path > start ? 1 : 0)))[0]!
}

/** Reads a saved book. Unknown or repeated ids are dropped; placed and found need an arrival. */
export function parseBook(value: unknown): Book {
  const book = emptyBook()
  if (!value || typeof value !== 'object') return book
  const list = (key: keyof Book) => {
    const raw = (value as Record<string, unknown>)[key]
    return Array.isArray(raw) ? [...new Set(raw.filter(isStickerId))] : []
  }
  book.arrived = list('arrived')
  book.found = list('found').filter(id => book.arrived.includes(id))
  book.placed = list('placed').filter(id => book.arrived.includes(id))
  return book
}

/**
 * The fairy starts on Earth, so the Earth sticker comes when she leaves for space
 * and comes back: a new visit, as for a new landscape (World.visit 2 or more).
 */
export const earnsSticker = (id: StickerId, visit: number) => id !== 'earth' || visit > 1

// The book of worlds (option D of docs/world-book-study.md): Worlds and the stickers in one
// dialog. The solar system opens as the fairy visits it, one "next door" at a time.

/** The order of the cards: Blossom Haven first, then the Sun and the worlds outward. */
export const BOOK_ORDER: readonly StickerId[] = ['fairy', ...STICKERS.map(sticker => sticker.id).filter(id => id !== 'fairy')]
/** Earth is the start, Blossom Haven the goal of the flower guide, and the Sun the centre of the map. */
export const KNOWN_AT_START: readonly StickerId[] = ['earth', 'fairy', 'sun']
/** Always open to "Fly there": the way home to Earth, and the flower guide to Blossom Haven, which wanders. */
export const ALWAYS_OPEN: readonly StickerId[] = ['earth', 'fairy']

/**
 * The empty space that the book opens next: the nearest world on the poster that has no
 * sticker. The fairy starts on Earth, so Earth comes last. Blossom Haven is always open,
 * so it is never the next door.
 */
export function nextDoor(book: Book): StickerId | null {
  const hasEarth = book.arrived.includes('earth')
  const assumed = [...book.arrived, ...(hasEarth ? [] : ['earth' as const]), ...(book.arrived.includes('fairy') ? [] : ['fairy' as const])]
  return suggestNext({ ...book, arrived: assumed }, book.arrived.at(-1) ?? 'earth')?.id ?? (hasEarth ? null : 'earth')
}

/** The map and the book show the name and the picture of a known world. The others are a grey "?". */
export const isKnown = (book: Book, id: StickerId) => KNOWN_AT_START.includes(id) || book.arrived.includes(id)

/** A guided flight goes to a world with its sticker, to Earth, to Blossom Haven, or to the next door. */
export const canFly = (book: Book, id: StickerId) => book.arrived.includes(id) || ALWAYS_OPEN.includes(id) || nextDoor(book) === id
